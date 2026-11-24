// grandesPremios.service.js — reglas de los Grandes Premios y sus resultados.
// Sin HTTP ni SQL; devuelve { ok, valor } o { ok: false, motivo, errores }. La hora llega por "reloj".
'use strict';

const { validarResultado, estadoGP } = require('../../../scoring.js');

const MAX_NOMBRE = 50;

const fallo = (motivo, errores) => ({ ok: false, motivo, errores });
const noExiste = () => fallo('no_encontrado', ['No existe ese Gran Premio.']);
const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');
const esFecha = (valor) => typeof valor === 'string' && valor.trim() !== '' && !Number.isNaN(Date.parse(valor));

// Crea el service de GPs. "dependencias": { grandesPremios, pilotos, reloj, generarId }.
function crearGrandesPremiosService({ grandesPremios, pilotos, reloj = () => new Date(), generarId }) {
  // Agrega el estado calculado (proximo, cerrado o finalizado).
  const presentar = (gp) => ({ ...gp, estado: estadoGP(gp, reloj()) });

  // Normaliza la entrada y devuelve { datos, errores }. "existente" es el GP que se está editando.
  function revisar(entrada, existente) {
    const datos = { nombre: texto(entrada.nombre), circuito: texto(entrada.circuito), fechaLargada: texto(entrada.fechaLargada) };
    const errores = [];
    if (!datos.nombre) errores.push('El nombre es obligatorio.');
    if (!datos.circuito) errores.push('El circuito es obligatorio.');
    if (datos.nombre.length > MAX_NOMBRE || datos.circuito.length > MAX_NOMBRE) errores.push(`El nombre y el circuito admiten hasta ${MAX_NOMBRE} caracteres.`);
    if (!esFecha(datos.fechaLargada)) errores.push('Elegí la fecha y la hora de largada.');
    else if (existente && existente.resultado && new Date(datos.fechaLargada) > reloj()) {
      errores.push('Este GP ya tiene resultado: la largada no puede quedar en el futuro.');
    }
    return { datos, errores };
  }

  return {
    // Lista todos los GPs con su estado.
    listar: async () => ({ ok: true, valor: (await grandesPremios.listar()).map(presentar) }),

    // Crea un GP sin resultado.
    async crear(entrada) {
      const { datos, errores } = revisar(entrada, null);
      if (errores.length) return fallo('invalido', errores);
      return { ok: true, valor: presentar(await grandesPremios.crear({ id: generarId(), ...datos })) };
    },

    // Edita nombre, circuito y largada.
    async editar(id, entrada) {
      const existente = await grandesPremios.obtener(id);
      if (!existente) return noExiste();
      const { datos, errores } = revisar(entrada, existente);
      if (errores.length) return fallo('invalido', errores);
      return { ok: true, valor: presentar(await grandesPremios.actualizar(id, datos)) };
    },

    // Borra el GP y, con él, sus pronósticos. Devuelve cuántos se borraron.
    async eliminar(id) {
      if (!await grandesPremios.obtener(id)) return noExiste();
      const pronosticosBorrados = await grandesPremios.contarPronosticos(id);
      await grandesPremios.eliminar(id);
      return { ok: true, valor: { eliminado: true, pronosticosBorrados } };
    },

    // Carga o corrige el resultado real; solo se puede después de la largada (hora del servidor).
    async cargarResultado(id, entrada) {
      const gp = await grandesPremios.obtener(id);
      if (!gp) return noExiste();
      const resultado = {};
      ['p1', 'p2', 'p3', 'pole'].forEach((campo) => { resultado[campo] = texto(entrada[campo]); });
      const errores = validarResultado(resultado, gp, await pilotos.listar(), reloj());
      if (errores.length) return fallo('invalido', errores);
      return { ok: true, valor: presentar(await grandesPremios.guardarResultado(id, resultado)) };
    },

    // Quita el resultado: los pronósticos del GP vuelven a quedar sin puntos.
    async quitarResultado(id) {
      if (!await grandesPremios.obtener(id)) return noExiste();
      return { ok: true, valor: presentar(await grandesPremios.quitarResultado(id)) };
    },
  };
}

module.exports = { crearGrandesPremiosService };
