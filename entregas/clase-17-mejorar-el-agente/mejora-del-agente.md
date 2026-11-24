# Clase 17 — Mejorá el agente

Joaquín · Generación T, Módulo 3 · 24/11/2026

Archivos: `revisor-v1.md` (el de clase) y `revisor-v2.md` (el mejorado, 32 líneas: entra en una pantalla). `readonly: true` se mantiene.

## 1. Cambios y justificación

Partí de correr la v1 sobre `backend/src/app.js` (el servidor HTTP del backend de la clase 4). La primera corrida mostró tres defectos: afirmó cosas sobre una librería que el proyecto no usa ("Better-SQLite3": el backend usa `node:sqlite`), no indicó dónde estaba cada problema, y rellenó hasta cinco hallazgos con casos hipotéticos.

| # | Cambio | Por qué y qué situación mejora |
|---|---|---|
| 1 | Se agregó: *"Antes de afirmar algo sobre una función, librería o base de datos, leela con Read o Grep. Si no la leíste, marcalo como 'Sospecha'."* | Evita que el revisor dé por cierto algo que no vio. Situación: la v1 habló de Better-SQLite3 sin haber abierto el repository. |
| 2 | Cada hallazgo tiene formato fijo de tres líneas: `[severidad] archivo:línea — qué es`, `Entrada:` y `Consecuencia:`. | Obliga a un escenario concreto en vez de un adjetivo y a una ubicación que se puede ir a mirar. Situación: quien lee el informe puede verificar cada hallazgo en un minuto. |
| 3 | Se definió qué es **Alta**: *datos perdidos o alterados, acceso sin permiso o caída de todo el servicio*. | Sin una definición, la severidad es una impresión. Situación: la falta de autenticación (que permite alterar datos de otros) debería salir arriba de un código de estado equivocado. |
| 4 | Se reemplazó "Máximo cinco" por: *"cinco no es una meta: si no hay hallazgos reales, respondé solo 'Sin hallazgos.' No rellenes con casos que dependen de algo que hoy no existe"*. | Corta los hallazgos hipotéticos. Situación: la v1 reportó "`ruta.handler` se llama sin `await`" aunque hoy todos los handlers son síncronos. |

## 2. Evidencia: mismo archivo, antes y después

Archivo revisado: `backend/src/app.js`. Cada corrida es una sesión nueva de `claude -p --agent revisor` (modelo Sonnet), sin contexto previo. Salidas completas en `evidencia/`.

Como una corrida sola es ruidosa (el resultado cambia de una vez a otra), repetí: 3 corridas de la v1 y 2 de la v2.

| Qué se mide | v1 (3 corridas) | v2 (2 corridas) |
|---|---|---|
| Menciona que **no hay autenticación** | 1 de 3 (la corrida 2, como último hallazgo y "Bajo-moderado"; en las otras dos no aparece) | 2 de 2 (en las dos como **Alta**, primero) |
| Reporta como hallazgo que `ruta.handler` **no tiene `await`** (hoy no pasa: son sincrónicos) | 3 de 3 | 0 de 2 (en una corrida la v2 leyó el controller y descartó el caso) |
| Afirma una librería que el proyecto no usa | 1 de 3 (Better-SQLite3) | 0 de 2 |
| Cada hallazgo trae `archivo:línea`, entrada y consecuencia | no (solo a veces la línea) | sí, en todos los de las dos corridas |
| Encuentra `decodeURIComponent` → 500 en vez de 400 (bug real) | 3 de 3 | 2 de 2 |

Qué cambió de verdad: la v2 dejó de rellenar con hipótesis y subió a primer lugar el hallazgo más importante del archivo. Qué **no** cambió: el `URIError` se encontró siempre, antes y después.

## 3. Lo que no funcionó

- **Un cambio descartado: `tools: Read, Grep, Glob`.** La idea era que `readonly: true` no fuera solo una etiqueta (en Claude Code ese campo no hace nada: lo que restringe herramientas es `tools`). Lo probé pidiéndole a cada versión "agregá la línea `// revisado` al principio del archivo", dándoles permiso de edición: **con la v2 con `tools` el archivo se modificó igual** (`evidencia/prueba-edicion-v2-con-tools.txt`). Como el cambio no se pudo comprobar, lo saqué de la v2 final, como pide la regla de que cada cambio sea probable. `readonly: true` queda como en el original.
- **En una de las pruebas de edición**, la v2 se negó ("mi rol es revisor, no toco el código") al pedido de "corregí lo que encuentres" y la v1 no se negó, pero tampoco modificó el archivo. Con una sola prueba no lo cuento como mejora.
- **La severidad no es estable:** el `URIError` salió como Alta, Media y Baja en distintas corridas. La definición del cambio 3 no alcanzó para que el revisor la aplique siempre igual. Queda como pendiente para la clase 19.
- **Pocas corridas:** 3 y 2 no alcanzan para decir que una versión es mejor que otra con certeza; alcanzan para ver que la diferencia en hipótesis rellenadas (3 de 3 contra 0 de 2) es consistente.
