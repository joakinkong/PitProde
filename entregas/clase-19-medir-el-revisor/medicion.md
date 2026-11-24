# Clase 19 — Medí tu revisor

Joaquín · Generación T, Módulo 3 · 24/11/2026

Revisor medido: `revisor-v2.md` de la clase 17 (el mejorado), tal cual quedó.

## Paso 1 — Los cinco archivos

Tres con un problema que ya conozco y dos que están bien hasta donde yo veo.

## Paso 2 — Qué espero, escrito antes de correr nada

Criterio de acierto, fijado también antes de correr:

- **Archivo con problema:** acierta si el informe menciona el problema que escribí abajo, aunque sea con otras palabras o con otra severidad.
- **Archivo sano:** acierta si el revisor **no reporta ningún hallazgo Alta ni Media** (responder "Sin hallazgos" o reportar solo cosas Baja cuenta como acierto). Si inventa un problema grave, falla.

| Archivo | Qué espero que encuentre | ¿Lo encontró? |
|---|---|---|
| `storage.js` | **Con problema:** al importar un JSON, el `color` del jugador se acepta como cualquier texto (solo se valida que sea texto no vacío) y después `app.js` lo mete en `style="background:${color}"`: un JSON importado con un color armado a propósito inyecta CSS. | _pendiente_ |
| `app.js` (frontend) | **Con problema:** el bloqueo de pronósticos por largada se decide con el reloj del dispositivo (`new Date()`) y datos guardados en `localStorage`, que quien usa la app puede cambiar: con solo adelantar o atrasar la hora de la PC se pronostica después de la largada. | _pendiente_ |
| `backend/src/app.js` | **Con problema:** no hay autenticación (cualquiera que llegue al puerto crea o edita pronósticos de cualquier jugador) y `decodeURIComponent` sin captura devuelve 500 en vez de 400 con un `%` mal escrito en la URL. | _pendiente_ |
| `scoring.js` | **Sano:** funciones puras, sin entrada externa ni acceso a datos, con tests. No espero hallazgos Alta ni Media. | _pendiente_ |
| `backend/src/repositories/pronosticos.repository.js` | **Sano:** todo el SQL usa parámetros (`?`), sin armar texto con datos del usuario. No espero hallazgos Alta ni Media. | _pendiente_ |

Una advertencia sobre mi propia medición: `backend/src/app.js` es el archivo con el que mejoré el revisor en la clase 17, así que ese caso no es independiente: el revisor ya se afinó mirándolo. Lo dejo igual, pero lo marco.
