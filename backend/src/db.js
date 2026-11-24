// db.js — abre la base SQLite, crea las tablas y carga la grilla y el calendario 2026.
// Es el único archivo que conoce el esquema completo; los repositories arman sus consultas sobre él.
'use strict';

const { DatabaseSync } = require('node:sqlite');
const { crearDatosIniciales } = require('../../storage.js');

const ESQUEMA = `
  CREATE TABLE IF NOT EXISTS jugadores (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    apodo TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '#888888',
    fecha_alta TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS pilotos (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    equipo TEXT NOT NULL,
    numero INTEGER NOT NULL,
    activo INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS grandes_premios (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    circuito TEXT NOT NULL,
    fecha_largada TEXT NOT NULL,
    res_p1 TEXT REFERENCES pilotos(id),
    res_p2 TEXT REFERENCES pilotos(id),
    res_p3 TEXT REFERENCES pilotos(id),
    res_pole TEXT REFERENCES pilotos(id)
  );
  CREATE TABLE IF NOT EXISTS pronosticos (
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
  );
`;

// Si la base está vacía, carga los pilotos y GPs 2026 (los mismos que usa el frontend).
function cargarDatosIniciales(db) {
  const hayPilotos = db.prepare('SELECT COUNT(*) AS n FROM pilotos').get().n > 0;
  if (hayPilotos) return;
  const datos = crearDatosIniciales();
  const insertarPiloto = db.prepare('INSERT INTO pilotos (id, nombre, equipo, numero, activo) VALUES (?, ?, ?, ?, ?)');
  const insertarGP = db.prepare('INSERT INTO grandes_premios (id, nombre, circuito, fecha_largada) VALUES (?, ?, ?, ?)');
  db.exec('BEGIN');
  datos.pilotos.forEach((p) => insertarPiloto.run(p.id, p.nombre, p.equipo, p.numero, p.activo ? 1 : 0));
  datos.grandesPremios.forEach((g) => insertarGP.run(g.id, g.nombre, g.circuito, g.fechaLargada));
  db.exec('COMMIT');
}

// Abre la base en "ruta" (o en memoria si es ':memory:'), con las tablas y datos listos.
function abrirBase(ruta = ':memory:') {
  const db = new DatabaseSync(ruta);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(ESQUEMA);
  cargarDatosIniciales(db);
  return db;
}

module.exports = { abrirBase };
