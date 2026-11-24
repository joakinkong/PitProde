// pronosticos.service.test.js — reglas del prode sobre pronósticos, con base en memoria y reloj controlado.
// Se corren con `node --test` desde la raíz del proyecto.
'use strict';

const { describe, test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { abrirBase } = require('../src/db.js');
const { crearJugadoresRepository } = require('../src/repositories/jugadores.repository.js');
const { crearPilotosRepository } = require('../src/repositories/pilotos.repository.js');
const { crearGrandesPremiosRepository } = require('../src/repositories/grandesPremios.repository.js');
const { crearPronosticosRepository } = require('../src/repositories/pronosticos.repository.js');
const { crearPronosticosService } = require('../src/services/pronosticos.service.js');

// GP de Australia largó el 8/3/2026 04:00 UTC; el de China, el 15/3/2026 07:00 UTC.
const ANTES_DE_AUSTRALIA = new Date('2026-03-01T00:00:00Z');
const DESPUES_DE_AUSTRALIA = new Date('2026-03-08T04:00:01Z');

let db;
let service;
let ahora;

// Prepara una base nueva con dos jugadores y un reloj que se puede mover.
beforeEach(() => {
  db = abrirBase(':memory:');
  const insertar = db.prepare('INSERT INTO jugadores (id, nombre, fecha_alta) VALUES (?, ?, ?)');
  insertar.run('ana', 'Ana', '2026-01-01T00:00:00Z');
  insertar.run('beto', 'Beto', '2026-01-01T00:00:00Z');
  ahora = ANTES_DE_AUSTRALIA;
  let contador = 0;
  service = crearPronosticosService({
    pronosticos: crearPronosticosRepository(db),
    jugadores: crearJugadoresRepository(db),
    pilotos: crearPilotosRepository(db),
    grandesPremios: crearGrandesPremiosRepository(db),
    reloj: () => ahora,
    generarId: () => `p${++contador}`,
  });
});

// Pronóstico de ejemplo; "cambios" pisa cualquier campo.
const entrada = (cambios = {}) => ({
  jugadorId: 'ana', gpId: 'gp-aus', p1: 'piloto-nor', p2: 'piloto-ver', p3: 'piloto-lec', pole: 'piloto-nor', ...cambios,
});

describe('crear', () => {
  test('guarda un pronóstico válido antes de la largada, sin puntos todavía', () => {
    const r = service.crear(entrada());
    assert.equal(r.ok, true);
    assert.equal(r.pronostico.id, 'p1');
    assert.equal(r.pronostico.puntos, null);
    assert.equal(r.pronostico.estadoGP, 'proximo');
    assert.equal(r.pronostico.fechaCarga, ANTES_DE_AUSTRALIA.toISOString());
  });

  test('rechaza un pronóstico si el GP ya largó (con la hora del servidor, no la del cliente)', () => {
    ahora = DESPUES_DE_AUSTRALIA;
    const r = service.crear(entrada({ fechaCarga: '2026-01-01T00:00:00Z' })); // un cliente tramposo manda otra fecha
    assert.equal(r.ok, false);
    assert.equal(r.motivo, 'invalido');
    assert.match(r.errores[0], /ya largó/);
  });

  test('rechaza un podio con pilotos repetidos', () => {
    const r = service.crear(entrada({ p2: 'piloto-nor' }));
    assert.equal(r.motivo, 'invalido');
    assert.match(r.errores[0], /distintos/);
  });

  test('rechaza un piloto que no existe', () => {
    const r = service.crear(entrada({ p3: 'piloto-fantasma' }));
    assert.equal(r.motivo, 'invalido');
  });

  test('rechaza posiciones vacías o que no son texto', () => {
    assert.equal(service.crear(entrada({ pole: '' })).motivo, 'invalido');
    assert.equal(service.crear(entrada({ p1: 5 })).motivo, 'invalido');
  });

  test('rechaza un jugador o un GP que no existen', () => {
    assert.equal(service.crear(entrada({ jugadorId: 'nadie' })).motivo, 'invalido');
    assert.equal(service.crear(entrada({ gpId: 'gp-nada' })).motivo, 'invalido');
  });

  test('un jugador no puede tener dos pronósticos para el mismo GP', () => {
    service.crear(entrada());
    const r = service.crear(entrada({ p1: 'piloto-ver', p2: 'piloto-nor' }));
    assert.equal(r.motivo, 'duplicado');
    assert.equal(service.listar().pronosticos.length, 1);
  });

  test('otro jugador sí puede pronosticar el mismo GP, y el mismo jugador otro GP', () => {
    assert.equal(service.crear(entrada()).ok, true);
    assert.equal(service.crear(entrada({ jugadorId: 'beto' })).ok, true);
    assert.equal(service.crear(entrada({ gpId: 'gp-chn' })).ok, true);
  });
});

describe('editar', () => {
  test('cambia el podio mientras el GP no largó', () => {
    const { pronostico } = service.crear(entrada());
    const r = service.editar(pronostico.id, { p1: 'piloto-ver', p2: 'piloto-nor', p3: 'piloto-lec', pole: 'piloto-ver' });
    assert.equal(r.ok, true);
    assert.deepEqual([r.pronostico.p1, r.pronostico.p2, r.pronostico.pole], ['piloto-ver', 'piloto-nor', 'piloto-ver']);
  });

  test('queda bloqueado cuando el GP larga', () => {
    const { pronostico } = service.crear(entrada());
    ahora = DESPUES_DE_AUSTRALIA;
    const r = service.editar(pronostico.id, { p1: 'piloto-ver', p2: 'piloto-nor', p3: 'piloto-lec', pole: 'piloto-ver' });
    assert.equal(r.motivo, 'invalido');
    assert.equal(service.obtener(pronostico.id).pronostico.p1, 'piloto-nor');
  });

  test('no permite cambiar el jugador ni el GP: se ignoran', () => {
    const { pronostico } = service.crear(entrada());
    const r = service.editar(pronostico.id, { jugadorId: 'beto', gpId: 'gp-chn', p1: 'piloto-ver', p2: 'piloto-nor', p3: 'piloto-lec', pole: 'piloto-ver' });
    assert.equal(r.pronostico.jugadorId, 'ana');
    assert.equal(r.pronostico.gpId, 'gp-aus');
  });

  test('devuelve no_encontrado si el pronóstico no existe', () => {
    assert.equal(service.editar('no-existe', entrada()).motivo, 'no_encontrado');
  });
});

describe('leer', () => {
  test('los puntos se calculan al leer: ejemplo del TP = 12, y se actualizan si se corrige el resultado', () => {
    const { pronostico } = service.crear(entrada()); // NOR-VER-LEC, pole NOR
    const poner = (p1, p2, p3, pole) => db.prepare('UPDATE grandes_premios SET res_p1 = ?, res_p2 = ?, res_p3 = ?, res_pole = ? WHERE id = ?')
      .run(p1, p2, p3, pole, 'gp-aus');
    ahora = DESPUES_DE_AUSTRALIA;
    poner('piloto-ver', 'piloto-nor', 'piloto-lec', 'piloto-nor');
    const leido = service.obtener(pronostico.id).pronostico;
    assert.equal(leido.puntos, 12);
    assert.equal(leido.estadoGP, 'finalizado');
    poner('piloto-nor', 'piloto-ver', 'piloto-lec', 'piloto-nor'); // el resultado se corrige: ahora es perfecto
    assert.equal(service.obtener(pronostico.id).pronostico.puntos, 18);
  });

  test('obtener un pronóstico inexistente devuelve no_encontrado', () => {
    assert.equal(service.obtener('x').motivo, 'no_encontrado');
  });

  test('listar filtra por GP, por jugador y por estado', () => {
    service.crear(entrada());
    service.crear(entrada({ jugadorId: 'beto' }));
    service.crear(entrada({ gpId: 'gp-chn' }));
    assert.equal(service.listar().pronosticos.length, 3);
    assert.equal(service.listar({ gpId: 'gp-aus' }).pronosticos.length, 2);
    assert.equal(service.listar({ jugadorId: 'ana' }).pronosticos.length, 2);
    assert.equal(service.listar({ jugadorId: 'ana', gpId: 'gp-chn' }).pronosticos.length, 1);
    ahora = DESPUES_DE_AUSTRALIA;
    assert.equal(service.listar({ estado: 'cerrado' }).pronosticos.length, 2);
    assert.equal(service.listar({ estado: 'proximo' }).pronosticos.length, 1);
  });
});
