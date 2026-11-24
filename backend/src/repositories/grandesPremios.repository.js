// grandesPremios.repository.js — SQL de los Grandes Premios y sus resultados.
// Todas las consultas usan parámetros (?).
'use strict';

// Pasa una fila al formato que usa scoring.js: con "resultado" ({ p1, p2, p3, pole }) o null.
function aGP(f) {
  const resultado = f.res_p1 ? { p1: f.res_p1, p2: f.res_p2, p3: f.res_p3, pole: f.res_pole } : null;
  return { id: f.id, nombre: f.nombre, circuito: f.circuito, fechaLargada: f.fecha_largada, resultado };
}

// Devuelve el repositorio de Grandes Premios, que usa la base "db".
function crearGrandesPremiosRepository(db) {
  // Devuelve el GP (con su resultado o null) o undefined si no existe.
  async function obtener(id) {
    const fila = await db.uno('SELECT * FROM grandes_premios WHERE id = ?', [id]);
    return fila ? aGP(fila) : undefined;
  }
  const ponerResultado = (id, r) => db.ejecutar(
    'UPDATE grandes_premios SET res_p1 = ?, res_p2 = ?, res_p3 = ?, res_pole = ? WHERE id = ?',
    [r.p1, r.p2, r.p3, r.pole, id],
  );

  return {
    // Lista todos los GPs por fecha de largada.
    listar: async () => (await db.todos('SELECT * FROM grandes_premios ORDER BY fecha_largada')).map(aGP),
    obtener,
    // Inserta un GP sin resultado y lo devuelve.
    crear: async (g) => {
      await db.ejecutar('INSERT INTO grandes_premios (id, nombre, circuito, fecha_largada) VALUES (?, ?, ?, ?)',
        [g.id, g.nombre, g.circuito, g.fechaLargada]);
      return obtener(g.id);
    },
    // Cambia nombre, circuito y largada. Devuelve el GP actualizado.
    actualizar: async (id, { nombre, circuito, fechaLargada }) => {
      await db.ejecutar('UPDATE grandes_premios SET nombre = ?, circuito = ?, fecha_largada = ? WHERE id = ?',
        [nombre, circuito, fechaLargada, id]);
      return obtener(id);
    },
    // Borra el GP (sus pronósticos se borran con él, por la clave foránea).
    eliminar: async (id) => { await db.ejecutar('DELETE FROM grandes_premios WHERE id = ?', [id]); },
    // Guarda o corrige el resultado. Devuelve el GP actualizado.
    guardarResultado: async (id, r) => {
      await ponerResultado(id, r);
      return obtener(id);
    },
    // Quita el resultado. Devuelve el GP actualizado.
    quitarResultado: async (id) => {
      await ponerResultado(id, { p1: null, p2: null, p3: null, pole: null });
      return obtener(id);
    },
    // Cuántos pronósticos tiene el GP.
    contarPronosticos: async (id) => Number((await db.uno('SELECT COUNT(*) AS n FROM pronosticos WHERE gp_id = ?', [id])).n),
  };
}

module.exports = { crearGrandesPremiosRepository };
