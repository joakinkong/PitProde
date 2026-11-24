// pronosticos.controller.js — traduce HTTP a llamadas al service y el resultado a código de estado.
// No tiene reglas del prode ni SQL. Cada handler recibe { params, query, body } y devuelve { estado, cuerpo }.
'use strict';

const { CODIGO_POR_MOTIVO, respuestaError, exigirObjeto } = require('./http.js');

const ESTADOS_VALIDOS = ['proximo', 'cerrado', 'finalizado'];

// Convierte lo que devuelve el service en { estado, cuerpo }; "estadoOk" es el código si salió bien.
function aRespuesta(resultado, estadoOk) {
  if (resultado.ok) return { estado: estadoOk, cuerpo: resultado.pronostico || { pronosticos: resultado.pronosticos } };
  return respuestaError(CODIGO_POR_MOTIVO[resultado.motivo] || 500, resultado.errores);
}

// Crea los handlers de /api/pronosticos sobre el service dado.
function crearPronosticosController(service) {
  return {
    // GET /api/pronosticos?gpId=&jugadorId=&estado=
    listar: async ({ query }) => {
      if (query.estado && !ESTADOS_VALIDOS.includes(query.estado)) {
        return respuestaError(400, [`El estado tiene que ser uno de: ${ESTADOS_VALIDOS.join(', ')}.`]);
      }
      return aRespuesta(await service.listar(query), 200);
    },
    // GET /api/pronosticos/:id
    obtener: async ({ params }) => aRespuesta(await service.obtener(params.id), 200),
    // POST /api/pronosticos
    crear: async ({ body }) => exigirObjeto(body) || aRespuesta(await service.crear(body), 201),
    // PUT /api/pronosticos/:id
    editar: async ({ params, body }) => exigirObjeto(body) || aRespuesta(await service.editar(params.id, body), 200),
    // DELETE /api/pronosticos/:id
    eliminar: async ({ params }) => aRespuesta(await service.eliminar(params.id), 200),
    // PATCH /api/pronosticos/:id/favorito   cuerpo: { "favorito": true }
    favorito: async ({ params, body }) => exigirObjeto(body) || aRespuesta(await service.marcarFavorito(params.id, body.favorito), 200),
  };
}

module.exports = { crearPronosticosController };
