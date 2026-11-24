// server.js — punto de entrada del backend: `node backend/server.js`.
// Se configura con variables de entorno (ver backend/.env.example y la sección de despliegue del README).
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { abrirBase, abrirBasePostgres } = require('./src/db.js');
const { crearApp } = require('./src/app.js');
const { leerConfig } = require('./src/config.js');

// Abre Postgres si hay DATABASE_URL (publicado) o SQLite en un archivo (local).
async function abrirSegunConfig(config) {
  if (config.databaseUrl) {
    const { Pool } = require('pg'); // solo se carga si se usa Postgres
    // Neon exige una conexión segura: la cadena de conexión trae sslmode=require.
    return { db: await abrirBasePostgres(new Pool({ connectionString: config.databaseUrl, max: 5 })), descripcion: 'Postgres' };
  }
  fs.mkdirSync(path.dirname(config.rutaSqlite), { recursive: true });
  return { db: await abrirBase(config.rutaSqlite), descripcion: `SQLite (${config.rutaSqlite})` };
}

async function iniciar() {
  const { config, errores } = leerConfig();
  if (errores.length) {
    errores.forEach((e) => console.error(`Configuración inválida: ${e}`));
    process.exit(1);
  }
  const { db, descripcion } = await abrirSegunConfig(config);
  const servidor = crearApp(db, { origenesPermitidos: config.origenesPermitidos, clave: config.clave });
  servidor.listen(config.puerto, config.host, () => {
    console.log(`PitProde backend en http://${config.host}:${config.puerto} · base: ${descripcion}`);
    if (!config.clave) console.log('Sin ORGANIZER_PASSWORD: cualquiera que llegue a este puerto puede escribir (solo seguro en tu PC).');
  });
}

iniciar().catch((error) => {
  console.error('No se pudo iniciar el servidor:', error.message);
  process.exit(1);
});
