// api.js — cliente de la API del backend (mismo origen: /api/...).
// Nunca lanza excepciones: devuelve { ok: true, datos } o { ok: false, errores } para mostrar en pantalla.
'use strict';

const MENSAJE_SIN_CONEXION = 'No se pudo conectar con el servidor. ¿Está corriendo `node backend/server.js`?';

const API = {
  // Hace una petición a /api + ruta. "cuerpo" (opcional) se manda como JSON.
  async pedir(metodo, ruta, cuerpo) {
    let respuesta;
    try {
      respuesta = await fetch(`/api${ruta}`, {
        method: metodo,
        headers: cuerpo === undefined ? {} : { 'Content-Type': 'application/json' },
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
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
    const errores = datos && Array.isArray(datos.errores) ? datos.errores : [`El servidor respondió con el error ${respuesta.status}.`];
    return { ok: false, errores };
  },
};
