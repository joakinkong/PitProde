# Plan técnico — PitProde

Cómo está construida la aplicación y por qué. Las reglas están en [spec.md](spec.md); las tareas, en [tasks.md](tasks.md).

## 1. Arquitectura

```
Navegador                         Render                              Neon
┌──────────────────┐   HTTPS    ┌─────────────────────────┐        ┌───────────────┐
│ Frontend (Netlify)│ ─────────▶│ Backend (node:http)     │───────▶│ PostgreSQL    │
│ HTML + CSS + JS   │  /api/...  │  Controller → Service   │  pg    │ (datos)       │
│ app.js · api.js   │ ◀───────── │      → Repository      │        └───────────────┘
└──────────────────┘   CORS     │  scoring.js · storage.js │
                                 └─────────────────────────┘
En la computadora: el mismo backend sirve también el frontend y usa SQLite (un archivo).
```

| Parte | Tecnología | Dónde corre |
|---|---|---|
| Frontend | HTML, CSS y JavaScript sin librerías ni build de framework | Netlify (publicado) o el propio backend (local) |
| Backend | Node.js sin framework: `node:http`, `node:crypto`; capas Controller / Service / Repository | Render (publicado) o tu PC |
| Base de datos | PostgreSQL (publicado) · SQLite con `node:sqlite` (local y tests) | Neon / archivo local |
| Dependencias | `pg` (Postgres); solo para pruebas: `pg-mem` | |

### Capas del backend

| Capa | Archivos (`backend/src/`) | Responsabilidad | No hace |
|---|---|---|---|
| Entrada | `app.js`, `routes.js`, `estaticos.js`, `config.js` | Servidor HTTP, tabla de rutas, CORS, token, límite de tamaño, lectura de la configuración | Reglas del prode |
| Controller | `controllers/*.controller.js` | Traduce HTTP a llamadas al service y el resultado a un código de estado | Reglas, SQL |
| Service | `services/*.service.js` | Las reglas del prode. Reutiliza `scoring.js` y `storage.js` | HTTP, SQL |
| Repository | `repositories/*.repository.js` | **Único lugar con SQL**, siempre con parámetros | Reglas |
| Base | `db.js` | Adaptadores SQLite y Postgres con la misma interfaz, tablas y carga inicial | |

Por qué en capas: cada una cambia por una razón distinta (el protocolo, una regla, la base) y las reglas se pueden probar sin servidor ni base. Esa separación es la que permitió cambiar de SQLite a Postgres sin tocar ni las reglas ni los controllers.

## 2. Base de datos y su justificación

**Postgres en Neon para publicar.** Render, en el plan gratuito, borra el disco cada vez que reinicia el servicio: un archivo SQLite perdería todos los datos. Neon guarda los datos fuera del servidor, tiene plan gratuito y es PostgreSQL común: solo cambia la cadena de conexión.

**SQLite para local y tests.** No hay que instalar nada y se puede probar sin conexión.

**Una sola escritura del SQL.** Los repositories hablan con una interfaz mínima (`todos`, `uno`, `ejecutar`, `transaccion`) y escriben `?` como parámetro; el adaptador de Postgres los traduce a `$1, $2…`. Se usan solo tipos que existen igual en los dos motores (los booleanos son `0/1`). Resultado: el SQL que se prueba es el que corre publicado.

**Cómo se prueba Postgres sin tenerlo:** con `pg-mem` (Postgres en memoria). Cada suite del backend corre contra SQLite y contra `pg-mem`. Lo único que no se puede comprobar así es la conexión real a Neon: se verifica con la aplicación publicada (ver [informe](informe.md)).

## 3. Modelo de datos

```
jugadores 1 ───< pronosticos >─── 1 grandes_premios
                     │ p1, p2, p3, pole
                     ▼
                  pilotos  ◀── res_p1, res_p2, res_p3, res_pole (resultado del GP)
```

| Tabla | Columnas | Restricciones |
|---|---|---|
| `jugadores` | `id` (PK), `nombre`, `apodo`, `color`, `fecha_alta` | |
| `pilotos` | `id` (PK), `nombre`, `equipo`, `numero`, `activo` (0/1) | |
| `grandes_premios` | `id` (PK), `nombre`, `circuito`, `fecha_largada`, `res_p1`, `res_p2`, `res_p3`, `res_pole` | `res_*` → `pilotos.id`; nulos mientras no hay resultado |
| `pronosticos` | `id` (PK), `jugador_id`, `gp_id`, `p1`, `p2`, `p3`, `pole`, `fecha_carga`, `favorito` (0/1) | FK a jugadores y GPs con `ON DELETE CASCADE` (RN4, RN10); FK de P1–pole a pilotos; **`UNIQUE (jugador_id, gp_id)`** (RN13) |
| `meta` | `clave`, `valor` | Marca que la carga inicial 2026 ya se hizo (RN25) |

No hay columna de puntos ni de estado del GP: se calculan al leer (RN9, RN22).

## 4. API

