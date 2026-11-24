# PitProde

Prode de Fórmula 1 entre amigos. Un organizador carga los jugadores, el calendario de Grandes Premios, el pronóstico de cada jugador (P1, P2, P3 y pole) y el resultado real de cada carrera. La app calcula los puntos y muestra la tabla de posiciones.

## Probalo

| | |
|---|---|
| **Aplicación** | **https://pitprode.netlify.app** |
| Backend (API) | https://pitprode.onrender.com/api/acceso |

Ver la tabla, los pronósticos y el calendario es libre. Para cargar o cambiar datos hace falta la contraseña del organizador (pestaña **Organizador**).

> El backend está en el plan gratuito de Render: si estuvo un rato sin uso, la primera carga puede tardar cerca de 30 segundos.

## Cómo se puntúa

| Acierto | Puntos |
|---|---|
| Piloto del podio en su posición exacta | 5 |
| Piloto que está en el podio, pero en otra posición | 2 |
| Pole | 3 |

Máximo por Gran Premio: 18. En la tabla, ante empate de puntos gana quien tenga más pilotos exactos; si sigue el empate, comparten posición. Un pronóstico se bloquea cuando el GP largó (con la hora del servidor) y el resultado solo se carga después de la largada.

## Documentación

| | |
|---|---|
| [docs/idea.md](docs/idea.md) | Qué es y por qué existe |
| [docs/glosario.md](docs/glosario.md) | Qué significa cada término |
| [docs/decisiones.md](docs/decisiones.md) | Decisiones, con su pregunta, respuesta y origen |
| [docs/preguntas-abiertas.md](docs/preguntas-abiertas.md) | Dudas sin resolver, por impacto |
| **[docs/spec.md](docs/spec.md)** | **30 reglas de negocio e historias de usuario** |
| [docs/plan.md](docs/plan.md) | Arquitectura, base de datos, API y dónde vive cada regla |
| [docs/tasks.md](docs/tasks.md) | Tareas hechas, con su commit |
| [docs/agentes.md](docs/agentes.md) · [AGENTS.md](AGENTS.md) | Reglas de los agentes y del proyecto |
| [docs/despliegue.md](docs/despliegue.md) | Cómo se publica |
| **[docs/informe.md](docs/informe.md)** | **Informe final: pruebas, plan y orden de las tareas** ([PDF](docs/informe.pdf)) |

## Cómo está armado

- **Frontend** (raíz): HTML, CSS y JavaScript sin librerías ni framework. `app.js` dibuja la interfaz y le manda cada cambio a la API por `api.js`.
- **`scoring.js` y `storage.js`**: las reglas del prode y el formato del respaldo, escritos una sola vez; los usan el navegador y el servidor.
- **`backend/`**: servidor Node sin framework (`node:http`), en tres capas: *controllers* (HTTP), *services* (reglas) y *repositories* (único lugar con SQL).
- **Base de datos**: PostgreSQL en Neon (publicado) o SQLite (local y pruebas), con el mismo SQL para las dos.
- **Publicación**: frontend en Netlify, backend en Render, base en Neon.

### API

Todo bajo `/api`, en JSON. Los errores devuelven `{ "errores": ["..."] }`. Toda escritura pide el token del organizador.

| Recurso | Rutas |
|---|---|
| Acceso | `GET` `POST /acceso` |
| Jugadores | `GET` `POST /jugadores` · `PUT` `DELETE /jugadores/:id` |
| Pilotos | `GET` `POST /pilotos` · `PUT` `DELETE /pilotos/:id` |
| Grandes Premios | `GET` `POST /grandes-premios` · `PUT` `DELETE /grandes-premios/:id` |
| Resultado de un GP | `PUT` `DELETE /grandes-premios/:id/resultado` |
| Pronósticos | `GET` `POST /pronosticos` · `GET` `PUT` `DELETE /pronosticos/:id` · `PATCH /pronosticos/:id/favorito` |
| Tabla y datos | `GET /tabla` · `GET /datos` · `GET /exportar` · `POST /importar` |

`GET /pronosticos` acepta los filtros `gpId`, `jugadorId` y `estado`. Los puntos no se guardan: se calculan cada vez que se leen.

## Correrlo en tu computadora

Necesitás Node 22.13 o superior (se probó con Node 24).

```powershell
npm install
node backend/server.js
```

Abrí http://127.0.0.1:3000. En local el servidor usa SQLite (`backend/datos/pitprode.sqlite`, que no se sube a git) y no pide contraseña, porque solo escucha en tu propia PC.

Variables de entorno opcionales (ver [backend/.env.example](backend/.env.example)): `DATABASE_URL` (Postgres), `ORGANIZER_PASSWORD`, `FRONTEND_URL`, `HOST`, `PORT`, `PITPRODE_DB`. Nunca se suben valores reales al repositorio.

## Tests

```powershell
npm test
```

Corre 156 pruebas: las reglas de puntos, el backend completo contra SQLite y contra Postgres emulado (`pg-mem`), y el build del frontend.

## Limitaciones

- Hay una sola contraseña compartida de organizador; no hay cuentas por jugador ni registro de quién cambió qué.
- Los pronósticos de los demás son visibles antes de la largada para cualquiera con el link.
- Las demás dudas sin resolver están en [docs/preguntas-abiertas.md](docs/preguntas-abiertas.md).

## Ramas

- `main`: la versión actual.
- `entrega-modulo-3`: la versión que se entregó en el Módulo 3, con el frontend guardando en `localStorage`.
