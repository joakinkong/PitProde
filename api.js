// api.js — cliente de la API del backend. Nunca lanza excepciones: devuelve { ok: true, datos }
// o { ok: false, estado, errores } para mostrar en pantalla.
// Usa window.PITPRODE_API_URL (config.js) como dirección del servidor y, si el organizador ingresó,
// manda su token en cada pedido. El token vive solo mientras la pestaña esté abierta (sessionStorage).
'use strict';

const MENSAJE_SIN_CONEXION = 'No se pudo conectar con el servidor. Si es la versión publicada, puede estar despertando: esperá un minuto y probá de nuevo.';
const CLAVE_TOKEN = 'pitprode.token';

// sessionStorage puede no estar disponible (modo privado, bloqueado): en ese caso el token vive solo en memoria.
let tokenEnMemoria = null;
function leerTokenGuardado() {
  try { return sessionStorage.getItem(CLAVE_TOKEN) || tokenEnMemoria; } catch (error) { return tokenEnMemoria; }
}

const API = {
  // Se ejecuta cuando el servidor rechaza un pedido por falta de token o por token vencido.
  alNoAutorizado: null,

  // Dirección base de la API: "/api" en local, o "https://servidor/api" si el frontend está publicado aparte.
  base: () => `${String(window.PITPRODE_API_URL || '').replace(/\/+$/, '')}/api`,

  guardarToken(token) {
    tokenEnMemoria = token;
    try { sessionStorage.setItem(CLAVE_TOKEN, token); } catch (error) { /* queda en memoria */ }
  },

  borrarToken() {
    tokenEnMemoria = null;
    try { sessionStorage.removeItem(CLAVE_TOKEN); } catch (error) { /* nada que borrar */ }
  },

  hayToken: () => Boolean(leerTokenGuardado()),

  // Hace una petición a la API. "cuerpo" (opcional) se manda como JSON.
  async pedir(metodo, ruta, cuerpo) {
    const cabeceras = {};
    if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';
    const token = leerTokenGuardado();
    if (token) cabeceras.Authorization = `Bearer ${token}`;
    let respuesta;
    try {
      respuesta = await fetch(API.base() + ruta, {
        method: metodo, headers: cabeceras, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      });
    } catch (error) {
      return { ok: false, sinConexion: true, errores: [MENSAJE_SIN_CONEXION] };
    }
    let datos = null;
    try {
      datos = await respuesta.json();
    } catch (error) {
      datos = null; // respuesta sin JSON: se informa solo el código
    }
    if (respuesta.ok) return { ok: true, datos };
    // Entrar con una contraseña mal escrita también da 401, pero eso no es "sesión vencida".
    if (respuesta.status === 401 && ruta !== '/acceso' && API.alNoAutorizado) API.alNoAutorizado();
    const errores = datos && Array.isArray(datos.errores) ? datos.errores : [`El servidor respondió con el error ${respuesta.status}.`];
    return { ok: false, estado: respuesta.status, errores };
  },
};
