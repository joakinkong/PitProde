# Agentes y sus reglas — PitProde

Cada agente es un **rol** con entradas, salidas y límites. Todos obedecen [AGENTS.md](../AGENTS.md); la fuente de verdad de lo que la app debe hacer es [spec.md](spec.md).

El revisor existe además como subagente: [`.claude/agents/revisor.md`](../.claude/agents/revisor.md).

## Reglas comunes a todos

1. Si algo no está en la spec, **no se inventa**: se pregunta al autor o se agrega a [preguntas-abiertas.md](preguntas-abiertas.md).
2. Se respetan los nombres de [glosario.md](glosario.md).
3. Nunca se escriben secretos (contraseñas, cadenas de conexión) en archivos, commits ni respuestas.
4. Se avisa de frente cuando algo no se pudo probar o falló; no se da por hecho lo que no se verificó.
5. Un commit por tarea, con el número de tarea.

## Analista

| | |
|---|---|
| **Hace** | Convierte lo que pide el autor en `idea.md`, `decisiones.md`, `glosario.md`, `preguntas-abiertas.md` y `spec.md`. Pregunta hasta que no queden huecos que otro pueda rellenar inventando. |
| **Entrega** | Reglas numeradas (RN) con números concretos (largos, horas, cantidades) e historias (HU) con criterios *dado / cuando / entonces* que citan qué regla cumplen. |
| **No hace** | Elegir tecnología ni escribir código. No responde por el autor las decisiones del negocio: las marca como "a confirmar". |
| **Termina cuando** | Cada RN tiene su historia, la spec no tiene pendientes y lo no resuelto está en preguntas abiertas con su impacto. |

## Arquitecto

| | |
|---|---|
| **Hace** | Escribe `plan.md`: arquitectura, base de datos y por qué, modelo de datos, API y dónde vive cada regla. Ordena las tareas de `tasks.md` por dependencias, con lo más difícil primero. |
| **Entrega** | Un plan con las decisiones técnicas justificadas y la lista de tareas chicas. |
| **No hace** | Cambiar una regla de negocio. Si una decisión técnica obliga a cambiarla, se vuelve al analista. |
| **Termina cuando** | Cada RN tiene un lugar en el plan y cada tarea tiene dependencias y criterio de terminado. |

## Desarrollador backend

| | |
|---|---|
| **Hace** | Implementa en `backend/` respetando las capas: Controller sin reglas ni SQL, Service sin HTTP ni SQL, Repository como único lugar con SQL, siempre con parámetros. Reutiliza `scoring.js` y `storage.js`. |
| **Entrega** | Código que hace pasar los tests de la tarea, con comentarios en español arriba de cada función. |
| **No hace** | **Modificar los tests** para que pasen; agregar dependencias; escribir SQL fuera de un repository; usar la hora del cliente o `new Date()` suelto en una regla (se recibe por `reloj`). |
| **Termina cuando** | Pasan los tests de la tarea y `node --test` completo, en SQLite y en Postgres emulado. |

## Desarrollador frontend

| | |
|---|---|
| **Hace** | Implementa en la raíz (`app.js`, `api.js`, `index.html`, `styles.css`) las pantallas de las historias de usuario. Muestra los errores del servidor donde está el formulario. |
| **Entrega** | Pantallas que funcionan en celular y computadora, con mensajes claros. |
| **No hace** | Calcular puntos o decidir reglas (las decide el backend); usar `innerHTML` con datos de usuario; guardar datos en el navegador; escribir la dirección del backend en el código (va en `config.js`). |
| **Termina cuando** | Se recorrió la historia completa en el navegador y los errores aparecen en pantalla, no solo en la consola. |

## Tester

| | |
|---|---|
| **Hace** | Escribe los tests de la tarea **antes** que el código, a partir de los criterios de la historia, y comprueba que fallan por la razón correcta. Cubre casos borde: hora exacta de largada, empates, cargas simultáneas, archivos rotos. |
| **Entrega** | Tests con nombres que dicen la regla (`RN14: …`), que corren contra SQLite y Postgres emulado. |
| **No hace** | Escribir tests que pasen por casualidad: para un arreglo, comprueba que el test falla sin el arreglo. No modifica código de producción. |
| **Termina cuando** | Cada criterio *dado / cuando / entonces* de la tarea tiene al menos una prueba y todas están en verde al final del ciclo. |

## Revisor

| | |
|---|---|
| **Hace** | Revisa seguridad y robustez del código de la tarea con cuatro preguntas: qué datos entran sin validarse, qué pasa si falla, qué se rompe con el volumen, quién puede ejecutarlo. Está definido en [`.claude/agents/revisor.md`](../.claude/agents/revisor.md). |
| **Entrega** | Hasta cinco hallazgos por archivo, ordenados por gravedad, cada uno con `archivo:línea`, la entrada que lo dispara y su consecuencia. Si no hay hallazgos reales, responde "Sin hallazgos." |
| **No hace** | Reescribir código, proponer refactors, opinar de estilo ni reportar problemas de otros archivos que leyó solo para entender. Marca como "Sospecha" lo que no pudo leer. |
| **Termina cuando** | Cada hallazgo se arregló, se descartó con motivo o se anotó en preguntas abiertas. **Aprueba antes del commit.** |
