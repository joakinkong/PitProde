// pilotos.controller.js — traduce HTTP a llamadas al service de pilotos. Sin reglas ni SQL.
'use strict';

const { aRespuesta, exigirObjeto } = require('./http.js');

// Crea los handlers de /api/pilotos sobre el service dado.
function crearPilotosController(service) {
  return {
    listar: () => aRespuesta(service.listar(), 200),
    crear: ({ body }) => exigirObjeto(body) || aRespuesta(service.crear(body), 201),
    editar: ({ params, body }) => exigirObjeto(body) || aRespuesta(service.editar(params.id, body), 200),
    eliminar: ({ params }) => aRespuesta(service.eliminar(params.id), 200),
  };
}

module.exports = { crearPilotosController };
