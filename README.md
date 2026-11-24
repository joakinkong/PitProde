# PitProde

Prode de Fórmula 1 entre amigos. Un organizador carga los jugadores, el calendario de Grandes Premios, el pronóstico de cada jugador (P1, P2, P3 y pole) y el resultado real de cada carrera. La app calcula los puntos y arma la tabla de posiciones.

Está precargado con la grilla y el calendario 2026 y nació como el TP1 de Generación T.

## Cómo se puntúa

| Acierto | Puntos |
|---|---|
| Piloto del podio en su posición exacta | 5 |
| Piloto que está en el podio, pero en otra posición | 2 |
| Pole | 3 |

Máximo por Gran Premio: 18. En la tabla, ante empate de puntos gana quien tenga más pilotos exactos; si sigue el empate, comparten posición.

Un pronóstico se bloquea cuando el GP largó (con la hora del servidor), y el resultado solo se carga después de la largada.

## Cómo usarlo

Necesitás Node 22.13 o superior (se probó con Node 24). No hay nada que instalar.

```powershell
node backend/server.js
```

Después abrí http://127.0.0.1:3000 en el navegador. El mismo servidor guarda los datos y muestra la página, así que no se puede abrir `index.html` suelto.

Los datos quedan en `backend/datos/pitprode.sqlite`, que no se sube a git. Si querés cambiar el puerto o el archivo:

```powershell
$env:PORT=3001; $env:PITPRODE_DB="C:\ruta\mi-prode.sqlite"; node backend/server.js
```

En la pestaña **Datos** podés exportar un JSON de respaldo, importarlo, cargar la temporada 2026 de nuevo o borrar todo.

## Tests

```powershell
node --test
```

Corre las pruebas de las reglas de puntos (`scoring.test.js`) y las del backend (`backend/tests/`).

## Cómo está armado

- **Frontend** (raíz): HTML, CSS y JavaScript sin librerías ni build. `app.js` dibuja la interfaz y le manda cada cambio a la API a través de `api.js`.
- **`scoring.js`**: las reglas del prode como funciones puras. Las usan el servidor y el navegador.
- **`backend/`**: servidor en Node sin dependencias (`node:http` y `node:sqlite`), con tres capas: *controllers* (HTTP), *services* (reglas del prode) y *repositories* (único lugar con SQL).
- **`entregas/`**: documentos de las actividades del curso.

### API

Todo bajo `/api`, en JSON. Los errores devuelven `{ "errores": ["..."] }`.

| Recurso | Rutas |
|---|---|
| Jugadores | `GET` `POST /jugadores` · `PUT` `DELETE /jugadores/:id` |
| Pilotos | `GET` `POST /pilotos` · `PUT` `DELETE /pilotos/:id` |
| Grandes Premios | `GET` `POST /grandes-premios` · `PUT` `DELETE /grandes-premios/:id` |
| Resultado de un GP | `PUT` `DELETE /grandes-premios/:id/resultado` |
| Pronósticos | `GET` `POST /pronosticos` · `GET` `PUT` `DELETE /pronosticos/:id` · `PATCH /pronosticos/:id/favorito` |
| Tabla y datos | `GET /tabla` · `GET /datos` · `GET /exportar` · `POST /importar` |

`GET /pronosticos` acepta los filtros `gpId`, `jugadorId` y `estado`. Los puntos no se guardan: se calculan cada vez que se leen.

## Limitaciones

- **No hay autenticación.** Cualquiera que llegue al puerto puede cargar o cambiar datos de cualquier jugador. Por eso el servidor escucha solo en `127.0.0.1` (tu propia PC). Para compartirlo con otras personas hay que agregarla antes.
- Un solo organizador y una sola base: no hay cuentas ni permisos por jugador.

## Ramas

- `main`: la versión actual, con backend.
- `entrega-modulo-3`: la versión que se entregó en el Módulo 3, con el frontend guardando en `localStorage`.
