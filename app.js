// app.js — interfaz y eventos de PitProde.
// Acá no hay cálculo de puntos (eso vive en scoring.js) ni acceso directo a localStorage (storage.js).
'use strict';

const NOMBRES_ESTADO = { proximo: 'Próximo', cerrado: 'Cerrado', finalizado: 'Finalizado' };
const PESTANAS = [
  ['tabla', 'Tabla'], ['pronosticos', 'Pronósticos'], ['calendario', 'Calendario'],
  ['jugadores', 'Jugadores'], ['pilotos', 'Pilotos'], ['datos', 'Datos'],
];
const PRONOSTICO_VACIO = { jugadorId: '', gpId: '', p1: '', p2: '', p3: '', pole: '' };

// Estado de la interfaz (los datos del prode están en estado.datos).
const estado = {
  datos: null,
  persistente: true,
  pestana: 'tabla',
  editando: { jugadores: null, pilotos: null, grandesPremios: null }, // id del registro en edición
  resultadoGpId: null, // GP al que se le está cargando el resultado
  borradorPronostico: { ...PRONOSTICO_VACIO },
  filtros: {
    calendario: { estado: '' },
    pronosticos: { gpId: '', jugadorId: '', estado: '', soloFavoritos: false },
  },
};

// ---------- Utilidades de DOM ----------

// Crea un elemento. "props" admite class, text, onXxx (eventos) y cualquier atributo.
// Siempre usa textContent (nunca innerHTML), así los nombres cargados por el usuario no inyectan HTML.
function el(etiqueta, props = {}, ...hijos) {
  const nodo = document.createElement(etiqueta);
  Object.entries(props).forEach(([clave, valor]) => {
    if (valor === null || valor === undefined || valor === false || clave === 'value') return;
    if (clave === 'class') nodo.className = valor;
    else if (clave === 'text') nodo.textContent = valor;
    else if (clave.startsWith('on')) nodo.addEventListener(clave.slice(2), valor);
    else nodo.setAttribute(clave, valor === true ? '' : valor);
  });
  nodo.append(...hijos.flat().filter((hijo) => hijo !== null && hijo !== undefined && hijo !== false));
  // El valor se asigna al final para que los <select> ya tengan sus opciones.
  if (props.value !== undefined) nodo.value = props.value;
  return nodo;
}

// Crea un botón.
function boton(texto, alClick, clase = '', extra = {}) {
  return el('button', { type: 'button', class: `btn ${clase}`.trim(), text: texto, onclick: alClick, ...extra });
}

// Crea un <select>. "opciones" es una lista de { valor, texto, desactivada }.
function crearSelect(opciones, valor, textoVacio, extra = {}) {
  const select = el(
    'select', extra,
    el('option', { value: '', text: textoVacio }),
    opciones.map((o) => el('option', { value: o.valor, text: o.texto, disabled: o.desactivada })),
  );
  select.value = valor;
  if (select.selectedIndex < 0) select.value = '';
  return select;
}

// Envuelve un control con su etiqueta.
function crearCampo(etiqueta, control, enLinea = false) {
  const contenido = enLinea ? [control, el('span', { text: etiqueta })] : [el('span', { text: etiqueta }), control];
  return el('label', { class: enLinea ? 'campo campo-check' : 'campo' }, contenido);
}

// Caja donde se muestran los errores de un formulario (nunca solo en la consola).
function crearCajaErrores() {
  return el('div', { class: 'errores', role: 'alert', hidden: true });
}

function pintarErrores(caja, errores) {
  caja.replaceChildren(...errores.map((texto) => el('p', { text: texto })));
  caja.hidden = errores.length === 0;
}

// Aviso global arriba de la pantalla: "ok" se va solo, "error" queda hasta cerrarlo.
function avisar(texto, tipo = 'ok') {
  const aviso = el(
    'div', { class: `aviso aviso-${tipo}`, role: tipo === 'error' ? 'alert' : 'status' },
    el('span', { text: texto }),
    el('button', { type: 'button', class: 'btn-cerrar', 'aria-label': 'Cerrar aviso', text: '×', onclick: () => aviso.remove() }),
  );
  document.getElementById('mensajes').replaceChildren(aviso);
  if (tipo === 'ok') setTimeout(() => aviso.remove(), 4000);
}

// ---------- Utilidades de datos ----------

const buscar = (lista, id) => lista.find((item) => item.id === id);
const ahora = () => new Date();

function formatearFecha(iso) {
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' });
}

