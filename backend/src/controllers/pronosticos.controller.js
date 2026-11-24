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
    listar: ({ query }) => {
      if (query.estado && !ESTADOS_VALIDOS.includes(query.estado)) {
        return respuestaError(400, [`El estado tiene que ser uno de: ${ESTADOS_VALIDOS.join(', ')}.`]);
      }
      return aRespuesta(service.listar(query), 200);
    },
    // GET /api/pronosticos/:id
    obtener: ({ params }) => aRespuesta(service.obtener(params.id), 200),
    // POST /api/pronosticos
    crear: ({ body }) => exigirObjeto(body) || aRespuesta(service.crear(body), 201),
    // PUT /api/pronosticos/:id
    editar: ({ params, body }) => exigirObjeto(body) || aRespuesta(service.editar(params.id, body), 200),
    // DELETE /api/pronosticos/:id
    eliminar: ({ params }) => aRespuesta(service.eliminar(params.id), 200),
    // PATCH /api/pronosticos/:id/favorito   cuerpo: { "favorito": true }
    favorito: ({ params, body }) => exigirObjeto(body) || aRespuesta(service.marcarFavorito(params.id, body.favorito), 200),
  };
}

module.exports = { crearPronosticosController };
