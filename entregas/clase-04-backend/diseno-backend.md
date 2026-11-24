# Clase 4 — Diseñando el backend de PitProde

Joaquín · Generación T, Módulo 3 · 24/11/2026

## 1. Qué es la aplicación

PitProde es un prode de Fórmula 1 entre amigos. Un organizador carga jugadores, pilotos, el calendario de Grandes Premios (GP), el pronóstico de cada jugador (P1, P2, P3 y pole) y el resultado real de cada carrera. La app calcula los puntos y arma la tabla de posiciones.

Hoy es un frontend puro: HTML, CSS y JavaScript sin librerías, que guarda todo en el `localStorage` del navegador. Viene precargado con la grilla y el calendario 2026. Repo: https://github.com/joakinkong/PitProde

## 2. Análisis del frontend actual

### Funcionalidades principales

- Alta, edición y baja de jugadores, pilotos y GPs.
- Carga de pronósticos (uno por jugador y GP), con edición mientras el GP no largó.
- Carga del resultado real una vez que el GP largó.
- Cálculo de puntos y tabla de posiciones.
- Calendario con filtro por estado y pronósticos con filtros (GP, jugador, estado, favoritos).
- Exportar e importar todo como JSON.

### Entidades y datos

| Entidad | Campos |
|---|---|
| Jugador | `id`, `nombre`, `apodo`, `color`, `fechaAlta` |
| Piloto | `id`, `nombre`, `equipo`, `numero`, `activo` |
| Gran Premio | `id`, `nombre`, `circuito`, `fechaLargada` (UTC), `resultado` (`p1`, `p2`, `p3`, `pole`, o `null`) |
| Pronóstico | `id`, `jugadorId`, `gpId`, `p1`, `p2`, `p3`, `pole`, `fechaCarga`, `puntos`, `favorito` |

Relaciones: un pronóstico pertenece a un jugador y a un GP. P1, P2, P3 y pole referencian pilotos. El resultado de un GP es un podio más pole, del mismo tipo que un pronóstico.

### Reglas de negocio (hoy en `scoring.js`)

- 5 puntos por piloto del podio en su posición exacta, 2 por piloto que está en el podio en otra posición, 3 por la pole. Máximo por GP: 18.
- Tabla: ordena por puntos; si empatan, por cantidad de exactos; si sigue el empate comparten posición.
- Estado de un GP (se calcula, no se guarda): `proximo`, `cerrado` (largó sin resultado) o `finalizado`.
- Un pronóstico se bloquea cuando el GP larga. El resultado solo se carga después de la largada.
- Un pronóstico por jugador y GP. P1, P2 y P3 son pilotos distintos. Los pilotos tienen que existir.

### Persistencia actual

Un único objeto JSON en `localStorage` (clave `pitprode.datos`), con respaldo si se daña. Los puntos de cada pronóstico se recalculan y se guardan al cargar.

### Problemas que aparecen al analizarlo

1. **El bloqueo por largada usa el reloj del navegador.** `validarPronostico` recibe `new Date()` del dispositivo. Cambiando la hora de la PC se puede cargar o editar un pronóstico después de que largó la carrera. En un prode entre amigos es justo la trampa que importa.
2. **Cada navegador tiene su propia copia de los datos.** Dos personas no pueden ver la misma tabla; hoy solo se comparte exportando e importando un JSON a mano.
3. **Quien tenga acceso al navegador del organizador puede editar todo**, porque no hay ninguna separación entre quien administra y quien juega.

El problema 1 es el que justifica empezar por los pronósticos en el backend.

## 3. Separación de responsabilidades

| Frontend | Backend |
|---|---|
| Pantallas, navegación por pestañas, formularios | Reglas de negocio: puntos, estados, tabla |
| Estados visuales: filtros, pestaña activa, registro en edición, borrador | Validaciones que no se pueden saltear: bloqueo por largada, podio sin repetidos, unicidad por jugador y GP, pilotos existentes |
| Formato de fechas y mensajes en voseo | Persistencia y acceso a datos |
| Validaciones de comodidad (campo vacío) que dan respuesta inmediata | Reloj de referencia: la hora del servidor, no la del dispositivo |
| Mostrar los errores que devuelve el backend | Exportar e importar con validación completa |

