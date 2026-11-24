# Clase 11 — Analizar antes de pedir

Joaquín · Generación T, Módulo 3 · 24/11/2026

Función analizada: `queryTicketRows()`, que se ejecuta en cada `GET /tickets` y trae los tickets de SQL Server llamando a `sqlcmd`.

La función anda: hoy hay 5 tickets con títulos cortos y una sola persona usando el sistema. Los problemas de abajo no son errores de hoy sino decisiones que quedaron tomadas sin que nadie las decidiera, y que se rompen cuando el sistema crezca o cuando se agregue el formulario para crear y editar tickets.

## 1. Tres problemas, del más grave al menos grave

### Problema 1 — El mecanismo no puede enviar valores del usuario de forma segura

La consulta viaja como texto en el argumento `-Q` de `sqlcmd`, y `sqlcmd` no tiene parámetros enlazados: lo que hay en ese texto es lo que se ejecuta. Hoy es seguro porque la consulta es una constante. Pero apenas haya que crear o editar tickets, el título y la descripción del formulario tienen que entrar en un `INSERT` o un `UPDATE`, y la única forma de hacerlo con este mecanismo es armar el SQL concatenando texto. (Las variables `-v` de `sqlcmd` tampoco sirven: son sustitución de texto, no parámetros.)

**Escenario concreto:** alguien crea un ticket con el título `'); DROP TABLE Tickets; --`. El `INSERT` armado por concatenación borra la tabla. Y sin ningún atacante: un título legítimo como `No anda el login de O'Brien` tiene una comilla simple, el SQL armado queda mal cerrado, el `INSERT` falla y el usuario ve un error sin entender por qué. `execFile` evita la inyección de comandos de la terminal (no pasa por un shell), pero no la inyección de SQL, que es otra cosa.

### Problema 2 — Con más tickets, la lista se corta y el endpoint falla para todos

La consulta pide todos los tickets (`SELECT * FROM Tickets`, sin `WHERE` ni paginación) como un único texto JSON, y `-y 8000` limita el ancho de lo que `sqlcmd` muestra a 8.000 caracteres (según la documentación de `sqlcmd`, ese parámetro corta lo que excede ese ancho). Si el JSON pasa de 8.000 caracteres, llega cortado a la mitad.

**Escenario concreto:** un ticket serializado en JSON pesa del orden de 100 a 150 caracteres con unas pocas columnas y títulos cortos. Entre los 50 y los 80 tickets el texto supera los 8.000 caracteres, `JSON.parse` recibe un JSON incompleto y lanza `Unexpected end of JSON input`. Desde ese momento `GET /tickets` devuelve error para todos los usuarios, y nada en el mensaje dice que la causa fue el tamaño. Con el formulario de edición pasa antes: un solo ticket con una descripción de 8.000 caracteres alcanza para romper la lista entera, y ese ticket lo cargó una sola persona. El límite de 10 MB del `maxBuffer` parece un margen enorme pero no ayuda, porque el corte ocurre antes, dentro de `sqlcmd`.

### Problema 3 — Un proceso nuevo por cada petición, sin tiempo máximo

Cada `GET /tickets` lanza un `sqlcmd` nuevo: arranca un proceso del sistema operativo, abre una conexión nueva a SQL Server, se autentica, ejecuta la consulta y cierra todo. No hay un pool de conexiones y `execFile` no tiene `timeout`.

**Escenario concreto:** 50 personas abren la pantalla de tickets al mismo tiempo, por ejemplo a la mañana. Son 50 procesos y 50 inicios de sesión simultáneos contra SQL Server, sin ningún tope de concurrencia. Si además alguien tiene una transacción abierta que bloquea la tabla `Tickets`, las 50 consultas quedan esperando sin límite: las peticiones HTTP no terminan nunca y los procesos `sqlcmd` se acumulan hasta agotar la memoria del servidor. Y hay una dependencia escondida: `sqlcmd` tiene que estar instalado y en el `PATH` del servidor, y `-E` usa la autenticación integrada de Windows de la cuenta que corre Node. En un contenedor Linux o en otro servidor sin esas dos cosas, la función falla con `ENOENT` o con un error de login.

