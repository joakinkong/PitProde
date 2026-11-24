// acceso.service.js — contraseña del organizador. Quien la conoce recibe un token firmado que vence;
// sin ese token, la API deja leer pero no escribir. Sin HTTP ni SQL; la hora llega por "reloj".
'use strict';

const crypto = require('node:crypto');

const DURACION_TOKEN_MS = 12 * 60 * 60 * 1000; // 12 horas
const MAX_FALLOS = 5;
const BLOQUEO_MS = 15 * 60 * 1000; // 15 minutos

const fallo = (motivo, errores) => ({ ok: false, motivo, errores });
const sha256 = (texto) => crypto.createHash('sha256').update(String(texto)).digest();

// Crea el service. "clave" vacía = acceso deshabilitado (solo para uso local).
function crearAccesoService({ clave, reloj = () => new Date() }) {
  const habilitado = Boolean(clave);
  const intentos = new Map(); // ip -> { fallos, hasta }

  // Firma el vencimiento con la contraseña: sin conocerla no se puede fabricar un token.
  const firmar = (vence) => crypto.createHmac('sha256', clave).update(String(vence)).digest('hex');

  // Devuelve true si "token" es uno que emitió este servidor y todavía no venció.
  function tokenValido(token) {
    if (!habilitado || typeof token !== 'string') return false;
    const [vence, firma] = token.split('.');
    if (!/^\d+$/.test(vence || '') || !/^[0-9a-f]{64}$/.test(firma || '')) return false;
    if (Number(vence) <= reloj().getTime()) return false;
    return crypto.timingSafeEqual(Buffer.from(firma, 'hex'), Buffer.from(firmar(vence), 'hex'));
  }

  // Quita de la memoria a quienes ya cumplieron su bloqueo, para que el mapa no crezca sin límite.
  function limpiarVencidos() {
    const ahora = reloj().getTime();
    intentos.forEach((registro, ip) => { if (registro.hasta && registro.hasta <= ahora) intentos.delete(ip); });
  }

  return {
    habilitado,
    tokenValido,

    // Si la API pide contraseña y si el token recibido sirve.
    estado: (token) => ({ ok: true, valor: { requerido: habilitado, autenticado: !habilitado || tokenValido(token) } }),

    // Revisa la contraseña. Tras MAX_FALLOS errores seguidos desde la misma dirección, bloquea BLOQUEO_MS.
    ingresar(entrada, ip) {
      if (!habilitado) return { ok: true, valor: { requerido: false, token: null, vence: null } };
      limpiarVencidos();
      const ahora = reloj().getTime();
      const registro = intentos.get(ip) || { fallos: 0, hasta: 0 };
      if (registro.hasta > ahora) {
        return fallo('bloqueado', [`Demasiados intentos fallidos. Probá de nuevo en ${Math.ceil((registro.hasta - ahora) / 60000)} minuto(s).`]);
      }
      const recibida = entrada && typeof entrada.clave === 'string' ? entrada.clave : '';
      if (!crypto.timingSafeEqual(sha256(recibida), sha256(clave))) {
        registro.fallos += 1;
        if (registro.fallos >= MAX_FALLOS) { registro.hasta = ahora + BLOQUEO_MS; registro.fallos = 0; }
        intentos.set(ip, registro);
        return fallo('no_autorizado', ['Contraseña incorrecta.']);
      }
      intentos.delete(ip);
      const vence = ahora + DURACION_TOKEN_MS;
      return { ok: true, valor: { requerido: true, token: `${vence}.${firmar(vence)}`, vence: new Date(vence).toISOString() } };
    },
  };
}

module.exports = { crearAccesoService };
