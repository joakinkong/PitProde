# Tareas — PitProde

Cada tarea es chica, tiene un criterio de terminado que se puede comprobar y su propio commit. El orden está justificado en el [informe](informe.md). Reglas (RN) e historias (HU) en [spec.md](spec.md).

**Estado:** ✅ hecha · ⬜ pendiente.

## Fase 1 — Proyecto final (un commit por tarea)

| N° | Título | Rol | RN / HU | Depende de | Criterio de terminado | Estado | Commit |
|---|---|---|---|---|---|---|---|
| T1 | `package.json`, dependencias `pg` y `pg-mem`, `.gitignore` de secretos | Arquitecto | RN29 (base) | — | `npm install` funciona; `node_modules`, `.env` y `dist` ignorados; `node --test` en verde | ✅ | `f016e09` |
| T2 | Capa de base async con adaptador SQLite; repositories, services y controllers async | Desarrollador backend | todas (cambio de base, sin cambiar reglas) | T1 | Los 63 tests que ya existían pasan sin cambiar su intención; el servidor real responde | ✅ | `c1615d6` |
| T3 | Adaptador de Postgres y suites de pruebas contra SQLite y `pg-mem` | Tester + Desarrollador backend | RN13, RN24, RN25 | T2 | Cada suite corre en las dos bases y hay una prueba de que usa el adaptador correcto | ✅ | `f146077` |
| T4 | Configuración por variables de entorno y CORS | Desarrollador backend | RN29, RN30, HU16, HU17 | T2 | El servidor no arranca abierto sin contraseña; CORS solo para `FRONTEND_URL`; pruebas de configuración y de CORS | ✅ | `317b550` |
| T5 | Contraseña de organizador: token firmado de 12 h y bloqueo por intentos | Desarrollador backend | RN26–RN28, HU2 | T4 | Toda escritura sin token da 401; leer es libre; el token vence; 5 fallos bloquean 15 minutos | ✅ | `61df519` |
| T6 | Frontend: URL de la API configurable, token y pantalla Organizador | Desarrollador frontend | RN26, HU2, HU16 | T5 | Se recorrió en el navegador: escribir sin ingresar redirige, contraseña mala avisa, buena entra, la sesión sobrevive a recargar y "Salir" funciona | ✅ | `cc3fff8` |
| T7 | Build del frontend para Netlify, `render.yaml` y guía de despliegue | Arquitecto | HU16 | T4, T6 | El build genera `config.js` con la dirección; probado con frontend y backend en puertos distintos y CORS activo | ✅ | `adb34df` |
| T8 | El color del jugador solo admite `#rrggbb` | Desarrollador backend | RN3, HU3, HU13 | T2 | Se rechazan colores con CSS por API e importación; los válidos se aceptan | ✅ | `2dc7c2c` |
| T9 | Documentos base: idea, glosario, decisiones y preguntas abiertas | Analista | todas | — | Cada decisión tiene origen; las preguntas abiertas tienen impacto | ✅ | `9068b8a` |
| T10 | Pruebas de reglas de borde y arreglo de la carga simultánea de un pronóstico | Tester | RN1, RN5, RN6, RN8, RN10, RN11, RN13, RN14 | T3 | Cada regla tiene prueba; la del arreglo **falla sin el arreglo** en las dos bases | ✅ | `3dbf84b` |
| T11 | Spec: RN1–RN30, 17 historias de usuario y casos borde | Analista | todas | T9, T10 | Cada RN tiene al menos una historia; la spec no tiene pendientes | ✅ | `9fd133b`, `86ab61a` |
| T12 | Plan técnico | Arquitecto | todas | T11 | Cada RN tiene un lugar en el plan | ✅ | `0162d4f` |
| T13 | `AGENTS.md` y reglas de los agentes | Analista | — | T12 | Mapa de documentos, ciclo por tarea, secretos y un archivo de reglas por rol | ✅ | `077f721` |
| T14 | Arreglar los hallazgos del revisor antes de publicar | Revisor + Desarrollador backend | RN26–RN28, RN30 | T5, T13 | Primera y segunda pasada guardadas con la decisión de cada hallazgo; los graves arreglados con pruebas | ✅ | `12ecd1e` |
| T15 | Publicar: base en Neon, backend en Render, frontend en Netlify | Desarrollador backend | HU15, HU16 | T7, T14 | Se completó la guía [despliegue.md](despliegue.md); la app responde desde internet con CORS solo para Netlify (verificado en el [informe](informe.md), 5.4) | ✅ | publicación + `README` con el link |
| T16 | Informe final (con PDF), README con el enlace público y `tasks.md` cerrado | Analista | todas | T15 | Informe con pruebas, plan y justificación del orden; README con el link; todas las tareas marcadas | ✅ | `d7654e6` |

## Fase 0 — Etapas previas al proyecto final

El recorrido anterior, con sus commits.

| N° | Título | Rol | Criterio de terminado | Estado | Commit |
|---|---|---|---|---|---|
| P1 | TP1 llevado a app: frontend con `localStorage`, reglas en `scoring.js`, exportar e importar | Desarrollador frontend | App que cumple las 8 funcionalidades del TP1, con tests de puntos | ✅ | `bba52f3` |
| P2 | Clase 4: diseño del backend (análisis, endpoints y arquitectura) | Arquitecto | Documento con entidades, responsabilidades, endpoints y la decisión cuestionada (Express) | ✅ | `407ac65` |
| P3 | Clase 4: backend de pronósticos en tres capas, con tests y evidencia | Desarrollador backend | Crear, editar, consultar y listar; 28 pruebas y corrida real | ✅ | `5646cf0`, `265a03f` |
| P4 | Clase 11: análisis de código y prompt | Revisor | Tres problemas con escenario, prompt y justificación | ✅ | `9d7b547` |
| P5 | Clases 17 y 19: revisor mejorado y medido | Revisor | Cuatro cambios justificados y dos rondas de medición (2 de 5 y 3 de 5) | ✅ | `c3cbf03`, `e41342f`, `4131857`, `8618a40`, `0043c33`, `78e93fc` |
| P6 | Backend completo (jugadores, pilotos, GPs, resultados, tabla, exportar e importar) | Desarrollador backend | Todas las rutas de la clase 4, 63 pruebas en verde | ✅ | `bb3b59c` |
| P7 | Frontend conectado al backend, README y documentación | Desarrollador frontend | Recorrido completo en el navegador: crear, recargar, reiniciar el servidor, borrar todo | ✅ | `6477cf0`, `8cf6e13`, `06d802c`, `e38cbe8`, `44658b5` |

## Criterio general de "hecha"

Una tarea está terminada cuando: sus pruebas pasan (`node --test` completo, en SQLite y en Postgres emulado), no se modificaron tests para forzarlo, el revisor no tiene hallazgos graves sin resolver, no hay secretos en el commit y el commit lleva el número de tarea.
