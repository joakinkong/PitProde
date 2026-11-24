// grandesPremios.controller.js — traduce HTTP a llamadas al service de GPs y resultados. Sin reglas ni SQL.
'use strict';

const { aRespuesta, exigirObjeto } = require('./http.js');

// Crea los handlers de /api/grandes-premios sobre el service dado.
function crearGrandesPremiosController(service) {
  return {
    listar: () => aRespuesta(service.listar(), 200),
    crear: ({ body }) => exigirObjeto(body) || aRespuesta(service.crear(body), 201),
    editar: ({ params, body }) => exigirObjeto(body) || aRespuesta(service.editar(params.id, body), 200),
    eliminar: ({ params }) => aRespuesta(service.eliminar(params.id), 200),
    // PUT /api/grandes-premios/:id/resultado
    cargarResultado: ({ params, body }) => exigirObjeto(body) || aRespuesta(service.cargarResultado(params.id, body), 200),
    // DELETE /api/grandes-premios/:id/resultado
    quitarResultado: ({ params }) => aRespuesta(service.quitarResultado(params.id), 200),
  };
}

module.exports = { crearGrandesPremiosController };
