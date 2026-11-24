# Spec — PitProde

Documento central: reglas de negocio (RN) e historias de usuario (HU). Si algo no está acá, no es una regla del sistema. Términos definidos en [glosario.md](glosario.md); decisiones y su origen en [decisiones.md](decisiones.md).

## 1. Objetivo

Llevar un prode de Fórmula 1 entre amigos durante toda la temporada: cargar pronósticos y resultados, calcular los puntos con reglas claras y mostrar una tabla de posiciones, de modo que nadie pueda cambiar un pronóstico después de la largada.

## 2. Usuarios y roles

| Rol | Qué puede hacer | Cómo se identifica |
|---|---|---|
| **Visitante** | Ver la tabla, los pronósticos, el calendario, los jugadores, los pilotos y los datos. Exportar un respaldo. | No se identifica: abre el link. |
| **Organizador** | Todo lo del visitante, más crear, editar y borrar jugadores, pilotos, GPs, pronósticos y resultados, y importar o reiniciar los datos. | Contraseña única (RN27). |

## 3. Alcance

**Dentro:** jugadores, pilotos, calendario, pronósticos, resultados, cálculo de puntos, tabla, filtros, exportar e importar, acceso del organizador, publicación en internet.

**Fuera:** apuestas con dinero, datos reales en vivo o APIs externas de F1, cuentas por jugador, notificaciones, más de un prode por instalación. Las dudas sobre estos temas están en [preguntas-abiertas.md](preguntas-abiertas.md).

## 4. Reglas de negocio

### Jugadores

| N° | Regla |
|---|---|
| RN1 | El nombre del jugador es obligatorio y tiene hasta **30** caracteres. El apodo es opcional y tiene hasta **20**. |
| RN2 | No puede haber dos jugadores con el mismo nombre, sin distinguir mayúsculas de minúsculas. |
| RN3 | El color del jugador tiene el formato `#rrggbb` (seis dígitos hexadecimales). Si no se indica, es `#888888`. |
| RN4 | Borrar un jugador borra también todos sus pronósticos. La interfaz pide confirmación y avisa cuántos se pierden. |

### Pilotos

| N° | Regla |
|---|---|
| RN5 | El nombre (hasta **40** caracteres) y el equipo (hasta **30**) son obligatorios. El número es un entero entre **0 y 99**. |
| RN6 | Un piloto **inactivo** no se puede elegir en un pronóstico. Sí se puede elegir en un resultado. |
| RN7 | No se puede borrar un piloto que aparece en algún pronóstico o resultado: se lo desactiva. |

### Grandes Premios

| N° | Regla |
|---|---|
| RN8 | El nombre y el circuito son obligatorios (hasta **50** caracteres cada uno) y la fecha y hora de largada tiene que ser una fecha válida. |
| RN9 | El estado de un GP se calcula con la hora del servidor y no se guarda: **próximo** si todavía no largó, **cerrado** si largó y no tiene resultado, **finalizado** si tiene resultado. |
| RN10 | Borrar un GP borra también todos sus pronósticos. La interfaz pide confirmación y avisa cuántos se pierden. |
| RN11 | Un GP que ya tiene resultado no puede cambiar su largada a una fecha futura. |

### Pronósticos

| N° | Regla |
|---|---|
| RN12 | Un pronóstico elige P1, P2, P3 y pole, todos pilotos existentes. P1, P2 y P3 son **distintos entre sí**; la pole puede ser el mismo piloto que alguno de ellos. |
| RN13 | Hay **un solo** pronóstico por jugador y GP. Cargar otro para la misma combinación se rechaza (la interfaz edita el existente). |
| RN14 | Un pronóstico se puede crear, editar o borrar **solo antes de la largada**. La hora que cuenta es la **del servidor**, nunca la del dispositivo. |
| RN15 | Al editar un pronóstico solo cambian P1, P2, P3 y pole: el jugador y el GP no se pueden cambiar. |
| RN16 | Marcar o desmarcar un pronóstico como favorito se puede hacer en cualquier momento, también después de la largada. No afecta los puntos. |

### Resultados

| N° | Regla |
|---|---|
| RN17 | El resultado (P1, P2, P3 y pole) se carga **solo después de la largada**. P1, P2 y P3 son distintos y todos los pilotos existen (pueden estar inactivos). |
| RN18 | Un resultado se puede corregir o quitar. Al hacerlo, los puntos de todos los pronósticos de ese GP se recalculan solos; sin resultado, los pronósticos quedan sin puntos. |

