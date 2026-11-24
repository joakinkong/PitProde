// pronosticos.repository.js — único lugar con SQL de los pronósticos.
// Todas las consultas usan parámetros (?) y devuelven objetos con los nombres del frontend.
'use strict';

// Pasa una fila de la tabla pronosticos al formato del frontend.
function filaAPronostico(fila) {
  return {
    id: fila.id, jugadorId: fila.jugador_id, gpId: fila.gp_id,
    p1: fila.p1, p2: fila.p2, p3: fila.p3, pole: fila.pole,
    fechaCarga: fila.fecha_carga, favorito: Number(fila.favorito) === 1,
  };
}

// Devuelve el repositorio de pronósticos, que usa la base "db".
function crearPronosticosRepository(db) {
  // Devuelve el pronóstico o undefined si no existe.
  async function obtener(id) {
    const fila = await db.uno('SELECT * FROM pronosticos WHERE id = ?', [id]);
    return fila ? filaAPronostico(fila) : undefined;
  }

  return {
    obtener,
    // Inserta un pronóstico nuevo y lo devuelve.
    crear: async (p) => {
      await db.ejecutar(`INSERT INTO pronosticos
        (id, jugador_id, gp_id, p1, p2, p3, pole, fecha_carga) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.id, p.jugadorId, p.gpId, p.p1, p.p2, p.p3, p.pole, p.fechaCarga]);
      return obtener(p.id);
    },
    // Cambia el podio, la pole y la fecha de carga. Devuelve el pronóstico actualizado.
    actualizar: async (id, { p1, p2, p3, pole, fechaCarga }) => {
      await db.ejecutar('UPDATE pronosticos SET p1 = ?, p2 = ?, p3 = ?, pole = ?, fecha_carga = ? WHERE id = ?',
        [p1, p2, p3, pole, fechaCarga, id]);
      return obtener(id);
    },
    // Borra el pronóstico.
    eliminar: async (id) => { await db.ejecutar('DELETE FROM pronosticos WHERE id = ?', [id]); },
    // Marca o desmarca el favorito. Devuelve el pronóstico actualizado.
    ponerFavorito: async (id, valor) => {
      await db.ejecutar('UPDATE pronosticos SET favorito = ? WHERE id = ?', [valor ? 1 : 0, id]);
      return obtener(id);
    },
    // Devuelve el pronóstico de ese jugador para ese GP, o undefined.
    obtenerPorJugadorYGP: async (jugadorId, gpId) => {
      const fila = await db.uno('SELECT * FROM pronosticos WHERE jugador_id = ? AND gp_id = ?', [jugadorId, gpId]);
      return fila ? filaAPronostico(fila) : undefined;
    },
    // Lista los pronósticos; "gpId" y "jugadorId" son filtros opcionales (null = todos).
    // El CAST es necesario en Postgres, que no puede deducir el tipo de un parámetro que solo se compara con NULL.
    listar: async ({ gpId = null, jugadorId = null } = {}) => (await db.todos(
      `SELECT * FROM pronosticos
       WHERE (CAST(? AS TEXT) IS NULL OR gp_id = ?) AND (CAST(? AS TEXT) IS NULL OR jugador_id = ?)
       ORDER BY fecha_carga, id`,
      [gpId, gpId, jugadorId, jugadorId],
    )).map(filaAPronostico),
  };
}

module.exports = { crearPronosticosRepository };
