# AGENTS.md — PitProde

El "reglamento de la obra": vale para todos los agentes de IA (y las personas) que trabajen en este proyecto. Si algo de acá contradice a [docs/spec.md](docs/spec.md) en cuanto a reglas del negocio, **manda la spec**.

## Qué es

Prode de Fórmula 1 entre amigos. Un organizador carga jugadores, pilotos, el calendario de Grandes Premios, los pronósticos de cada jugador (P1, P2, P3 y pole) y los resultados reales. La app calcula los puntos y arma la tabla de posiciones. Cualquiera puede ver; solo quien tiene la contraseña del organizador puede cambiar datos.

## Dónde está cada cosa (y cuál es la fuente de verdad)

| Documento | Para qué | Fuente de verdad de… |
|---|---|---|
| [docs/idea.md](docs/idea.md) | Qué es y por qué existe (parte del TP1) | La intención |
| [docs/glosario.md](docs/glosario.md) | Qué significa cada término | Los nombres y su significado |
| [docs/decisiones.md](docs/decisiones.md) | Cada decisión, con su pregunta, respuesta y origen | Por qué se hizo así |
| [docs/preguntas-abiertas.md](docs/preguntas-abiertas.md) | Dudas sin resolver, por impacto | Lo que todavía no está decidido |
| **[docs/spec.md](docs/spec.md)** | **Reglas de negocio (RN) e historias de usuario (HU)** | **Qué tiene que hacer la app** |
| [docs/plan.md](docs/plan.md) | Arquitectura, base de datos, API, dónde vive cada regla | Cómo está construida |
| [docs/tasks.md](docs/tasks.md) | Tareas hechas, con su commit | Qué se hizo y en qué orden |
| [docs/agentes.md](docs/agentes.md) | Reglas de cada agente | Quién hace qué |
| [docs/despliegue.md](docs/despliegue.md) | Cómo publicar en internet | La publicación |
| [docs/informe.md](docs/informe.md) | Pruebas, plan y justificación del orden de tareas | La evidencia |

Si un dato no está en la spec, **no es una regla**: no se inventa. Se agrega primero a [docs/preguntas-abiertas.md](docs/preguntas-abiertas.md) y se le pregunta al autor.

## Stack y restricciones

- **Frontend:** HTML, CSS y JavaScript vanilla. Sin librerías, sin frameworks, sin build de framework. Scripts clásicos (no módulos ES): cada archivo define funciones globales y, al final, las exporta con `module.exports` solo si existe, para poder probarlas desde Node.
- **Backend:** Node.js (22.13 o superior) sin framework: `node:http`, `node:crypto`, `node:sqlite`. Capas Controller → Service → Repository.
- **Base de datos:** Postgres (Neon) publicado; SQLite en local y tests. El SQL se escribe una sola vez (ver [docs/plan.md](docs/plan.md)).
- **Dependencias permitidas** (autorizadas por el autor): `pg` y, solo para pruebas, `pg-mem`. Cualquier otra requiere pedido explícito.
- **Publicación:** frontend en Netlify, backend en Render, base en Neon.

## Estructura

| Archivo | Responsabilidad |
|---|---|
| `index.html`, `styles.css` | Página y estilos. Carga `storage.js`, `scoring.js`, `config.js`, `api.js` y `app.js`, en ese orden. |
| `scoring.js` | Reglas del prode: puntos, estado de los GPs, tabla y validaciones. **Funciones puras.** Lo usan el navegador y el backend. |
| `storage.js` | Datos iniciales 2026 y validación, normalización, exportación e importación del JSON. Lo usan el navegador y el backend. Las funciones de `localStorage` quedaron sin uso. |
| `config.js` | Dirección de la API (`window.PITPRODE_API_URL`). Vacío en local; el build lo genera al publicar. |
| `api.js` | Cliente de la API: nunca lanza excepciones y maneja el token del organizador. |
| `app.js` | Interfaz y eventos. No calcula puntos ni guarda nada: manda cada cambio a la API y vuelve a pedir los datos. |
| `backend/` | Servidor. `server.js` arranca; `src/` tiene `app.js`, `routes.js`, `config.js`, `db.js`, `controllers/`, `services/` y `repositories/`; `tests/` tiene las pruebas. |
| `scripts/` | `build-frontend.js` arma la carpeta que se publica en Netlify. |
| `docs/` | Documentación del proyecto. |
| `entregas/` | Documentos de las actividades del Módulo 3 (clases 4, 11, 17 y 19). |
| `.claude/agents/revisor.md` | Subagente revisor de seguridad y robustez (clases 17 y 19). |
| `scoring.test.js`, `backend/tests/*.test.js`, `scripts/*.test.js` | Pruebas con `node:test`. |

