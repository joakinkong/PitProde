// pronosticos.service.js — reglas del prode para los pronósticos.
// No sabe nada de HTTP ni de SQL: recibe objetos y devuelve { ok, ... }. La hora llega por "reloj",
// así el bloqueo por largada se prueba con cualquier fecha y en producción manda la hora del servidor.
'use strict';

const { validarPronostico, calcularPuntos, estadoGP, yaLargo } = require('../../../scoring.js');

const CAMPOS_PODIO = ['p1', 'p2', 'p3', 'pole'];
const MENSAJE_BLOQUEADO = 'Ese GP ya largó: el pronóstico está bloqueado.';

// Deja solo los campos que se aceptan; todo lo que no sea texto cuenta como vacío.
function limpiarEntrada(entrada, campos) {
  const limpia = {};
  campos.forEach((campo) => {
    limpia[campo] = typeof entrada[campo] === 'string' ? entrada[campo].trim() : '';
  });
  return limpia;
}

// Devuelve { ok: false, motivo, errores } con el motivo que usa el controller para elegir el código HTTP.
const fallo = (motivo, errores) => ({ ok: false, motivo, errores });
const noExiste = () => fallo('no_encontrado', ['No existe ese pronóstico.']);

// Crea el service. "dependencias": { pronosticos, jugadores, pilotos, grandesPremios, reloj, generarId }.
function crearPronosticosService({ pronosticos, jugadores, pilotos, grandesPremios, reloj = () => new Date(), generarId }) {
  // Arma el objeto "datos" que esperan las validaciones de scoring.js, con lo mínimo necesario.
  function datosParaValidar(jugadorId, gp) {
    const jugador = jugadores.obtener(jugadorId);
    return {
      jugadores: jugador ? [jugador] : [],
      grandesPremios: gp ? [gp] : [],
      pilotos: pilotos.listar(),
    };
  }

  // Valida el pronóstico con las reglas del prode y rechaza pilotos inactivos (no se puede pronosticar con ellos).
  function validar(entrada, gp) {
    const datos = datosParaValidar(entrada.jugadorId, gp);
    const errores = validarPronostico(entrada, datos, reloj());
    if (errores.length) return errores;
    return CAMPOS_PODIO
      .map((campo) => datos.pilotos.find((p) => p.id === entrada[campo]))
      .filter((piloto) => piloto && !piloto.activo)
      .map((piloto) => `${piloto.nombre} está inactivo: no se puede elegir.`);
  }

  // Agrega los puntos (calculados al leer, nunca guardados) y el estado del GP.
  function presentar(pronostico, gp) {
    const puntos = gp && gp.resultado ? calcularPuntos(pronostico, gp.resultado) : null;
    return { ...pronostico, puntos, estadoGP: gp ? estadoGP(gp, reloj()) : null };
  }

  return {
    // Crea un pronóstico. Reglas: jugador y GP existentes, GP sin largar, podio válido, uno por jugador y GP.
    crear(entrada) {
      const datos = limpiarEntrada(entrada, ['jugadorId', 'gpId', ...CAMPOS_PODIO]);
      const gp = grandesPremios.obtener(datos.gpId);
      const errores = validar(datos, gp);
      if (errores.length) return fallo('invalido', errores);
      if (pronosticos.obtenerPorJugadorYGP(datos.jugadorId, datos.gpId)) {
        return fallo('duplicado', ['Ese jugador ya tiene un pronóstico para este GP. Editá el que existe.']);
      }
      const creado = pronosticos.crear({ id: generarId(), ...datos, fechaCarga: reloj().toISOString() });
      return { ok: true, pronostico: presentar(creado, gp) };
    },

    // Cambia el podio y la pole de un pronóstico. El jugador y el GP no se pueden cambiar.
    editar(id, entrada) {
      const existente = pronosticos.obtener(id);
      if (!existente) return noExiste();
      const cambios = limpiarEntrada(entrada, CAMPOS_PODIO);
      const gp = grandesPremios.obtener(existente.gpId);
      const errores = validar({ jugadorId: existente.jugadorId, gpId: existente.gpId, ...cambios }, gp);
      if (errores.length) return fallo('invalido', errores);
      const editado = pronosticos.actualizar(id, { ...cambios, fechaCarga: reloj().toISOString() });
      return { ok: true, pronostico: presentar(editado, gp) };
    },

    // Borra un pronóstico, solo si el GP todavía no largó.
    eliminar(id) {
      const existente = pronosticos.obtener(id);
      if (!existente) return noExiste();
      const gp = grandesPremios.obtener(existente.gpId);
      if (gp && yaLargo(gp, reloj())) return fallo('invalido', [MENSAJE_BLOQUEADO]);
      pronosticos.eliminar(id);
      return { ok: true, pronostico: { eliminado: true } };
    },

    // Marca o desmarca un pronóstico como favorito (se puede hacer aunque el GP ya haya largado).
    marcarFavorito(id, favorito) {
      if (typeof favorito !== 'boolean') return fallo('invalido', ['"favorito" tiene que ser true o false.']);
      const existente = pronosticos.obtener(id);
      if (!existente) return noExiste();
      const actualizado = pronosticos.ponerFavorito(id, favorito);
      return { ok: true, pronostico: presentar(actualizado, grandesPremios.obtener(existente.gpId)) };
    },

    // Devuelve un pronóstico con sus puntos, o un error si no existe.
    obtener(id) {
      const pronostico = pronosticos.obtener(id);
      if (!pronostico) return noExiste();
      return { ok: true, pronostico: presentar(pronostico, grandesPremios.obtener(pronostico.gpId)) };
    },

    // Lista pronósticos con sus puntos; "filtros" admite gpId, jugadorId y estado (proximo, cerrado, finalizado).
    listar(filtros = {}) {
      const gps = new Map(grandesPremios.listar().map((g) => [g.id, g]));
      const lista = pronosticos
        .listar({ gpId: filtros.gpId || null, jugadorId: filtros.jugadorId || null })
        .map((p) => presentar(p, gps.get(p.gpId)))
        .filter((p) => !filtros.estado || p.estadoGP === filtros.estado);
      return { ok: true, pronosticos: lista };
    },
  };
}

module.exports = { crearPronosticosService };
