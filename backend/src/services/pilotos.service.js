// pilotos.service.js — reglas de los pilotos. Sin HTTP ni SQL; devuelve { ok, valor } o { ok: false, motivo, errores }.
'use strict';

const MAX_NOMBRE = 40;
const MAX_EQUIPO = 30;

const fallo = (motivo, errores) => ({ ok: false, motivo, errores });
const noExiste = () => fallo('no_encontrado', ['No existe ese piloto.']);
const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

// Normaliza la entrada y devuelve { datos, errores }.
function revisar(entrada) {
  const datos = {
    nombre: texto(entrada.nombre), equipo: texto(entrada.equipo), numero: entrada.numero,
    activo: entrada.activo === undefined ? true : entrada.activo,
  };
  const errores = [];
  if (!datos.nombre) errores.push('El nombre es obligatorio.');
  if (!datos.equipo) errores.push('El equipo es obligatorio.');
  if (datos.nombre.length > MAX_NOMBRE || datos.equipo.length > MAX_EQUIPO) {
    errores.push(`El nombre admite hasta ${MAX_NOMBRE} caracteres y el equipo hasta ${MAX_EQUIPO}.`);
  }
  if (!Number.isInteger(datos.numero) || datos.numero < 0 || datos.numero > 99) {
    errores.push('El número tiene que ser un entero entre 0 y 99.');
  }
  if (typeof datos.activo !== 'boolean') errores.push('"activo" tiene que ser true o false.');
  return { datos, errores };
}

// Crea el service de pilotos. "dependencias": { pilotos, generarId }.
function crearPilotosService({ pilotos, generarId }) {
  return {
    // Lista todos los pilotos.
    listar: async () => ({ ok: true, valor: await pilotos.listar() }),

    // Crea un piloto con id del servidor.
    async crear(entrada) {
      const { datos, errores } = revisar(entrada);
      if (errores.length) return fallo('invalido', errores);
      return { ok: true, valor: await pilotos.crear({ id: generarId(), ...datos }) };
    },

    // Edita un piloto.
    async editar(id, entrada) {
      if (!await pilotos.obtener(id)) return noExiste();
      const { datos, errores } = revisar(entrada);
      if (errores.length) return fallo('invalido', errores);
      return { ok: true, valor: await pilotos.actualizar(id, datos) };
    },

    // Borra un piloto, salvo que algún pronóstico o resultado lo use (en ese caso se sugiere desactivarlo).
    async eliminar(id) {
      const piloto = await pilotos.obtener(id);
      if (!piloto) return noExiste();
      const usos = await pilotos.usos(id);
      if (usos.pronosticos + usos.resultados > 0) {
        return fallo('en_uso', [`${piloto.nombre} aparece en ${usos.pronosticos} pronóstico(s) y ${usos.resultados} resultado(s). Desactivalo en vez de borrarlo.`]);
      }
      await pilotos.eliminar(id);
      return { ok: true, valor: { eliminado: true } };
    },
  };
}

module.exports = { crearPilotosService };
