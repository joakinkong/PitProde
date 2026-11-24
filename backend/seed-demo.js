// seed-demo.js — crea dos jugadores de prueba en la base SQLite: `node backend/seed-demo.js`.
// Sirve para probar la API a mano sin pasar por la interfaz.
'use strict';

const path = require('node:path');
const fs = require('node:fs');
const { abrirBase } = require('./src/db.js');

const rutaBase = process.env.PITPRODE_DB || path.join(__dirname, 'datos', 'pitprode.sqlite');

(async () => {
  fs.mkdirSync(path.dirname(rutaBase), { recursive: true });
  const db = await abrirBase(rutaBase);
  const sql = 'INSERT INTO jugadores (id, nombre, apodo, color, fecha_alta) VALUES (?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING';
  await db.ejecutar(sql, ['ana', 'Ana', '', '#e10600', new Date().toISOString()]);
  await db.ejecutar(sql, ['beto', 'Beto', '', '#0066ff', new Date().toISOString()]);
  console.log(`Jugadores de prueba listos en ${rutaBase}`);
})();
