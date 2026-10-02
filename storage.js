// storage.js — lectura y escritura en localStorage, exportar/importar JSON y datos iniciales (2026).
// Depende de scoring.js (hayPilotosRepetidos y recalcularPuntos), que se carga después pero
// solo se usa cuando las funciones se ejecutan.
'use strict';

const CLAVE_STORAGE = 'pitprode.datos';
const CLAVE_RESPALDO = 'pitprode.datos.respaldo';
const VERSION_DATOS = 1;
const COLECCIONES = ['jugadores', 'pilotos', 'grandesPremios', 'pronosticos'];
const POSICIONES = ['p1', 'p2', 'p3', 'pole'];
const MAXIMO_ERRORES = 5;

// ---------- Utilidades ----------

// Genera un id único y corto.
function generarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Devuelve true si localStorage existe y se puede escribir (puede fallar en modo privado).
function localStorageDisponible() {
  try {
    localStorage.setItem('__pitprode_prueba__', '1');
    localStorage.removeItem('__pitprode_prueba__');
    return true;
  } catch (error) {
    return false;
  }
}

// ---------- Datos iniciales ----------

function crearDatosVacios() {
  return { jugadores: [], pilotos: [], grandesPremios: [], pronosticos: [] };
}

// Grilla 2026: [id, nombre, equipo, número].
const GRILLA_2026 = [
  ['ant', 'Kimi Antonelli', 'Mercedes', 12], ['rus', 'George Russell', 'Mercedes', 63],
  ['ham', 'Lewis Hamilton', 'Ferrari', 44], ['lec', 'Charles Leclerc', 'Ferrari', 16],
  ['nor', 'Lando Norris', 'McLaren', 1], ['pia', 'Oscar Piastri', 'McLaren', 81],
  ['ver', 'Max Verstappen', 'Red Bull', 3], ['had', 'Isack Hadjar', 'Red Bull', 6],
  ['law', 'Liam Lawson', 'Racing Bulls', 30], ['lin', 'Arvid Lindblad', 'Racing Bulls', 41],
  ['gas', 'Pierre Gasly', 'Alpine', 10], ['col', 'Franco Colapinto', 'Alpine', 43],
  ['bea', 'Oliver Bearman', 'Haas', 87], ['oco', 'Esteban Ocon', 'Haas', 31],
  ['bor', 'Gabriel Bortoleto', 'Audi', 5], ['hul', 'Nico Hülkenberg', 'Audi', 27],
  ['sai', 'Carlos Sainz', 'Williams', 55], ['alb', 'Alexander Albon', 'Williams', 23],
  ['alo', 'Fernando Alonso', 'Aston Martin', 14], ['str', 'Lance Stroll', 'Aston Martin', 18],
  ['per', 'Sergio Pérez', 'Cadillac', 11], ['bot', 'Valtteri Bottas', 'Cadillac', 77],
];

// Calendario 2026: [id, nombre, circuito, largada en UTC].
const CALENDARIO_2026 = [
  ['aus', 'Gran Premio de Australia', 'Albert Park Circuit', '2026-03-08T04:00:00Z'],
  ['chn', 'Gran Premio de China', 'Shanghai International Circuit', '2026-03-15T07:00:00Z'],
  ['jpn', 'Gran Premio de Japón', 'Suzuka Circuit', '2026-03-29T05:00:00Z'],
  ['mia', 'Gran Premio de Miami', 'Miami International Autodrome', '2026-05-03T20:00:00Z'],
  ['can', 'Gran Premio de Canadá', 'Circuit Gilles Villeneuve', '2026-05-24T18:00:00Z'],
  ['mco', 'Gran Premio de Mónaco', 'Circuit de Monaco', '2026-06-07T13:00:00Z'],
  ['esp', 'Gran Premio de España', 'Circuit de Barcelona-Catalunya', '2026-06-14T13:00:00Z'],
  ['aut', 'Gran Premio de Austria', 'Red Bull Ring', '2026-06-28T13:00:00Z'],
  ['gbr', 'Gran Premio de Gran Bretaña', 'Silverstone Circuit', '2026-07-05T14:00:00Z'],
  ['bel', 'Gran Premio de Bélgica', 'Circuit de Spa-Francorchamps', '2026-07-19T13:00:00Z'],
  ['hun', 'Gran Premio de Hungría', 'Hungaroring', '2026-07-26T13:00:00Z'],
  ['nld', 'Gran Premio de Países Bajos', 'Circuit Zandvoort', '2026-08-23T13:00:00Z'],
  ['ita', 'Gran Premio de Italia', 'Autodromo Nazionale Monza', '2026-09-06T13:00:00Z'],
  ['mad', 'Gran Premio de Madrid', 'Madrid Street Circuit', '2026-09-13T13:00:00Z'],
  ['aze', 'Gran Premio de Azerbaiyán', 'Baku City Circuit', '2026-09-27T11:00:00Z'],
  ['bmy', 'Gran Premio de Bahréin', 'Sepang International Circuit', '2026-10-04T07:00:00Z'],
  ['sgp', 'Gran Premio de Singapur', 'Marina Bay Street Circuit', '2026-10-11T12:00:00Z'],
  ['usa', 'Gran Premio de Estados Unidos', 'Circuit of the Americas', '2026-10-25T19:00:00Z'],
  ['mex', 'Gran Premio de México', 'Autódromo Hermanos Rodríguez', '2026-11-01T20:00:00Z'],
  ['sao', 'Gran Premio de São Paulo', 'Interlagos Circuit', '2026-11-08T17:00:00Z'],
  ['las', 'Gran Premio de Las Vegas', 'Las Vegas Strip Circuit', '2026-11-22T06:00:00Z'],
  ['qat', 'Gran Premio de Qatar', 'Lusail International Circuit', '2026-11-29T13:00:00Z'],
  ['abu', 'Gran Premio de Abu Dabi', 'Yas Marina Circuit', '2026-12-06T13:00:00Z'],
];

