# Informe final — PitProde

Joaquín Barreira · Generación T, Bootcamp IA-First · Proyecto final · 24/11/2026

| | |
|---|---|
| **Aplicación publicada** | https://pitprode.netlify.app |
| **Backend (API)** | https://pitprode.onrender.com/api/acceso |
| **Repositorio** | https://github.com/joakinkong/PitProde |

## 1. Qué es

PitProde es un prode de Fórmula 1 entre amigos. Un organizador carga jugadores, el calendario, los pronósticos (P1, P2, P3 y pole) y los resultados; la app calcula los puntos (5 por posición exacta, 2 por piloto en el podio en otra posición, 3 por la pole, máximo 18) y arma la tabla de posiciones. Cualquiera puede ver; solo el organizador, con contraseña, puede cambiar datos. La idea nació en el TP N° 1 ([idea.md](idea.md)).

Las reglas de negocio no son un ABM: la hora de largada bloquea los pronósticos con la hora **del servidor**, hay un solo pronóstico por jugador y GP, los pilotos del podio no se pueden repetir, los puntos se recalculan solos si se corrige un resultado, la tabla desempata por exactos y hay una importación que reemplaza todo o no cambia nada. Son 30 reglas numeradas en [spec.md](spec.md).

## 2. Cómo se trabajó

Recorrido real, en orden:

1. **TP1 (diseño sin código)** → una app de frontend con `localStorage` y las reglas de puntos en funciones puras.
2. **Clase 4 (backend):** análisis del frontend, endpoints y arquitectura en capas. Se implementó la funcionalidad de pronósticos. **Decisión cuestionada:** la IA propuso Express y una librería de SQLite; el autor la rechazó porque el proyecto prohibía dependencias sin pedido y la librería nativa suele fallar al compilar en Windows. Se usó `node:http` y `node:sqlite`.
3. **Clases 11, 17 y 19:** análisis de código, un subagente revisor mejorado y medido (acertó 2 de 5 y, con una línea cambiada, 3 de 5). Ese revisor se usó después en este proyecto (ver 5.3).
4. **Backend completo y frontend conectado:** jugadores, pilotos, GPs, resultados, tabla, exportar e importar; el frontend dejó de usar `localStorage`.
5. **Proyecto final, T1 a T16:** pasar a Postgres, contraseña de organizador, CORS, publicar, documentos y este informe. Cada tarea tiene su commit con el número ([tasks.md](tasks.md)).

**Decisiones del autor** (el resto de las decisiones y su origen están en [decisiones.md](decisiones.md)): rechazar Express; publicar con Postgres en Neon y la combinación Netlify + Render + Neon; agregar una contraseña de organizador (el TP1 decía "no hay cuentas ni contraseñas"); autorizar `pg` y un `package.json` en un proyecto que antes no tenía dependencias.

**Qué hizo la IA y qué no.** El código y los documentos los escribió Claude (Claude Code) dirigido por el autor. Los tests se escribieron junto con el código; el ciclo estricto de "primero la prueba que falla" se aplicó donde importaba más: en T10, donde se comprobó que la prueba de la carga simultánea **falla sin el arreglo** y pasa con él, en SQLite y en Postgres emulado. La IA también se equivocó y se corrigió con pruebas y con el revisor: por ejemplo, una carrera real entre dos cargas simultáneas que con Postgres terminaba en un error 500, y una protección contra fuerza bruta que se saltaba cambiando una cabecera.

## 3. Plan

El plan técnico completo está en [plan.md](plan.md): arquitectura, base de datos y por qué, modelo de datos, API y dónde vive cada regla. En resumen:

- Frontend (Netlify) → Backend en tres capas Controller / Service / Repository (Render) → PostgreSQL (Neon).
- En local, el mismo backend usa SQLite y sirve el frontend.
- Los repositories escriben el SQL **una sola vez** sobre una interfaz mínima con un adaptador por motor.
- Las reglas del prode viven en `scoring.js` y `storage.js`, que usan el navegador y el backend.

## 4. Orden de las tareas y por qué

La regla que se siguió: **lo más difícil y de lo que más depende, primero; lo que se puede equivocar en silencio, con red de seguridad.**

