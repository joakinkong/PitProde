// scoring.js — reglas de puntuación, estados de los GPs, validaciones y tabla de posiciones.
// Todo son funciones puras: no tocan el DOM ni localStorage, así se pueden probar solas
// (en el navegador con tests.html o en la consola).
'use strict';

// Reglas de puntuación del prode.
const PUNTOS = { exacto: 5, enPodio: 2, pole: 3 };
const MAXIMO_POR_GP = 3 * PUNTOS.exacto + PUNTOS.pole; // 18

// Nombres legibles de las posiciones, para los mensajes de error.
const NOMBRES_POSICION = { p1: 'P1', p2: 'P2', p3: 'P3', pole: 'la pole' };

// ---------- Estado de un Gran Premio ----------

// Devuelve true si el GP ya largó (la hora de largada es igual o anterior a "ahora").
function yaLargo(gp, ahora = new Date()) {
  return new Date(gp.fechaLargada).getTime() <= ahora.getTime();
}

// Estado calculado del GP: 'proximo' (no largó), 'cerrado' (largó, sin resultado)
// o 'finalizado' (ya tiene resultado). No se guarda: se calcula siempre.
function estadoGP(gp, ahora = new Date()) {
  if (gp.resultado) return 'finalizado';
  return yaLargo(gp, ahora) ? 'cerrado' : 'proximo';
}

// ---------- Cálculo de puntos ----------

// Devuelve true si el podio (P1, P2, P3) repite algún piloto.
function hayPilotosRepetidos({ p1, p2, p3 }) {
  return new Set([p1, p2, p3]).size < 3;
}

// Clasifica cada piloto pronosticado: 'exacto' (misma posición), 'podio' (está en el
// podio pero en otra posición) o 'fallo'. Devuelve un arreglo de tres elementos.
function clasificarPodio(pronostico, resultado) {
  const podioReal = [resultado.p1, resultado.p2, resultado.p3];
  return [pronostico.p1, pronostico.p2, pronostico.p3].map((piloto, i) => {
    if (piloto === podioReal[i]) return 'exacto';
    return podioReal.includes(piloto) ? 'podio' : 'fallo';
  });
}

// Puntúa un pronóstico contra el resultado real del GP clasificando el podio una sola vez.
// Devuelve { puntos, exactos }: "exactos" son los pilotos acertados en su posición (desempatan la tabla).
function puntuarPronostico(pronostico, resultado) {
  const aciertos = clasificarPodio(pronostico, resultado);
  const exactos = aciertos.filter((acierto) => acierto === 'exacto').length;
  const enPodio = aciertos.filter((acierto) => acierto === 'podio').length;
  const puntosPole = pronostico.pole === resultado.pole ? PUNTOS.pole : 0;
  return { puntos: exactos * PUNTOS.exacto + enPodio * PUNTOS.enPodio + puntosPole, exactos };
}

// Puntos de un pronóstico contra el resultado real del GP.
function calcularPuntos(pronostico, resultado) {
  return puntuarPronostico(pronostico, resultado).puntos;
}

// Devuelve la lista de pronósticos con el campo "puntos" actualizado:
// el puntaje si el GP tiene resultado, o null si todavía no.
function recalcularPuntos(datos) {
  return datos.pronosticos.map((pronostico) => {
    const gp = datos.grandesPremios.find((g) => g.id === pronostico.gpId);
    const puntos = gp && gp.resultado ? calcularPuntos(pronostico, gp.resultado) : null;
    return { ...pronostico, puntos };
  });
}

// ---------- Tabla de posiciones ----------

// Suma los puntos y los aciertos exactos de un jugador sobre los GPs finalizados.
function resumirJugador(jugador, pronosticos, grandesPremios) {
  let puntos = 0;
  let exactos = 0;
  let carreras = 0;
  pronosticos.filter((p) => p.jugadorId === jugador.id).forEach((pronostico) => {
    const gp = grandesPremios.find((g) => g.id === pronostico.gpId);
    if (!gp || !gp.resultado) return;
    const puntaje = puntuarPronostico(pronostico, gp.resultado);
    puntos += puntaje.puntos;
    exactos += puntaje.exactos;
    carreras += 1;
  });
  return { jugador, puntos, exactos, carreras };
}

// Tabla general: ordenada por puntos y, ante empate, por aciertos exactos.
// Si siguen empatados comparten posición (1, 1, 3...) y se ordenan por nombre.
function calcularTabla(jugadores, pronosticos, grandesPremios) {
  const filas = jugadores
    .map((jugador) => resumirJugador(jugador, pronosticos, grandesPremios))
    .sort((a, b) => b.puntos - a.puntos
      || b.exactos - a.exactos
      || a.jugador.nombre.localeCompare(b.jugador.nombre, 'es'));
  const tabla = [];
  filas.forEach((fila, i) => {
    const anterior = tabla[i - 1];
    const empatado = anterior && anterior.puntos === fila.puntos && anterior.exactos === fila.exactos;
    tabla.push({ ...fila, posicion: empatado ? anterior.posicion : i + 1 });
  });
  return tabla;
}

// ---------- Validaciones de reglas ----------

// Devuelve los nombres de las posiciones que falta elegir (ej. ['P1', 'la pole']).
function posicionesFaltantes(entrada) {
  return Object.keys(NOMBRES_POSICION).filter((clave) => !entrada[clave]).map((c) => NOMBRES_POSICION[c]);
}

// Errores comunes a pronóstico y resultado: posiciones sin elegir, repetidas o con pilotos inexistentes.
function validarPodio(entrada, pilotos) {
  const faltan = posicionesFaltantes(entrada);
  if (faltan.length) return [`Falta elegir: ${faltan.join(', ')}.`];
  if (hayPilotosRepetidos(entrada)) return ['P1, P2 y P3 tienen que ser pilotos distintos.'];
  const inexistente = Object.keys(NOMBRES_POSICION).some((c) => !pilotos.some((p) => p.id === entrada[c]));
  return inexistente ? ['Hay un piloto que ya no existe en la grilla. Volvé a elegirlo.'] : [];
}

// Valida un pronóstico antes de guardarlo. Devuelve una lista de mensajes (vacía si está bien).
function validarPronostico(entrada, datos, ahora = new Date()) {
  const errores = [];
  const gp = datos.grandesPremios.find((g) => g.id === entrada.gpId);
  if (!datos.jugadores.some((j) => j.id === entrada.jugadorId)) errores.push('Elegí un jugador.');
  if (!gp) errores.push('Elegí un Gran Premio.');
  else if (yaLargo(gp, ahora)) errores.push('Ese GP ya largó: el pronóstico está bloqueado.');
  return errores.concat(validarPodio(entrada, datos.pilotos));
}

// Valida el resultado real de un GP: solo se carga después de la largada.
function validarResultado(entrada, gp, pilotos, ahora = new Date()) {
  const errores = [];
  if (!yaLargo(gp, ahora)) errores.push('Todavía no largó este GP: no se puede cargar el resultado.');
  return errores.concat(validarPodio(entrada, pilotos));
}

// Permite usar este archivo desde Node (pruebas) sin afectar al navegador.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PUNTOS, MAXIMO_POR_GP, yaLargo, estadoGP, hayPilotosRepetidos, clasificarPodio,
    calcularPuntos, puntuarPronostico, recalcularPuntos, calcularTabla, validarPodio,
    validarPronostico, validarResultado,
  };
}
