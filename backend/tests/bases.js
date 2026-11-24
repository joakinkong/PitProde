// bases.js — las bases contra las que se corren las pruebas: SQLite en memoria y Postgres emulado (pg-mem).
// El mismo juego de pruebas corre en las dos, para comprobar que el SQL de los repositories sirve en ambas.
'use strict';

const { abrirBase, abrirBasePostgres } = require('../src/db.js');

const BASES = [
  { nombre: 'SQLite', abrir: () => abrirBase(':memory:') },
  {
    nombre: 'Postgres (pg-mem)',
    abrir: async () => {
      const { newDb } = require('pg-mem');
      const { Pool } = newDb().adapters.createPg();
      return abrirBasePostgres(new Pool());
    },
  },
];

module.exports = { BASES };