// Convierte una fecha ISO al formato que usa <input type="datetime-local"> (hora local).
function aValorLocal(iso) {
  const f = new Date(iso);
  const dos = (n) => String(n).padStart(2, '0');
  return `${f.getFullYear()}-${dos(f.getMonth() + 1)}-${dos(f.getDate())}T${dos(f.getHours())}:${dos(f.getMinutes())}`;
}

// Código de tres letras de un piloto: las primeras del apellido ("Max Verstappen" → "VER").
function codigoPiloto(id) {
  const piloto = buscar(estado.datos.pilotos, id);
  if (!piloto) return '—';
  const apellido = piloto.nombre.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+(jr|sr)\.?$/i, '').trim().split(/\s+/).pop();
  return apellido.slice(0, 3).toUpperCase();
}

function nombrePiloto(id) {
  const piloto = buscar(estado.datos.pilotos, id);
  return piloto ? piloto.nombre : 'Piloto eliminado';
}

// Opciones de piloto para los selects. En los pronósticos los pilotos inactivos aparecen deshabilitados.
function opcionesPilotos(bloquearInactivos) {
  return estado.datos.pilotos.map((p) => ({
    valor: p.id,
    texto: `${p.nombre} · ${p.equipo}${p.activo ? '' : ' (inactivo)'}`,
    desactivada: bloquearInactivos && !p.activo,
  }));
}

const opcionesJugadores = () => estado.datos.jugadores.map((j) => ({ valor: j.id, texto: j.nombre }));
const opcionesGPs = (gps) => gps.map((g) => ({ valor: g.id, texto: g.nombre }));
const ordenarPorFecha = (a, b) => new Date(a.fechaLargada) - new Date(b.fechaLargada);

function buscarPronostico(jugadorId, gpId) {
  return estado.datos.pronosticos.find((p) => p.jugadorId === jugadorId && p.gpId === gpId);
}

// Guarda en localStorage; si falla, avisa en pantalla.
function persistir() {
  const resultado = guardarDatos(estado.datos);
  if (!resultado.ok) avisar(resultado.error, 'error');
}

// Cambia los datos completos (importar, reiniciar) y limpia lo que quedaba a medias.
function reemplazarDatos(datos) {
  estado.datos = datos;
  estado.editando = { jugadores: null, pilotos: null, grandesPremios: null };
  estado.resultadoGpId = null;
  estado.borradorPronostico = { ...PRONOSTICO_VACIO };
  persistir();
  render();
}

const etiquetaEstado = (gp) => {
  const valor = estadoGP(gp, ahora());
  return el('span', { class: `etiqueta etiqueta-${valor}`, text: NOMBRES_ESTADO[valor] });
};

const textoPodio = (r) => `P1 ${codigoPiloto(r.p1)} · P2 ${codigoPiloto(r.p2)} · P3 ${codigoPiloto(r.p3)} · Pole ${codigoPiloto(r.pole)}`;

// ---------- Tabla de posiciones ----------

function vistaTabla() {
  const { jugadores, pronosticos, grandesPremios } = estado.datos;
  if (!jugadores.length) {
    return el('section', {}, el('h2', { text: 'Tabla de posiciones' }),
      el('p', { class: 'vacio', text: 'Todavía no hay jugadores. Agregalos en la pestaña Jugadores.' }));
  }
  const filas = calcularTabla(jugadores, pronosticos, grandesPremios).map((fila) => el(
    'tr', {},
    el('td', { text: fila.posicion }),
    el('td', {}, el('span', { class: 'punto-color', style: `background:${fila.jugador.color}` }),
      fila.jugador.apodo ? `${fila.jugador.nombre} “${fila.jugador.apodo}”` : fila.jugador.nombre),
    el('td', { class: 'total', text: fila.puntos }),
    el('td', { text: fila.exactos }),
    el('td', { text: fila.carreras }),
  ));
  const tabla = el('table', { class: 'tabla' },
    el('thead', {}, el('tr', {}, ['#', 'Jugador', 'Puntos', 'Exactos', 'GPs'].map((t) => el('th', { scope: 'col', text: t })))),
    el('tbody', {}, filas));
  return el('section', {}, el('h2', { text: 'Tabla de posiciones' }),
    el('div', { class: 'tarjeta tabla-contenedor' }, tabla),
    el('p', { class: 'nota', text: `5 puntos por piloto en su posición exacta, 2 por piloto en el podio en otra posición y 3 por la pole (máximo ${MAXIMO_POR_GP} por GP). Ante empate de puntos, gana quien tenga más pilotos exactos.` }));
}

// ---------- ABM genérico (jugadores, pilotos y Grandes Premios) ----------

