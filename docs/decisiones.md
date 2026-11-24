# Decisiones — PitProde

Cada decisión tiene su pregunta, su respuesta y su origen, agrupadas por tema. Las reglas resultantes están numeradas en [spec.md](spec.md) (RN).

**Cómo leer la columna "Origen":**

- **TP1:** salió del TP1 escrito por el autor.
- **Autor:** el autor respondió una pregunta puntual durante el desarrollo.
- **Propuesta de la IA:** la tomó el asistente de IA (Claude) al implementar y **todavía tiene que confirmarla el autor**. Si no coincide con lo que el autor quería, se cambia la regla y el código.

## 1. Alcance y reglas del juego

| Pregunta | Respuesta | Origen |
|---|---|---|
| ¿Se apuesta dinero? | No. La app solo cuenta puntos. | TP1 |
| ¿Cómo se puntúa? | 5 puntos por piloto en su posición exacta, 2 por piloto del podio en otra posición, 3 por la pole. Máximo 18 por GP. | TP1 → RN19–RN21 |
| ¿Cómo se desempata la tabla? | Por cantidad de aciertos exactos. | TP1 → RN23 |
| Si siguen empatados, ¿qué pasa? | Comparten posición (1, 1, 3…) y se listan por nombre. | Propuesta de la IA → RN23 |
| ¿Se puede repetir un piloto en el podio? | No: P1, P2 y P3 son distintos. | TP1 → RN12 |
| ¿La pole puede ser el mismo piloto que P1? | Sí. Es una predicción aparte. | Propuesta de la IA → RN12 (el TP1 pone como ejemplo una pole igual al P1 y da 12 puntos) |
| ¿Cuántos pronósticos hay por jugador y GP? | Uno solo. Cargar de nuevo edita el existente. | TP1 → RN13 |
| ¿Hasta cuándo se puede pronosticar o cambiar un pronóstico? | Hasta la hora de largada. Después queda bloqueado (no se puede ni editar ni borrar). | TP1 → RN14 |
| ¿Cuándo se puede cargar el resultado? | Solo después de la largada. | TP1 → RN17 |
| ¿Se puede corregir un resultado mal cargado? | Sí, o quitarlo. Los puntos se recalculan solos. | Propuesta de la IA → RN18 |
| ¿Qué pasa con un piloto que se va a mitad de temporada? | Se lo marca inactivo: deja de aparecer para pronosticar, pero sus pronósticos y resultados anteriores se conservan. No se puede borrar si alguien lo usó. | TP1 (campo "activo") + Propuesta de la IA → RN6, RN7 |
| ¿El favorito afecta los puntos? | No, es solo una marca para destacar jugadas. | TP1 |
| ¿Cuántos pilotos y GPs vienen cargados? | Los 22 pilotos de la grilla 2026 y los 23 GPs del calendario 2026. | TP1 → RN25 |

## 2. Datos y respaldo

| Pregunta | Respuesta | Origen |
|---|---|---|
| ¿Dónde se guardaban los datos en el TP1? | En `localStorage`, en un solo dispositivo. | TP1 |
| ¿Dónde se guardan ahora? | En una base de datos del servidor, para que todos vean lo mismo y no se pierdan. | Autor (pidió conectar el frontend con el backend) |
| ¿Se guardan los puntos de cada pronóstico? | No. Se calculan cada vez que se leen. Así, corregir un resultado actualiza todo solo y no hay datos que se desfasen. | Propuesta de la IA → RN22 |
| ¿Qué pasa si se borra un jugador o un GP? | Se borran también sus pronósticos. La app pide confirmación y avisa cuántos se pierden. | TP1 → RN4, RN10 |
| ¿Se puede exportar e importar? | Sí, un JSON con todos los datos. Importar reemplaza todo o no cambia nada. | TP1 → RN24 |
| ¿Qué pasa con un archivo importado roto? | Se informa qué está mal y no se pierde nada de lo guardado. | TP1 → RN24 |
| Si se "borra todo" y se reinicia el servidor, ¿vuelven los datos 2026? | No. La carga 2026 se hace una sola vez al crear la base; si no, nunca se podría tener una base vacía. | Propuesta de la IA → RN25 |
| ¿Qué formato tiene el color de un jugador? | Solo `#rrggbb`. Se usa dentro de un atributo `style`, y aceptar cualquier texto permitiría meter CSS ajeno desde un archivo importado. | Propuesta de la IA, a partir de un hallazgo del revisor (clase 19) → RN3 |

