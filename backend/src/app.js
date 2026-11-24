// app.js — arma las capas (repository -> service -> controller) y el servidor HTTP con node:http.
// El enrutador es mínimo a propósito: ver la decisión sobre Express en entregas/clase-04-backend.
'use strict';

const http = require('node:http');
const { randomUUID } = require('node:crypto');
const { crearReferenciasRepository } = require('./repositories/referencias.repository.js');
const { crearPronosticosRepository } = require('./repositories/pronosticos.repository.js');
const { crearPronosticosService } = require('./services/pronosticos.service.js');
const { crearPronosticosController } = require('./controllers/pronosticos.controller.js');

const LIMITE_CUERPO_BYTES = 10 * 1024; // un pronóstico pesa menos de 1 KB
const LIMITE_DESCARTE_BYTES = 1024 * 1024; // lo máximo que se sigue descartando después de pasarse del límite

// Tabla de rutas: [método, patrón, nombre del handler del controller].
function crearRutas(controller) {
  return [
    ['GET', /^\/api\/pronosticos$/, controller.listar],
    ['POST', /^\/api\/pronosticos$/, controller.crear],
    ['GET', /^\/api\/pronosticos\/([^/]+)$/, controller.obtener],
    ['PUT', /^\/api\/pronosticos\/([^/]+)$/, controller.editar],
  ];
}

// Lee el cuerpo de la petición con tope de tamaño. Devuelve { texto } o { demasiadoGrande: true }.
function leerCuerpo(req) {
  return new Promise((resolve, reject) => {
    const partes = [];
    let bytes = 0;
    req.on('data', (parte) => {
      bytes += parte.length;
      if (bytes > LIMITE_CUERPO_BYTES) {
        // Se responde 413 enseguida, pero se sigue descartando lo que llega: cortar mientras el cliente
        // todavía escribe le rompe la conexión antes de que lea la respuesta. Pasado el tope de descarte, se corta igual.
        partes.length = 0;
        resolve({ demasiadoGrande: true });
        if (bytes > LIMITE_DESCARTE_BYTES) req.destroy();
        return;
      }
      partes.push(parte);
    });
    req.on('end', () => resolve({ texto: Buffer.concat(partes).toString('utf8') }));
    req.on('error', reject);
  });
}

// Escribe una respuesta JSON.
function responder(res, estado, cuerpo) {
  const texto = JSON.stringify(cuerpo);
  res.writeHead(estado, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(texto) });
  res.end(texto);
}

// Crea el servidor HTTP (sin ponerlo a escuchar) sobre la base "db". "reloj" permite fijar la hora en pruebas.
function crearApp(db, { reloj = () => new Date() } = {}) {
  const service = crearPronosticosService({
    pronosticos: crearPronosticosRepository(db),
    referencias: crearReferenciasRepository(db),
    reloj,
    generarId: randomUUID,
  });
  const rutas = crearRutas(crearPronosticosController(service));

  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const candidatas = rutas.map(([metodo, patron, handler]) => ({ metodo, handler, coincide: patron.exec(url.pathname) }));
      const deLaRuta = candidatas.filter((c) => c.coincide);
      if (deLaRuta.length === 0) return responder(res, 404, { errores: ['Ruta inexistente.'] });
      const ruta = deLaRuta.find((c) => c.metodo === req.method);
      if (!ruta) return responder(res, 405, { errores: ['Método no permitido en esta ruta.'] });

      let body;
      if (req.method === 'POST' || req.method === 'PUT') {
        const cuerpo = await leerCuerpo(req);
        if (cuerpo.demasiadoGrande) return responder(res, 413, { errores: ['El cuerpo es demasiado grande.'] });
        try { body = JSON.parse(cuerpo.texto); } catch (error) {
          return responder(res, 400, { errores: ['El cuerpo no es un JSON válido.'] });
        }
      }
      const params = { id: ruta.coincide[1] ? decodeURIComponent(ruta.coincide[1]) : undefined };
      const query = Object.fromEntries(url.searchParams);
      const { estado, cuerpo } = ruta.handler({ params, query, body });
      return responder(res, estado, cuerpo);
    } catch (error) {
      console.error(error);
      return responder(res, 500, { errores: ['Error interno del servidor.'] });
    }
  });
}

module.exports = { crearApp };
