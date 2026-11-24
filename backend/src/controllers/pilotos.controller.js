// pilotos.controller.js — traduce HTTP a llamadas al service de pilotos. Sin reglas ni SQL.
'use strict';

const { aRespuesta, exigirObjeto } = require('./http.js');

// Crea los handlers de /api/pilotos sobre el service dado.
function crearPilotosController(service) {
  return {
    listar: async () => aRespuesta(await service.listar(), 200),
    crear: async ({ body }) => exigirObjeto(body) || aRespuesta(await service.crear(body), 201),
    editar: async ({ params, body }) => exigirObjeto(body) || aRespuesta(await service.editar(params.id, body), 200),
    eliminar: async ({ params }) => aRespuesta(await service.eliminar(params.id), 200),
  };
}

module.exports = { crearPilotosController };
