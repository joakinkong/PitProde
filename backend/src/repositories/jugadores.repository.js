// jugadores.repository.js — SQL de los jugadores. Todas las consultas usan parámetros (?).
'use strict';

// Pasa una fila de la tabla jugadores al formato del frontend.
const aJugador = (f) => ({ id: f.id, nombre: f.nombre, apodo: f.apodo, color: f.color, fechaAlta: f.fecha_alta });

// Devuelve el repositorio de jugadores, que usa la base "db".
function crearJugadoresRepository(db) {
  // Devuelve el jugador o undefined si no existe.
  async function obtener(id) {
    const fila = await db.uno('SELECT * FROM jugadores WHERE id = ?', [id]);
    return fila ? aJugador(fila) : undefined;
  }

  return {
    // Lista todos los jugadores.
    listar: async () => (await db.todos('SELECT * FROM jugadores ORDER BY nombre')).map(aJugador),
    obtener,
    // Inserta un jugador y lo devuelve.
    crear: async (j) => {
      await db.ejecutar('INSERT INTO jugadores (id, nombre, apodo, color, fecha_alta) VALUES (?, ?, ?, ?, ?)',
        [j.id, j.nombre, j.apodo, j.color, j.fechaAlta]);
      return obtener(j.id);
    },
    // Cambia nombre, apodo y color. Devuelve el jugador actualizado.
    actualizar: async (id, { nombre, apodo, color }) => {
      await db.ejecutar('UPDATE jugadores SET nombre = ?, apodo = ?, color = ? WHERE id = ?', [nombre, apodo, color, id]);
      return obtener(id);
    },
    // Borra el jugador (sus pronósticos se borran con él, por la clave foránea).
    eliminar: async (id) => { await db.ejecutar('DELETE FROM jugadores WHERE id = ?', [id]); },
    // Cuántos pronósticos tiene el jugador.
    contarPronosticos: async (id) => Number((await db.uno('SELECT COUNT(*) AS n FROM pronosticos WHERE jugador_id = ?', [id])).n),
  };
}

module.exports = { crearJugadoresRepository };
