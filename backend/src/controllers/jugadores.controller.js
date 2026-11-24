// jugadores.controller.js — traduce HTTP a llamadas al service de jugadores. Sin reglas ni SQL.
'use strict';

const { aRespuesta, exigirObjeto } = require('./http.js');

// Crea los handlers de /api/jugadores sobre el service dado.
function crearJugadoresController(service) {
  return {
    listar: async () => aRespuesta(await service.listar(), 200),
    crear: async ({ body }) => exigirObjeto(body) || aRespuesta(await service.crear(body), 201),
    editar: async ({ params, body }) => exigirObjeto(body) || aRespuesta(await service.editar(params.id, body), 200),
    eliminar: async ({ params }) => aRespuesta(await service.eliminar(params.id), 200),
  };
}

module.exports = { crearJugadoresController };