Orden: el 1 es el más grave porque pasa de "se rompe" a "se pierden o se alteran datos" y se vuelve inevitable apenas se escriba la primera función de creación. El 2 deja el sistema caído de forma silenciosa y es seguro que ocurre al crecer. El 3 degrada y puede tirar el servidor, pero necesita carga concurrente real para notarse.

## 2. El prompt

```
Necesito cambiar cómo `queryTicketRows()` habla con SQL Server. No quiero un "refactor
general": quiero reemplazar el mecanismo de acceso por uno concreto, y que me avises
antes de salirte de lo que está acá abajo.

CONTEXTO
- Backend en Node con TypeScript. La función corre en cada `GET /tickets`.
- Hoy ejecuta `sqlcmd` con `execFile`, le pasa la consulta con `-Q` y parsea el JSON que
  devuelve (`SELECT * FROM Tickets FOR JSON PATH`). Usa autenticación integrada (`-E`).
- Hoy hay 5 tickets y una persona usando el sistema. Los próximos pasos son: crear y
  editar tickets desde un formulario (título y descripción de texto libre) y abrirlo a
  unas 50 personas.
- Hay tres problemas que quiero resolver, en este orden:
  1. Con `sqlcmd` no se pueden enviar parámetros enlazados; cuando haya `INSERT`/`UPDATE`
     con texto del usuario, habría que concatenar SQL (inyección, y falla con una comilla
     simple en el título).
  2. `-y 8000` corta la salida a 8.000 caracteres: con unas decenas de tickets, o con una
     sola descripción larga, `JSON.parse` recibe un JSON incompleto y todo `GET /tickets`
     falla.
  3. Se lanza un proceso y una conexión nuevos en cada petición, sin pool y sin timeout.

DECISIONES YA TOMADAS (no las cambies ni las reabras)
- Reemplazar `sqlcmd` por el paquete `mssql` (driver `tedious`), con UN solo pool de
  conexiones compartido y creado una única vez, no uno por llamada.
- Toda consulta usa parámetros (`request.input(...)`). Prohibido armar SQL concatenando
  o interpolando valores, incluso en consultas que hoy no reciben datos del usuario.
- Pool con máximo de 10 conexiones; timeout de conexión y de consulta de 5 segundos.
- Lista explícita de columnas en lugar de `SELECT *`, con `ORDER BY` determinístico.
  No conozco los nombres de las columnas de memoria: preguntámelos, no los inventes.
- Sin paginación por ahora. Cambia el contrato de `GET /tickets` y el frontend, y eso lo
  decido yo más adelante. Dejá solo un comentario `TODO` con el motivo.
- Si falla la base, la función lanza un error con mensaje claro (sin conexión, timeout,
  consulta inválida) que NO incluya la cadena de conexión, el usuario ni el SQL.

LO QUE NO HAY QUE TOCAR
- La firma: `export async function queryTicketRows(): Promise<unknown[]>`.
- Los nombres de las variables de entorno (`DB_SERVER`, `DB_DATABASE`), la carga de
  `dotenv` desde `../../.env` y el mensaje de error cuando falta `DB_SERVER`.
- La forma del resultado: un arreglo de objetos con los mismos nombres de campo que
  devolvía `FOR JSON PATH`.
- El handler de `GET /tickets` y cualquier otro archivo que llame a esta función.
- El nombre de la tabla `Tickets`.
- No agregues ORM, ni otras dependencias además de `mssql`, ni archivos nuevos que no
  hagan falta.
- No escribas todavía las funciones de crear o editar tickets. Solo dejá el módulo de
  conexión armado para que se puedan agregar sin tocar el pool.

AUTENTICACIÓN: caso especial
Hoy uso autenticación integrada de Windows. Si el driver no la soporta de forma directa,
frená y contame las opciones con su costo. No cambies a usuario y contraseña por tu cuenta.

CÓMO QUIERO LA RESPUESTA
1. Antes de escribir código: tu plan en pasos cortos y las preguntas que tengas
   (columnas, cómo se autentica en producción).
2. Después, el cambio como diff, con una frase por cada decisión que tomaste vos y no
   figura arriba (por ejemplo, cómo se crea el pool).
3. Cómo verificarlo: un caso con 5 tickets y otro con 500 tickets con títulos de 200
   caracteres, que antes fallaba, y un caso con una comilla simple en un valor.
```