// Crea el control de un campo según su tipo.
function crearControl(campo, valor) {
  if (campo.tipo === 'checkbox') return el('input', { type: 'checkbox', checked: valor === true });
  if (campo.tipo === 'datetime-local') return el('input', { type: 'datetime-local', value: valor ? aValorLocal(valor) : '' });
  if (campo.tipo === 'number') return el('input', { type: 'number', inputmode: 'numeric', min: 0, max: 99, step: 1, value: valor ?? '' });
  return el('input', { type: campo.tipo, maxlength: campo.max, value: valor ?? '' });
}

// Lee el valor de un control ya normalizado.
function leerControl(campo, control) {
  if (campo.tipo === 'checkbox') return control.checked;
  if (campo.tipo === 'number') return control.value === '' ? NaN : Number(control.value);
  if (campo.tipo === 'datetime-local') return control.value ? new Date(control.value).toISOString() : '';
  return control.value.trim();
}

// Arma el formulario y la lista de una entidad a partir de su configuración (ver ENTIDADES).
function vistaEntidad(cfg) {
  const existente = buscar(estado.datos[cfg.clave], estado.editando[cfg.clave]);
  const caja = crearCajaErrores();
  const controles = {};
  const campos = cfg.campos.map((campo) => {
    controles[campo.n] = crearControl(campo, existente ? existente[campo.n] : campo.def);
    return crearCampo(campo.et, controles[campo.n], campo.tipo === 'checkbox');
  });
  const form = el(
    'form',
    { class: 'tarjeta', novalidate: true, onsubmit: (e) => { e.preventDefault(); guardarEntidad(cfg, existente, controles, caja); } },
    el('h2', { text: existente ? `Editar ${cfg.singular}` : `Nuevo ${cfg.singular}` }),
    campos, caja,
    el('div', { class: 'acciones' },
      el('button', { type: 'submit', class: 'btn btn-primario', text: existente ? 'Guardar cambios' : `Agregar ${cfg.singular}` }),
      existente && boton('Cancelar', () => { estado.editando[cfg.clave] = null; render(); })),
  );
  const lista = el('div');
  const pintar = () => pintarListaEntidad(cfg, lista);
  pintar();
  return el('section', {}, form, cfg.filtros ? cfg.filtros(pintar) : null, lista);
}

function guardarEntidad(cfg, existente, controles, caja) {
  const valores = {};
  cfg.campos.forEach((campo) => { valores[campo.n] = leerControl(campo, controles[campo.n]); });
  const errores = cfg.validar(valores, estado.datos, existente);
  pintarErrores(caja, errores);
  if (errores.length) return;
  if (existente) Object.assign(existente, valores);
  else estado.datos[cfg.clave].push(cfg.crear(valores));
  estado.editando[cfg.clave] = null;
  persistir();
  render();
  avisar(`Se guardó: ${valores.nombre}.`);
}

function pintarListaEntidad(cfg, contenedor) {
  const items = estado.datos[cfg.clave].filter(cfg.filtrar || (() => true)).sort(cfg.ordenar);
  if (!items.length) {
    contenedor.replaceChildren(el('p', { class: 'vacio', text: cfg.vacio }));
    return;
  }
  contenedor.replaceChildren(...items.map((item) => el(
    'article', { class: 'tarjeta item' },
    el('div', { class: 'item-info' }, cfg.info(item)),
    el('div', { class: 'acciones' },
      cfg.acciones ? cfg.acciones(item) : null,
      boton('Editar', () => { estado.editando[cfg.clave] = item.id; render(); window.scrollTo(0, 0); }),
      boton('Borrar', () => borrarEntidad(cfg, item), 'btn-peligro')),
  )));
}

// Borra un registro pidiendo confirmación y avisando qué se pierde con él.
function borrarEntidad(cfg, item) {
  const impacto = cfg.impactoBorrado(item, estado.datos);
  if (impacto.bloqueo) {
    avisar(impacto.bloqueo, 'error');
    return;
  }
  if (!window.confirm(impacto.aviso)) return;
  cfg.borrar(estado.datos, item);
  if (estado.editando[cfg.clave] === item.id) estado.editando[cfg.clave] = null;
  persistir();
  render();
  avisar('Se eliminó correctamente.');
}

// Mensaje de confirmación que avisa cuántos pronósticos se borran junto con el registro.
const avisoConPronosticos = (nombre, cantidad) => (
  `¿Borrar a "${nombre}"? También se van a borrar sus ${cantidad} pronóstico(s). No se puede deshacer.`
);

const quitar = (lista, item) => lista.splice(lista.indexOf(item), 1);
const porNombre = (a, b) => a.nombre.localeCompare(b.nombre, 'es');
const campoTexto = (n, et, max) => ({ n, et, tipo: 'text', max });