| Orden | Tarea | Por qué en este lugar |
|---|---|---|
| T1 | `package.json` y dependencias | Todo lo demás necesita `pg` y `pg-mem`. Es lo más chico, pero bloquea el resto. |
| T2 | Capa de base async | **La parte más difícil**: toca repositories, services, controllers, el servidor y todos los tests. Se hizo primero y sin cambiar ningún comportamiento, así las 63 pruebas que ya existían servían de red de seguridad. Hacerla después, con más código encima, habría multiplicado el costo. |
| T3 | Postgres y pruebas en dos bases | Depende de T2. Antes de construir funciones nuevas sobre la base, había que saber que el mismo SQL anda en las dos. Las diferencias entre motores se resolvieron acá: `CAST` en los filtros opcionales (Postgres no deduce el tipo de un parámetro que solo se compara con `NULL`) y conteos convertidos a número (Postgres los devuelve como texto). |
| T4 | Variables de entorno y CORS | La contraseña (T5) necesita la configuración y el CORS: el navegador manda una pregunta previa que incluye la cabecera `Authorization`. |
| T5 | Contraseña de organizador | Es la regla de seguridad más importante y la que más depende de las anteriores. Va en el backend antes que en el frontend porque el frontend solo puede reaccionar a lo que la API ya hace. |
| T6 | Frontend con acceso y URL configurable | Depende de que la API (T5) ya rechace y acepte tokens. |
| T7 | Build para Netlify y guía | Solo tiene sentido cuando el frontend ya habla con una API de otra dirección (T6). |
| T8 | Color `#rrggbb` | Cerrar un hallazgo de seguridad conocido **antes** de escribir la spec, para que quede sin pendientes. |
| T9–T13 | Documentos | Se escribieron cuando el comportamiento ya estaba estable, para que la spec describa lo que la app hace de verdad y cada regla se pueda comprobar. T10 (pruebas de borde) va entre ellos porque escribir la spec mostró reglas sin prueba. |
| T14 | Revisión de seguridad | Antes de publicar: es la última oportunidad de encontrar problemas sin que estén en internet. |
| T15 | Publicar | Depende de todo lo anterior. |
| T16 | Informe | Necesita el resultado de publicar. |

## 5. Pruebas realizadas

### 5.1 Automáticas: 156 pruebas, todas en verde

`node --test` desde la raíz. Las suites del backend corren **dos veces**: contra SQLite y contra Postgres emulado (`pg-mem`).

| Archivo | Pruebas | Qué cubre |
|---|---|---|
| `scoring.test.js` | 18 | Puntos (el caso del TP: 12; perfecto: 18; sin aciertos: 0), tabla, desempates y datos inválidos |
| `backend/tests/pronosticos.service.test.js` | 32 | Reglas de pronósticos con reloj controlado: bloqueo por largada, duplicados, cargas simultáneas, puntos al leer |
| `backend/tests/pronosticos.api.test.js` | 26 | La API de pronósticos de punta a punta: códigos de estado, inyección SQL en un filtro, JSON roto, cuerpo grande |
| `backend/tests/recursos.api.test.js` | 52 | Jugadores, pilotos, GPs, resultados, tabla, exportar e importar, color, reglas de borde, frontend servido |
| `backend/tests/acceso.test.js` | 14 | Contraseña: token, vencimiento, bloqueo, dirección no falsificable, límites de memoria y de tiempo |
| `backend/tests/entorno.test.js` | 11 | Configuración y CORS |
| `scripts/build-frontend.test.js` | 3 | Build del frontend y rechazo de direcciones inválidas |
| **Total** | **156** | |

Cada regla de la spec indica en qué prueba se verifica ([spec.md](spec.md), sección 8).

### 5.2 Manuales

Con el servidor real y el navegador (sin librerías de prueba; no se usó Postman, se usó `curl` y el navegador):

- Crear jugador y pronóstico desde la interfaz, recargar, reiniciar el servidor: los datos siguen.
- Marcar favorito, cargar el resultado de una carrera y ver la tabla.
- "Borrar todo" y reiniciar el servidor: la base sigue vacía.
- Servidor apagado: el formulario muestra el error de conexión.
- Contraseña: escribir sin ingresar redirige y avisa; contraseña mala avisa; buena entra; la sesión sobrevive a recargar; "Salir" cierra.
- **Frontend y backend en puertos distintos con CORS activo** (la misma topología que Netlify y Render): lectura, ingreso y escritura funcionan; un origen no permitido no recibe las cabeceras CORS.
- Las nueve peticiones de la clase 4 con sus respuestas: [evidencia.txt](../entregas/clase-04-backend/evidencia.txt).

