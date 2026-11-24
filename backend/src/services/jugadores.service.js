// jugadores.service.js — reglas de los jugadores. Sin HTTP ni SQL; devuelve { ok, valor } o { ok: false, motivo, errores }.
'use strict';

const MAX_NOMBRE = 30;
const MAX_APODO = 20;
const COLOR_POR_DEFECTO = '#888888';

const fallo = (motivo, errores) => ({ ok: false, motivo, errores });
const noExiste = () => fallo('no_encontrado', ['No existe ese jugador.']);
const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

// Crea el service de jugadores. "dependencias": { jugadores, reloj, generarId }.
function crearJugadoresService({ jugadores, reloj = () => new Date(), generarId }) {
  // Normaliza la entrada y devuelve { datos, errores }. "exceptoId" es el jugador que se está editando.
  function revisar(entrada, exceptoId) {
    const datos = { nombre: texto(entrada.nombre), apodo: texto(entrada.apodo), color: texto(entrada.color) || COLOR_POR_DEFECTO };
    if (!datos.nombre) return { datos, errores: ['El nombre es obligatorio.'], motivo: 'invalido' };
    if (datos.nombre.length > MAX_NOMBRE || datos.apodo.length > MAX_APODO) {
      return { datos, errores: [`El nombre admite hasta ${MAX_NOMBRE} caracteres y el apodo hasta ${MAX_APODO}.`], motivo: 'invalido' };
    }
    const repetido = jugadores.listar().some((j) => j.id !== exceptoId && j.nombre.toLowerCase() === datos.nombre.toLowerCase());
    if (repetido) return { datos, errores: ['Ya existe un jugador con ese nombre.'], motivo: 'duplicado' };
    return { datos, errores: [] };
  }

  return {
    // Lista todos los jugadores.
    listar: () => ({ ok: true, valor: jugadores.listar() }),

    // Crea un jugador con id y fecha de alta del servidor.
    crear(entrada) {
      const { datos, errores, motivo } = revisar(entrada);
      if (errores.length) return fallo(motivo, errores);
      return { ok: true, valor: jugadores.crear({ id: generarId(), ...datos, fechaAlta: reloj().toISOString() }) };
    },

    // Edita nombre, apodo y color.
    editar(id, entrada) {
      if (!jugadores.obtener(id)) return noExiste();
      const { datos, errores, motivo } = revisar(entrada, id);
      if (errores.length) return fallo(motivo, errores);
      return { ok: true, valor: jugadores.actualizar(id, datos) };
    },

    // Borra el jugador y, con él, sus pronósticos. Devuelve cuántos se borraron.
    eliminar(id) {
      if (!jugadores.obtener(id)) return noExiste();
      const pronosticosBorrados = jugadores.contarPronosticos(id);
      jugadores.eliminar(id);
      return { ok: true, valor: { eliminado: true, pronosticosBorrados } };
    },
  };
}

module.exports = { crearJugadoresService };
