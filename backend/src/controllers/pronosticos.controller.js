// pronosticos.controller.js — traduce HTTP a llamadas al service y el resultado a código de estado.
// No tiene reglas del prode ni SQL. Cada handler recibe { params, query, body } y devuelve { estado, cuerpo }.
'use strict';

const ESTADOS_VALIDOS = ['proximo', 'cerrado', 'finalizado'];

// Código HTTP para cada motivo de fallo del service.
const CODIGO_POR_MOTIVO = { invalido: 422, duplicado: 409, no_encontrado: 404 };

const respuestaError = (estado, errores) => ({ estado, cuerpo: { errores } });

// Convierte lo que devuelve el service en { estado, cuerpo }; "estadoOk" es el código si salió bien.
function aRespuesta(resultado, estadoOk) {
  if (resultado.ok) return { estado: estadoOk, cuerpo: resultado.pronostico || { pronosticos: resultado.pronosticos } };
  return respuestaError(CODIGO_POR_MOTIVO[resultado.motivo] || 500, resultado.errores);
}

// Devuelve true si el cuerpo es un objeto común (no null, no arreglo).
const esObjeto = (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor);

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
    crear: ({ body }) => {
      if (!esObjeto(body)) return respuestaError(400, ['El cuerpo tiene que ser un objeto JSON.']);
      return aRespuesta(service.crear(body), 201);
    },
    // PUT /api/pronosticos/:id
    editar: ({ params, body }) => {
      if (!esObjeto(body)) return respuestaError(400, ['El cuerpo tiene que ser un objeto JSON.']);
      return aRespuesta(service.editar(params.id, body), 200);
    },
  };
}

module.exports = { crearPronosticosController };
