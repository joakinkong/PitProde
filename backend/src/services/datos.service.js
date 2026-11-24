// datos.service.js — vistas y operaciones sobre todos los datos juntos: tabla, carga inicial,
// exportar e importar. Reutiliza scoring.js (puntos y tabla) y storage.js (formato y validación del JSON).
'use strict';

const scoring = require('../../../scoring.js');
const { exportarDatos, importarDatos } = require('../../../storage.js');

const { calcularTabla } = scoring;

// storage.js es un script de navegador: usa hayPilotosRepetidos y recalcularPuntos de scoring.js como globales.
// En Node no existen, así que se publican acá (sin tocar storage.js, que el frontend sigue cargando tal cual).
Object.assign(globalThis, { hayPilotosRepetidos: scoring.hayPilotosRepetidos, recalcularPuntos: scoring.recalcularPuntos });

// Crea el service de datos. "dependencias": { jugadores, pilotos, grandesPremios, pronosticosService, datos }.
function crearDatosService({ jugadores, pilotos, grandesPremios, pronosticosService, datos }) {
  // Todo lo guardado, con los puntos de cada pronóstico calculados al leer.
  function leerTodo() {
    return {
      jugadores: jugadores.listar(),
      pilotos: pilotos.listar(),
      grandesPremios: grandesPremios.listar(),
      pronosticos: pronosticosService.listar().pronosticos,
    };
  }

  return {
    // Todos los datos juntos: es lo que pide el frontend al cargar.
    todo: () => ({ ok: true, valor: leerTodo() }),

    // Tabla de posiciones: puntos, exactos, carreras y posición (con empates compartidos).
    tabla() {
      const { jugadores: js, pronosticos, grandesPremios: gps } = leerTodo();
      return { ok: true, valor: calcularTabla(js, pronosticos, gps) };
    },

    // Texto JSON con el mismo formato de backup que ya usaba el frontend.
    exportar: () => ({ ok: true, valor: JSON.parse(exportarDatos(leerTodo())) }),

    // Valida el objeto con las reglas de storage.js y, si está bien, reemplaza TODO lo guardado.
    // Si no es válido, no se toca nada.
    importar(objeto) {
      const resultado = importarDatos(JSON.stringify(objeto));
      if (!resultado.ok) return { ok: false, motivo: 'invalido', errores: resultado.errores };
      datos.reemplazarTodo(resultado.datos);
      return { ok: true, valor: { importado: true } };
    },
  };
}

module.exports = { crearDatosService };
