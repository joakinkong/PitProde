# Revisión de seguridad antes de publicar

Antes de publicar se pasó el subagente revisor ([`.claude/agents/revisor.md`](../../../.claude/agents/revisor.md)) por los archivos nuevos más sensibles, cada uno en una sesión nueva. Salidas completas: `antes-*.txt` (primera pasada) y `despues-*.txt` (segunda pasada, después de los arreglos).

## Primera pasada → qué se hizo

| Archivo | Hallazgo | Gravedad | Decisión |
|---|---|---|---|
| `app.js` | `X-Forwarded-For` falsificable: cambiando la cabecera en cada intento se evitaba el bloqueo por fuerza bruta de la contraseña | Alta | **Arreglado.** Detrás del proxy cuenta la última dirección (la agrega Render); sin proxy se ignora la cabecera. Pruebas en `acceso.test.js`. |
| `app.js` | `%ZZ` en la dirección daba 500 en vez de 400 | Media | **Arreglado** (era el mismo error que el revisor había encontrado en la clase 17). Prueba en `recursos.api.test.js`. |
| `app.js` | Con `?id=1&id=2` se queda con el último valor | Baja | No se cambia: ningún endpoint usa parámetros repetidos. |
| `services/acceso.service.js` | Las direcciones con 1 a 4 fallos nunca se borraban de memoria: el mapa crecía sin límite | Media | **Arreglado.** Los fallos se olvidan a los 15 minutos y hay un tope de direcciones. Pruebas en `acceso.test.js`. |
| `services/acceso.service.js` | Todas las conexiones sin dirección comparten un mismo contador | Baja | Aceptado: la dirección falta solo si el socket se cerró en el medio del pedido (no hay a quién responder) y en Render el proxy siempre la manda. |
| `db.js` | Dos servidores arrancando a la vez contra una base vacía podían chocar al cargar los datos 2026 | Media | **Mitigado:** la carga usa `ON CONFLICT DO NOTHING`. No se pudo probar con un test porque `pg-mem` no soporta DDL concurrente; Render corre una sola instancia. |
| `db.js` | El adaptador de SQLite exponía la base cruda (`bd`), que saltea los parámetros | Baja | **Arreglado:** se quitó la propiedad. |
| `db.js` | `?` dentro de un texto SQL se traduciría mal a `$n` | Baja | Aceptado: es un contrato documentado en el código y ningún repository lo viola. |
| `config.js` | `PORT` inválido se descartaba en silencio | Baja | **Arreglado** y probado. |
| `config.js` | `DATABASE_URL` sin ninguna validación de formato | Baja | **Arreglado**: tiene que empezar con `postgres://` o `postgresql://`, y el mensaje de error no muestra el valor (es un secreto). |

## Segunda pasada → qué se hizo

| Archivo | Hallazgo | Gravedad | Decisión |
|---|---|---|---|
| `app.js` | Sin tiempo máximo para quien envía el cuerpo gota a gota | Baja | **Arreglado:** `headersTimeout` 15 s y `requestTimeout` 30 s. |
| `services/acceso.service.js` | Al llegar al tope se podía descartar a una dirección todavía bloqueada | Baja | **Arreglado:** se descarta primero a las no bloqueadas. Prueba en `acceso.test.js`. |
| `services/acceso.service.js` | Bucket compartido de direcciones desconocidas | Media | Aceptado, mismo motivo que arriba (el revisor lo volvió a marcar). |

El revisor no modificó ningún archivo.