## 3. Justificación del prompt

**Por qué no empieza con "mejorá este código".** Esa frase deja que la IA elija qué mejorar y cómo, y la clase de respuesta que se obtiene es un reordenamiento prolijo que no toca nada de lo importante: los tres problemas son de mecanismo, no de estilo. Por eso el prompt arranca diciendo qué quiero cambiar (el acceso a la base) y lo que no.

**Qué contexto puse y por qué.**
- *Qué va a pasar después* (formulario de crear y editar, unas 50 personas): sin eso, la IA ve una función que funciona y la deja casi igual. El problema 1 solo existe por lo que viene, y es el que más pesa.
- *Los tres problemas con su escenario*, y no "hacelo más seguro y más rápido". Así la IA sabe contra qué medir su propuesta, y yo puedo comprobar después si resolvió cada uno.
- *El orden de prioridad*, para que, si hay que resignar algo, se resigne lo menos grave.

**Qué decidí yo en vez de dejárselo a la IA.**
- *El camino:* `mssql` con un único pool. Si lo dejaba libre, podía elegir un ORM, un módulo nuevo con su propia capa, o simplemente subir el `-y` a un número más grande, que tapa el problema 2 sin resolverlo y deja el 1 y el 3 intactos.
- *Parámetros siempre,* incluso donde hoy no hacen falta, para que el patrón correcto quede puesto antes de que llegue la primera función de escritura.
- *Los números* (10 conexiones, 5 segundos): si no los fijo, la IA elige uno sin saber cuántos usuarios tengo, o no pone ninguno, que es exactamente el problema 3.
- *No paginar todavía:* paginar cambia lo que devuelve `GET /tickets`, y eso afecta al frontend y no es una decisión que le corresponda a la función de acceso a datos.
- *Que no filtre la cadena de conexión en los errores:* es un detalle que una IA suele olvidar y que pasa a ser grave cuando el mensaje llega a la pantalla del usuario.

**Qué límites puse.** Una lista explícita de lo que no hay que tocar: la firma, las variables de entorno, el formato del resultado, el handler, el nombre de la tabla. Es lo que cualquier archivo que llame a esta función espera; cambiar cualquiera de esas cosas obliga a revisar todo lo demás. Y dos límites de alcance: nada de ORM ni de dependencias extra, y no escribir todavía crear o editar, porque un cambio chico y verificable se revisa; uno grande se acepta sin leer.

**Qué le dejé abierto a propósito.** Los nombres de las columnas (los desconozco y prefiero que pregunte antes de inventarlos), la autenticación (la integrada de Windows no es trivial con este driver y no quiero que cambie el modo de login sin avisarme), y los detalles menores: cómo se crea el pool, cómo se llama el error. Pido que esas decisiones me las cuente, en vez de esconderlas dentro del código.

**Cómo voy a saber si funcionó.** Pido tres pruebas concretas: 5 tickets (que siga andando), 500 tickets con títulos de 200 caracteres (el caso que hoy se rompe, problema 2) y un valor con comilla simple (problema 1). El problema 3 se verifica mirando que haya un solo pool y que la consulta tenga timeout.
