// entorno.test.js — configuración por variables de entorno y CORS (quién puede pedirle cosas a la API).
'use strict';

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { abrirBase } = require('../src/db.js');
const { crearApp } = require('../src/app.js');
const { leerConfig } = require('../src/config.js');

describe('configuración', () => {
  test('sin variables: arranca en local, en el puerto 3000, sin contraseña ni CORS', () => {
    const { config, errores } = leerConfig({});
    assert.deepEqual(errores, []);
    assert.equal(config.host, '127.0.0.1');
    assert.equal(config.puerto, 3000);
    assert.equal(config.esLocal, true);
    assert.deepEqual(config.origenesPermitidos, []);
  });

  test('si escucha fuera de la PC y no hay contraseña, no arranca', () => {
    const { errores } = leerConfig({ HOST: '0.0.0.0' });
    assert.equal(errores.length, 1);
    assert.match(errores[0], /ORGANIZER_PASSWORD/);
  });

  test('con contraseña y host público es válida; con contraseña corta, no', () => {
    assert.deepEqual(leerConfig({ HOST: '0.0.0.0', ORGANIZER_PASSWORD: 'una-clave-larga' }).errores, []);
    assert.match(leerConfig({ ORGANIZER_PASSWORD: 'corta' }).errores[0], /8 caracteres/);
  });

  test('FRONTEND_URL admite varias direcciones y se limpian espacios y barras finales', () => {
    const { config } = leerConfig({ FRONTEND_URL: ' https://a.netlify.app/ , http://localhost:5173 ' });
    assert.deepEqual(config.origenesPermitidos, ['https://a.netlify.app', 'http://localhost:5173']);
  });

  test('un PORT inválido se rechaza y DATABASE_URL se toma tal cual', () => {
    assert.match(leerConfig({ PORT: '99999' }).errores[0], /PORT/);
    assert.equal(leerConfig({ DATABASE_URL: 'postgres://x' }).config.databaseUrl, 'postgres://x');
  });
});

describe('CORS', () => {
  const PERMITIDO = 'https://pitprode.netlify.app';
  let servidor;
  let base;

  before(async () => {
    servidor = crearApp(await abrirBase(':memory:'), { origenesPermitidos: [PERMITIDO] });
    await new Promise((resolver) => servidor.listen(0, '127.0.0.1', resolver));
    base = `http://127.0.0.1:${servidor.address().port}`;
  });
  after(() => new Promise((resolver) => servidor.close(resolver)));

  test('al frontend permitido le contesta con su dirección y permite Authorization', async () => {
    const r = await fetch(`${base}/api/pilotos`, { headers: { Origin: PERMITIDO } });
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('access-control-allow-origin'), PERMITIDO);
    assert.equal(r.headers.get('vary'), 'Origin');
  });

  test('a otra dirección no le manda las cabeceras CORS: el navegador bloquea la respuesta', async () => {
    const r = await fetch(`${base}/api/pilotos`, { headers: { Origin: 'https://sitio-malicioso.example' } });
    assert.equal(r.headers.get('access-control-allow-origin'), null);
  });

  test('la pregunta previa (OPTIONS) del frontend permitido da 204 con métodos y cabeceras', async () => {
    const r = await fetch(`${base}/api/jugadores`, { method: 'OPTIONS', headers: { Origin: PERMITIDO, 'Access-Control-Request-Method': 'POST' } });
    assert.equal(r.status, 204);
    assert.match(r.headers.get('access-control-allow-methods'), /POST/);
    assert.match(r.headers.get('access-control-allow-headers'), /Authorization/);
  });

  test('la pregunta previa de otro origen se rechaza con 403', async () => {
    const r = await fetch(`${base}/api/jugadores`, { method: 'OPTIONS', headers: { Origin: 'https://otro.example' } });
    assert.equal(r.status, 403);
  });

  test('los errores también llevan las cabeceras CORS del origen permitido', async () => {
    const r = await fetch(`${base}/api/no-existe`, { headers: { Origin: PERMITIDO } });
    assert.equal(r.status, 404);
    assert.equal(r.headers.get('access-control-allow-origin'), PERMITIDO);
  });
});
