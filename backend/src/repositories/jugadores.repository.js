// jugadores.repository.js — SQL de los jugadores. Todas las consultas usan parámetros (?).
'use strict';

// Pasa una fila de la tabla jugadores al formato del frontend.
const aJugador = (f) => ({ id: f.id, nombre: f.nombre, apodo: f.apodo, color: f.color, fechaAlta: f.fecha_alta });

// Devuelve el repositorio de jugadores, que usa la base "db".
function crearJugadoresRepository(db) {
  const todos = db.prepare('SELECT * FROM jugadores ORDER BY nombre');
  const porId = db.prepare('SELECT * FROM jugadores WHERE id = ?');
  const insertar = db.prepare('INSERT INTO jugadores (id, nombre, apodo, color, fecha_alta) VALUES (?, ?, ?, ?, ?)');
  const actualizar = db.prepare('UPDATE jugadores SET nombre = ?, apodo = ?, color = ? WHERE id = ?');
  const borrar = db.prepare('DELETE FROM jugadores WHERE id = ?');
  const contarPronosticos = db.prepare('SELECT COUNT(*) AS n FROM pronosticos WHERE jugador_id = ?');

  return {
    // Lista todos los jugadores.
    listar: () => todos.all().map(aJugador),
    // Devuelve el jugador o undefined si no existe.
    obtener: (id) => {
      const fila = porId.get(id);
      return fila ? aJugador(fila) : undefined;
    },
    // Inserta un jugador y lo devuelve.
    crear: (j) => {
      insertar.run(j.id, j.nombre, j.apodo, j.color, j.fechaAlta);
      return aJugador(porId.get(j.id));
    },
    // Cambia nombre, apodo y color. Devuelve el jugador actualizado.
    actualizar: (id, { nombre, apodo, color }) => {
      actualizar.run(nombre, apodo, color, id);
      return aJugador(porId.get(id));
    },
    // Borra el jugador (sus pronósticos se borran con él, por la clave foránea).
    eliminar: (id) => { borrar.run(id); },
    // Cuántos pronósticos tiene el jugador.
    contarPronosticos: (id) => contarPronosticos.get(id).n,
  };
}

module.exports = { crearJugadoresRepository };