Criterio: el frontend puede validar para ser cómodo, pero el backend valida siempre, porque al frontend lo controla quien lo usa. El frontend deja de calcular puntos y de tocar `localStorage` cuando se conecte, y solo muestra lo que devuelve la API.

`scoring.js` ya está escrito como funciones puras, sin DOM ni `localStorage`. Eso permite que el backend lo reutilice tal cual y que haya una sola fuente de verdad de las reglas.

## 4. Endpoints propuestos

Todos bajo `/api`, JSON de entrada y salida. Los errores devuelven `{ "errores": ["mensaje", ...] }`.

| Método y ruta | Qué hace |
|---|---|
| `GET /jugadores` · `POST /jugadores` | Listar y crear jugadores |
| `PUT /jugadores/:id` · `DELETE /jugadores/:id` | Editar y borrar (borra sus pronósticos) |
| `GET /pilotos` · `POST /pilotos` | Listar y crear pilotos |
| `PUT /pilotos/:id` · `DELETE /pilotos/:id` | Editar y borrar (no si algún pronóstico lo usa) |
| `GET /grandes-premios` · `POST /grandes-premios` | Calendario, con el estado calculado |
| `PUT /grandes-premios/:id` · `DELETE /grandes-premios/:id` | Editar y borrar |
| `PUT /grandes-premios/:id/resultado` | Cargar o corregir el resultado (solo después de largar) |
| `DELETE /grandes-premios/:id/resultado` | Quitar el resultado |
| **`GET /pronosticos`** | **Listar, filtrando por `gpId`, `jugadorId`, `estado`** |
| **`GET /pronosticos/:id`** | **Un pronóstico, con sus puntos calculados** |
| **`POST /pronosticos`** | **Crear un pronóstico** |
| **`PUT /pronosticos/:id`** | **Editar un pronóstico (solo antes de la largada)** |
| `DELETE /pronosticos/:id` | Borrar (solo antes de la largada) |
| `PATCH /pronosticos/:id/favorito` | Marcar o desmarcar favorito |
| `GET /tabla` | Tabla de posiciones calculada |
| `GET /exportar` · `POST /importar` | Respaldo completo en JSON, con la validación actual |

En negrita, lo que implemento en esta entrega. Códigos de estado: `200`/`201` si salió bien, `400` si el cuerpo no es un JSON válido, `404` si no existe el recurso, `409` si ya existe un pronóstico de ese jugador para ese GP, `422` si rompe una regla del prode (GP ya largó, podio repetido, piloto inexistente).

## 5. Arquitectura elegida

**Capas Controller → Service → Repository, sobre `node:http` y `node:sqlite`.**

```
backend/
  server.js                     arranca el servidor HTTP
  src/
    app.js                      arma las dependencias y enruta
    db.js                       abre SQLite, crea las tablas, carga los datos 2026
    controllers/                recibe la petición, traduce HTTP <-> llamadas al service
    services/                   reglas del prode (reutiliza ../../scoring.js)
    repositories/               único lugar con SQL
  tests/
```

Por qué:

- **Controller / Service / Repository** porque cada capa cambia por una razón distinta: el Controller cambia si cambia el protocolo (rutas, códigos de estado), el Service cambia si cambia una regla del prode y el Repository cambia si cambia la base de datos. Hoy esas tres cosas están mezcladas en el frontend y por eso no se pueden probar por separado.
- **El Service no sabe nada de HTTP ni de SQL**: recibe objetos y un reloj, y devuelve resultados o errores. Eso permite probar el bloqueo por largada con una hora inventada, sin servidor y sin base.
- **SQLite** porque la app es chica, de un solo organizador, y SQLite es un archivo: no hay que instalar ni mantener un servidor de base de datos. Si algún día hace falta otra base, solo cambia la capa Repository.
- **Los puntos no se guardan: se calculan al leer.** En el frontend se guardaba `puntos` en cada pronóstico y había que recalcularlo cada vez que se corregía un resultado. Guardarlo en la base duplica un dato que se deriva de otros dos y abre la puerta a que queden desfasados. Con calcularlo al leer, corregir un resultado actualiza todo solo.

