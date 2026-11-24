// datos.repository.js — operaciones sobre todos los datos juntos: reemplazarlos de una vez (importar).
'use strict';

// Devuelve el repositorio de datos completos, que usa la base "db".
function crearDatosRepository(db) {
  return {
    // Reemplaza TODO el contenido por "datos" ({ jugadores, pilotos, grandesPremios, pronosticos }),
    // en una transacción: si algo falla no se pierde nada de lo que había.
    reemplazarTodo: (datos) => db.transaccion(async (tx) => {
      for (const tabla of ['pronosticos', 'grandes_premios', 'jugadores', 'pilotos']) await tx.ejecutar(`DELETE FROM ${tabla}`);
      for (const p of datos.pilotos) {
        await tx.ejecutar('INSERT INTO pilotos (id, nombre, equipo, numero, activo) VALUES (?, ?, ?, ?, ?)',
          [p.id, p.nombre, p.equipo, p.numero, p.activo ? 1 : 0]);
      }
      for (const j of datos.jugadores) {
        await tx.ejecutar('INSERT INTO jugadores (id, nombre, apodo, color, fecha_alta) VALUES (?, ?, ?, ?, ?)',
          [j.id, j.nombre, j.apodo, j.color, j.fechaAlta]);
      }
      for (const g of datos.grandesPremios) {
        const r = g.resultado;
        await tx.ejecutar(`INSERT INTO grandes_premios
          (id, nombre, circuito, fecha_largada, res_p1, res_p2, res_p3, res_pole) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [g.id, g.nombre, g.circuito, g.fechaLargada, r ? r.p1 : null, r ? r.p2 : null, r ? r.p3 : null, r ? r.pole : null]);
      }
      for (const p of datos.pronosticos) {
        await tx.ejecutar(`INSERT INTO pronosticos
          (id, jugador_id, gp_id, p1, p2, p3, pole, fecha_carga, favorito) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.id, p.jugadorId, p.gpId, p.p1, p.p2, p.p3, p.pole, p.fechaCarga, p.favorito ? 1 : 0]);
      }
    }),
  };
}

module.exports = { crearDatosRepository };