### Puntos y tabla

| N° | Regla |
|---|---|
| RN19 | Cada piloto del pronóstico que quedó en el podio real **en la misma posición** suma **5** puntos. |
| RN20 | Cada piloto del pronóstico que está en el podio real pero **en otra posición** suma **2** puntos. |
| RN21 | Acertar la pole suma **3** puntos. El máximo por GP es **18** (3 × 5 + 3). |
| RN22 | Los puntos no se guardan: se calculan cada vez que se leen. Un GP sin resultado no da puntos. |
| RN23 | La tabla cuenta solo los GPs finalizados. Se ordena por puntos, de mayor a menor; ante igualdad, por cantidad de posiciones exactas; si siguen igualados, comparten posición (1, 1, 3…) y se listan por nombre. |

### Datos

| N° | Regla |
|---|---|
| RN24 | **Exportar** descarga un archivo JSON con todos los datos. **Importar** valida el archivo completo (formato, ids repetidos, referencias a pilotos, jugadores y GPs que existan, un pronóstico por jugador y GP, colores `#rrggbb`) y reemplaza todos los datos **o no cambia nada**. |
| RN25 | La temporada 2026 (**22** pilotos y **23** GPs) se carga **una sola vez**, al crear la base. Si el organizador borra todo, la base queda vacía aunque se reinicie el servidor. |

### Acceso y publicación

| N° | Regla |
|---|---|
| RN26 | Ver datos es libre. Cuando hay contraseña configurada, **cualquier cambio** (crear, editar, borrar, cargar resultados, importar, reiniciar) exige ser organizador. |
| RN27 | La contraseña del organizador tiene al menos **8** caracteres y se configura por variable de entorno. Con ella el servidor entrega un token firmado que **vence a las 12 horas**. |
| RN28 | Después de **5** intentos fallidos seguidos desde una misma dirección, esa dirección queda bloqueada **15 minutos**, aun con la contraseña correcta. |
| RN29 | El servidor no arranca si escucha fuera de la máquina local sin contraseña configurada. |
| RN30 | Desde un navegador, la API solo acepta pedidos que vengan de las direcciones del frontend configuradas (CORS). |

## 5. Historias de usuario

Cada criterio de aceptación indica la regla que cumple.

### HU1 — Ver la tabla de posiciones
Como **visitante** quiero ver la tabla para saber quién va ganando.
- **Dado** que hay jugadores y GPs finalizados, **cuando** abro la pestaña Tabla, **entonces** veo cada jugador con sus puntos, sus exactos y la cantidad de GPs, ordenados según RN23.
- **Dado** que dos jugadores tienen los mismos puntos, **cuando** miro la tabla, **entonces** va primero el de más exactos (RN23).
- **Dado** que no hay jugadores, **cuando** abro la tabla, **entonces** se me indica que primero hay que agregarlos.

### HU2 — Ingresar como organizador
Como **organizador** quiero ingresar con una contraseña para poder cargar datos.
- **Dado** que la API pide contraseña, **cuando** intento guardar algo sin haber ingresado, **entonces** se me lleva a la pestaña Organizador con un aviso (RN26).
- **Dado** que escribo la contraseña correcta, **cuando** toco Ingresar, **entonces** puedo hacer cambios durante 12 horas y la sesión sigue si recargo la página (RN27).
- **Dado** que escribo una contraseña incorrecta, **cuando** toco Ingresar, **entonces** veo "Contraseña incorrecta" y no entro (RN26).
- **Dado** que fallé 5 veces seguidas, **cuando** pruebo de nuevo, **entonces** se me indica que espere 15 minutos aunque la contraseña sea correcta (RN28).
- **Dado** que toco Salir, **entonces** la sesión se cierra y vuelve a pedirse la contraseña.

### HU3 — Gestionar jugadores
Como **organizador** quiero crear, editar y borrar jugadores.
- **Dado** que escribo un nombre válido, **cuando** guardo, **entonces** el jugador aparece en la lista (RN1).
- **Dado** que el nombre ya existe en otras mayúsculas, **cuando** guardo, **entonces** se rechaza con un mensaje (RN2).
- **Dado** que el color no es `#rrggbb`, **cuando** guardo (por API o importando), **entonces** se rechaza (RN3).
- **Dado** que un jugador tiene pronósticos, **cuando** lo borro, **entonces** se me avisa cuántos pronósticos se pierden, y al confirmar se borran junto con él (RN4).