const ENTIDADES = {
  jugadores: {
    clave: 'jugadores',
    singular: 'jugador',
    campos: [campoTexto('nombre', 'Nombre', 30), campoTexto('apodo', 'Apodo (opcional)', 20), { n: 'color', et: 'Color en la tabla', tipo: 'color', def: '#e10600' }],
    vacio: 'Todavía no hay jugadores.',
    ordenar: porNombre,
    validar: (v, datos, existente) => {
      if (!v.nombre) return ['El nombre es obligatorio.'];
      const repetido = datos.jugadores.some((j) => j !== existente && j.nombre.toLowerCase() === v.nombre.toLowerCase());
      return repetido ? ['Ya existe un jugador con ese nombre.'] : [];
    },
    crear: (v) => ({ id: generarId(), ...v, fechaAlta: new Date().toISOString() }),
    info: (j) => [
      el('strong', {}, el('span', { class: 'punto-color', style: `background:${j.color}` }), j.nombre),
      j.apodo ? el('div', { class: 'secundario', text: `Apodo: ${j.apodo}` }) : null,
    ],
    impactoBorrado: (j, datos) => ({
      aviso: avisoConPronosticos(j.nombre, datos.pronosticos.filter((p) => p.jugadorId === j.id).length),
    }),
    borrar: (datos, j) => {
      quitar(datos.jugadores, j);
      datos.pronosticos = datos.pronosticos.filter((p) => p.jugadorId !== j.id);
    },
  },

  pilotos: {
    clave: 'pilotos',
    singular: 'piloto',
    campos: [
      campoTexto('nombre', 'Nombre', 40), campoTexto('equipo', 'Equipo', 30),
      { n: 'numero', et: 'Número', tipo: 'number' },
      { n: 'activo', et: 'Activo (aparece para pronosticar)', tipo: 'checkbox', def: true },
    ],
    vacio: 'No hay pilotos cargados.',
    ordenar: porNombre,
    validar: (v) => {
      const errores = [];
      if (!v.nombre) errores.push('El nombre es obligatorio.');
      if (!v.equipo) errores.push('El equipo es obligatorio.');
      if (!Number.isInteger(v.numero) || v.numero < 0 || v.numero > 99) errores.push('El número tiene que ser un entero entre 0 y 99.');
      return errores;
    },
    crear: (v) => ({ id: generarId(), ...v }),
    info: (p) => [
      el('strong', { text: `#${p.numero} ${p.nombre}` }),
      el('div', { class: 'secundario', text: p.equipo }),
      p.activo ? null : el('span', { class: 'etiqueta etiqueta-inactivo', text: 'Inactivo' }),
    ],
    impactoBorrado: (p, datos) => {
      const usosPronosticos = datos.pronosticos.filter((x) => ['p1', 'p2', 'p3', 'pole'].some((pos) => x[pos] === p.id)).length;
      const usosResultados = datos.grandesPremios.filter((g) => g.resultado && Object.values(g.resultado).includes(p.id)).length;
      if (usosPronosticos + usosResultados > 0) {
        return { bloqueo: `${p.nombre} aparece en ${usosPronosticos} pronóstico(s) y ${usosResultados} resultado(s). Desactivalo en vez de borrarlo.` };
      }
      return { aviso: `¿Borrar a "${p.nombre}" de la grilla?` };
    },
    borrar: (datos, p) => quitar(datos.pilotos, p),
  },

  grandesPremios: {
    clave: 'grandesPremios',
    singular: 'Gran Premio',
    campos: [
      campoTexto('nombre', 'Nombre', 50), campoTexto('circuito', 'Circuito', 50),
      { n: 'fechaLargada', et: 'Fecha y hora de largada', tipo: 'datetime-local' },
    ],
    vacio: 'No hay Grandes Premios con ese filtro.',
    // Primero los próximos (el más cercano arriba) y después los que ya largaron (el más reciente arriba).
    ordenar: (a, b) => {
      const aProximo = estadoGP(a, ahora()) === 'proximo';
      const bProximo = estadoGP(b, ahora()) === 'proximo';
      if (aProximo !== bProximo) return aProximo ? -1 : 1;
      return aProximo ? ordenarPorFecha(a, b) : ordenarPorFecha(b, a);
    },
    filtrar: (gp) => !estado.filtros.calendario.estado || estadoGP(gp, ahora()) === estado.filtros.calendario.estado,
    filtros: (pintar) => el('div', { class: 'filtros' }, crearCampo('Filtrar por estado', crearSelect(
      Object.entries(NOMBRES_ESTADO).map(([valor, texto]) => ({ valor, texto })),
      estado.filtros.calendario.estado, 'Todos',
      { onchange: (e) => { estado.filtros.calendario.estado = e.target.value; pintar(); } },
    ))),
    validar: (v, datos, existente) => {
      const errores = [];
      if (!v.nombre) errores.push('El nombre es obligatorio.');
      if (!v.circuito) errores.push('El circuito es obligatorio.');
      if (!v.fechaLargada) errores.push('Elegí la fecha y la hora de largada.');
      else if (existente && existente.resultado && new Date(v.fechaLargada) > ahora()) {
        errores.push('Este GP ya tiene resultado: la largada no puede quedar en el futuro.');
      }
      return errores;
    },
    crear: (v) => ({ id: generarId(), ...v, resultado: null }),
    info: (gp) => [
      el('strong', { text: gp.nombre }),
      el('div', { class: 'secundario', text: `${gp.circuito} · ${formatearFecha(gp.fechaLargada)}` }),
      el('div', {}, etiquetaEstado(gp), gp.resultado ? el('span', { class: 'secundario', text: ` ${textoPodio(gp.resultado)}` }) : null),
    ],
    acciones: (gp) => [boton(gp.resultado ? 'Editar resultado' : 'Cargar resultado', () => abrirResultado(gp), 'btn-primario')],
    impactoBorrado: (gp, datos) => ({
      aviso: avisoConPronosticos(gp.nombre, datos.pronosticos.filter((p) => p.gpId === gp.id).length),
    }),
    borrar: (datos, gp) => {
      quitar(datos.grandesPremios, gp);
      datos.pronosticos = datos.pronosticos.filter((p) => p.gpId !== gp.id);
      if (estado.resultadoGpId === gp.id) estado.resultadoGpId = null;
    },
  },
};

