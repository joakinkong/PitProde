// scoring.test.js — tests unitarios del cálculo de puntos y la tabla de posiciones.
// Se corren con Node, sin instalar nada: `node --test` desde esta carpeta.
'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { calcularPuntos, puntuarPronostico, recalcularPuntos, calcularTabla, validarPodio } = require('./scoring.js');

// ---------- Datos de prueba ----------

const podio = (p1, p2, p3, pole) => ({ p1, p2, p3, pole });
const pron = (jugadorId, gpId, p1, p2, p3, pole) => ({ jugadorId, gpId, ...podio(p1, p2, p3, pole) });

const ana = { id: 'j1', nombre: 'Ana' };
const beto = { id: 'j2', nombre: 'Beto' };
const caro = { id: 'j3', nombre: 'Caro' };
const jugadores = [ana, beto, caro];

const gp1 = { id: 'g1', resultado: podio('VER', 'NOR', 'LEC', 'VER') };
const gp2 = { id: 'g2', resultado: podio('NOR', 'PIA', 'VER', 'NOR') };
const gpSinResultado = { id: 'g3', resultado: null };
const gps = [gp1, gp2, gpSinResultado];

// Resumen de la tabla para comparar sin el objeto jugador completo.
const resumen = (tabla) => tabla.map((f) => [f.jugador.nombre, f.puntos, f.exactos, f.carreras, f.posicion]);

// ---------- Casos correctos ----------

describe('Casos correctos', () => {
  test('ejemplo del TP: VER-NOR-LEC pole NOR vs pronóstico NOR-VER-LEC pole NOR = 12', () => {
    assert.equal(calcularPuntos(podio('NOR', 'VER', 'LEC', 'NOR'), podio('VER', 'NOR', 'LEC', 'NOR')), 12);
  });

  test('pronóstico perfecto = 18 (máximo por GP)', () => {
    assert.equal(calcularPuntos(gp1.resultado, gp1.resultado), 18);
  });

  test('tabla: suma varios GPs, cuenta exactos y carreras, y ordena por puntos', () => {
    const pronosticos = [
      pron('j1', 'g1', 'VER', 'NOR', 'LEC', 'VER'), // 18, 3 exactos
      pron('j1', 'g2', 'NOR', 'VER', 'PIA', 'PIA'), // 5 + 2 + 2 = 9, 1 exacto
      pron('j2', 'g1', 'NOR', 'VER', 'LEC', 'VER'), // 2 + 2 + 5 + 3 = 12, 1 exacto
    ];
    assert.deepEqual(resumen(calcularTabla(jugadores, pronosticos, gps)), [
      ['Ana', 27, 4, 2, 1],
      ['Beto', 12, 1, 1, 2],
      ['Caro', 0, 0, 0, 3],
    ]);
  });

  test('recalcularPuntos: pone los puntos si el GP tiene resultado y null si no, sin modificar el original', () => {
    const original = [pron('j1', 'g1', 'VER', 'NOR', 'LEC', 'VER'), pron('j1', 'g3', 'VER', 'NOR', 'LEC', 'VER')];
    const nuevos = recalcularPuntos({ grandesPremios: gps, pronosticos: original });
    assert.deepEqual(nuevos.map((p) => p.puntos), [18, null]);
    assert.equal('puntos' in original[0], false);
  });
});

// ---------- Función nueva del refactor ----------

describe('puntuarPronostico', () => {
  test('devuelve puntos y exactos juntos (ejemplo del TP: 12 puntos, 1 exacto)', () => {
    assert.deepEqual(puntuarPronostico(podio('NOR', 'VER', 'LEC', 'NOR'), podio('VER', 'NOR', 'LEC', 'NOR')), { puntos: 12, exactos: 1 });
  });

  test('coincide con calcularPuntos en todos los casos de este archivo', () => {
    const casos = [
      [gp1.resultado, gp1.resultado], [podio('HAM', 'RUS', 'ALO', 'SAI'), gp1.resultado],
      [podio('HAM', 'RUS', 'ALO', 'VER'), gp1.resultado], [podio('LEC', 'HAM', 'RUS', 'SAI'), gp1.resultado],
      [podio('NOR', 'VER', 'PIA', 'PIA'), gp2.resultado], [podio('VER', 'VER', 'VER', 'VER'), gp1.resultado],
    ];
    casos.forEach(([pronostico, resultado]) => {
      assert.equal(puntuarPronostico(pronostico, resultado).puntos, calcularPuntos(pronostico, resultado));
    });
  });
});

