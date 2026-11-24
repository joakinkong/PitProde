// referencias.repository.js — lectura de jugadores, pilotos y Grandes Premios.
// Es solo lectura: estos datos los consulta el service de pronósticos para validar.
'use strict';

// Pasa una fila de grandes_premios al formato que usa scoring.js (con "resultado" o null).
function filaAGP(fila) {
  const resultado = fila.res_p1
    ? { p1: fila.res_p1, p2: fila.res_p2, p3: fila.res_p3, pole: fila.res_pole }
    : null;
  return {
    id: fila.id, nombre: fila.nombre, circuito: fila.circuito, fechaLargada: fila.fecha_largada, resultado,
  };
}

// Devuelve el repositorio de datos de referencia, que usa la base "db".
function crearReferenciasRepository(db) {
  const jugadorPorId = db.prepare('SELECT id, nombre FROM jugadores WHERE id = ?');
  const gpPorId = db.prepare('SELECT * FROM grandes_premios WHERE id = ?');
  const todosLosGPs = db.prepare('SELECT * FROM grandes_premios');
  const todosLosPilotos = db.prepare('SELECT id, nombre FROM pilotos');

  return {
    // Devuelve el jugador o undefined si no existe.
    obtenerJugador: (id) => jugadorPorId.get(id),
    // Devuelve el GP (con su resultado o null) o undefined si no existe.
    obtenerGP: (id) => {
      const fila = gpPorId.get(id);
      return fila ? filaAGP(fila) : undefined;
    },
    // Devuelve todos los GPs.
    listarGPs: () => todosLosGPs.all().map(filaAGP),
    // Devuelve todos los pilotos (id y nombre).
    listarPilotos: () => todosLosPilotos.all().map((p) => ({ ...p })),
  };
}

module.exports = { crearReferenciasRepository };