### HU4 — Gestionar pilotos
Como **organizador** quiero mantener la grilla de pilotos.
- **Dado** que el número está fuera de 0–99 o falta el nombre o el equipo, **cuando** guardo, **entonces** se rechaza con un mensaje (RN5).
- **Dado** que un piloto está inactivo, **cuando** cargo un pronóstico, **entonces** no puedo elegirlo (RN6); **cuando** cargo un resultado, **entonces** sí (RN6).
- **Dado** que un piloto aparece en algún pronóstico o resultado, **cuando** intento borrarlo, **entonces** se me impide y se me sugiere desactivarlo (RN7).

### HU5 — Gestionar el calendario
Como **organizador** quiero crear, editar y borrar Grandes Premios.
- **Dado** que faltan nombre, circuito o una fecha válida, **cuando** guardo, **entonces** se rechaza (RN8).
- **Dado** que un GP ya tiene resultado, **cuando** intento mover su largada al futuro, **entonces** se rechaza (RN11).
- **Dado** que un GP tiene pronósticos, **cuando** lo borro, **entonces** se me avisa y, al confirmar, se borran con él (RN10).
- **Dado** el calendario, **cuando** filtro por estado, **entonces** veo solo los GPs próximos, cerrados o finalizados (RN9).

### HU6 — Cargar un pronóstico
Como **organizador** quiero cargar el pronóstico de un jugador para un GP.
- **Dado** un GP próximo, **cuando** elijo jugador, GP, P1, P2, P3 y pole distintos y guardo, **entonces** queda registrado y sin puntos (RN12, RN22).
- **Dado** que repito un piloto entre P1, P2 y P3, **cuando** guardo, **entonces** se rechaza con un mensaje claro (RN12).
- **Dado** que el jugador ya tiene pronóstico para ese GP, **cuando** elijo esa combinación, **entonces** se carga el existente para editarlo y no se duplica (RN13).
- **Dado** un GP que ya largó, **cuando** intento guardar, **entonces** se rechaza aunque yo haya cambiado la hora de mi dispositivo (RN14).

### HU7 — Editar o borrar un pronóstico
Como **organizador** quiero corregir un pronóstico antes de la largada.
- **Dado** un GP que todavía no largó, **cuando** edito o borro el pronóstico, **entonces** el cambio se guarda; el jugador y el GP no cambian (RN14, RN15).
- **Dado** un GP que ya largó, **cuando** miro el pronóstico, **entonces** aparece bloqueado y el servidor rechaza editarlo o borrarlo (RN14).

### HU8 — Marcar favorito
Como **organizador** quiero destacar jugadas.
- **Dado** cualquier pronóstico, incluso de un GP ya largado, **cuando** toco la estrella, **entonces** se marca o desmarca sin cambiar los puntos (RN16).

### HU9 — Cargar el resultado y ver los puntos
Como **organizador** quiero cargar lo que pasó en la carrera para que se calculen los puntos.
- **Dado** un GP que todavía no largó, **cuando** intento cargar el resultado, **entonces** se rechaza (RN17).
- **Dado** un GP que ya largó, **cuando** cargo P1, P2, P3 (distintos) y pole, **entonces** el GP pasa a finalizado y cada pronóstico muestra sus puntos (RN9, RN19–RN21).
- **Dado** el resultado VER, NOR, LEC con pole de NOR, **cuando** miro el pronóstico NOR, VER, LEC con pole de NOR, **entonces** da **12 puntos** (RN19–RN21).
- **Dado** un pronóstico perfecto, **entonces** da 18; **dado** uno sin aciertos, **entonces** da 0 (RN21).

### HU10 — Corregir o quitar un resultado
Como **organizador** quiero arreglar un resultado mal cargado.
- **Dado** un GP finalizado, **cuando** corrijo el resultado, **entonces** los puntos y la tabla se actualizan solos (RN18, RN22).
- **Dado** un GP finalizado, **cuando** quito el resultado, **entonces** los pronósticos quedan sin puntos y el GP vuelve a estado cerrado (RN9, RN18).

### HU11 — Buscar y filtrar
Como **visitante** quiero encontrar pronósticos rápido.
- **Dado** la lista de pronósticos, **cuando** filtro por jugador, por GP, por estado del GP o por favoritos, **entonces** veo solo los que coinciden.

