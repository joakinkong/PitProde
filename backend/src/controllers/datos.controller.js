// datos.controller.js — traduce HTTP a llamadas al service de datos: carga completa, tabla, exportar e importar.
'use strict';

const { aRespuesta, exigirObjeto } = require('./http.js');

// Crea los handlers de /api/datos, /api/tabla, /api/exportar y /api/importar.
function crearDatosController(service) {
  return {
    todo: async () => aRespuesta(await service.todo(), 200),
    tabla: async () => aRespuesta(await service.tabla(), 200),
    exportar: async () => aRespuesta(await service.exportar(), 200),
    importar: async ({ body }) => exigirObjeto(body) || aRespuesta(await service.importar(body), 200),
  };
}

module.exports = { crearDatosController };
