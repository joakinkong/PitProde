// datos.repository.js — operaciones sobre todos los datos juntos: reemplazarlos de una vez (importar).
'use strict';

// Devuelve el repositorio de datos completos, que usa la base "db".
function crearDatosRepository(db) {
  const insertarJugador = db.prepare('INSERT INTO jugadores (id, nombre, apodo, color, fecha_alta) VALUES (?, ?, ?, ?, ?)');
  const insertarPiloto = db.prepare('INSERT INTO pilotos (id, nombre, equipo, numero, activo) VALUES (?, ?, ?, ?, ?)');
  const insertarGP = db.prepare(`INSERT INTO grandes_premios
    (id, nombre, circuito, fecha_largada, res_p1, res_p2, res_p3, res_pole) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertarPronostico = db.prepare(`INSERT INTO pronosticos
    (id, jugador_id, gp_id, p1, p2, p3, pole, fecha_carga, favorito) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  return {
    // Reemplaza TODO el contenido por "datos" ({ jugadores, pilotos, grandesPremios, pronosticos }),
    // en una transacción: si algo falla no se pierde nada de lo que había.
    reemplazarTodo(datos) {
      db.exec('BEGIN');
      try {
        ['pronosticos', 'grandes_premios', 'jugadores', 'pilotos'].forEach((tabla) => db.exec(`DELETE FROM ${tabla}`));
        datos.pilotos.forEach((p) => insertarPiloto.run(p.id, p.nombre, p.equipo, p.numero, p.activo ? 1 : 0));
        datos.jugadores.forEach((j) => insertarJugador.run(j.id, j.nombre, j.apodo, j.color, j.fechaAlta));
        datos.grandesPremios.forEach((g) => {
          const r = g.resultado;
          insertarGP.run(g.id, g.nombre, g.circuito, g.fechaLargada, r ? r.p1 : null, r ? r.p2 : null, r ? r.p3 : null, r ? r.pole : null);
        });
        datos.pronosticos.forEach((p) => insertarPronostico.run(
          p.id, p.jugadorId, p.gpId, p.p1, p.p2, p.p3, p.pole, p.fechaCarga, p.favorito ? 1 : 0,
        ));
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
}

module.exports = { crearDatosRepository };
