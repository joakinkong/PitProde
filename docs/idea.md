# Idea — PitProde

> Documento redactado a partir del TP N° 1 de Generación T ("Diseñá tu propia aplicación", Joaquín Barreira) y de lo que la aplicación hace hoy. Al final se explica qué cambió respecto del TP1.

## El problema

Con mis amigos seguimos la Fórmula 1 y antes de cada Gran Premio apostamos (sin plata) quién va a quedar en el podio. Hoy lo hacemos por un grupo de WhatsApp: los pronósticos se pierden entre mensajes, alguien siempre dice que "lo había mandado antes" y, al final de cada carrera, hay que sumar los puntos a mano en una nota del celular. Con más de 20 carreras por temporada, llevar la cuenta así es imposible y termina en discusión.

## Qué es PitProde

Una aplicación web para llevar un prode de Fórmula 1 durante toda la temporada: se cargan los jugadores, el calendario de Grandes Premios, el pronóstico de cada jugador (P1, P2, P3 y pole) y el resultado real de cada carrera. La app calcula los puntos y muestra una tabla de posiciones que se actualiza sola.

Por qué sirve: deja todo registrado en un solo lugar, **no permite cambiar un pronóstico una vez que largó la carrera**, calcula los puntos con reglas claras y termina con la discusión.

## Quién la usa

- **Organizador:** una persona del grupo. Carga los pronósticos de todos y el resultado de cada carrera. Es el único que puede cambiar datos.
- **Visitante (jugador o curioso):** mira la tabla, los pronósticos y el calendario con solo abrir el link. No necesita cuenta.

Grupos de amigos, familias o compañeros de curso que miran F1 y quieren competir entre ellos.

## Qué hace

1. Gestionar jugadores (nombre, apodo, color para la tabla).
2. Gestionar pilotos (nombre, equipo, número, activo/inactivo por si hay un cambio de piloto a mitad de temporada). La grilla 2026 viene precargada.
3. Gestionar el calendario de Grandes Premios (nombre, circuito, fecha y hora de largada). El calendario 2026 viene precargado.
4. Cargar el pronóstico de cada jugador para cada GP: P1, P2, P3 y pole. Se puede editar hasta la hora de largada; después queda bloqueado.
5. Cargar el resultado real de cada GP (podio y pole), solo después de la largada.
6. Calcular los puntos automáticamente: 5 por cada piloto en su posición exacta, 2 por cada piloto que está en el podio pero en otra posición y 3 por acertar la pole. Máximo 18 por carrera.
7. Mostrar la tabla de posiciones, ordenada por puntos y con desempate por cantidad de aciertos exactos.
8. Buscar y filtrar: pronósticos por GP, por jugador, por estado del GP y por favoritos.
9. Exportar e importar todos los datos en un archivo JSON, como respaldo o para pasarle el prode a otro organizador.

## Datos que maneja

| Registro | Campos |
|---|---|
| Jugador | id · nombre · apodo · color · fecha de alta |
| Piloto | id · nombre · equipo · número · activo |
| Gran Premio | id · nombre · circuito · fecha y hora de largada · resultado (P1, P2, P3, pole) · estado (se calcula: próximo, cerrado, finalizado) |
| Pronóstico | id · jugador · GP · P1 · P2 · P3 · pole · fecha de carga · favorito · puntos (se calculan al leer) |

Cada pronóstico une a un jugador con un GP, y solo puede haber uno por cada combinación.

## Qué no es

- No se apuesta dinero: la app solo cuenta puntos.
- No usa datos reales en vivo ni APIs externas de F1: la grilla y el calendario se cargan y se editan a mano.
- No tiene cuentas de usuario por jugador: hay una sola contraseña, la del organizador.

## Qué cambió respecto del TP1

El TP1 describía una app **sin backend**, con todo guardado en el navegador (`localStorage`), sin cuentas ni contraseñas. Para el proyecto final se agregó:

| TP1 | Proyecto final | Por qué |
|---|---|---|
| Datos en el navegador de una sola persona | Backend propio con base de datos (Postgres publicado, SQLite en local) | Que todos vean la misma tabla y que los datos no se pierdan |
| La hora de largada se controlaba con el reloj del dispositivo | La hora que vale es la del servidor | Cambiando la hora de la PC se podía pronosticar después de la largada |
| "No hay cuentas ni contraseñas" | Una contraseña de organizador para escribir; leer sigue siendo libre | Con la app pública, cualquiera podría borrar o cambiar todo |
| Se abre con doble clic en `index.html` | Se publica en internet (Netlify + Render + Neon) | Que se pueda probar sin instalar nada |
