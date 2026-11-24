// config.js — lee la configuración del servidor desde las variables de entorno y la valida al arrancar.
// Los secretos (DATABASE_URL, ORGANIZER_PASSWORD) llegan solo por variables de entorno: nunca van en el código.
'use strict';

const path = require('node:path');

const HOSTS_LOCALES = ['127.0.0.1', 'localhost', '::1'];

// Devuelve { config, errores } a partir de "env" (por defecto, process.env).
function leerConfig(env = process.env) {
  const host = env.HOST || '127.0.0.1';
  const config = {
    host,
    puerto: env.PORT === undefined || env.PORT === '' ? 3000 : Number(env.PORT),
    databaseUrl: env.DATABASE_URL || '',
    rutaSqlite: env.PITPRODE_DB || path.join(__dirname, '..', 'datos', 'pitprode.sqlite'),
    // Direcciones del frontend que pueden pedirle cosas a la API (CORS), separadas por comas.
    origenesPermitidos: (env.FRONTEND_URL || '').split(',').map((o) => o.trim().replace(/\/+$/, '')).filter(Boolean),
    clave: env.ORGANIZER_PASSWORD || '',
    esLocal: HOSTS_LOCALES.includes(host),
  };
  const errores = [];
  // Abierto a internet sin contraseña, cualquiera podría borrar los datos: se corta el arranque.
  if (!config.esLocal && !config.clave) {
    errores.push('Falta ORGANIZER_PASSWORD: el servidor escucha fuera de tu PC y las escrituras tienen que estar protegidas.');
  }
  if (config.clave && config.clave.length < 8) errores.push('ORGANIZER_PASSWORD tiene que tener al menos 8 caracteres.');
  if (!Number.isInteger(config.puerto) || config.puerto < 1 || config.puerto > 65535) errores.push('PORT no es un puerto válido.');
  // No se muestra el valor: la cadena de conexión es un secreto.
  if (config.databaseUrl && !/^postgres(ql)?:\/\//.test(config.databaseUrl)) {
    errores.push('DATABASE_URL tiene que ser una cadena de conexión que empiece con postgresql://');
  }
  return { config, errores };
}

module.exports = { leerConfig };
