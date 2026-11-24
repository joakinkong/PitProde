// estaticos.js — sirve el frontend (los archivos de la raíz del proyecto) desde el mismo servidor.
// Solo se sirven los archivos de la lista: nunca se arma una ruta de disco con lo que manda el cliente.
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..', '..');
const ARCHIVOS = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/api.js': ['api.js', 'text/javascript; charset=utf-8'],
  '/scoring.js': ['scoring.js', 'text/javascript; charset=utf-8'],
  '/storage.js': ['storage.js', 'text/javascript; charset=utf-8'],
};

// Si "ruta" es un archivo del frontend, lo escribe en la respuesta y devuelve true; si no, devuelve false.
function servirEstatico(ruta, res) {
  const entrada = Object.hasOwn(ARCHIVOS, ruta) ? ARCHIVOS[ruta] : null;
  if (!entrada) return false;
  try {
    const contenido = fs.readFileSync(path.join(RAIZ, entrada[0]));
    res.writeHead(200, { 'Content-Type': entrada[1], 'Content-Length': contenido.length, 'Cache-Control': 'no-cache' });
    res.end(contenido);
  } catch (error) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Archivo no encontrado.');
  }
  return true;
}

module.exports = { servirEstatico };
