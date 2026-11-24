// acceso.controller.js — traduce HTTP a llamadas al service de acceso. Sin reglas ni SQL.
'use strict';

const { aRespuesta, exigirObjeto } = require('./http.js');

// Crea los handlers de /api/acceso. Reciben además "token" (de la cabecera Authorization) e "ip".
function crearAccesoController(service) {
  return {
    // GET /api/acceso → { requerido, autenticado }
    estado: async ({ token }) => aRespuesta(service.estado(token), 200),
    // POST /api/acceso   cuerpo: { "clave": "..." } → { token, vence }
    ingresar: async ({ body, ip }) => exigirObjeto(body) || aRespuesta(service.ingresar(body, ip), 200),
  };
}

module.exports = { crearAccesoController };
