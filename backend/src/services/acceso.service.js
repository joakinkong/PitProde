// acceso.service.js — contraseña del organizador. Quien la conoce recibe un token firmado que vence;
// sin ese token, la API deja leer pero no escribir. Sin HTTP ni SQL; la hora llega por "reloj".
'use strict';

const crypto = require('node:crypto');

const DURACION_TOKEN_MS = 12 * 60 * 60 * 1000; // 12 horas
const MAX_FALLOS = 5;
const BLOQUEO_MS = 15 * 60 * 1000; // 15 minutos
const MAX_DIRECCIONES = 10000; // tope de direcciones recordadas, para que el mapa no crezca sin límite

const fallo = (motivo, errores) => ({ ok: false, motivo, errores });
const sha256 = (texto) => crypto.createHash('sha256').update(String(texto)).digest();

// Crea el service. "clave" vacía = acceso deshabilitado (solo para uso local).
function crearAccesoService({ clave, reloj = () => new Date(), maxDirecciones = MAX_DIRECCIONES }) {
  const habilitado = Boolean(clave);
  const intentos = new Map(); // ip -> { fallos, hasta (fin del bloqueo, 0 si no está bloqueada), ultimo (último intento fallido) }

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

  // Olvida a quienes ya cumplieron su bloqueo y a quienes fallaron hace más de BLOQUEO_MS sin llegar a bloquearse
  // (así el contador de fallos también se reinicia con el tiempo). Si aun así hay demasiadas, descarta las más viejas.
  function limpiarVencidos(ahora) {
    intentos.forEach((registro, ip) => {
      const vencido = registro.hasta ? registro.hasta <= ahora : registro.ultimo + BLOQUEO_MS <= ahora;
      if (vencido) intentos.delete(ip);
    });
    // Al descartar se prefiere a quien no está bloqueada: borrar a una bloqueada le devolvería los intentos.
    while (intentos.size >= maxDirecciones) {
      const libre = [...intentos].find(([, registro]) => !(registro.hasta > ahora));
      intentos.delete(libre ? libre[0] : intentos.keys().next().value);
    }
  }

  return {
    habilitado,
    tokenValido,

    // Si la API pide contraseña y si el token recibido sirve.
    estado: (token) => ({ ok: true, valor: { requerido: habilitado, autenticado: !habilitado || tokenValido(token) } }),

    // Revisa la contraseña. Tras MAX_FALLOS errores seguidos desde la misma dirección, bloquea BLOQUEO_MS.
    ingresar(entrada, ip) {
      if (!habilitado) return { ok: true, valor: { requerido: false, token: null, vence: null } };
      const ahora = reloj().getTime();
      limpiarVencidos(ahora);
      const registro = intentos.get(ip) || { fallos: 0, hasta: 0, ultimo: ahora };
      if (registro.hasta > ahora) {
        return fallo('bloqueado', [`Demasiados intentos fallidos. Probá de nuevo en ${Math.ceil((registro.hasta - ahora) / 60000)} minuto(s).`]);
      }
      const recibida = entrada && typeof entrada.clave === 'string' ? entrada.clave : '';
      if (!crypto.timingSafeEqual(sha256(recibida), sha256(clave))) {
        registro.fallos += 1;
        registro.ultimo = ahora;
        if (registro.fallos >= MAX_FALLOS) { registro.hasta = ahora + BLOQUEO_MS; registro.fallos = 0; }
        intentos.delete(ip); // se vuelve a insertar al final: el mapa queda ordenado de más viejo a más nuevo
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
