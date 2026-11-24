// build-frontend.js — arma la carpeta que se publica en Netlify: `node scripts/build-frontend.js [carpeta]`.
// Copia los archivos del frontend y genera config.js con la dirección del backend (variable PITPRODE_API_URL),
// así la dirección no queda escrita en el código. Sin librerías: solo copia archivos.
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const ARCHIVOS = ['index.html', 'styles.css', 'app.js', 'api.js', 'scoring.js', 'storage.js'];

// Valida la dirección del backend y la devuelve sin barras al final. Lanza un Error con el motivo si no sirve.
function normalizarUrlApi(valor) {
  if (!valor || !valor.trim()) throw new Error('Falta PITPRODE_API_URL: la dirección del backend publicado (por ejemplo https://pitprode-api.onrender.com).');
  let url;
  try { url = new URL(valor.trim()); } catch (error) { throw new Error(`PITPRODE_API_URL no es una dirección válida: ${valor}`); }
  const local = ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) throw new Error('PITPRODE_API_URL tiene que empezar con https://');
  return url.origin;
}

// Arma "salida" con el frontend y su config.js. Devuelve la lista de archivos escritos.
function construir(salida, urlApi) {
  const direccion = normalizarUrlApi(urlApi);
  fs.rmSync(salida, { recursive: true, force: true });
  fs.mkdirSync(salida, { recursive: true });
  ARCHIVOS.forEach((archivo) => fs.copyFileSync(path.join(RAIZ, archivo), path.join(salida, archivo)));
  const config = `// Generado por scripts/build-frontend.js: no se edita a mano.\nwindow.PITPRODE_API_URL = ${JSON.stringify(direccion)};\n`;
  fs.writeFileSync(path.join(salida, 'config.js'), config);
  return [...ARCHIVOS, 'config.js'];
}

if (require.main === module) {
  try {
    const salida = path.resolve(process.argv[2] || path.join(RAIZ, 'dist'));
    const escritos = construir(salida, process.env.PITPRODE_API_URL);
    console.log(`Frontend listo en ${salida} (${escritos.length} archivos). API: ${process.env.PITPRODE_API_URL}`);
  } catch (error) {
    console.error(`No se pudo armar el frontend: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { construir, normalizarUrlApi };
