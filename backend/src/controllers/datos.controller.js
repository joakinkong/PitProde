// datos.controller.js — traduce HTTP a llamadas al service de datos: carga completa, tabla, exportar e importar.
'use strict';

const { aRespuesta, exigirObjeto } = require('./http.js');

// Crea los handlers de /api/datos, /api/tabla, /api/exportar y /api/importar.
function crearDatosController(service) {
  return {
    todo: () => aRespuesta(service.todo(), 200),
    tabla: () => aRespuesta(service.tabla(), 200),
    exportar: () => aRespuesta(service.exportar(), 200),
    importar: ({ body }) => exigirObjeto(body) || aRespuesta(service.importar(body), 200),
  };
}

module.exports = { crearDatosController };
