# Manual de uso — PitProde

PitProde es un prode de Fórmula 1 entre amigos: se pronostica el podio y la pole de cada Gran Premio, se suman puntos y se ve quién va ganando.

**Dirección de la aplicación:** https://pitprode.netlify.app

> La primera vez que entrás después de un rato sin uso, la página puede tardar hasta **30 segundos** en mostrar los datos. Es normal: el servidor gratuito "se duerme" cuando nadie lo usa. Esperá y listo.

## 1. Dos formas de usarla

| | Visitante | Organizador |
|---|---|---|
| Quién es | Cualquiera que abre el link | La persona que conoce la contraseña |
| Puede ver la tabla, los pronósticos, el calendario, los jugadores y los pilotos | ✅ | ✅ |
| Puede exportar un respaldo | ✅ | ✅ |
| Puede cargar o cambiar jugadores, pilotos, Grandes Premios, pronósticos y resultados | ❌ | ✅ |
| Puede importar un respaldo o borrar todo | ❌ | ✅ |

Los jugadores **no** necesitan cuenta ni contraseña: el organizador carga los pronósticos de todos.

## 2. Cómo se puntúa

Para cada Gran Premio, cada jugador pronostica **P1, P2, P3 y la pole**. Cuando se carga el resultado real:

| Acierto | Puntos |
|---|---|
| Un piloto del podio en **su misma posición** (por ejemplo, dijiste que ganaba Norris y ganó) | **5** |
| Un piloto que **está en el podio pero en otra posición** | **2** |
| Acertar la **pole** | **3** |

El máximo por carrera es **18** (5 + 5 + 5 + 3).

**Ejemplo.** Resultado real: ganó Verstappen, segundo Norris, tercero Leclerc, y Norris hizo la pole. Tu pronóstico fue: Norris, Verstappen, Leclerc, con pole de Norris.
- Leclerc, tercero en las dos: **5** puntos.
- Norris y Verstappen están en el podio pero cambiados: **2 + 2** puntos.
- Norris en la pole: **3** puntos.
- Total: **12** puntos.

## 3. Las pantallas

Arriba hay siete pestañas: **Tabla, Pronósticos, Calendario, Jugadores, Pilotos, Datos y Organizador.**

### Tabla

Muestra el ranking. Cada fila tiene:
- **#:** la posición.
- **Jugador:** su nombre, apodo y su color.
- **Puntos:** el total acumulado.
- **Exactos:** cuántos pilotos acertó en la posición exacta. Sirve para desempatar: si dos jugadores tienen los mismos puntos, va primero el que tiene más exactos.
- **GPs:** en cuántas carreras terminadas participó.

Si siguen empatados en todo, comparten posición (1, 1, 3…). La tabla solo cuenta carreras que ya tienen resultado.

### Calendario

Lista los Grandes Premios con su circuito y la fecha y hora de largada. Cada uno tiene una etiqueta de estado:

| Estado | Qué significa |
|---|---|
| **Próximo** | Todavía no largó: se pueden cargar y cambiar pronósticos |
| **Cerrado** | Ya largó y todavía no tiene resultado |
| **Finalizado** | Ya tiene resultado y suma puntos |

Podés filtrar la lista con **Filtrar por estado**. El calendario y la grilla de pilotos 2026 vienen precargados.

### Pronósticos

Abajo del formulario están los **Pronósticos cargados**. Cada tarjeta muestra el jugador, la carrera y el podio pronosticado con códigos de tres letras (por ejemplo, NOR para Norris). Pasando el mouse por un código ves el nombre completo. Cuando la carrera ya tiene resultado, los pilotos se pintan según el acierto (exacto o en podio) y aparecen los puntos.

Los filtros son **Jugador, Gran Premio, Estado del GP y Solo favoritos**. La estrella (☆/★) marca una jugada como favorita.

Si una carrera ya largó, el pronóstico muestra **🔒 Bloqueado** y no se puede tocar.

### Jugadores y Pilotos

Listas de participantes y de pilotos. Solo el organizador puede cambiarlas (ver la sección 5).

### Datos

Muestra cuántos jugadores, pilotos, GPs y pronósticos hay, y tiene los botones del respaldo (sección 6).

## 4. Ingresar como organizador

