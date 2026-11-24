// build-frontend.test.js — el build arma el frontend con la dirección del backend y rechaza direcciones malas.
'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { construir, normalizarUrlApi } = require('./build-frontend.js');

describe('build del frontend', () => {
  test('copia los archivos y genera config.js con la dirección, sin barra final', () => {
    const salida = fs.mkdtempSync(path.join(os.tmpdir(), 'pitprode-dist-'));
    const escritos = construir(salida, 'https://pitprode-api.onrender.com/');
    assert.deepEqual(escritos.sort(), ['api.js', 'app.js', 'config.js', 'index.html', 'scoring.js', 'storage.js', 'styles.css']);
    const config = fs.readFileSync(path.join(salida, 'config.js'), 'utf8');
    assert.match(config, /window\.PITPRODE_API_URL = "https:\/\/pitprode-api\.onrender\.com";/);
    assert.equal(fs.existsSync(path.join(salida, 'backend')), false); // el backend no se publica en Netlify
    fs.rmSync(salida, { recursive: true, force: true });
  });

  test('sin dirección, con dirección inválida o sin https, falla con un mensaje claro', () => {
    assert.throws(() => normalizarUrlApi(''), /Falta PITPRODE_API_URL/);
    assert.throws(() => normalizarUrlApi('no es una url'), /no es una dirección válida/);
    assert.throws(() => normalizarUrlApi('http://pitprode-api.onrender.com'), /https/);
    assert.equal(normalizarUrlApi('http://localhost:3000'), 'http://localhost:3000');
  });

  test('una dirección con comillas o código no puede escaparse del config.js', () => {
    const salida = fs.mkdtempSync(path.join(os.tmpdir(), 'pitprode-dist-'));
    assert.throws(() => construir(salida, 'https://x.com"; alert(1); "'), /no es una dirección válida|https/);
    const origen = normalizarUrlApi('https://x.com/ruta?a="b"');
    assert.equal(origen, 'https://x.com'); // solo se conserva el origen
    fs.rmSync(salida, { recursive: true, force: true });
  });
});