### 5.3 Revisión de seguridad con el subagente revisor

Se pasó el revisor por `app.js`, `acceso.service.js`, `config.js` y `db.js` y se volvió a pasar por los dos que más cambiaron. Encontró, entre otras cosas, que **la dirección usada para frenar la fuerza bruta se podía falsificar con una cabecera** (Alta) y que el limitador guardaba direcciones sin límite (Media). Se arreglaron con pruebas. Cada hallazgo, con su decisión, está en [evidencia/revisor/](evidencia/revisor/README.md). El revisor no modificó ningún archivo.

### 5.4 Sobre la aplicación publicada (24/11/2026)

| Verificación | Resultado |
|---|---|
| `GET /api/acceso` en Render | `200` · `{"requerido":true,"autenticado":false}` |
| `GET /api/datos` (datos desde Neon) | 22 pilotos · 23 GPs; la base tiene además un jugador cargado |
| Escribir sin token | `401` "Tenés que ingresar como organizador para hacer cambios." |
| CORS desde `https://pitprode.netlify.app` | Permitido (`access-control-allow-origin: https://pitprode.netlify.app`) |
| CORS desde otro sitio | Sin cabecera: el navegador bloquea la lectura |
| Frontend en Netlify | `200`; `config.js` apunta a `https://pitprode.onrender.com` |
| `backend/server.js`, `.env`, `package.json`, `docs/spec.md` en Netlify | `404`: no se publican |
| Navegador sobre Netlify | Sin errores en la consola; Datos, Calendario (23 GPs), Pilotos (22) y Tabla cargan; la pestaña Organizador pide contraseña |

La existencia de un jugador en la base publicada indica que la escritura con contraseña funcionó desde la aplicación, pero este informe no registra esa prueba paso a paso.

## 6. Limitaciones y lo que no se probó

- **Postgres real:** el SQL se probó contra `pg-mem`, un emulador. La conexión real a Neon se verificó publicando (5.4), no con tests.
- **Arranque simultáneo de dos servidores contra una base vacía:** se mitigó (la carga 2026 usa `ON CONFLICT DO NOTHING`) pero no se puede probar con `pg-mem`. Render corre una sola instancia.
- **Primera carga lenta:** el plan gratuito de Render duerme el servidor; la primera petición puede tardar cerca de 30 segundos.
- **Los pronósticos de los demás son visibles antes de la largada** para cualquiera con el link (pregunta abierta de mayor impacto en [preguntas-abiertas.md](preguntas-abiertas.md)).
- **Una sola contraseña compartida**; no hay registro de quién cambió qué.
- Dos hallazgos menores del revisor se aceptaron con su motivo (dirección desconocida compartida; `?` dentro de un texto SQL).

## 7. Checklist de la consigna

| Punto | Estado |
|---|---|
| Proyecto propio (no ReservaClub), individual | ✅ |
| Reglas de negocio con complejidad más allá de un ABM | ✅ 30 reglas ([spec.md](spec.md)) |
| `idea.md`, `decisiones.md`, `glosario.md`, `preguntas-abiertas.md` | ✅ |
| `spec.md` con RN e HU, sin pendientes | ✅ 30 RN, 17 HU, 45 criterios |
| `AGENTS.md` y reglas de los agentes | ✅ [AGENTS.md](../AGENTS.md), [agentes.md](agentes.md) |
| `plan.md` y `tasks.md` con todas las tareas marcadas | ✅ |
| Tests que pasan | ✅ 156 de 156 |
| Un commit por tarea | ✅ desde T1; las etapas previas figuran como etapas ([tasks.md](tasks.md)) |
| Ningún secreto en el código; `.env` en `.gitignore`; variables en la nube | ✅ |
| Frontend con todas las pantallas funcionando | ✅ |
| Frontend y backend publicados | ✅ Netlify y Render, con la base en Neon |
| CORS solo para el frontend | ✅ verificado en 5.4 |
| README con el enlace público | ✅ |
| Informe con pruebas, plan y justificación del orden | ✅ este documento |
| Enlace al repositorio en el espacio del Módulo 5 | ⬜ lo sube el autor |