## 6. Una decisión de la IA que cuestioné

**La propuesta de la IA:** usar Express con la librería de SQLite instalada por npm (`better-sqlite3`), que es la combinación más común para un backend así.

**Lo que cuestioné:** el proyecto tiene una regla explícita en `AGENTS.md`: *sin librerías, sin frameworks, sin build; no agregar dependencias ni archivos de configuración (`package.json`) sin pedido*. Express traería `package.json`, `node_modules` y un paso de instalación para algo que se resuelve con lo que ya trae Node. Además, `better-sqlite3` compila un módulo nativo, que en Windows suele fallar si faltan las herramientas de compilación, y en un curso eso es un costo real.

**Qué decidí:** usar `node:http` (rutas con un enrutador de unas treinta líneas) y `node:sqlite`, que vienen incluidos en Node 24. Verifiqué que `node:sqlite` funciona en la versión instalada antes de elegirlo.

**Lo que se pierde, dicho de frente:** hay que escribir a mano el parseo del cuerpo, la lectura de parámetros y el enrutado, cosas que Express da hechas. Me quedo con el costo porque son pocas rutas y porque la arquitectura en capas es la misma con o sin Express: si el proyecto crece, el Controller se puede pasar a Express sin tocar Service ni Repository.

## 7. Qué se implementa en esta entrega

La funcionalidad de **pronósticos**: crear, editar, consultar y listar, con todas las reglas del prode del lado del servidor y con la hora del servidor como referencia. Quedan para después los demás recursos, la tabla, la importación y la conexión del frontend.

Límites conocidos de esta primera versión, declarados a propósito: no hay autenticación (cualquiera que llegue a la API puede cargar un pronóstico por cualquier jugador) y el servidor escucha solo en `127.0.0.1`. Es una decisión para esta etapa, no un descuido.

## 8. Evidencia de que funciona

- **Tests automáticos:** 28 pruebas nuevas del backend (15 del service con base en memoria y reloj controlado, 13 de punta a punta contra un servidor HTTP real). Con las 18 que ya existían del puntaje, `node --test` da 46 de 46. Salida completa en `tests-salida.txt`.
- **Corrida a mano contra el servidor real** (`node backend/server.js`, SQLite en archivo, hora real del servidor): `evidencia.txt` tiene las nueve peticiones con su respuesta. Lo que muestran:
  - Crear un pronóstico para un GP que no largó devuelve `201` y los puntos en `null`.
  - Repetir jugador y GP devuelve `409`; un podio con piloto repetido, `422`.
  - **Un pronóstico para un GP que ya largó devuelve `422` aunque el cliente mande una `fechaCarga` vieja:** la hora que cuenta es la del servidor. Esto resuelve el problema 1 del análisis.
  - Editar y listar funcionan; un filtro con `' OR 1=1 --` devuelve una lista vacía (consultas con parámetros); un JSON roto devuelve `400`.
- **Un bug encontrado por los tests:** al pasarse del límite de tamaño del cuerpo, el servidor cortaba la conexión mientras el cliente todavía estaba escribiendo y el cliente veía un error de socket en vez de un `413`. La primera corrección (responder y recién después cortar) no alcanzó: el test seguía fallando de vez en cuando. La definitiva fue responder `413` enseguida y seguir descartando el cuerpo que llega, con un tope de 1 MB. Después de eso, 0 fallas en 230 corridas seguidas y en 80 corridas en paralelo; una corrida de 40 seguidas hecha justo antes del último ajuste había fallado una vez y no pude reproducirlo después, así que no puedo asegurar que la carrera esté 100 % descartada.

Cómo repetirlo:

```
node --test
node backend/seed-demo.js
node backend/server.js
```