// Datos con los que arranca la app la primera vez: grilla y calendario 2026, sin jugadores.
function crearDatosIniciales() {
  const datos = crearDatosVacios();
  datos.pilotos = GRILLA_2026.map(([id, nombre, equipo, numero]) => (
    { id: `piloto-${id}`, nombre, equipo, numero, activo: true }
  ));
  datos.grandesPremios = CALENDARIO_2026.map(([id, nombre, circuito, fechaLargada]) => (
    { id: `gp-${id}`, nombre, circuito, fechaLargada, resultado: null }
  ));
  return datos;
}

// ---------- Validación de datos importados ----------

const esTexto = (valor) => typeof valor === 'string' && valor.trim() !== '';
const esFecha = (valor) => esTexto(valor) && !Number.isNaN(Date.parse(valor));
const idsDe = (lista) => new Set(lista.map((registro) => registro && registro.id));

// Chequea que una entrada con P1, P2, P3 y pole use pilotos existentes y sin repetir en el podio.
function errorDePodio(entrada, idsPilotos) {
  if (!entrada || typeof entrada !== 'object') return 'tiene un podio inválido';
  if (!POSICIONES.every((pos) => idsPilotos.has(entrada[pos]))) return 'usa un piloto que no existe';
  return hayPilotosRepetidos(entrada) ? 'repite pilotos en el podio' : '';
}

// Reglas de cada tipo de registro. Devuelven un texto con el problema o '' si está bien.
function errorDeJugador(j) {
  return esTexto(j.id) && esTexto(j.nombre) ? '' : 'le falta el id o el nombre';
}

function errorDePiloto(p) {
  if (!esTexto(p.id) || !esTexto(p.nombre) || !esTexto(p.equipo)) return 'le falta el id, el nombre o el equipo';
  return Number.isInteger(p.numero) && typeof p.activo === 'boolean' ? '' : 'tiene número o estado "activo" inválido';
}

function errorDeGP(gp, idsPilotos) {
  if (!esTexto(gp.id) || !esTexto(gp.nombre) || !esTexto(gp.circuito)) return 'le falta el id, el nombre o el circuito';
  if (!esFecha(gp.fechaLargada)) return 'tiene una fecha de largada inválida';
  return gp.resultado ? errorDePodio(gp.resultado, idsPilotos) : '';
}

function errorDePronostico(p, ids) {
  if (!esTexto(p.id)) return 'le falta el id';
  if (!ids.jugadores.has(p.jugadorId)) return 'apunta a un jugador que no existe';
  if (!ids.grandesPremios.has(p.gpId)) return 'apunta a un GP que no existe';
  return errorDePodio(p, ids.pilotos);
}

// Valida la estructura completa. Devuelve la lista de problemas (vacía si el archivo sirve).
function validarDatos(objeto) {
  if (objeto === null || typeof objeto !== 'object' || Array.isArray(objeto)) {
    return ['El archivo no tiene el formato de PitProde.'];
  }
  const faltantes = COLECCIONES.filter((nombre) => !Array.isArray(objeto[nombre]));
  if (faltantes.length) return faltantes.map((nombre) => `Falta la lista "${nombre}".`);

  const ids = {
    jugadores: idsDe(objeto.jugadores), pilotos: idsDe(objeto.pilotos), grandesPremios: idsDe(objeto.grandesPremios),
  };
  const reglas = {
    jugadores: (r) => errorDeJugador(r),
    pilotos: (r) => errorDePiloto(r),
    grandesPremios: (r) => errorDeGP(r, ids.pilotos),
    pronosticos: (r) => errorDePronostico(r, ids),
  };
  const errores = [];
  COLECCIONES.forEach((nombre) => {
    objeto[nombre].forEach((registro, i) => {
      const problema = registro && typeof registro === 'object' ? reglas[nombre](registro) : 'no es un registro válido';
      if (problema) errores.push(`${nombre} #${i + 1}: ${problema}.`);
    });
  });
  return errores.concat(erroresDeDuplicados(objeto));
}

