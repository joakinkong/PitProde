// app.js — arma las capas (repository -> service -> controller) y el servidor HTTP con node:http.
// El enrutador es mínimo a propósito: ver la decisión sobre Express en entregas/clase-04-backend.
'use strict';

const http = require('node:http');
const { randomUUID } = require('node:crypto');
const { crearJugadoresRepository } = require('./repositories/jugadores.repository.js');
const { crearPilotosRepository } = require('./repositories/pilotos.repository.js');
const { crearGrandesPremiosRepository } = require('./repositories/grandesPremios.repository.js');
const { crearPronosticosRepository } = require('./repositories/pronosticos.repository.js');
const { crearDatosRepository } = require('./repositories/datos.repository.js');
const { crearJugadoresService } = require('./services/jugadores.service.js');
const { crearPilotosService } = require('./services/pilotos.service.js');
const { crearGrandesPremiosService } = require('./services/grandesPremios.service.js');
const { crearPronosticosService } = require('./services/pronosticos.service.js');
const { crearDatosService } = require('./services/datos.service.js');
const { crearJugadoresController } = require('./controllers/jugadores.controller.js');
const { crearPilotosController } = require('./controllers/pilotos.controller.js');
const { crearGrandesPremiosController } = require('./controllers/grandesPremios.controller.js');
const { crearPronosticosController } = require('./controllers/pronosticos.controller.js');
const { crearDatosController } = require('./controllers/datos.controller.js');
const { crearRutas } = require('./routes.js');
const { servirEstatico } = require('./estaticos.js');

const LIMITE_CUERPO_BYTES = 10 * 1024; // un pronóstico pesa menos de 1 KB
const LIMITE_DESCARTE_BYTES = 1024 * 1024; // lo máximo que se sigue descartando después de pasarse del límite
const METODOS_CON_CUERPO = ['POST', 'PUT', 'PATCH'];

// Arma todas las capas sobre la base "db" y devuelve los controllers listos.
function armarControllers(db, reloj) {
  const jugadores = crearJugadoresRepository(db);
  const pilotos = crearPilotosRepository(db);
  const grandesPremios = crearGrandesPremiosRepository(db);
  const pronosticos = crearPronosticosRepository(db);
  const generarId = randomUUID;

  const pronosticosService = crearPronosticosService({ pronosticos, jugadores, pilotos, grandesPremios, reloj, generarId });
  return {
    jugadores: crearJugadoresController(crearJugadoresService({ jugadores, reloj, generarId })),
    pilotos: crearPilotosController(crearPilotosService({ pilotos, generarId })),
    grandesPremios: crearGrandesPremiosController(crearGrandesPremiosService({ grandesPremios, pilotos, reloj, generarId })),
    pronosticos: crearPronosticosController(pronosticosService),
    datos: crearDatosController(crearDatosService({
      jugadores, pilotos, grandesPremios, pronosticosService, datos: crearDatosRepository(db),
    })),
  };
}

// Lee el cuerpo de la petición con tope de tamaño. Devuelve { texto } o { demasiadoGrande: true }.
function leerCuerpo(req, limiteBytes) {
  return new Promise((resolve, reject) => {
    const partes = [];
    let bytes = 0;
    req.on('data', (parte) => {
      bytes += parte.length;
      if (bytes > limiteBytes) {
        // Se responde 413 enseguida, pero se sigue descartando lo que llega: cortar mientras el cliente
        // todavía escribe le rompe la conexión antes de que lea la respuesta. Pasado el tope de descarte, se corta igual.
        partes.length = 0;
        resolve({ demasiadoGrande: true });
        if (bytes > limiteBytes + LIMITE_DESCARTE_BYTES) req.destroy();
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
  const rutas = crearRutas(armarControllers(db, reloj));

  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (req.method === 'GET' && servirEstatico(url.pathname, res)) return undefined;

      const deLaRuta = rutas
        .map(([metodo, patron, handler, opciones]) => ({ metodo, handler, opciones, coincide: patron.exec(url.pathname) }))
        .filter((c) => c.coincide);
      if (deLaRuta.length === 0) return responder(res, 404, { errores: ['Ruta inexistente.'] });
      const ruta = deLaRuta.find((c) => c.metodo === req.method);
      if (!ruta) return responder(res, 405, { errores: ['Método no permitido en esta ruta.'] });

      let body;
      if (METODOS_CON_CUERPO.includes(req.method)) {
        const limite = (ruta.opciones && ruta.opciones.limiteBytes) || LIMITE_CUERPO_BYTES;
        const cuerpo = await leerCuerpo(req, limite);
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