1. Entrá a la pestaña **Organizador**.
2. Escribí la contraseña y tocá **Ingresar**.
3. Cuando entraste, la pestaña dice "Ingresaste como organizador". Podés hacer cambios durante **12 horas**, aunque recargues la página.
4. Para salir, tocá **Salir** en esa misma pestaña.

Si querés cambiar algo sin haber ingresado, la página te lleva sola a esta pantalla con un aviso.

**Si te equivocás 5 veces seguidas con la contraseña**, queda bloqueado el ingreso durante 15 minutos, aunque después la escribas bien. Esperá y probá de nuevo.

## 5. Guía del organizador, paso a paso

### 5.1 Cargar jugadores

1. Pestaña **Jugadores**.
2. Completá el **Nombre** (hasta 30 caracteres), el **Apodo** si querés (hasta 20) y elegí un **Color en la tabla**.
3. Tocá **Agregar jugador**. Aparece un aviso arriba: "Se guardó: …".

No puede haber dos jugadores con el mismo nombre (sin importar mayúsculas). Para cambiar uno, tocá **Editar** en su tarjeta; para sacarlo, **Borrar**.

> ⚠️ **Borrar un jugador borra también todos sus pronósticos.** La página te pregunta y te dice cuántos se pierden.

### 5.2 Revisar los pilotos

Los 22 pilotos de 2026 ya están cargados. En la pestaña **Pilotos** podés agregar uno, editar su nombre, equipo o número (de 0 a 99) y marcarlo **Activo** o no.

- Si un piloto se va a mitad de temporada, **desmarcá "Activo"** en lugar de borrarlo: deja de aparecer para pronosticar pero se conservan sus pronósticos y resultados anteriores.
- No se puede borrar un piloto que aparece en algún pronóstico o resultado; la página te lo avisa y te sugiere desactivarlo.

### 5.3 Armar o corregir el calendario

1. Pestaña **Calendario**.
2. Completá **Nombre**, **Circuito** y **Fecha y hora de largada** (en tu hora local).
3. Tocá **Agregar Gran Premio**.

> ⚠️ **Borrar un Gran Premio borra también sus pronósticos.** La página te avisa cuántos.

Un GP que ya tiene resultado no puede cambiar su largada a una fecha futura.

### 5.4 Cargar un pronóstico

1. Pestaña **Pronósticos**, formulario **Cargar pronóstico**.
2. Elegí el **Jugador** y el **Gran Premio**. Solo aparecen las carreras **próximas**: una vez que largó, ya no se puede pronosticar.
3. Elegí **P1, P2 y P3** (tienen que ser pilotos **distintos**) y la **Pole position** (puede ser el mismo piloto que P1). Los pilotos inactivos aparecen deshabilitados.
4. Tocá **Guardar pronóstico**.

Cada jugador tiene **un solo pronóstico por carrera**. Si elegís un jugador y un GP que ya tienen pronóstico, el formulario se completa con el que existe y, al guardar, **lo actualiza** (no se duplica). El botón **Limpiar** vacía el formulario.

Para cambiar o borrar un pronóstico, usá **Editar** o **Borrar** en su tarjeta, **mientras la carrera no haya largado**.

### 5.5 Cargar el resultado de una carrera

El resultado se carga **después de la largada**.

1. Pestaña **Calendario**.
2. En la tarjeta del GP, tocá **Cargar resultado**. Si la carrera todavía no largó, la página te avisa que no se puede.
3. Elegí **P1 (ganador), P2, P3 y Pole position** y tocá **Guardar resultado**.

Los puntos de todos los pronósticos de esa carrera se calculan solos y la tabla se actualiza. El GP pasa a **Finalizado**.

**Si cargaste mal el resultado:** tocá **Editar resultado**, corregí y guardá (los puntos se recalculan), o tocá **Quitar resultado** para que el GP vuelva a "Cerrado" y los pronósticos queden sin puntos.

### 5.6 Marcar favoritos

En cualquier pronóstico, tocá la estrella (☆). Pasa a ★ y queda marcado. Sirve para destacar jugadas; **no cambia los puntos**. Se puede hacer también después de la largada.

## 6. Respaldo de los datos

Pestaña **Datos**.