Todo bajo `/api`, en JSON. Errores: `{ "errores": ["mensaje"] }`. Códigos: `200/201` bien · `400` JSON inválido o cuerpo que no es objeto · `401` falta ingresar o venció · `403` CORS (solo en la pregunta previa) · `404` no existe · `409` duplicado o en uso · `413` cuerpo demasiado grande · `422` rompe una regla · `429` bloqueo por intentos.

| Método y ruta | Qué hace | Pide token |
|---|---|---|
| `GET /acceso` | Si la API pide contraseña y si el token sirve | No |
| `POST /acceso` | Entra con la contraseña; devuelve el token | No (es la que lo entrega) |
| `GET /datos` · `/tabla` · `/exportar` | Todos los datos · tabla de posiciones · backup | No |
| `POST /importar` | Reemplaza todos los datos (hasta 2 MB) | **Sí** |
| `GET /jugadores` · `/pilotos` · `/grandes-premios` | Listados | No |
| `POST` `PUT` `DELETE` en cada uno | Alta, edición y baja | **Sí** |
| `PUT` `DELETE /grandes-premios/:id/resultado` | Cargar, corregir o quitar el resultado | **Sí** |
| `GET /pronosticos` (`?gpId=&jugadorId=&estado=`) · `GET /pronosticos/:id` | Listar y consultar, con puntos | No |
| `POST /pronosticos` · `PUT` `DELETE /pronosticos/:id` | Crear, editar, borrar | **Sí** |
| `PATCH /pronosticos/:id/favorito` | Marcar o desmarcar | **Sí** |

Además, el servidor entrega los archivos del frontend (`/`, `/app.js`, etc.) con una lista fija: nunca arma una ruta de disco con lo que manda el cliente.

## 5. Dónde vive cada regla

| Reglas | Dónde | Archivo |
|---|---|---|
| RN1–RN3 | Service de jugadores | `services/jugadores.service.js` |
| RN4, RN10 | Base (borrado en cascada) + Service (avisa cuántos) | `db.js`, `services/jugadores.service.js`, `grandesPremios.service.js` |
| RN5, RN7 | Service de pilotos | `services/pilotos.service.js` |
| RN6 | Service de pronósticos | `services/pronosticos.service.js` |
| RN8, RN11 | Service de GPs | `services/grandesPremios.service.js` |
| RN9 | Funciones puras | `scoring.js` (`estadoGP`) |
| RN12, RN14, RN17 | Funciones puras de validación, usadas por los services con la hora del servidor | `scoring.js` (`validarPronostico`, `validarResultado`, `yaLargo`) |
| RN13 | Service + restricción única de la base | `services/pronosticos.service.js`, `db.js` |
| RN15, RN16, RN18 | Service de pronósticos y de GPs | `services/pronosticos.service.js`, `grandesPremios.service.js` |
| RN19–RN23 | Funciones puras | `scoring.js` (`puntuarPronostico`, `calcularTabla`) |
| RN22 | Service (calcula al leer) | `services/pronosticos.service.js` (`presentar`) |
| RN24 | Formato y validación compartidos + transacción | `storage.js`, `services/datos.service.js`, `repositories/datos.repository.js` |
| RN25 | Carga inicial una vez por base | `db.js` (`prepararDatos`) |
| RN26 | Entrada HTTP: toda escritura pide token | `app.js` |
| RN27, RN28 | Service de acceso | `services/acceso.service.js` |
| RN29 | Configuración | `config.js` |
| RN30 | Entrada HTTP | `app.js` (`cabecerasCors`) |

`scoring.js` y `storage.js` son archivos de la raíz que se cargan en el navegador **y** los usa el backend: las reglas del prode están escritas una sola vez.

## 6. Seguridad

- **Secretos fuera del código:** `DATABASE_URL` y `ORGANIZER_PASSWORD` solo existen como variables de entorno en Render. `.env` está en `.gitignore`; el repositorio solo tiene `backend/.env.example`, sin valores.
- **Contraseña:** se compara en tiempo constante y el token es un HMAC-SHA256 del vencimiento firmado con la contraseña; no se guarda en el servidor.
- **SQL:** siempre con parámetros; nunca se arma texto con datos del usuario.
- **Color del jugador:** solo `#rrggbb`, porque va dentro de un atributo `style`.
- **CORS:** solo las direcciones de `FRONTEND_URL`.
- **Tamaño:** 10 KB por pedido (2 MB para importar).

## 7. Decisiones técnicas

Detalladas, con su pregunta, respuesta y origen, en [decisiones.md](decisiones.md): capas Controller/Service/Repository; `node:http` en lugar de Express (decisión cuestionada); hora del servidor; puntos calculados al leer; un solo SQL para dos bases; `pg-mem` para probar; Postgres en Neon; contraseña única de organizador.

## 8. Preguntas para el analista

Las dudas sin resolver están ordenadas por impacto en [preguntas-abiertas.md](preguntas-abiertas.md). Las tres más importantes: (1) si los pronósticos ajenos deberían ocultarse hasta la largada, (2) qué hacer si una carrera se reprograma o cancela, (3) si hace falta un registro de quién cambió qué.
