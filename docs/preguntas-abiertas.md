# Preguntas abiertas — PitProde

Dudas que no están resueltas, la regla que tocarían y el impacto si se responden de otra manera. Están ordenadas de mayor a menor impacto.

**Ninguna de estas preguntas cambia una regla vigente ni bloquea la entrega:** hoy la app hace lo que dice la [spec](spec.md) y estas cuestiones quedan fuera de su alcance. Si el autor decide responderlas, se convierten en reglas nuevas (RN) con sus historias y tareas.

| # | Pregunta | Regla que afecta | Impacto | Qué hace la app hoy |
|---|---|---|---|---|
| 1 | **¿Los pronósticos de los demás tienen que ser visibles antes de la largada?** Ver es libre, así que cualquiera con el link puede mirar lo que pronosticó otro jugador antes de que largue la carrera y copiarlo. | RN14, RN26 | **Alto:** afecta la justicia del juego | Son visibles apenas se cargan. Como los carga el organizador, en la práctica el organizador ve todo; la pregunta es si los demás también deberían ver. |
| 2 | **¿Qué pasa si una carrera se reprograma o se cancela?** | RN9, RN11, RN14 | Alto | Se puede editar la fecha de largada. Si la carrera se cancela, se borra el GP (y sus pronósticos). Si se adelanta a una hora ya pasada, los pronósticos quedan bloqueados. |
| 3 | **¿Quién corrige si el organizador se equivoca o se desconoce quién cambió qué?** No hay registro de cambios. | RN18, RN26 | Medio | No hay auditoría. El único respaldo es el JSON exportado. |
| 4 | **¿Qué pasa con una descalificación posterior a la carrera?** | RN17, RN18 | Medio | El organizador corrige el resultado y los puntos se recalculan solos. |
| 5 | **¿Hay un solo prode por instalación?** ¿Y si dos grupos quieren usarla? | Todas | Medio | Un solo prode por base de datos. Dos grupos necesitan dos instalaciones. |
| 6 | **¿La contraseña compartida alcanza?** Si se filtra, hay que cambiarla en Render, y todas las sesiones abiertas se invalidan. | RN27 | Medio | Una sola contraseña de organizador. |
| 7 | **¿Hay puntos por carreras sprint, vuelta rápida u otros eventos?** | RN19–RN21 | Bajo | No: solo podio y pole, máximo 18 por GP. |
| 8 | **¿Hay recordatorios antes de la largada?** | RN14 | Bajo | No hay notificaciones de ningún tipo. |
| 9 | **¿El respaldo tiene que ser automático?** | RN24 | Bajo | El respaldo es manual (exportar JSON). La base de Neon está fuera del servidor, pero no se configuró ningún respaldo propio. |
| 10 | **¿Qué experiencia debe tener el primer pedido cuando Render está dormido?** | RN30 | Bajo | En el plan gratuito, la primera carga puede tardar cerca de 30 segundos. La app muestra un mensaje si no logra conectarse. |
