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
  const todos = db.prepare('SELECT * FROM grandes_premios ORDER BY fecha_largada');
  const porId = db.prepare('SELECT * FROM grandes_premios WHERE id = ?');
  const insertar = db.prepare('INSERT INTO grandes_premios (id, nombre, circuito, fecha_largada) VALUES (?, ?, ?, ?)');
  const actualizar = db.prepare('UPDATE grandes_premios SET nombre = ?, circuito = ?, fecha_largada = ? WHERE id = ?');
  const borrar = db.prepare('DELETE FROM grandes_premios WHERE id = ?');
  const ponerResultado = db.prepare('UPDATE grandes_premios SET res_p1 = ?, res_p2 = ?, res_p3 = ?, res_pole = ? WHERE id = ?');
  const contarPronosticos = db.prepare('SELECT COUNT(*) AS n FROM pronosticos WHERE gp_id = ?');

  return {
    // Lista todos los GPs por fecha de largada.
    listar: () => todos.all().map(aGP),
    // Devuelve el GP (con su resultado o null) o undefined si no existe.
    obtener: (id) => {
      const fila = porId.get(id);
      return fila ? aGP(fila) : undefined;
    },
    // Inserta un GP sin resultado y lo devuelve.
    crear: (g) => {
      insertar.run(g.id, g.nombre, g.circuito, g.fechaLargada);
      return aGP(porId.get(g.id));
    },
    // Cambia nombre, circuito y largada. Devuelve el GP actualizado.
    actualizar: (id, { nombre, circuito, fechaLargada }) => {
      actualizar.run(nombre, circuito, fechaLargada, id);
      return aGP(porId.get(id));
    },
    // Borra el GP (sus pronósticos se borran con él, por la clave foránea).
    eliminar: (id) => { borrar.run(id); },
    // Guarda o corrige el resultado. Devuelve el GP actualizado.
    guardarResultado: (id, r) => {
      ponerResultado.run(r.p1, r.p2, r.p3, r.pole, id);
      return aGP(porId.get(id));
    },
    // Quita el resultado. Devuelve el GP actualizado.
    quitarResultado: (id) => {
      ponerResultado.run(null, null, null, null, id);
      return aGP(porId.get(id));
    },
    // Cuántos pronósticos tiene el GP.
    contarPronosticos: (id) => contarPronosticos.get(id).n,
  };
}

module.exports = { crearGrandesPremiosRepository };
