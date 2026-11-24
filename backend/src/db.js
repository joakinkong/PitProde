// db.js — acceso a la base con una interfaz async mínima, igual para SQLite (local y tests) y Postgres (publicado).
// Los repositories escriben el SQL una sola vez con "?" como parámetro; el adaptador de Postgres lo traduce a $1, $2...
// Interfaz de un adaptador: todos(sql, params), uno(sql, params), ejecutar(sql, params), transaccion(fn), cerrar().
'use strict';

const { crearDatosIniciales } = require('../../storage.js');

// Tablas. Se usan solo tipos que existen igual en SQLite y Postgres (los booleanos se guardan como 0/1).
const ESQUEMA = [
  `CREATE TABLE IF NOT EXISTS meta (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS jugadores (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    apodo TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '#888888',
    fecha_alta TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS pilotos (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    equipo TEXT NOT NULL,
    numero INTEGER NOT NULL,
    activo INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS grandes_premios (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    circuito TEXT NOT NULL,
    fecha_largada TEXT NOT NULL,
    res_p1 TEXT REFERENCES pilotos(id),
    res_p2 TEXT REFERENCES pilotos(id),
    res_p3 TEXT REFERENCES pilotos(id),
    res_pole TEXT REFERENCES pilotos(id)
  )`,
  `CREATE TABLE IF NOT EXISTS pronosticos (
    id TEXT PRIMARY KEY,
    jugador_id TEXT NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
    gp_id TEXT NOT NULL REFERENCES grandes_premios(id) ON DELETE CASCADE,
    p1 TEXT NOT NULL REFERENCES pilotos(id),
    p2 TEXT NOT NULL REFERENCES pilotos(id),
    p3 TEXT NOT NULL REFERENCES pilotos(id),
    pole TEXT NOT NULL REFERENCES pilotos(id),
    fecha_carga TEXT NOT NULL,
    favorito INTEGER NOT NULL DEFAULT 0,
    UNIQUE (jugador_id, gp_id)
  )`,
];

// ---------- Adaptador de SQLite ----------

// Abre SQLite en "ruta" (o en memoria si es ':memory:'). node:sqlite es síncrono: se lo envuelve en promesas.
function crearAdaptadorSqlite(ruta) {
  const { DatabaseSync } = require('node:sqlite'); // solo se carga si se usa SQLite
  const bd = new DatabaseSync(ruta);
  bd.exec('PRAGMA foreign_keys = ON;');
  const sentencias = new Map();
  const preparar = (sql) => {
    if (!sentencias.has(sql)) sentencias.set(sql, bd.prepare(sql));
    return sentencias.get(sql);
  };
  const adaptador = {
    dialecto: 'sqlite',
    todos: async (sql, params = []) => preparar(sql).all(...params),
    uno: async (sql, params = []) => preparar(sql).get(...params),
    ejecutar: async (sql, params = []) => { preparar(sql).run(...params); },
    // Corre "fn" dentro de una transacción: si lanza, se deshace todo.
    transaccion: async (fn) => {
      bd.exec('BEGIN');
      try {
        const resultado = await fn(adaptador);
        bd.exec('COMMIT');
        return resultado;
      } catch (error) {
        bd.exec('ROLLBACK');
        throw error;
      }
    },
    cerrar: async () => { bd.close(); },
  };
  return adaptador;
}

// ---------- Adaptador de Postgres ----------

// "pool" es un pg.Pool (o uno compatible, como el de pg-mem en las pruebas).
function crearAdaptadorPostgres(pool) {
  // Cambia cada "?" por $1, $2... (el SQL de los repositories no tiene "?" dentro de textos).
  const aPostgres = (sql) => {
    let n = 0;
    return sql.replace(/\?/g, () => `$${++n}`);
  };
  const sobre = (ejecutor) => ({
    dialecto: 'postgres',
    todos: async (sql, params = []) => (await ejecutor.query(aPostgres(sql), params)).rows,
    uno: async (sql, params = []) => (await ejecutor.query(aPostgres(sql), params)).rows[0],
    ejecutar: async (sql, params = []) => { await ejecutor.query(aPostgres(sql), params); },
  });
  return {
    ...sobre(pool),
    // Toma una conexión del pool para que todas las sentencias de "fn" caigan en la misma transacción.
    transaccion: async (fn) => {
      const cliente = await pool.connect();
      try {
        await cliente.query('BEGIN');
        const resultado = await fn(sobre(cliente));
        await cliente.query('COMMIT');
        return resultado;
      } catch (error) {
        await cliente.query('ROLLBACK');
        throw error;
      } finally {
        cliente.release();
      }
    },
    cerrar: async () => { await pool.end(); },
  };
}

// ---------- Datos iniciales ----------

// Carga los pilotos y GPs 2026 (los mismos que usa el frontend). Solo se llama con la base recién creada.
// "ON CONFLICT DO NOTHING" hace que no pase nada grave si dos servidores arrancan a la vez contra una base vacía.
async function cargarDatosIniciales(db) {
  const datos = crearDatosIniciales();
  await db.transaccion(async (tx) => {
    for (const p of datos.pilotos) {
      await tx.ejecutar('INSERT INTO pilotos (id, nombre, equipo, numero, activo) VALUES (?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING',
        [p.id, p.nombre, p.equipo, p.numero, p.activo ? 1 : 0]);
    }
    for (const g of datos.grandesPremios) {
      await tx.ejecutar('INSERT INTO grandes_premios (id, nombre, circuito, fecha_largada) VALUES (?, ?, ?, ?) ON CONFLICT (id) DO NOTHING',
        [g.id, g.nombre, g.circuito, g.fechaLargada]);
    }
  });
}

// Carga los datos 2026 una sola vez por base (se marca en la tabla meta). Si no, "Borrar todo"
// dejaría la base vacía y al reiniciar el servidor volvería a aparecer la temporada.
async function prepararDatos(db) {
  if (await db.uno("SELECT valor FROM meta WHERE clave = 'semilla'")) return;
  const { n } = await db.uno('SELECT COUNT(*) AS n FROM pilotos');
  if (Number(n) === 0) await cargarDatosIniciales(db);
  await db.ejecutar("INSERT INTO meta (clave, valor) VALUES ('semilla', '1') ON CONFLICT (clave) DO NOTHING");
}

// Crea las tablas y deja los datos listos en cualquier adaptador.
async function inicializar(db) {
  for (const sentencia of ESQUEMA) await db.ejecutar(sentencia);
  await prepararDatos(db);
  return db;
}

// Abre una base SQLite (en memoria por defecto) lista para usar.
async function abrirBase(ruta = ':memory:') {
  const db = crearAdaptadorSqlite(ruta);
  for (const sentencia of ESQUEMA) await db.ejecutar(sentencia);
  // Las bases creadas antes de existir la tabla meta marcaban la carga inicial con user_version.
  const { user_version: version } = await db.uno('PRAGMA user_version');
  if (version >= 1) await db.ejecutar("INSERT INTO meta (clave, valor) VALUES ('semilla', '1') ON CONFLICT (clave) DO NOTHING");
  await prepararDatos(db);
  return db;
}

// Abre una base Postgres a partir de un pool ya creado, lista para usar.
async function abrirBasePostgres(pool) {
  return inicializar(crearAdaptadorPostgres(pool));
}

module.exports = { abrirBase, abrirBasePostgres };
