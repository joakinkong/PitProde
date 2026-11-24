# AGENTS.md — PitProde

Guía para agentes de IA (y personas) que trabajen sobre este proyecto.

## Qué es

Prode de Fórmula 1 entre amigos. Un organizador carga jugadores, pilotos, el calendario de
Grandes Premios, los pronósticos de cada jugador (P1, P2, P3 y pole) y los resultados reales.
La app calcula los puntos y arma la tabla de posiciones. La especificación funcional de origen
es el TP1 de Generación T (`../tp1`).

## Stack y restricciones

- Frontend en HTML, CSS y JavaScript vanilla. **Sin librerías, sin frameworks, sin build.**
- Backend en Node sin dependencias (`node:http`, `node:sqlite`). **La app necesita el servidor**: se usa desde
  `http://127.0.0.1:3000` (`node backend/server.js`), que también sirve el frontend. Ya no se abre `index.html`
  suelto ni se publica en GitHub Pages sin servidor.
- Persistencia en SQLite (`backend/datos/pitprode.sqlite`), con exportar/importar JSON. La rama
  `entrega-modulo-3` conserva la versión anterior con `localStorage`.
- Scripts clásicos (no módulos ES): cada archivo define funciones globales y, al final,
  las exporta con `module.exports` solo si existe (para poder probarlas desde Node).

## Estructura

| Archivo            | Responsabilidad |
|--------------------|-----------------|
| `index.html`       | Esqueleto de la página y carga de scripts (`storage.js`, `scoring.js`, `api.js`, `app.js`). |
| `scoring.js`       | Reglas del prode: puntos, estado de los GPs, tabla y validaciones. **Funciones puras.** |
| `storage.js`       | Datos iniciales 2026, validación y normalización de JSON importado. Lo usan el frontend y el backend. Las funciones de `localStorage` (`cargarDatos`, `guardarDatos`) quedaron sin uso. |
| `api.js`           | Cliente de la API (`API.pedir`): nunca lanza, devuelve `{ ok, datos }` o `{ ok: false, errores }`. |
| `app.js`           | Interfaz y eventos. No calcula puntos ni guarda nada: manda cada cambio a la API y vuelve a pedir los datos. |
| `styles.css`       | Estilos. |
| `tests.html`       | Pruebas que corren en el navegador (abrir el archivo). |
| `scoring.test.js`  | Tests unitarios de puntos y tabla con `node:test`. |
| `backend/`         | Backend en Node: Controller → Service → Repository sobre `node:http` y `node:sqlite`. Jugadores, pilotos, GPs, resultados, pronósticos, tabla, exportar e importar. Sirve también el frontend. |
| `entregas/`        | Documentos de las actividades del curso (clases 4, 11, 17 y 19), con su evidencia y los PDF. |
| `.claude/agents/revisor.md` | Subagente revisor de seguridad y robustez (versión final de las clases 17 y 19). |

## Reglas de negocio (no cambiarlas sin pedido explícito)

- 5 puntos por piloto del podio en su posición exacta.
- 2 puntos por piloto que está en el podio pero en otra posición.
- 3 puntos por acertar la pole. Máximo por GP: 18.
- Tabla: ordena por puntos; ante empate, por cantidad de pilotos exactos; si sigue el empate,
  comparten posición (1, 1, 3…) y se listan por nombre.
- Estado de un GP (se calcula, no se guarda): `proximo`, `cerrado` (largó sin resultado),
  `finalizado` (tiene resultado).
- Un pronóstico se bloquea cuando el GP larga. El resultado solo se carga después de la largada.
- Un jugador tiene como máximo un pronóstico por GP; P1, P2 y P3 son pilotos distintos.

## Convenciones de código

- Nombres de funciones, variables y textos en español; la interfaz habla en voseo rioplatense.
- `scoring.js` no toca el DOM ni `localStorage`. Las funciones que dependen de la hora reciben
  `ahora` como parámetro (con `new Date()` por defecto) para poder testearlas.
- En `app.js` el DOM se arma con `el()` y `textContent`; **nunca `innerHTML`** con datos del usuario.
- Los errores se devuelven como listas de mensajes para mostrar en pantalla, no se lanzan excepciones.
- Comentarios breves arriba de cada función explicando qué devuelve.

## Backend (`backend/`)

- `controllers/` traduce HTTP a llamadas al service y arma los códigos de estado; no tiene reglas ni SQL.
- `services/` tiene las reglas del prode y **reutiliza `scoring.js` y `storage.js`** (no duplicar reglas). No sabe de HTTP ni de SQL; la hora llega por `reloj` para poder probarlo.
- `repositories/` es el único lugar con SQL, siempre con parámetros (`?`).
- `routes.js` es la tabla de rutas; `estaticos.js` sirve el frontend con una lista fija de archivos.
- Los puntos no se guardan: se calculan al leer. La hora que manda es la del servidor.
- El frontend valida solo para dar respuesta rápida; el backend valida siempre.
- Al crear la base se cargan los pilotos y GPs 2026 una sola vez (`PRAGMA user_version`); "Borrar todo" deja la base vacía de verdad.
- Sin autenticación todavía; el servidor escucha solo en `127.0.0.1`.
- Sin `package.json` ni dependencias: solo módulos de Node (`node:http`, `node:sqlite`, `node:test`).

## Cómo probar

```bash
node --test          # desde la raíz del proyecto: scoring.test.js y backend/tests/ (63 pruebas)
```

Además, abrir `tests.html` en el navegador tiene que mostrar todas las pruebas en verde.
Cualquier cambio en `scoring.js` o `storage.js` tiene que dejar ambas suites pasando.

## Forma de trabajo

- Antes de escribir código, analizar y proponer; implementar solo lo aprobado.
- Refactors: una mejora por vez y sin cambiar comportamiento. Correr los tests antes y después.
- No agregar dependencias ni archivos de configuración (package.json, bundlers) sin pedido.