## Convenciones de código

- Nombres de funciones, variables y textos en **español**; la interfaz habla en voseo rioplatense.
- Comentarios breves arriba de cada función explicando qué devuelve.
- `scoring.js` no toca el DOM, la base ni el reloj: las funciones que dependen de la hora reciben `ahora` como parámetro.
- En `app.js` el DOM se arma con `el()` y `textContent`; **nunca `innerHTML`** con datos del usuario.
- Los errores se devuelven como listas de mensajes para mostrar en pantalla; los services devuelven `{ ok, ... }` y no lanzan por reglas de negocio.
- El backend: el **Controller** no tiene reglas ni SQL; el **Service** no sabe de HTTP ni de SQL (la hora llega por `reloj`); el **Repository** es el único lugar con SQL y siempre con parámetros (`?`).
- Los puntos no se guardan: se calculan al leer. La hora que manda es la del servidor. El frontend valida solo para dar respuesta rápida; el backend valida siempre.

## Secretos

- `DATABASE_URL` y `ORGANIZER_PASSWORD` **nunca** van en el código, en el repositorio, en la documentación ni en un chat. Viven en `.env` (que está en `.gitignore`) para pruebas locales y como variables de entorno en el panel de Render.
- `backend/.env.example` muestra los nombres sin valores.
- Antes de cada commit: confirmar que no se agregó ningún `.env` ni ninguna cadena de conexión (`git status` y `git diff --staged`).

## Ciclo de trabajo de cada tarea

1. **Leer** la tarea en [docs/tasks.md](docs/tasks.md) y las RN y HU que cubre. Si algo no está en la spec, parar y preguntar.
2. **Tester:** escribir los tests que describen la tarea y comprobar que **fallan** por la razón correcta (rojo).
3. **Desarrollador:** implementar lo mínimo para que pasen **sin modificar los tests** (verde). Si un test está mal, se avisa y se corrige aparte, con motivo.
4. **Refactor:** mejorar sin cambiar el comportamiento, con los tests en verde.
5. **Revisor:** revisar el cambio (seguridad y robustez). Solo reporta hallazgos del archivo pedido y no modifica código.
6. **Verificar:** `node --test` completo en verde.
7. **Commit:** **uno por tarea**, con el número de tarea en el mensaje (`T12: ...`), y subir a GitHub de a poco.
8. **Marcar** la tarea como hecha en `docs/tasks.md`, con el hash del commit.

## Agentes

Son roles con reglas propias; el detalle está en [docs/agentes.md](docs/agentes.md): **analista, arquitecto, desarrollador backend, desarrollador frontend, tester y revisor**. Una misma persona o IA puede cumplir varios roles, pero tiene que respetar las reglas de cada uno mientras lo hace.

## Cómo probar

```bash
node --test          # desde la raíz: reglas de puntos, backend (SQLite y Postgres emulado) y build
node backend/server.js
```

Cualquier cambio en `scoring.js` o `storage.js` tiene que dejar `node --test` en verde. Los tests del backend corren contra SQLite y contra `pg-mem`: si falla solo uno de los dos, el SQL no es compatible con los dos motores.

## Reglas generales

- Antes de escribir código: analizar y proponer; implementar solo lo aprobado.
- Refactors: una mejora por vez y sin cambiar comportamiento. Correr los tests antes y después.
- No agregar dependencias ni archivos de configuración nuevos sin pedido.
- No tocar las reglas de negocio sin pedido explícito: se cambia primero la spec y después el código.