## 3. Arquitectura

| Pregunta | Respuesta | Origen |
|---|---|---|
| ¿Cómo se organiza el backend? | En capas Controller → Service → Repository. El Controller traduce HTTP, el Service tiene las reglas, el Repository es el único lugar con SQL. Cada capa cambia por una razón distinta y las reglas se pueden probar sin servidor ni base. | Propuesta de la IA (clase 4) |
| ¿Express y una librería de SQLite, como propuso la IA? | No. `node:http` y `node:sqlite`, que vienen con Node. El proyecto tenía una regla de no agregar dependencias sin pedido y la librería nativa de SQLite suele fallar al compilar en Windows. | **Autor** (cuestionó la propuesta de la IA, clase 4) |
| ¿De quién es la hora que manda? | La del servidor. La del dispositivo se podía cambiar para pronosticar después de la largada. | Propuesta de la IA (clase 4) → RN14 |
| ¿Las reglas del prode se escriben de nuevo en el backend? | No: el backend reutiliza `scoring.js`, que ya tenía las reglas como funciones puras. Hay una sola fuente de verdad. | Propuesta de la IA |
| ¿El frontend sigue validando? | Sí, solo para dar respuesta rápida. El backend valida siempre. | Propuesta de la IA |
| ¿Cómo se escribe el SQL para dos bases? | Una sola vez, sobre una interfaz mínima (`todos`, `uno`, `ejecutar`, `transaccion`) con un adaptador por motor. Así el SQL que se prueba en SQLite en local es el mismo que corre en Postgres publicado. | Propuesta de la IA |
| ¿Cómo se prueba el SQL de Postgres sin Postgres instalado? | Con `pg-mem`, un Postgres emulado en memoria. El mismo juego de pruebas corre contra SQLite y contra `pg-mem`. La conexión real a Neon solo se puede comprobar publicada. | Propuesta de la IA |
| ¿Se agregan dependencias? | Solo `pg` (Postgres) y, para pruebas, `pg-mem`. | **Autor** (autorizó `pg` y el `package.json`) |

## 4. Publicación

| Pregunta | Respuesta | Origen |
|---|---|---|
| ¿Dónde se publica? | Frontend en Netlify, backend en Render, base de datos en Neon (la combinación sugerida en el curso). | Autor (eligió la opción con Postgres en Neon) |
| ¿Por qué no SQLite en Render? | En el plan gratuito de Render el disco se borra al reiniciar: se perderían los datos. Neon guarda los datos fuera del servidor. | Propuesta de la IA |
| ¿Quién puede cambiar datos en la versión pública? | Solo quien conozca la contraseña del organizador. Ver es libre. | **Autor** (pidió contraseña simple) → RN26 |
| ¿Cuántas contraseñas hay? | Una sola, compartida, definida por variable de entorno. No hay cuentas por jugador. | Propuesta de la IA, coherente con el TP1 ("no hay cuentas") → RN27 |
| ¿Cuánto dura la sesión de organizador? | 12 horas. | Propuesta de la IA → RN27 |
| ¿Cómo se frenan los intentos de adivinar la contraseña? | 5 intentos fallidos seguidos bloquean 15 minutos a esa dirección. | Propuesta de la IA → RN28 |
| ¿Se puede publicar sin contraseña por error? | No: el servidor se niega a arrancar abierto a internet sin `ORGANIZER_PASSWORD`. | Propuesta de la IA → RN29 |
| ¿Quién puede pedirle cosas a la API desde un navegador? | Solo la dirección del frontend publicado (CORS). | Consigna del curso → RN30 |
| ¿Dónde van las contraseñas y la cadena de conexión? | En variables de entorno cargadas en el panel de cada servicio. Nunca en el código ni en el repositorio. | Consigna del curso |
| ¿Cómo se llega a la API desde el frontend publicado? | El build genera `config.js` con la dirección del backend a partir de la variable `PITPRODE_API_URL`, así no queda escrita en el código. | Propuesta de la IA |