// Detecta ids repetidos y más de un pronóstico por jugador y GP.
function erroresDeDuplicados(objeto) {
  const errores = [];
  COLECCIONES.forEach((nombre) => {
    if (idsDe(objeto[nombre]).size !== objeto[nombre].length) errores.push(`Hay ids repetidos en "${nombre}".`);
  });
  const pares = objeto.pronosticos.map((p) => `${p.jugadorId}|${p.gpId}`);
  if (new Set(pares).size !== pares.length) errores.push('Hay más de un pronóstico del mismo jugador para el mismo GP.');
  return errores;
}

// Arma los datos limpios (solo los campos conocidos) y con los puntos recalculados.
function normalizarDatos(objeto) {
  const ahora = new Date().toISOString();
  const datos = {
    jugadores: objeto.jugadores.map((j) => ({
      id: j.id, nombre: j.nombre.trim(), apodo: esTexto(j.apodo) ? j.apodo.trim() : '',
      color: esTexto(j.color) ? j.color : '#888888', fechaAlta: esFecha(j.fechaAlta) ? j.fechaAlta : ahora,
    })),
    pilotos: objeto.pilotos.map((p) => ({
      id: p.id, nombre: p.nombre.trim(), equipo: p.equipo.trim(), numero: p.numero, activo: p.activo,
    })),
    grandesPremios: objeto.grandesPremios.map((g) => ({
      id: g.id, nombre: g.nombre.trim(), circuito: g.circuito.trim(), fechaLargada: g.fechaLargada,
      resultado: g.resultado ? { p1: g.resultado.p1, p2: g.resultado.p2, p3: g.resultado.p3, pole: g.resultado.pole } : null,
    })),
    pronosticos: objeto.pronosticos.map((p) => ({
      id: p.id, jugadorId: p.jugadorId, gpId: p.gpId, p1: p.p1, p2: p.p2, p3: p.p3, pole: p.pole,
      fechaCarga: esFecha(p.fechaCarga) ? p.fechaCarga : ahora, puntos: null, favorito: p.favorito === true,
    })),
  };
  datos.pronosticos = recalcularPuntos(datos);
  return datos;
}

// ---------- Importar y exportar ----------

// Convierte los datos a texto JSON listo para descargar.
function exportarDatos(datos) {
  return JSON.stringify({
    app: 'PitProde', version: VERSION_DATOS, exportadoEn: new Date().toISOString(), ...datos,
  }, null, 2);
}

// Lee un texto JSON. Devuelve { ok: true, datos } o { ok: false, errores } sin tocar nada guardado.
function importarDatos(texto) {
  let objeto;
  try {
    objeto = JSON.parse(texto);
  } catch (error) {
    return { ok: false, errores: ['El archivo no es un JSON válido (está roto o incompleto).'] };
  }
  const errores = validarDatos(objeto);
  if (errores.length) {
    const resto = errores.length - MAXIMO_ERRORES;
    const mostrados = errores.slice(0, MAXIMO_ERRORES);
    if (resto > 0) mostrados.push(`...y ${resto} problema(s) más.`);
    return { ok: false, errores: mostrados };
  }
  return { ok: true, datos: normalizarDatos(objeto) };
}

// ---------- localStorage ----------

// Carga los datos guardados. Devuelve { datos, persistente, aviso }:
// "aviso" es un texto para mostrarle al usuario si pasó algo raro.
function cargarDatos() {
  if (!localStorageDisponible()) {
    return {
      datos: crearDatosIniciales(),
      persistente: false,
      aviso: 'Tu navegador no deja guardar datos (localStorage no está disponible). Podés usar la app, pero se pierde al cerrar la pestaña: exportá un JSON para no perder nada.',
    };
  }
  const crudo = localStorage.getItem(CLAVE_STORAGE);
  if (crudo === null) return { datos: crearDatosIniciales(), persistente: true, aviso: '' };

  const resultado = importarDatos(crudo);
  if (resultado.ok) return { datos: resultado.datos, persistente: true, aviso: '' };

  // Datos dañados: se guarda una copia aparte antes de arrancar de cero.
  try { localStorage.setItem(CLAVE_RESPALDO, crudo); } catch (error) { /* sin espacio: seguimos igual */ }
  return {
    datos: crearDatosIniciales(),
    persistente: true,
    aviso: 'Los datos guardados estaban dañados. Dejé una copia sin tocar en el navegador (clave "pitprode.datos.respaldo") y arranqué con datos nuevos.',
  };
}

// Guarda los datos. Devuelve { ok: true } o { ok: false, error }.
function guardarDatos(datos) {
  try {
    localStorage.setItem(CLAVE_STORAGE, JSON.stringify(datos));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: 'No se pudieron guardar los datos en este navegador. Exportá un JSON para no perder lo cargado.' };
  }
}

// Permite usar este archivo desde Node (pruebas) sin afectar al navegador.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { crearDatosIniciales, crearDatosVacios, exportarDatos, importarDatos, validarDatos, generarId };
}
