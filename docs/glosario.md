# Glosario — PitProde

Cada término se usa con este significado en la spec, en el código y en la interfaz.

| Término | Definición |
|---|---|
| **Prode** | Juego entre amigos en el que cada uno pronostica el resultado de cada carrera y suma puntos según cuánto acierta. Acá no se apuesta dinero. |
| **Organizador** | La persona que conoce la contraseña y puede cargar y cambiar datos. Es una sola contraseña compartida, no hay cuentas individuales. |
| **Visitante** | Quien abre la página sin ingresar. Puede ver la tabla, los pronósticos, el calendario y los datos, pero no cambiar nada. |
| **Jugador** | Participante del prode. No inicia sesión: el organizador carga sus pronósticos. Tiene nombre, apodo opcional y un color para reconocerlo en la tabla. |
| **Piloto** | Corredor de la grilla. Puede estar **activo** o **inactivo** (por ejemplo, si lo reemplazan a mitad de temporada). |
| **Gran Premio (GP)** | Una carrera del calendario, con nombre, circuito y fecha y hora de largada. |
| **Largada** | Momento en que arranca la carrera. Después de la largada ya no se pueden cargar, editar ni borrar pronósticos de ese GP. |
| **Podio** | Los tres primeros de la carrera: P1, P2 y P3. |
| **Pole** | El piloto que largó primero (el más rápido en la clasificación). Se pronostica aparte del podio y puede ser el mismo que P1. |
| **Pronóstico** | La predicción de un jugador para un GP: quién queda P1, P2, P3 y quién hace la pole. Hay uno solo por jugador y GP. |
| **Resultado** | Lo que pasó de verdad en un GP: P1, P2, P3 y pole. Se carga después de la largada y se puede corregir. |
| **Posición exacta** | Un piloto del pronóstico que quedó en el podio real **en la misma posición** pronosticada (por ejemplo, pronosticó P1 a Norris y Norris ganó). |
| **Acierto en podio** | Un piloto del pronóstico que está en el podio real pero **en otra posición** que la pronosticada. |
| **Puntos** | 5 por posición exacta, 2 por acierto en podio y 3 por la pole. Máximo 18 por GP. No se guardan: se calculan cada vez que se leen. |
| **Exactos** | Cantidad de posiciones exactas acumuladas por un jugador. Sirve para desempatar la tabla. |
| **Estado del GP** | Se calcula con la hora del servidor, nunca se guarda. **Próximo:** todavía no largó. **Cerrado:** ya largó y todavía no tiene resultado. **Finalizado:** tiene resultado. |
| **Tabla de posiciones** | Ranking de jugadores por puntos acumulados en los GPs finalizados. Ante igualdad de puntos gana quien tenga más exactos; si siguen igualados, comparten posición (1, 1, 3…). |
| **Favorito** | Marca que el organizador le pone a un pronóstico para destacarlo ("jugadas" destacadas). No afecta los puntos. |
| **Backup (exportar / importar)** | Archivo JSON con todos los datos. Exportar lo descarga; importar reemplaza todos los datos actuales por los del archivo, o no cambia nada si el archivo tiene errores. |
| **Token** | Código firmado que el servidor entrega al organizador cuando ingresa con la contraseña. Dura 12 horas. Sin token válido, el servidor rechaza cualquier cambio. |
| **CORS** | Regla del navegador por la cual una página solo puede pedirle cosas a un servidor que la autoriza. El backend autoriza únicamente la dirección del frontend publicado. |
| **Frontend / Backend** | Frontend: las pantallas que se ven en el navegador (Netlify). Backend: el servidor con las reglas y el acceso a los datos (Render). |
| **Base de datos** | Donde quedan guardados los datos. Publicada: Postgres en Neon. En local: un archivo SQLite. |