// ---------- Calendario y resultados ----------

// Abre el panel de resultado, salvo que el GP todavía no haya largado.
function abrirResultado(gp) {
  if (!yaLargo(gp, ahora())) {
    avisar('Todavía no largó este GP: no se puede cargar el resultado.', 'error');
    return;
  }
  estado.resultadoGpId = gp.id;
  render();
  window.scrollTo(0, 0);
}

function vistaCalendario() {
  const panel = vistaPanelResultado();
  return el('section', {}, el('h2', { text: 'Calendario' }), panel, vistaEntidad(ENTIDADES.grandesPremios));
}

// Formulario para cargar el resultado real del GP elegido.
function vistaPanelResultado() {
  const gp = buscar(estado.datos.grandesPremios, estado.resultadoGpId);
  if (!gp) return null;
  const caja = crearCajaErrores();
  const actual = gp.resultado || {};
  const selects = {};
  const campos = [['p1', 'P1 (ganador)'], ['p2', 'P2'], ['p3', 'P3'], ['pole', 'Pole position']].map(([pos, etiqueta]) => {
    selects[pos] = crearSelect(opcionesPilotos(false), actual[pos] || '', 'Elegí piloto');
    return crearCampo(etiqueta, selects[pos]);
  });
  const guardar = (e) => {
    e.preventDefault();
    const entrada = Object.fromEntries(Object.entries(selects).map(([pos, select]) => [pos, select.value]));
    const errores = validarResultado(entrada, gp, estado.datos.pilotos, ahora());
    pintarErrores(caja, errores);
    if (errores.length) return;
    gp.resultado = entrada;
    cerrarResultado(`Resultado de ${gp.nombre} guardado. Los puntos se recalcularon.`);
  };
  const quitarResultado = () => {
    if (!window.confirm('¿Quitar el resultado? Los pronósticos de este GP vuelven a quedar sin puntos.')) return;
    gp.resultado = null;
    cerrarResultado('Resultado quitado.');
  };
  return el(
    'form', { class: 'tarjeta', novalidate: true, onsubmit: guardar },
    el('h2', { text: `Resultado: ${gp.nombre}` }),
    el('div', { class: 'grilla-campos' }, campos), caja,
    el('div', { class: 'acciones' },
      el('button', { type: 'submit', class: 'btn btn-primario', text: 'Guardar resultado' }),
      boton('Cancelar', () => { estado.resultadoGpId = null; render(); }),
      gp.resultado && boton('Quitar resultado', quitarResultado, 'btn-peligro')),
  );
}

// Cierra el panel, recalcula los puntos de todos los pronósticos y guarda.
function cerrarResultado(mensaje) {
  estado.datos.pronosticos = recalcularPuntos(estado.datos);
  estado.resultadoGpId = null;
  persistir();
  render();
  avisar(mensaje);
}

// ---------- Pronósticos ----------

