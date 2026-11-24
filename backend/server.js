// server.js — punto de entrada del backend: `node backend/server.js`.
// Variables opcionales: PORT (3000) y PITPRODE_DB (ruta del archivo SQLite).
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { abrirBase } = require('./src/db.js');
const { crearApp } = require('./src/app.js');

const puerto = Number(process.env.PORT) || 3000;
const rutaBase = process.env.PITPRODE_DB || path.join(__dirname, 'datos', 'pitprode.sqlite');
fs.mkdirSync(path.dirname(rutaBase), { recursive: true });

const servidor = crearApp(abrirBase(rutaBase));
// Escucha solo en la máquina local: todavía no hay autenticación.
servidor.listen(puerto, '127.0.0.1', () => {
  console.log(`PitProde backend en http://127.0.0.1:${puerto} (base: ${rutaBase})`);
});
