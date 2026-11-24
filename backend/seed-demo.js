// seed-demo.js — crea dos jugadores de prueba en la base: `node backend/seed-demo.js`.
// Todavía no existe el endpoint de jugadores, así que para probar la API a mano hacen falta estos datos.
'use strict';

const path = require('node:path');
const fs = require('node:fs');
const { abrirBase } = require('./src/db.js');

const rutaBase = process.env.PITPRODE_DB || path.join(__dirname, 'datos', 'pitprode.sqlite');
fs.mkdirSync(path.dirname(rutaBase), { recursive: true });
const db = abrirBase(rutaBase);
const insertar = db.prepare('INSERT OR IGNORE INTO jugadores (id, nombre, apodo, color, fecha_alta) VALUES (?, ?, ?, ?, ?)');
insertar.run('ana', 'Ana', '', '#e10600', new Date().toISOString());
insertar.run('beto', 'Beto', '', '#0066ff', new Date().toISOString());
console.log(`Jugadores de prueba listos en ${rutaBase}`);
