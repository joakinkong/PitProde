// pronosticos.api.test.js — pruebas de punta a punta: servidor HTTP real, base en memoria y peticiones con fetch.
'use strict';

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { abrirBase } = require('../src/db.js');
const { crearApp } = require('../src/app.js');

let servidor;
let base;
let db;
let ahora = new Date('2026-03-01T00:00:00Z');

before(async () => {
  db = await abrirBase(':memory:');
  await db.ejecutar('INSERT INTO jugadores (id, nombre, fecha_alta) VALUES (?, ?, ?)', ['ana', 'Ana', '2026-01-01T00:00:00Z']);
  servidor = crearApp(db, { reloj: () => ahora });
  await new Promise((resolver) => servidor.listen(0, '127.0.0.1', resolver));
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => new Promise((resolver) => servidor.close(resolver)));

// Hace una petición y devuelve { estado, cuerpo } con el JSON ya leído.
async function pedir(metodo, ruta, cuerpo, crudo) {
  const respuesta = await fetch(base + ruta, {
    method: metodo,
    headers: cuerpo !== undefined || crudo !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: crudo !== undefined ? crudo : (cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined),
  });
  return { estado: respuesta.status, cuerpo: await respuesta.json() };
}

const nuevo = (cambios = {}) => ({
  jugadorId: 'ana', gpId: 'gp-aus', p1: 'piloto-nor', p2: 'piloto-ver', p3: 'piloto-lec', pole: 'piloto-nor', ...cambios,
});

describe('API de pronósticos', () => {
  let id;

  test('POST crea un pronóstico y responde 201', async () => {
    const r = await pedir('POST', '/api/pronosticos', nuevo());
    assert.equal(r.estado, 201);
    assert.equal(r.cuerpo.gpId, 'gp-aus');
    assert.equal(r.cuerpo.puntos, null);
    id = r.cuerpo.id;
  });

  test('POST del mismo jugador y GP responde 409', async () => {
    const r = await pedir('POST', '/api/pronosticos', nuevo());
    assert.equal(r.estado, 409);
  });

  test('POST con podio repetido responde 422 con el mensaje', async () => {
    const r = await pedir('POST', '/api/pronosticos', nuevo({ gpId: 'gp-chn', p2: 'piloto-nor' }));
    assert.equal(r.estado, 422);
    assert.match(r.cuerpo.errores[0], /distintos/);
  });

  test('GET /:id devuelve el pronóstico', async () => {
    const r = await pedir('GET', `/api/pronosticos/${id}`);
    assert.equal(r.estado, 200);
    assert.equal(r.cuerpo.p1, 'piloto-nor');
  });

  test('GET /:id inexistente responde 404', async () => {
    assert.equal((await pedir('GET', '/api/pronosticos/no-existe')).estado, 404);
  });

  test('PUT edita el podio antes de la largada', async () => {
    const r = await pedir('PUT', `/api/pronosticos/${id}`, { p1: 'piloto-ver', p2: 'piloto-nor', p3: 'piloto-lec', pole: 'piloto-ver' });
    assert.equal(r.estado, 200);
    assert.equal(r.cuerpo.p1, 'piloto-ver');
  });

  test('GET lista con filtros y valida el estado', async () => {
    const todos = await pedir('GET', '/api/pronosticos');
    assert.equal(todos.cuerpo.pronosticos.length, 1);
    assert.equal((await pedir('GET', '/api/pronosticos?gpId=gp-chn')).cuerpo.pronosticos.length, 0);
    assert.equal((await pedir('GET', '/api/pronosticos?estado=inventado')).estado, 400);
  });

  test('un intento de inyección SQL en un filtro no devuelve nada ni rompe', async () => {
    const r = await pedir('GET', `/api/pronosticos?gpId=${encodeURIComponent("' OR 1=1 --")}`);
    assert.equal(r.estado, 200);
    assert.deepEqual(r.cuerpo.pronosticos, []);
  });

  test('después de la largada, PUT y POST responden 422 aunque el cliente mande otra hora', async () => {
    ahora = new Date('2026-03-08T04:00:01Z');
    const edicion = await pedir('PUT', `/api/pronosticos/${id}`, { p1: 'piloto-nor', p2: 'piloto-ver', p3: 'piloto-lec', pole: 'piloto-nor', fechaCarga: '2026-01-01T00:00:00Z' });
    assert.equal(edicion.estado, 422);
    assert.match(edicion.cuerpo.errores[0], /ya largó/);
    assert.equal((await pedir('POST', '/api/pronosticos', nuevo({ jugadorId: 'ana', gpId: 'gp-aus' }))).estado, 422);
    ahora = new Date('2026-03-01T00:00:00Z');
  });

  test('JSON roto responde 400', async () => {
    assert.equal((await pedir('POST', '/api/pronosticos', undefined, '{"jugadorId": ')).estado, 400);
  });

  test('un cuerpo que no es un objeto responde 400', async () => {
    assert.equal((await pedir('POST', '/api/pronosticos', undefined, '[1,2,3]')).estado, 400);
  });

  test('un cuerpo demasiado grande responde 413', async () => {
    const r = await pedir('POST', '/api/pronosticos', nuevo({ relleno: 'x'.repeat(20000) }));
    assert.equal(r.estado, 413);
  });

  test('ruta inexistente responde 404 y método no permitido responde 405', async () => {
    assert.equal((await pedir('GET', '/api/otra-cosa')).estado, 404);
    assert.equal((await pedir('PUT', '/api/pronosticos')).estado, 405);
  });
});
