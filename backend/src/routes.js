// routes.js — tabla de rutas de la API: [método, patrón, handler del controller, opciones].
// "limiteBytes" cambia el tope de tamaño del cuerpo para esa ruta (por defecto 10 KB).
'use strict';

const LIMITE_IMPORTAR_BYTES = 2 * 1024 * 1024; // un backup completo pesa decenas de KB

// Arma la lista de rutas con los controllers ya creados.
function crearRutas({ jugadores, pilotos, grandesPremios, pronosticos, datos }) {
  return [
    ['GET', /^\/api\/datos$/, datos.todo],
    ['GET', /^\/api\/tabla$/, datos.tabla],
    ['GET', /^\/api\/exportar$/, datos.exportar],
    ['POST', /^\/api\/importar$/, datos.importar, { limiteBytes: LIMITE_IMPORTAR_BYTES }],

    ['GET', /^\/api\/jugadores$/, jugadores.listar],
    ['POST', /^\/api\/jugadores$/, jugadores.crear],
    ['PUT', /^\/api\/jugadores\/([^/]+)$/, jugadores.editar],
    ['DELETE', /^\/api\/jugadores\/([^/]+)$/, jugadores.eliminar],

    ['GET', /^\/api\/pilotos$/, pilotos.listar],
    ['POST', /^\/api\/pilotos$/, pilotos.crear],
    ['PUT', /^\/api\/pilotos\/([^/]+)$/, pilotos.editar],
    ['DELETE', /^\/api\/pilotos\/([^/]+)$/, pilotos.eliminar],

    ['GET', /^\/api\/grandes-premios$/, grandesPremios.listar],
    ['POST', /^\/api\/grandes-premios$/, grandesPremios.crear],
    ['PUT', /^\/api\/grandes-premios\/([^/]+)$/, grandesPremios.editar],
    ['DELETE', /^\/api\/grandes-premios\/([^/]+)$/, grandesPremios.eliminar],
    ['PUT', /^\/api\/grandes-premios\/([^/]+)\/resultado$/, grandesPremios.cargarResultado],
    ['DELETE', /^\/api\/grandes-premios\/([^/]+)\/resultado$/, grandesPremios.quitarResultado],

    ['GET', /^\/api\/pronosticos$/, pronosticos.listar],
    ['POST', /^\/api\/pronosticos$/, pronosticos.crear],
    ['GET', /^\/api\/pronosticos\/([^/]+)$/, pronosticos.obtener],
    ['PUT', /^\/api\/pronosticos\/([^/]+)$/, pronosticos.editar],
    ['DELETE', /^\/api\/pronosticos\/([^/]+)$/, pronosticos.eliminar],
    ['PATCH', /^\/api\/pronosticos\/([^/]+)\/favorito$/, pronosticos.favorito],
  ];
}

module.exports = { crearRutas };
