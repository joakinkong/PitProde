// pronosticos.repository.js — único lugar con SQL de los pronósticos.
// Todas las consultas usan parámetros (?) y devuelven objetos con los nombres del frontend.
'use strict';

// Pasa una fila de la tabla pronosticos al formato del frontend.
function filaAPronostico(fila) {
  return {
    id: fila.id, jugadorId: fila.jugador_id, gpId: fila.gp_id,
    p1: fila.p1, p2: fila.p2, p3: fila.p3, pole: fila.pole,
    fechaCarga: fila.fecha_carga, favorito: fila.favorito === 1,
  };
}

// Devuelve el repositorio de pronósticos, que usa la base "db".
function crearPronosticosRepository(db) {
  const insertar = db.prepare(`INSERT INTO pronosticos
    (id, jugador_id, gp_id, p1, p2, p3, pole, fecha_carga) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  const actualizar = db.prepare('UPDATE pronosticos SET p1 = ?, p2 = ?, p3 = ?, pole = ?, fecha_carga = ? WHERE id = ?');
  const porId = db.prepare('SELECT * FROM pronosticos WHERE id = ?');
  const porJugadorYGP = db.prepare('SELECT * FROM pronosticos WHERE jugador_id = ? AND gp_id = ?');
  // Los filtros son opcionales: "? IS NULL OR campo = ?" evita armar el SQL con texto.
  const listar = db.prepare(`SELECT * FROM pronosticos
    WHERE (? IS NULL OR gp_id = ?) AND (? IS NULL OR jugador_id = ?)
    ORDER BY fecha_carga, id`);

  return {
    // Inserta un pronóstico nuevo y lo devuelve.
    crear: (p) => {
      insertar.run(p.id, p.jugadorId, p.gpId, p.p1, p.p2, p.p3, p.pole, p.fechaCarga);
      return filaAPronostico(porId.get(p.id));
    },
    // Cambia el podio, la pole y la fecha de carga. Devuelve el pronóstico actualizado.
    actualizar: (id, { p1, p2, p3, pole, fechaCarga }) => {
      actualizar.run(p1, p2, p3, pole, fechaCarga, id);
      return filaAPronostico(porId.get(id));
    },
    // Devuelve el pronóstico o undefined si no existe.
    obtener: (id) => {
      const fila = porId.get(id);
      return fila ? filaAPronostico(fila) : undefined;
    },
    // Devuelve el pronóstico de ese jugador para ese GP, o undefined.
    obtenerPorJugadorYGP: (jugadorId, gpId) => {
      const fila = porJugadorYGP.get(jugadorId, gpId);
      return fila ? filaAPronostico(fila) : undefined;
    },
    // Lista los pronósticos; "gpId" y "jugadorId" son filtros opcionales (null = todos).
    listar: ({ gpId = null, jugadorId = null } = {}) => (
      listar.all(gpId, gpId, jugadorId, jugadorId).map(filaAPronostico)
    ),
  };
}

module.exports = { crearPronosticosRepository };