function vistaPronosticos() {
  const datos = estado.datos;
  const borrador = estado.borradorPronostico;
  const proximos = datos.grandesPremios.filter((gp) => estadoGP(gp, ahora()) === 'proximo').sort(ordenarPorFecha);
  const caja = crearCajaErrores();
  const nota = el('p', { class: 'nota' });

  const controles = {
    jugadorId: crearSelect(opcionesJugadores(), borrador.jugadorId, 'Elegí jugador'),
    gpId: crearSelect(opcionesGPs(proximos), borrador.gpId, 'Elegí GP'),
  };
  ['p1', 'p2', 'p3', 'pole'].forEach((pos) => {
    controles[pos] = crearSelect(opcionesPilotos(true), borrador[pos], 'Elegí piloto');
  });
  const alElegirPar = () => cargarPronosticoExistente(controles, nota);
  controles.jugadorId.addEventListener('change', alElegirPar);
  controles.gpId.addEventListener('change', alElegirPar);
  nota.textContent = textoPronosticoExistente(controles.jugadorId.value, controles.gpId.value);

  const etiquetas = { jugadorId: 'Jugador', gpId: 'Gran Premio', p1: 'P1', p2: 'P2', p3: 'P3', pole: 'Pole position' };
  const form = el(
    'form',
    { class: 'tarjeta', novalidate: true, onsubmit: (e) => { e.preventDefault(); guardarPronostico(controles, caja); } },
    el('h2', { text: 'Cargar pronóstico' }),
    !datos.jugadores.length ? el('p', { class: 'nota', text: 'Primero agregá jugadores en la pestaña Jugadores.' }) : null,
    !proximos.length ? el('p', { class: 'nota', text: 'No hay Grandes Premios próximos. Agregá uno en Calendario.' }) : null,
    el('div', { class: 'grilla-campos' }, Object.keys(etiquetas).map((clave) => crearCampo(etiquetas[clave], controles[clave]))),
    nota, caja,
    el('div', { class: 'acciones' },
      el('button', { type: 'submit', class: 'btn btn-primario', text: 'Guardar pronóstico' }),
      boton('Limpiar', () => { estado.borradorPronostico = { ...PRONOSTICO_VACIO }; render(); })),
  );

  const lista = el('div');
  const pintar = () => pintarListaPronosticos(lista, pintar);
  pintar();
  return el('section', {}, form, el('h2', { text: 'Pronósticos cargados' }), vistaFiltrosPronosticos(pintar), lista);
}

function textoPronosticoExistente(jugadorId, gpId) {
  return buscarPronostico(jugadorId, gpId)
    ? 'Este jugador ya tiene un pronóstico para este GP: al guardar se actualiza (no se duplica).'
    : '';
}

// Al elegir jugador y GP, si ya había un pronóstico se carga en el formulario para editarlo.
function cargarPronosticoExistente(controles, nota) {
  const existente = buscarPronostico(controles.jugadorId.value, controles.gpId.value);
  ['p1', 'p2', 'p3', 'pole'].forEach((pos) => { controles[pos].value = existente ? existente[pos] : ''; });
  nota.textContent = textoPronosticoExistente(controles.jugadorId.value, controles.gpId.value);
}

function guardarPronostico(controles, caja) {
  const entrada = Object.fromEntries(Object.entries(controles).map(([clave, select]) => [clave, select.value]));
  const errores = validarPronostico(entrada, estado.datos, ahora());
  pintarErrores(caja, errores);
  if (errores.length) return;
  const fechaCarga = new Date().toISOString();
  const existente = buscarPronostico(entrada.jugadorId, entrada.gpId);
  if (existente) Object.assign(existente, entrada, { fechaCarga });
  else estado.datos.pronosticos.push({ id: generarId(), ...entrada, fechaCarga, puntos: null, favorito: false });
  // Se deja el GP elegido para cargar rápido el pronóstico del siguiente jugador.
  estado.borradorPronostico = { ...PRONOSTICO_VACIO, gpId: entrada.gpId };
  persistir();
  render();
  avisar(`Pronóstico de ${buscar(estado.datos.jugadores, entrada.jugadorId).nombre} guardado.`);
}

