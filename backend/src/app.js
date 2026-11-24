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
const { crearAccesoService } = require('./services/acceso.service.js');
const { crearJugadoresController } = require('./controllers/jugadores.controller.js');
const { crearPilotosController } = require('./controllers/pilotos.controller.js');
const { crearGrandesPremiosController } = require('./controllers/grandesPremios.controller.js');
const { crearPronosticosController } = require('./controllers/pronosticos.controller.js');
const { crearDatosController } = require('./controllers/datos.controller.js');
const { crearAccesoController } = require('./controllers/acceso.controller.js');
const { crearRutas } = require('./routes.js');
const { servirEstatico } = require('./estaticos.js');

const LIMITE_CUERPO_BYTES = 10 * 1024; // un pronóstico pesa menos de 1 KB
const LIMITE_DESCARTE_BYTES = 1024 * 1024; // lo máximo que se sigue descartando después de pasarse del límite
const METODOS_CON_CUERPO = ['POST', 'PUT', 'PATCH'];

// Arma todas las capas sobre la base "db" y devuelve los controllers listos.
function armarControllers(db, reloj, acceso) {
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
    acceso: crearAccesoController(acceso),
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

// Dirección del cliente, para limitar los intentos de contraseña. Detrás del proxy de Render, el proxy agrega la dirección
// real al FINAL de x-forwarded-for: lo que el cliente escriba antes no cuenta. Sin proxy, la cabecera se ignora porque
// cualquiera puede falsificarla.
function direccionCliente(req, confiarProxy) {
  if (confiarProxy) {
    const partes = String(req.headers['x-forwarded-for'] || '').split(',').map((p) => p.trim()).filter(Boolean);
    if (partes.length) return partes[partes.length - 1];
  }
  return req.socket.remoteAddress || 'desconocida';
}

// Cabeceras CORS para el origen de la petición, o {} si ese origen no está permitido.
// Un navegador solo deja que una página lea la respuesta si la API nombra su dirección.
function cabecerasCors(origen, origenesPermitidos) {
  if (!origen || !origenesPermitidos.includes(origen)) return {};
  return {
    'Access-Control-Allow-Origin': origen,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}

// Escribe una respuesta JSON (con las cabeceras extra, por ejemplo las de CORS).

function responder(res, estado, cuerpo, extra = {}) {
  const texto = JSON.stringify(cuerpo);
  res.writeHead(estado, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(texto), ...extra });
  res.end(texto);
}

// Crea el servidor HTTP (sin ponerlo a escuchar) sobre la base "db". "reloj" permite fijar la hora en pruebas.
function crearApp(db, { reloj = () => new Date(), origenesPermitidos = [], clave = '', confiarProxy = false } = {}) {
  const acceso = crearAccesoService({ clave, reloj });
  const rutas = crearRutas(armarControllers(db, reloj, acceso));

  const servidor = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (req.method === 'GET' && servirEstatico(url.pathname, res)) return undefined;
      const cors = cabecerasCors(req.headers.origin, origenesPermitidos);
      // Pregunta previa del navegador ("¿me dejás hacer esto?"): se contesta sin tocar nada.
      if (req.method === 'OPTIONS') {
        res.writeHead(Object.keys(cors).length ? 204 : 403, cors);
        return res.end();
      }

      const deLaRuta = rutas
        .map(([metodo, patron, handler, opciones]) => ({ metodo, handler, opciones, coincide: patron.exec(url.pathname) }))
        .filter((c) => c.coincide);
      if (deLaRuta.length === 0) return responder(res, 404, { errores: ['Ruta inexistente.'] }, cors);
      const ruta = deLaRuta.find((c) => c.metodo === req.method);
      if (!ruta) return responder(res, 405, { errores: ['Método no permitido en esta ruta.'] }, cors);

      // Con contraseña configurada, toda escritura (salvo entrar) necesita el token del organizador.
      const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      const escribe = req.method !== 'GET';
      if (acceso.habilitado && escribe && !(ruta.opciones && ruta.opciones.publica) && !acceso.tokenValido(token)) {
        return responder(res, 401, { errores: ['Tenés que ingresar como organizador para hacer cambios.'] }, cors);
      }

      let id;
      try {
        id = ruta.coincide[1] ? decodeURIComponent(ruta.coincide[1]) : undefined;
      } catch (error) {
        return responder(res, 400, { errores: ['La dirección tiene un identificador mal escrito.'] }, cors);
      }

      let body;
      if (METODOS_CON_CUERPO.includes(req.method)) {
        const limite = (ruta.opciones && ruta.opciones.limiteBytes) || LIMITE_CUERPO_BYTES;
        const cuerpo = await leerCuerpo(req, limite);
        if (cuerpo.demasiadoGrande) return responder(res, 413, { errores: ['El cuerpo es demasiado grande.'] }, cors);
        try { body = JSON.parse(cuerpo.texto); } catch (error) {
          return responder(res, 400, { errores: ['El cuerpo no es un JSON válido.'] }, cors);
        }
      }
      const params = { id };
      const query = Object.fromEntries(url.searchParams);
      const ip = direccionCliente(req, confiarProxy);
      const { estado, cuerpo } = await ruta.handler({ params, query, body, token, ip });
      return responder(res, estado, cuerpo, cors);
    } catch (error) {
      console.error(error);
      return responder(res, 500, { errores: ['Error interno del servidor.'] }, cabecerasCors(req.headers.origin, origenesPermitidos));
    }
  });
  // Un cliente que manda los encabezados y después gotea el cuerpo no puede dejar conexiones abiertas para siempre.
  servidor.headersTimeout = 15000;
  servidor.requestTimeout = 30000;
  return servidor;
}

module.exports = { crearApp };
