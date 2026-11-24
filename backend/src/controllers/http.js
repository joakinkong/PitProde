// http.js — piezas comunes de los controllers: de motivo de fallo a código HTTP y respuestas de error.
'use strict';

// Código HTTP para cada motivo de fallo de un service.
const CODIGO_POR_MOTIVO = { invalido: 422, duplicado: 409, en_uso: 409, no_encontrado: 404 };

const respuestaError = (estado, errores) => ({ estado, cuerpo: { errores } });

// Convierte { ok, valor } o { ok: false, motivo, errores } de un service en { estado, cuerpo }.
function aRespuesta(resultado, estadoOk) {
  if (resultado.ok) return { estado: estadoOk, cuerpo: resultado.valor };
  return respuestaError(CODIGO_POR_MOTIVO[resultado.motivo] || 500, resultado.errores);
}

// Devuelve true si el cuerpo es un objeto común (no null, no arreglo).
const esObjeto = (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor);

// Si el cuerpo no es un objeto devuelve la respuesta 400; si está bien, devuelve null.
const exigirObjeto = (body) => (esObjeto(body) ? null : respuestaError(400, ['El cuerpo tiene que ser un objeto JSON.']));

module.exports = { CODIGO_POR_MOTIVO, respuestaError, aRespuesta, esObjeto, exigirObjeto };