function vistaFiltrosPronosticos(pintar) {
  const filtros = estado.filtros.pronosticos;
  const alCambiar = (clave) => (e) => { filtros[clave] = e.target.value; pintar(); };
  return el(
    'div', { class: 'filtros' },
    crearCampo('Jugador', crearSelect(opcionesJugadores(), filtros.jugadorId, 'Todos', { onchange: alCambiar('jugadorId') })),
    crearCampo('Gran Premio', crearSelect(opcionesGPs([...estado.datos.grandesPremios].sort(ordenarPorFecha)), filtros.gpId, 'Todos', { onchange: alCambiar('gpId') })),
    crearCampo('Estado del GP', crearSelect(
      Object.entries(NOMBRES_ESTADO).map(([valor, texto]) => ({ valor, texto })), filtros.estado, 'Todos', { onchange: alCambiar('estado') },
    )),
    crearCampo('Solo favoritos', el('input', {
      type: 'checkbox', checked: filtros.soloFavoritos,
      onchange: (e) => { filtros.soloFavoritos = e.target.checked; pintar(); },
    }), true),
  );
}

function pintarListaPronosticos(contenedor, pintar) {
  const filtros = estado.filtros.pronosticos;
  const { pronosticos, grandesPremios, jugadores } = estado.datos;
  const visibles = pronosticos.filter((p) => (
    (!filtros.gpId || p.gpId === filtros.gpId)
    && (!filtros.jugadorId || p.jugadorId === filtros.jugadorId)
    && (!filtros.estado || estadoGP(buscar(grandesPremios, p.gpId), ahora()) === filtros.estado)
    && (!filtros.soloFavoritos || p.favorito)
  )).sort((a, b) => ordenarPorFecha(buscar(grandesPremios, b.gpId), buscar(grandesPremios, a.gpId))
    || buscar(jugadores, a.jugadorId).nombre.localeCompare(buscar(jugadores, b.jugadorId).nombre, 'es'));

  if (!visibles.length) {
    contenedor.replaceChildren(el('p', { class: 'vacio', text: 'No hay pronósticos con esos filtros.' }));
    return;
  }
  contenedor.replaceChildren(...visibles.map((p) => tarjetaPronostico(p, pintar)));
}

function tarjetaPronostico(pronostico, pintar) {
  const jugador = buscar(estado.datos.jugadores, pronostico.jugadorId);
  const gp = buscar(estado.datos.grandesPremios, pronostico.gpId);
  const clases = gp.resultado ? clasificarPodio(pronostico, gp.resultado) : [];
  const chip = (texto, titulo, clase) => el('span', { class: `chip ${clase || ''}`, title: titulo, text: texto });
  const podio = ['p1', 'p2', 'p3'].map((pos, i) => chip(
    `${pos.toUpperCase()} ${codigoPiloto(pronostico[pos])}`, nombrePiloto(pronostico[pos]), clases[i] ? `chip-${clases[i]}` : '',
  ));
  const aciertaPole = gp.resultado && gp.resultado.pole === pronostico.pole;
  podio.push(chip(`Pole ${codigoPiloto(pronostico.pole)}`, nombrePiloto(pronostico.pole), aciertaPole ? 'chip-exacto' : ''));

  const bloqueado = yaLargo(gp, ahora());
  return el(
    'article', { class: 'tarjeta item' },
    el('div', { class: 'item-info' },
      el('strong', {}, el('span', { class: 'punto-color', style: `background:${jugador.color}` }), `${jugador.nombre} — ${gp.nombre} `, etiquetaEstado(gp)),
      el('div', { class: 'podio' }, podio),
      pronostico.puntos === null ? null : el('div', { class: 'puntos', text: `${pronostico.puntos} punto(s)` })),
    el('div', { class: 'acciones' },
      boton(pronostico.favorito ? '★' : '☆', () => { pronostico.favorito = !pronostico.favorito; persistir(); pintar(); }, 'btn-estrella', {
        'aria-pressed': String(pronostico.favorito), 'aria-label': 'Marcar como favorito',
      }),
      bloqueado
        ? el('span', { class: 'nota', text: '🔒 Bloqueado (el GP ya largó)' })
        : [boton('Editar', () => editarPronostico(pronostico)), boton('Borrar', () => borrarPronostico(pronostico), 'btn-peligro')]),
  );
}

function editarPronostico(pronostico) {
  const { jugadorId, gpId, p1, p2, p3, pole } = pronostico;
  estado.borradorPronostico = { jugadorId, gpId, p1, p2, p3, pole };
  render();
  window.scrollTo(0, 0);
}

function borrarPronostico(pronostico) {
  if (!window.confirm('¿Borrar este pronóstico?')) return;
  quitar(estado.datos.pronosticos, pronostico);
  persistir();
  render();
  avisar('Pronóstico eliminado.');
}

// ---------- Datos: exportar, importar y reiniciar ----------