### HU12 — Exportar un respaldo
Como **visitante u organizador** quiero descargar todos los datos.
- **Dado** cualquier estado, **cuando** toco Exportar JSON, **entonces** se descarga un archivo con jugadores, pilotos, GPs y pronósticos (RN24).

### HU13 — Importar un respaldo
Como **organizador** quiero restaurar o pasar el prode a otra instalación.
- **Dado** un archivo válido, **cuando** confirmo, **entonces** los datos actuales se reemplazan por los del archivo y los puntos se recalculan (RN24).
- **Dado** un archivo roto (JSON incompleto, pilotos inexistentes, pronósticos duplicados, color inválido), **cuando** intento importarlo, **entonces** se me dicen los problemas y no cambia nada de lo guardado (RN24).
- **Dado** que exporto, borro todo e importo ese archivo, **entonces** queda todo igual que antes (RN24).

### HU14 — Reiniciar los datos
Como **organizador** quiero empezar de nuevo.
- **Dado** que elijo "Cargar grilla y calendario 2026", **entonces** quedan los 22 pilotos y los 23 GPs, sin jugadores ni pronósticos (RN25).
- **Dado** que elijo "Borrar todo" y se reinicia el servidor, **entonces** la base sigue vacía (RN25).

### HU15 — Que los datos no se pierdan
Como **organizador** quiero que lo cargado siga ahí.
- **Dado** que cargué datos, **cuando** recargo la página o se reinicia el servidor, **entonces** los datos siguen (RN25).

### HU16 — Usar la app desde internet
Como **visitante** quiero abrir un link y usar la app sin instalar nada.
- **Dado** la dirección pública del frontend, **cuando** la abro, **entonces** veo la app funcionando contra el backend publicado (RN30).
- **Dado** que el servidor está dormido, **cuando** la abro, **entonces** la primera carga puede tardar y, si no logra conectarse, se muestra un mensaje que lo explica.
- **Dado** otro sitio web, **cuando** intenta leer la API desde el navegador, **entonces** el navegador lo bloquea (RN30).

## 6. Casos borde

| Caso | Qué pasa |
|---|---|
| Dos cargas casi simultáneas del mismo jugador y GP | La base tiene una restricción única por jugador y GP: solo una se guarda y la otra recibe el error de RN13. |
| Pronóstico a la hora exacta de largada | Ya largó: se rechaza (la largada es "igual o anterior a ahora"). |
| Piloto desactivado después de cargar un pronóstico con él | El pronóstico se conserva y suma puntos normalmente; solo deja de poder elegirse en pronósticos nuevos o editados (RN6). |
| Corrección de resultado que cambia el podio | Todos los puntos y la tabla se recalculan sin tocar los pronósticos (RN18, RN22). |
| Jugadores con los mismos puntos y los mismos exactos | Comparten posición y se listan por nombre (RN23). |
| Pole igual a P1 | Es válido; cuenta por separado (RN12, RN21). |
| Archivo importado de más de 2 MB | Se rechaza por tamaño. Cualquier otro pedido que supere 10 KB también. |
| Contraseña cambiada en el servidor mientras hay sesiones abiertas | Las sesiones dejan de valer y hay que volver a ingresar. |
| La base no responde | La API devuelve un error 500 genérico (sin detalles internos) y el frontend avisa que no pudo completar la acción. |

## 7. Pendientes

**Ninguno.** Todas las reglas están numeradas y verificadas. Las preguntas que quedan sin responder son decisiones futuras fuera del alcance y están separadas en [preguntas-abiertas.md](preguntas-abiertas.md).

## 8. Dónde se verifica cada regla

| Reglas | Prueba automática |
|---|---|
| RN19–RN23 | `scoring.test.js` |
| RN3, RN12–RN16 | `backend/tests/pronosticos.service.test.js`, `pronosticos.api.test.js`, `recursos.api.test.js` |
| RN1–RN2, RN4–RN11, RN17–RN18, RN24–RN25 | `backend/tests/recursos.api.test.js` |
| RN26–RN29 | `backend/tests/acceso.test.js`, `backend/tests/entorno.test.js` |
| RN30 | `backend/tests/entorno.test.js` y prueba manual con frontend y backend en puertos distintos |
| Build y `config.js` | `scripts/build-frontend.test.js` |

Las pruebas de backend corren contra SQLite y contra Postgres emulado. Detalle y resultados en el [informe](informe.md).