// ---------- Datos inválidos ----------

describe('Datos inválidos', () => {
  test('pronóstico de un GP que no existe: queda con puntos null y no suma en la tabla', () => {
    const pronosticos = [pron('j1', 'no-existe', 'VER', 'NOR', 'LEC', 'VER')];
    assert.deepEqual(recalcularPuntos({ grandesPremios: gps, pronosticos }).map((p) => p.puntos), [null]);
    assert.deepEqual(resumen(calcularTabla([ana], pronosticos, gps)), [['Ana', 0, 0, 0, 1]]);
  });

  test('pronóstico de un jugador que no está en la lista: se ignora en la tabla', () => {
    const pronosticos = [pron('fantasma', 'g1', 'VER', 'NOR', 'LEC', 'VER')];
    const tabla = calcularTabla(jugadores, pronosticos, gps);
    assert.equal(tabla.length, 3);
    assert.ok(tabla.every((fila) => fila.puntos === 0));
  });

  test('pilotos que no corrieron (ids inexistentes) = 0 puntos', () => {
    assert.equal(calcularPuntos(podio('x1', 'x2', 'x3', 'x4'), gp1.resultado), 0);
  });

  test('pilotos repetidos: el cálculo no los frena (da 12), los rechaza la validación previa', () => {
    const repetido = podio('VER', 'VER', 'VER', 'VER');
    // VER exacto en P1 (5) + VER "en el podio" en P2 y P3 (2 + 2) + pole (3).
    assert.equal(calcularPuntos(repetido, gp1.resultado), 12);
    const grilla = [{ id: 'VER' }, { id: 'NOR' }, { id: 'LEC' }];
    assert.deepEqual(validarPodio(repetido, grilla), ['P1, P2 y P3 tienen que ser pilotos distintos.']);
  });
});

// ---------- Casos límite ----------

describe('Casos límite', () => {
  test('ningún acierto = 0 (mínimo)', () => {
    assert.equal(calcularPuntos(podio('HAM', 'RUS', 'ALO', 'SAI'), gp1.resultado), 0);
  });

  test('solo la pole = 3', () => {
    assert.equal(calcularPuntos(podio('HAM', 'RUS', 'ALO', 'VER'), gp1.resultado), 3);
  });

  test('un solo piloto en el podio pero en otra posición = 2', () => {
    assert.equal(calcularPuntos(podio('LEC', 'HAM', 'RUS', 'SAI'), gp1.resultado), 2);
  });

  test('empate en puntos: gana quien tiene más exactos', () => {
    const pronosticos = [
      pron('j1', 'g1', 'VER', 'LEC', 'NOR', 'PIA'), // 5 + 2 + 2 = 9, 1 exacto
      pron('j2', 'g1', 'NOR', 'LEC', 'VER', 'VER'), // 2 + 2 + 2 + 3 = 9, 0 exactos
    ];
    assert.deepEqual(resumen(calcularTabla(jugadores, pronosticos, gps)), [
      ['Ana', 9, 1, 1, 1],
      ['Beto', 9, 0, 1, 2],
      ['Caro', 0, 0, 0, 3],
    ]);
  });

  test('empate total: comparten posición y se ordenan por nombre', () => {
    const desordenados = [caro, ana, beto];
    assert.deepEqual(resumen(calcularTabla(desordenados, [], gps)), [
      ['Ana', 0, 0, 0, 1],
      ['Beto', 0, 0, 0, 1],
      ['Caro', 0, 0, 0, 1],
    ]);
  });

  test('empate parcial: 1, 1, 3 (la posición siguiente salta)', () => {
    const pronosticos = [pron('j1', 'g1', 'VER', 'NOR', 'LEC', 'VER'), pron('j2', 'g1', 'VER', 'NOR', 'LEC', 'VER')];
    assert.deepEqual(calcularTabla(jugadores, pronosticos, gps).map((f) => f.posicion), [1, 1, 3]);
  });

  test('GP que ya largó pero sin resultado: no suma puntos ni carreras', () => {
    const pronosticos = [pron('j1', 'g3', 'VER', 'NOR', 'LEC', 'VER')];
    assert.deepEqual(resumen(calcularTabla([ana], pronosticos, gps)), [['Ana', 0, 0, 0, 1]]);
  });

  test('sin jugadores: la tabla queda vacía', () => {
    assert.deepEqual(calcularTabla([], [pron('j1', 'g1', 'VER', 'NOR', 'LEC', 'VER')], gps), []);
  });
});