// Descarga un texto como archivo.
function descargarArchivo(nombre, texto) {
  const url = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
  const enlace = el('a', { href: url, download: nombre });
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

function exportarArchivo() {
  descargarArchivo(`pitprode-${new Date().toISOString().slice(0, 10)}.json`, exportarDatos(estado.datos));
  avisar('Backup descargado.');
}

// Importa un archivo JSON. Si está roto o no es válido, no se toca nada de lo guardado.
async function importarArchivo(archivo, caja) {
  let texto;
  try {
    texto = await archivo.text();
  } catch (error) {
    pintarErrores(caja, ['No se pudo leer el archivo.']);
    return;
  }
  const resultado = importarDatos(texto);
  if (!resultado.ok) {
    pintarErrores(caja, ['No se importó nada: tus datos siguen como estaban.', ...resultado.errores]);
    return;
  }
  pintarErrores(caja, []);
  if (!window.confirm('Importar va a reemplazar todos los datos actuales por los del archivo. ¿Seguimos?')) return;
  reemplazarDatos(resultado.datos);
  avisar('Datos importados correctamente.');
}

function vistaDatos() {
  const { jugadores, pilotos, grandesPremios, pronosticos } = estado.datos;
  const caja = crearCajaErrores();
  const entrada = el('input', { type: 'file', accept: '.json,application/json', 'aria-label': 'Archivo JSON a importar' });
  entrada.addEventListener('change', async () => {
    if (entrada.files[0]) await importarArchivo(entrada.files[0], caja);
    entrada.value = '';
  });
  const reiniciar = (texto, crearNuevos, mensaje) => () => {
    if (!window.confirm(texto)) return;
    reemplazarDatos(crearNuevos());
    avisar(mensaje);
  };
  return el(
    'section', {},
    el('h2', { text: 'Datos y backup' }),
    el('div', { class: 'tarjeta' },
      el('p', { text: `${jugadores.length} jugadores · ${pilotos.length} pilotos · ${grandesPremios.length} GPs · ${pronosticos.length} pronósticos.` }),
      el('p', { class: 'nota', text: 'Los datos viven solo en este navegador. Exportá un JSON de vez en cuando como backup o para pasarle el prode a otro organizador.' }),
      el('div', { class: 'acciones' }, boton('Exportar JSON', exportarArchivo, 'btn-primario'))),
    el('div', { class: 'tarjeta' },
      el('h2', { text: 'Importar' }),
      el('p', { class: 'nota', text: 'Reemplaza todos los datos actuales. Si el archivo está roto, no se pierde nada.' }),
      entrada, caja),
    el('div', { class: 'tarjeta' },
      el('h2', { text: 'Reiniciar' }),
      el('div', { class: 'acciones' },
        boton('Cargar grilla y calendario 2026', reiniciar('Esto borra todos los datos actuales y carga la grilla y el calendario 2026 sin jugadores. ¿Seguimos?', crearDatosIniciales, 'Se cargó la temporada 2026.')),
        boton('Borrar todo', reiniciar('Esto borra TODOS los datos (jugadores, pilotos, GPs y pronósticos). ¿Seguro?', crearDatosVacios, 'Se borraron todos los datos.'), 'btn-peligro'))),
  );
}

// ---------- Pantalla principal ----------

const VISTAS = {
  tabla: vistaTabla,
  pronosticos: vistaPronosticos,
  calendario: vistaCalendario,
  jugadores: () => el('section', {}, el('h2', { text: 'Jugadores' }), vistaEntidad(ENTIDADES.jugadores)),
  pilotos: () => el('section', {}, el('h2', { text: 'Pilotos' }), vistaEntidad(ENTIDADES.pilotos)),
  datos: vistaDatos,
};

function cambiarPestana(clave) {
  estado.pestana = clave;
  render();
  window.scrollTo(0, 0);
}

// Redibuja la pestaña actual (los estados de los GPs se calculan con la hora de este momento).
function render() {
  document.querySelectorAll('.pestana').forEach((pestana) => {
    if (pestana.dataset.pestana === estado.pestana) pestana.setAttribute('aria-current', 'page');
    else pestana.removeAttribute('aria-current');
  });
  document.getElementById('banner-persistencia').hidden = estado.persistente;
  document.getElementById('vista').replaceChildren(VISTAS[estado.pestana]());
}

function iniciar() {
  const carga = cargarDatos();
  estado.datos = carga.datos;
  estado.persistente = carga.persistente;
  document.getElementById('navegacion').replaceChildren(...PESTANAS.map(([clave, texto]) => (
    el('button', { type: 'button', class: 'pestana', 'data-pestana': clave, text: texto, onclick: () => cambiarPestana(clave) })
  )));
  render();
  if (carga.aviso) avisar(carga.aviso, 'error');
}

document.addEventListener('DOMContentLoaded', iniciar);
