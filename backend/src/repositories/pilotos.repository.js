// pilotos.repository.js — SQL de los pilotos. Todas las consultas usan parámetros (?).
'use strict';

// Pasa una fila de la tabla pilotos al formato del frontend.
const aPiloto = (f) => ({ id: f.id, nombre: f.nombre, equipo: f.equipo, numero: Number(f.numero), activo: Number(f.activo) === 1 });

// Devuelve el repositorio de pilotos, que usa la base "db".
function crearPilotosRepository(db) {
  // Devuelve el piloto o undefined si no existe.
  async function obtener(id) {
    const fila = await db.uno('SELECT * FROM pilotos WHERE id = ?', [id]);
    return fila ? aPiloto(fila) : undefined;
  }
  const contar = async (sql, id) => Number((await db.uno(sql, [id])).n);

  return {
    // Lista todos los pilotos (con el campo "activo").
    listar: async () => (await db.todos('SELECT * FROM pilotos ORDER BY nombre')).map(aPiloto),
    obtener,
    // Inserta un piloto y lo devuelve.
    crear: async (p) => {
      await db.ejecutar('INSERT INTO pilotos (id, nombre, equipo, numero, activo) VALUES (?, ?, ?, ?, ?)',
        [p.id, p.nombre, p.equipo, p.numero, p.activo ? 1 : 0]);
      return obtener(p.id);
    },
    // Cambia los datos del piloto. Devuelve el piloto actualizado.
    actualizar: async (id, { nombre, equipo, numero, activo }) => {
      await db.ejecutar('UPDATE pilotos SET nombre = ?, equipo = ?, numero = ?, activo = ? WHERE id = ?',
        [nombre, equipo, numero, activo ? 1 : 0, id]);
      return obtener(id);
    },
    // Borra el piloto (la base lo rechaza si algún pronóstico o resultado lo usa).
    eliminar: async (id) => { await db.ejecutar('DELETE FROM pilotos WHERE id = ?', [id]); },
    // Cuántos pronósticos y resultados usan al piloto: { pronosticos, resultados }.
    usos: async (id) => ({
      pronosticos: await contar('SELECT COUNT(*) AS n FROM pronosticos WHERE ? IN (p1, p2, p3, pole)', id),
      resultados: await contar('SELECT COUNT(*) AS n FROM grandes_premios WHERE ? IN (res_p1, res_p2, res_p3, res_pole)', id),
    }),
  };
}

module.exports = { crearPilotosRepository };
