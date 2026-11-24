// grandesPremios.controller.js — traduce HTTP a llamadas al service de GPs y resultados. Sin reglas ni SQL.
'use strict';

const { aRespuesta, exigirObjeto } = require('./http.js');

// Crea los handlers de /api/grandes-premios sobre el service dado.
function crearGrandesPremiosController(service) {
  return {
    listar: async () => aRespuesta(await service.listar(), 200),
    crear: async ({ body }) => exigirObjeto(body) || aRespuesta(await service.crear(body), 201),
    editar: async ({ params, body }) => exigirObjeto(body) || aRespuesta(await service.editar(params.id, body), 200),
    eliminar: async ({ params }) => aRespuesta(await service.eliminar(params.id), 200),
    // PUT /api/grandes-premios/:id/resultado
    cargarResultado: async ({ params, body }) => exigirObjeto(body) || aRespuesta(await service.cargarResultado(params.id, body), 200),
    // DELETE /api/grandes-premios/:id/resultado
    quitarResultado: async ({ params }) => aRespuesta(await service.quitarResultado(params.id), 200),
  };
}

module.exports = { crearGrandesPremiosController };
