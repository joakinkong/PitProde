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
| `storage.js` | **Con problema:** al importar un JSON, el `color` del jugador se acepta como cualquier texto (solo se valida que sea texto no vacío) y después `app.js` lo mete en `style="background:${color}"`: un JSON importado con un color armado a propósito inyecta CSS. | **Sí.** Marcó `j.color` aceptado sin validar y el riesgo de que se inyecte en un `style`, como "Sospecha" (no leyó `app.js`). Además reportó como Alta una excepción hipotética en `normalizarDatos` (no esperada). |
| `app.js` (frontend) | **Con problema:** el bloqueo de pronósticos por largada se decide con el reloj del dispositivo (`new Date()`) y datos guardados en `localStorage`, que quien usa la app puede cambiar: con solo adelantar o atrasar la hora de la PC se pronostica después de la largada. | **No.** Encontró otro problema real, la inyección de CSS por `color` (Media), pero ni una palabra sobre el reloj del dispositivo ni `localStorage` para el bloqueo de largada. Nota: el primer intento falló porque hay dos `app.js` en el laboratorio y el revisor preguntó cuál; lo repetí aclarando la ruta (`ronda-1/a-2-app-frontend-intento1-ambiguo.txt`). |
| `backend/src/app.js` | **Con problema:** no hay autenticación (cualquiera que llegue al puerto crea o edita pronósticos de cualquier jugador) y `decodeURIComponent` sin captura devuelve 500 en vez de 400 con un `%` mal escrito en la URL. | **Sí.** Las dos cosas: sin autenticación (Alta, primero) y `decodeURIComponent` → 500 (Baja). |
| `scoring.js` | **Sano:** funciones puras, sin entrada externa ni acceso a datos, con tests. No espero hallazgos Alta ni Media. | **No** (el archivo sano no quedó callado). Reportó 1 Media y 1 Baja, pero casi todo sobre *otros* archivos: la columna `res_pole` de `db.js` sin `NOT NULL`, el schema de SQLite, la falta de autenticación del backend. Del propio `scoring.js` solo el caso de `fechaLargada` inválida (Baja). |
| `backend/src/repositories/pronosticos.repository.js` | **Sano:** todo el SQL usa parámetros (`?`), sin armar texto con datos del usuario. No espero hallazgos Alta ni Media. | **No** según el criterio escrito (reportó 1 Alta y 1 Media), pero ninguno de los dos hallazgos es del archivo pedido: la Alta es la falta de autenticación de `app.js` y la Media es de `referencias.repository.js`. Sobre `pronosticos.repository.js` dijo que el SQL está bien resuelto. |

Una advertencia sobre mi propia medición: `backend/src/app.js` es el archivo con el que mejoré el revisor en la clase 17, así que ese caso no es independiente: el revisor ya se afinó mirándolo. Lo dejo igual, pero lo marco.

## Paso 3 — Resultado de la primera corrida

Cada archivo se pasó por separado en una sesión nueva (`claude -p --agent revisor`), sin contarle qué esperaba. Salidas completas en `ronda-1/`.

**Mi revisor acertó 2 de 5.**

Lo que más me molestó: los dos archivos sanos fallaron por lo mismo, que el revisor **se va a revisar otros archivos**. Como lee el proyecto para entender el contexto, termina reportando hallazgos de los archivos vecinos, y el informe de un archivo sano no queda en blanco. Para saber si sirve cuando un archivo está bien, ese comportamiento es el más dañino.
