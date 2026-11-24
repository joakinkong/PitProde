# Cómo publicar PitProde en internet

Se publica en tres piezas, la combinación sugerida en el curso:

| Pieza | Servicio | Qué guarda o corre |
|---|---|---|
| Base de datos | **Neon** (Postgres) | Los datos del prode: no se borran al reiniciar |
| Backend | **Render** | La API (`node backend/server.js`) |
| Frontend | **Netlify** | Las pantallas (los archivos de la raíz del repo) |

Se hace **en este orden**, porque cada pieza necesita la dirección de la anterior. Los nombres de botones y menús de cada servicio pueden cambiar un poco; lo importante son los valores.

> **Regla de oro:** la cadena de conexión y la contraseña del organizador **nunca** van al código, al repositorio, al README ni a un chat. Solo se pegan en el panel de cada servicio.

## 1. Neon: la base de datos

1. Crear una cuenta en neon.tech y un proyecto nuevo (cualquier nombre, por ejemplo `pitprode`).
2. Copiar la **cadena de conexión** (connection string). Empieza con `postgresql://` y termina con `?sslmode=require`.
3. Guardarla en un lugar seguro: se pega en el paso 2. Las tablas las crea el servidor solo al arrancar la primera vez, y carga los pilotos y el calendario 2026.

## 2. Render: el backend

1. Crear una cuenta en render.com y conectarla con GitHub.
2. **New → Web Service** y elegir el repositorio `joakinkong/PitProde`. (El archivo `render.yaml` del repo ya trae estos valores.)
3. Completar:
   - **Runtime:** Node
   - **Build Command:** `npm install --omit=dev`
   - **Start Command:** `node backend/server.js`
   - **Plan:** Free
4. En **Environment Variables** cargar:

   | Variable | Valor |
   |---|---|
   | `NODE_VERSION` | `22` |
   | `HOST` | `0.0.0.0` |
   | `DATABASE_URL` | la cadena de Neon del paso 1 |
   | `ORGANIZER_PASSWORD` | una contraseña tuya de **8 caracteres o más** |
   | `FRONTEND_URL` | (todavía no: se completa en el paso 4) |

5. Crear el servicio. Cuando termine de desplegar, Render muestra su dirección, algo como `https://pitprode-api.onrender.com`. Probala abriendo `https://TU-DIRECCION/api/acceso` en el navegador: tiene que mostrar `{"requerido":true,"autenticado":false}`.

Si el servidor no arranca, mirá la pestaña **Logs**: dice exactamente qué variable falta.

## 3. Netlify: el frontend

1. Crear una cuenta en netlify.com y conectarla con GitHub.
2. **Add new site → Import an existing project** y elegir el mismo repositorio. (El archivo `netlify.toml` ya trae el comando de build y la carpeta `dist`.)
3. En **Environment variables** cargar:

   | Variable | Valor |
   |---|---|
   | `PITPRODE_API_URL` | la dirección de Render del paso 2, **con `https://` y sin barra final** |

4. Desplegar. Netlify muestra la dirección pública del sitio, algo como `https://pitprode.netlify.app`. Esa es la que se entrega.

## 4. Volver a Render: CORS

El backend solo acepta pedidos desde la dirección del frontend. En Render, en **Environment**, completar:

| Variable | Valor |
|---|---|
| `FRONTEND_URL` | la dirección de Netlify del paso 3, con `https://` y sin barra final |

Render vuelve a desplegar solo.

## 5. Probar que anda

1. Abrir la dirección de Netlify. Si Render estaba dormido, la primera carga puede tardar cerca de 30 segundos: es normal en el plan gratuito.
2. La pestaña **Datos** tiene que decir `0 jugadores · 22 pilotos · 23 GPs · 0 pronósticos`.
3. En **Organizador**, ingresar con la contraseña. Crear un jugador y un pronóstico.
4. Recargar la página y esperar un rato: los datos tienen que seguir ahí (están en Neon).

## Si algo falla

| Síntoma | Causa probable |
|---|---|
| "No se pudo conectar con el servidor" | Render está despertando (esperar 30 s) o `PITPRODE_API_URL` está mal escrita en Netlify |
| El navegador muestra un error de **CORS** | `FRONTEND_URL` en Render no coincide exactamente con la dirección de Netlify (revisar `https://` y la barra final) |
| "Tenés que ingresar como organizador" | Falta ingresar en la pestaña Organizador, o la sesión (12 horas) venció |
| Render no arranca y dice "Falta ORGANIZER_PASSWORD" | Falta cargar esa variable (o tiene menos de 8 caracteres) |
| Netlify falla con "Falta PITPRODE_API_URL" | Falta cargar esa variable en Netlify antes de desplegar |
| La contraseña dice "bloqueado" | Hubo 5 intentos fallidos: esperar 15 minutos |

## Cambiar de dirección o de contraseña

- Cambiar `ORGANIZER_PASSWORD` en Render invalida las sesiones abiertas: todos tienen que volver a ingresar.
- Si cambia la dirección de Netlify o de Render, actualizar `FRONTEND_URL` y `PITPRODE_API_URL` respectivamente y volver a desplegar.
