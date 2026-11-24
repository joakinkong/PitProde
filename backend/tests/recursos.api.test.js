// recursos.api.test.js — jugadores, pilotos, GPs, resultados, tabla, importar/exportar y frontend,
// de punta a punta contra un servidor HTTP real con base en memoria y reloj controlado.
'use strict';

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { BASES } = require('./bases.js');
const { crearApp } = require('../src/app.js');

for (const { nombre, abrir } of BASES) {
  describe(`[${nombre}]`, () => {
    let servidor;
    let base;
    let db;
    let ahora = new Date('2026-03-01T00:00:00Z'); // antes de que largue Australia (8/3/2026 04:00 UTC)

    before(async () => {
      db = await abrir();
      servidor = crearApp(db, { reloj: () => ahora });
      await new Promise((resolver) => servidor.listen(0, '127.0.0.1', resolver));
      base = `http://127.0.0.1:${servidor.address().port}`;
    });
    after(() => new Promise((resolver) => servidor.close(resolver)));

    // Hace una petición y devuelve { estado, cuerpo } con el JSON ya leído.
    async function pedir(metodo, ruta, cuerpo) {
      const respuesta = await fetch(base + ruta, {
        method: metodo,
        headers: cuerpo === undefined ? {} : { 'Content-Type': 'application/json' },
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      });
      return { estado: respuesta.status, cuerpo: await respuesta.json() };
    }

    const podio = (p1, p2, p3, pole) => ({ p1, p2, p3, pole });
    const CON_PODIO = (jugadorId, gpId, ...resto) => ({ jugadorId, gpId, ...podio(...resto) });

    test('usa el adaptador de la base que corresponde', () => {
      assert.equal(db.dialecto, nombre.startsWith('Postgres') ? 'postgres' : 'sqlite');
    });

    describe('jugadores', () => {
      let id;
      test('crea un jugador con id y fecha de alta del servidor', async () => {
        const r = await pedir('POST', '/api/jugadores', { nombre: ' Ana ', apodo: 'La Reina', color: '#e10600', id: 'trampa', fechaAlta: '1999-01-01' });
        assert.equal(r.estado, 201);
        assert.equal(r.cuerpo.nombre, 'Ana');
        assert.notEqual(r.cuerpo.id, 'trampa');
        assert.equal(r.cuerpo.fechaAlta, ahora.toISOString());
        id = r.cuerpo.id;
      });
      test('rechaza nombre vacío (422) y nombre repetido sin importar mayúsculas (409)', async () => {
        assert.equal((await pedir('POST', '/api/jugadores', { nombre: '  ' })).estado, 422);
        assert.equal((await pedir('POST', '/api/jugadores', { nombre: 'ANA' })).estado, 409);
      });
      test('edita y permite conservar el propio nombre', async () => {
        const r = await pedir('PUT', `/api/jugadores/${id}`, { nombre: 'Ana', apodo: 'Reina', color: '#00ff00' });
        assert.equal(r.estado, 200);
        assert.equal(r.cuerpo.apodo, 'Reina');
      });
      test('editar o borrar uno inexistente da 404', async () => {
        assert.equal((await pedir('PUT', '/api/jugadores/nadie', { nombre: 'X' })).estado, 404);
        assert.equal((await pedir('DELETE', '/api/jugadores/nadie')).estado, 404);
      });
      test('borrar un jugador borra sus pronósticos y dice cuántos', async () => {
        await pedir('POST', '/api/pronosticos', CON_PODIO(id, 'gp-aus', 'piloto-nor', 'piloto-ver', 'piloto-lec', 'piloto-nor'));
        const r = await pedir('DELETE', `/api/jugadores/${id}`);
        assert.equal(r.estado, 200);
        assert.equal(r.cuerpo.pronosticosBorrados, 1);
        assert.deepEqual((await pedir('GET', '/api/pronosticos')).cuerpo.pronosticos, []);
      });
    });

    describe('pilotos', () => {
      test('valida número, nombre y equipo, y crea uno válido', async () => {
        assert.equal((await pedir('POST', '/api/pilotos', { nombre: 'X', equipo: 'Y', numero: 100 })).estado, 422);
        assert.equal((await pedir('POST', '/api/pilotos', { nombre: '', equipo: 'Y', numero: 5 })).estado, 422);
        const r = await pedir('POST', '/api/pilotos', { nombre: 'Nuevo Piloto', equipo: 'Equipo', numero: 77, activo: true });
        assert.equal(r.estado, 201);
        assert.equal(r.cuerpo.activo, true);
        assert.equal((await pedir('DELETE', `/api/pilotos/${r.cuerpo.id}`)).estado, 200);
      });
      test('no se puede borrar un piloto que usa un pronóstico, y se sugiere desactivarlo', async () => {
        const j = (await pedir('POST', '/api/jugadores', { nombre: 'Beto' })).cuerpo;
        await pedir('POST', '/api/pronosticos', CON_PODIO(j.id, 'gp-aus', 'piloto-nor', 'piloto-ver', 'piloto-lec', 'piloto-nor'));
        const r = await pedir('DELETE', '/api/pilotos/piloto-nor');
        assert.equal(r.estado, 409);
        assert.match(r.cuerpo.errores[0], /Desactivalo/);
      });
      test('no se puede pronosticar con un piloto inactivo', async () => {
        const p = (await pedir('GET', '/api/pilotos')).cuerpo.find((x) => x.id === 'piloto-bot');
        await pedir('PUT', '/api/pilotos/piloto-bot', { ...p, activo: false });
        const j = (await pedir('POST', '/api/jugadores', { nombre: 'Caro' })).cuerpo;
        const r = await pedir('POST', '/api/pronosticos', CON_PODIO(j.id, 'gp-chn', 'piloto-bot', 'piloto-ver', 'piloto-lec', 'piloto-nor'));
        assert.equal(r.estado, 422);
        assert.match(r.cuerpo.errores[0], /inactivo/);
      });
    });

    describe('grandes premios y resultados', () => {
      test('crear, editar y borrar un GP, con validación', async () => {
        assert.equal((await pedir('POST', '/api/grandes-premios', { nombre: 'GP', circuito: 'C', fechaLargada: 'no-es-fecha' })).estado, 422);
        const r = await pedir('POST', '/api/grandes-premios', { nombre: 'GP de prueba', circuito: 'Circuito', fechaLargada: '2026-12-31T12:00:00Z' });
        assert.equal(r.estado, 201);
        assert.equal(r.cuerpo.estado, 'proximo');
        assert.equal((await pedir('PUT', `/api/grandes-premios/${r.cuerpo.id}`, { nombre: 'Otro', circuito: 'Circuito', fechaLargada: '2026-12-31T12:00:00Z' })).cuerpo.nombre, 'Otro');
        assert.equal((await pedir('DELETE', `/api/grandes-premios/${r.cuerpo.id}`)).estado, 200);
      });
      test('el resultado no se puede cargar antes de la largada', async () => {
        const r = await pedir('PUT', '/api/grandes-premios/gp-aus/resultado', podio('piloto-ver', 'piloto-nor', 'piloto-lec', 'piloto-nor'));
        assert.equal(r.estado, 422);
        assert.match(r.cuerpo.errores[0], /Todavía no largó/);
      });
      test('después de la largada se carga, los puntos y la tabla se calculan, y al quitarlo vuelven a null', async () => {
        const j = (await pedir('POST', '/api/jugadores', { nombre: 'Zoe' })).cuerpo;
        const pr = await pedir('POST', '/api/pronosticos', CON_PODIO(j.id, 'gp-mco', 'piloto-nor', 'piloto-ver', 'piloto-lec', 'piloto-nor'));
        assert.equal(pr.estado, 201);
        ahora = new Date('2026-06-08T00:00:00Z'); // Mónaco ya largó (7/6/2026)
        assert.equal((await pedir('PUT', '/api/grandes-premios/gp-mco/resultado', podio('piloto-ver', 'piloto-nor', 'piloto-lec', 'piloto-nor'))).estado, 200);
        assert.equal((await pedir('GET', `/api/pronosticos/${pr.cuerpo.id}`)).cuerpo.puntos, 12); // ejemplo del TP
        const fila = (await pedir('GET', '/api/tabla')).cuerpo.find((f) => f.jugador.nombre === 'Zoe');
        assert.deepEqual([fila.puntos, fila.exactos, fila.carreras], [12, 1, 1]);
        assert.equal((await pedir('DELETE', '/api/grandes-premios/gp-mco/resultado')).estado, 200);
        assert.equal((await pedir('GET', `/api/pronosticos/${pr.cuerpo.id}`)).cuerpo.puntos, null);
        ahora = new Date('2026-03-01T00:00:00Z');
      });
      test('un pronóstico se puede borrar antes de la largada y no después; el favorito se marca siempre', async () => {
        const j = (await pedir('POST', '/api/jugadores', { nombre: 'Leo' })).cuerpo;
        const pr = (await pedir('POST', '/api/pronosticos', CON_PODIO(j.id, 'gp-esp', 'piloto-nor', 'piloto-ver', 'piloto-lec', 'piloto-nor'))).cuerpo;
        ahora = new Date('2026-06-15T00:00:00Z'); // España ya largó (14/6/2026)
        assert.equal((await pedir('DELETE', `/api/pronosticos/${pr.id}`)).estado, 422);
        assert.equal((await pedir('PATCH', `/api/pronosticos/${pr.id}/favorito`, { favorito: true })).cuerpo.favorito, true);
        assert.equal((await pedir('PATCH', `/api/pronosticos/${pr.id}/favorito`, { favorito: 'si' })).estado, 422);
        ahora = new Date('2026-03-01T00:00:00Z');
        assert.equal((await pedir('DELETE', `/api/pronosticos/${pr.id}`)).estado, 200);
      });
    });

    describe('exportar, importar y reiniciar', () => {
      test('exportar e importar el mismo archivo deja todo igual', async () => {
        const antes = (await pedir('GET', '/api/exportar')).cuerpo;
        assert.equal(antes.app, 'PitProde');
        assert.equal((await pedir('POST', '/api/importar', antes)).estado, 200);
        const despues = (await pedir('GET', '/api/exportar')).cuerpo;
        assert.deepEqual({ ...despues, exportadoEn: 0 }, { ...antes, exportadoEn: 0 });
      });
      test('un archivo inválido no cambia nada y devuelve los errores', async () => {
        const antes = (await pedir('GET', '/api/datos')).cuerpo;
        const r = await pedir('POST', '/api/importar', { jugadores: [], pilotos: [] });
        assert.equal(r.estado, 422);
        assert.ok(r.cuerpo.errores.length > 0);
        assert.deepEqual((await pedir('GET', '/api/datos')).cuerpo, antes);
      });
      test('"borrar todo" deja la base vacía y no se vuelve a llenar sola al reabrirla', async () => {
        const vacio = { jugadores: [], pilotos: [], grandesPremios: [], pronosticos: [] };
        assert.equal((await pedir('POST', '/api/importar', vacio)).estado, 200);
        const datos = (await pedir('GET', '/api/datos')).cuerpo;
        assert.deepEqual([datos.jugadores.length, datos.pilotos.length, datos.grandesPremios.length], [0, 0, 0]);
        const reabierta = await abrir(); // base nueva: sí se precarga
        assert.equal(Number((await reabierta.uno('SELECT COUNT(*) AS n FROM pilotos')).n), 22);
        // la base de este test ya quedó marcada: no se vuelve a precargar aunque esté vacía
        assert.ok(await db.uno("SELECT valor FROM meta WHERE clave = 'semilla'"));
      });
      test('el importar acepta cuerpos de más de 10 KB (hasta 2 MB), el resto de las rutas no', async () => {
        const grande = { relleno: 'x'.repeat(20000) };
        assert.equal((await pedir('POST', '/api/importar', grande)).estado, 422); // llega al service y lo rechaza por formato
        assert.equal((await pedir('POST', '/api/jugadores', grande)).estado, 413);
      });
    });

    describe('frontend', () => {
      test('sirve index.html y los scripts, y nada más', async () => {
        const pagina = await fetch(`${base}/`);
        assert.equal(pagina.status, 200);
        assert.match(pagina.headers.get('content-type'), /text\/html/);
        assert.equal((await fetch(`${base}/app.js`)).status, 200);
        assert.equal((await fetch(`${base}/api.js`)).status, 200);
        assert.equal((await fetch(`${base}/package.json`)).status, 404);
        assert.equal((await fetch(`${base}/backend/server.js`)).status, 404);
        assert.equal((await fetch(`${base}/..%2f..%2fetc/passwd`)).status, 404);
      });
    });
  });
}
