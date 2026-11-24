// acceso.test.js — contraseña del organizador: quién puede escribir, tokens que vencen y bloqueo por intentos.
'use strict';

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { abrirBase } = require('../src/db.js');
const { crearApp } = require('../src/app.js');

const CLAVE = 'clave-segura-123';
const NUEVO_JUGADOR = { nombre: 'Ana' };

// Levanta un servidor con (o sin) contraseña y un reloj que se puede mover.
async function levantar(clave) {
  const reloj = { ahora: new Date('2026-03-01T10:00:00Z') };
  const servidor = crearApp(await abrirBase(':memory:'), { reloj: () => reloj.ahora, clave });
  await new Promise((resolver) => servidor.listen(0, '127.0.0.1', resolver));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const pedir = async (metodo, ruta, cuerpo, token, ip) => {
    const cabeceras = {};
    if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';
    if (token) cabeceras.Authorization = `Bearer ${token}`;
    if (ip) cabeceras['X-Forwarded-For'] = ip;
    const r = await fetch(base + ruta, { method: metodo, headers: cabeceras, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
    return { estado: r.status, cuerpo: await r.json() };
  };
  return { reloj, pedir, cerrar: () => new Promise((resolver) => servidor.close(resolver)) };
}

describe('con contraseña', () => {
  let t;
  before(async () => { t = await levantar(CLAVE); });
  after(() => t.cerrar());

  test('leer es libre: GET de datos, tabla y exportar no piden nada', async () => {
    for (const ruta of ['/api/datos', '/api/tabla', '/api/exportar', '/api/pilotos', '/api/pronosticos']) {
      assert.equal((await t.pedir('GET', ruta)).estado, 200, ruta);
    }
  });

  test('escribir sin token da 401, en cualquier método', async () => {
    assert.equal((await t.pedir('POST', '/api/jugadores', NUEVO_JUGADOR)).estado, 401);
    assert.equal((await t.pedir('PUT', '/api/jugadores/x', NUEVO_JUGADOR)).estado, 401);
    assert.equal((await t.pedir('DELETE', '/api/jugadores/x')).estado, 401);
    assert.equal((await t.pedir('PATCH', '/api/pronosticos/x/favorito', { favorito: true })).estado, 401);
    assert.equal((await t.pedir('POST', '/api/importar', { jugadores: [] })).estado, 401);
    assert.equal((await t.pedir('PUT', '/api/grandes-premios/gp-aus/resultado', {})).estado, 401);
  });

  test('con un token inventado o alterado también da 401', async () => {
    assert.equal((await t.pedir('POST', '/api/jugadores', NUEVO_JUGADOR, 'cualquiera')).estado, 401);
    const { cuerpo } = await t.pedir('POST', '/api/acceso', { clave: CLAVE }, undefined, '10.0.0.1');
    const [vence, firma] = cuerpo.token.split('.');
    const masTiempo = `${Number(vence) + 3600000}.${firma}`; // alargar el vencimiento rompe la firma
    assert.equal((await t.pedir('POST', '/api/jugadores', NUEVO_JUGADOR, masTiempo)).estado, 401);
  });

  test('con la contraseña correcta entrega un token que permite escribir', async () => {
    const r = await t.pedir('POST', '/api/acceso', { clave: CLAVE }, undefined, '10.0.0.2');
    assert.equal(r.estado, 200);
    assert.match(r.cuerpo.token, /^\d+\.[0-9a-f]{64}$/);
    assert.equal((await t.pedir('POST', '/api/jugadores', NUEVO_JUGADOR, r.cuerpo.token)).estado, 201);
  });

  test('con la contraseña incorrecta da 401 y no entrega token', async () => {
    const r = await t.pedir('POST', '/api/acceso', { clave: 'otra-clave' }, undefined, '10.0.0.3');
    assert.equal(r.estado, 401);
    assert.equal(r.cuerpo.token, undefined);
    assert.equal((await t.pedir('POST', '/api/acceso', {}, undefined, '10.0.0.3')).estado, 401);
  });

  test('el token vence a las 12 horas', async () => {
    const { cuerpo } = await t.pedir('POST', '/api/acceso', { clave: CLAVE }, undefined, '10.0.0.4');
    t.reloj.ahora = new Date('2026-03-01T21:59:00Z'); // 11 h 59 min después
    assert.equal((await t.pedir('POST', '/api/jugadores', { nombre: 'Beto' }, cuerpo.token)).estado, 201);
    t.reloj.ahora = new Date('2026-03-01T22:01:00Z'); // 12 h 1 min después
    assert.equal((await t.pedir('POST', '/api/jugadores', { nombre: 'Caro' }, cuerpo.token)).estado, 401);
    t.reloj.ahora = new Date('2026-03-01T10:00:00Z');
  });

  test('GET /api/acceso dice si hace falta contraseña y si el token sirve', async () => {
    assert.deepEqual((await t.pedir('GET', '/api/acceso')).cuerpo, { requerido: true, autenticado: false });
    const { cuerpo } = await t.pedir('POST', '/api/acceso', { clave: CLAVE }, undefined, '10.0.0.5');
    assert.deepEqual((await t.pedir('GET', '/api/acceso', undefined, cuerpo.token)).cuerpo, { requerido: true, autenticado: true });
  });

  test('cinco errores seguidos bloquean 15 minutos a esa dirección, incluso con la contraseña correcta', async () => {
    const ip = '10.0.0.9';
    for (let i = 0; i < 5; i += 1) assert.equal((await t.pedir('POST', '/api/acceso', { clave: 'mal' }, undefined, ip)).estado, 401);
    const bloqueado = await t.pedir('POST', '/api/acceso', { clave: CLAVE }, undefined, ip);
    assert.equal(bloqueado.estado, 429);
    assert.match(bloqueado.cuerpo.errores[0], /15 minuto/);
    assert.equal((await t.pedir('POST', '/api/acceso', { clave: CLAVE }, undefined, '10.0.0.10')).estado, 200); // otra dirección no se ve afectada
    t.reloj.ahora = new Date('2026-03-01T10:16:00Z');
    assert.equal((await t.pedir('POST', '/api/acceso', { clave: CLAVE }, undefined, ip)).estado, 200);
    t.reloj.ahora = new Date('2026-03-01T10:00:00Z');
  });
});

describe('sin contraseña (uso local)', () => {
  let t;
  before(async () => { t = await levantar(''); });
  after(() => t.cerrar());

  test('se puede escribir sin token y la API avisa que no hace falta', async () => {
    assert.equal((await t.pedir('POST', '/api/jugadores', NUEVO_JUGADOR)).estado, 201);
    assert.deepEqual((await t.pedir('GET', '/api/acceso')).cuerpo, { requerido: false, autenticado: true });
    assert.equal((await t.pedir('POST', '/api/acceso', { clave: 'lo-que-sea' })).cuerpo.requerido, false);
  });
});