| Botón | Qué hace | Quién puede |
|---|---|---|
| **Exportar JSON** | Descarga un archivo con todos los datos. Conviene hacerlo cada tanto y **antes de cualquier cambio grande**. | Cualquiera |
| **Importar** (elegir archivo) | Reemplaza **todos** los datos actuales por los del archivo. Antes de hacerlo te pide confirmación. Si el archivo está roto o tiene errores, te muestra qué está mal y **no cambia nada**. | Organizador |
| **Cargar grilla y calendario 2026** | Borra todo y deja solo los 22 pilotos y los 23 GPs de 2026, sin jugadores ni pronósticos. | Organizador |
| **Borrar todo** | Borra **todos** los datos: jugadores, pilotos, GPs y pronósticos. | Organizador |

> ⚠️ **"Borrar todo" y "Cargar grilla y calendario 2026" no se pueden deshacer.** Exportá un respaldo antes. Si algo sale mal, **Importar** ese archivo devuelve todo como estaba.

## 7. Un recorrido completo (para probar la app en 5 minutos)

1. Pestaña **Datos**: **Exportar JSON** (respaldo).
2. Pestaña **Organizador**: ingresá con la contraseña.
3. Pestaña **Jugadores**: agregá dos jugadores, por ejemplo "Ana" y "Beto".
4. Pestaña **Pronósticos**: cargá el pronóstico de Ana para un GP próximo (por ejemplo, Norris, Verstappen, Leclerc, con pole de Norris) y uno distinto para Beto.
5. Intentá cargar de nuevo a Ana en el mismo GP: la página te trae el pronóstico que ya tenía y lo edita, no lo duplica.
6. Intentá repetir un piloto entre P1, P2 y P3: te avisa que tienen que ser distintos.
7. Cuando la carrera largue, pestaña **Calendario** → **Cargar resultado**: cargá el podio real.
8. Pestaña **Tabla**: aparecen los puntos de Ana y de Beto.
9. Marcá una jugada como favorita en **Pronósticos**.

## 8. Si algo no anda

| Qué ves | Qué significa y qué hacer |
|---|---|
| La página tarda mucho o dice **"No se pudo conectar con el servidor"** | El servidor se estaba despertando. Esperá un minuto y recargá. |
| **"Tenés que ingresar como organizador para hacer cambios."** | Te falta ingresar, o pasaron las 12 horas. Entrá a la pestaña **Organizador**. |
| **"Contraseña incorrecta."** | Revisá la contraseña. Con 5 errores seguidos hay que esperar 15 minutos. |
| **"Demasiados intentos fallidos…"** | El ingreso está bloqueado 15 minutos. Esperá. |
| **"Ese GP ya largó: el pronóstico está bloqueado."** | La carrera ya largó: ya no se puede cargar, editar ni borrar un pronóstico de ese GP. |
| **"P1, P2 y P3 tienen que ser pilotos distintos."** | Elegiste el mismo piloto en dos posiciones del podio. |
| **"Todavía no largó este GP: no se puede cargar el resultado."** | El resultado se carga solo después de la largada. |
| **"Ya existe un jugador con ese nombre."** | Elegí otro nombre. |
| **"…aparece en N pronóstico(s) y M resultado(s). Desactivalo en vez de borrarlo."** | Ese piloto ya se usó. Editalo y desmarcá "Activo". |
| **"No se importó nada: tus datos siguen como estaban."** | El archivo de respaldo tiene errores. Debajo se detalla cuáles. No se perdió nada. |
| La tabla está vacía | No hay jugadores todavía, o ninguna carrera tiene resultado. |

## 9. Preguntas frecuentes

**¿Por qué no puedo cambiar un pronóstico?** Porque la carrera ya largó. Se compara con la hora del servidor, no con la de tu celular o computadora, así que cambiar la hora del dispositivo no sirve.

**¿Los otros jugadores ven mis pronósticos?** Sí: cualquiera que abra el link los ve, incluso antes de la largada.

**¿Se pierden los datos si cierro la página?** No. Quedan guardados en el servidor y siguen ahí al volver a entrar.

**¿Y si dos personas cambian cosas a la vez?** Los cambios se guardan en el orden en que llegan. Si dos personas cargan el mismo pronóstico casi al mismo tiempo, se guarda uno y el otro recibe el aviso de que ya existe.
