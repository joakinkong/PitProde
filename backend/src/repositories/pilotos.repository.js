// pilotos.repository.js — SQL de los pilotos. Todas las consultas usan parámetros (?).
'use strict';

// Pasa una fila de la tabla pilotos al formato del frontend.
const aPiloto = (f) => ({ id: f.id, nombre: f.nombre, equipo: f.equipo, numero: f.numero, activo: f.activo === 1 });

// Devuelve el repositorio de pilotos, que usa la base "db".
function crearPilotosRepository(db) {
  const todos = db.prepare('SELECT * FROM pilotos ORDER BY nombre');
  const porId = db.prepare('SELECT * FROM pilotos WHERE id = ?');
  const insertar = db.prepare('INSERT INTO pilotos (id, nombre, equipo, numero, activo) VALUES (?, ?, ?, ?, ?)');
  const actualizar = db.prepare('UPDATE pilotos SET nombre = ?, equipo = ?, numero = ?, activo = ? WHERE id = ?');
  const borrar = db.prepare('DELETE FROM pilotos WHERE id = ?');
  const usosEnPronosticos = db.prepare('SELECT COUNT(*) AS n FROM pronosticos WHERE ? IN (p1, p2, p3, pole)');
  const usosEnResultados = db.prepare('SELECT COUNT(*) AS n FROM grandes_premios WHERE ? IN (res_p1, res_p2, res_p3, res_pole)');

  return {
    // Lista todos los pilotos (con el campo "activo").
    listar: () => todos.all().map(aPiloto),
    // Devuelve el piloto o undefined si no existe.
    obtener: (id) => {
      const fila = porId.get(id);
      return fila ? aPiloto(fila) : undefined;
    },
    // Inserta un piloto y lo devuelve.
    crear: (p) => {
      insertar.run(p.id, p.nombre, p.equipo, p.numero, p.activo ? 1 : 0);
      return aPiloto(porId.get(p.id));
    },
    // Cambia los datos del piloto. Devuelve el piloto actualizado.
    actualizar: (id, { nombre, equipo, numero, activo }) => {
      actualizar.run(nombre, equipo, numero, activo ? 1 : 0, id);
      return aPiloto(porId.get(id));
    },
    // Borra el piloto (la base lo rechaza si algún pronóstico o resultado lo usa).
    eliminar: (id) => { borrar.run(id); },
    // Cuántos pronósticos y resultados usan al piloto: { pronosticos, resultados }.
    usos: (id) => ({ pronosticos: usosEnPronosticos.get(id).n, resultados: usosEnResultados.get(id).n }),
  };
}

module.exports = { crearPilotosRepository };
