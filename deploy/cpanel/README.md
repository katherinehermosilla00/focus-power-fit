# Despliegue en V2Networks (hosting compartido con cPanel)

Guía para publicar Focus Power Fit CRM en el hosting del cliente: V2Networks, «Plan Emprendedor», con cPanel y «Setup Node.js App». Para un servidor propio con Docker, ver [`deploy/README.md`](../README.md).

La publicación se hace desde la rama **`focuspowerfit`**, que por ahora cumple el papel de `main` para el sistema en uso.

| Parte | Dirección | Dónde vive en el hosting |
|---|---|---|
| Sitio web (Next.js exportado como archivos) | `https://focuspowerfit.cl` | `public_html` |
| API (Express) | `https://api.focuspowerfit.cl` | App Node.js en `~/focuspowerfit-api` |
| Base de datos | Solo desde el hosting | MySQL del cPanel |
| Recordatorios por correo | — | Cron Jobs cada 10 minutos |

**FitBot en el hosting:** un hosting compartido no puede correr n8n ni la IA local. Con `FITBOT_WEBHOOK_URL` vacío, la API responde con las mismas reglas del flujo de n8n, copiadas en `backend/src/fitbot/reglasN8n.js`. Si cambias las reglas en n8n, exporta el flujo y ejecuta `npm run fitbot:reglas` en `backend`. Una prueba automática avisa si la copia quedó desactualizada.

## 0. Antes de empezar

- El dominio debe apuntar al hosting. En NIC Chile, en **Servidores DNS**, van `ns01.v2nets.com` y `ns02.v2nets.com`. Comprobar con `nslookup focuspowerfit.cl`: debe responder la IP del hosting.
- Las contraseñas las escribe el dueño del hosting. No se envían por chat ni se suben al repositorio.

## 1. Preparar los archivos (en el computador)

Desde la raíz del proyecto, en la rama `focuspowerfit`:

```powershell
git switch focuspowerfit
```

```powershell
node deploy/cpanel/empaquetar.mjs focuspowerfit.cl
```

Deja en `Documentos\FocusPowerFit-despliegue`:

- `sitio.zip`: el sitio, con su `.htaccess` (HTTPS y cabeceras de seguridad).
- `api.zip`: la API, sin `.env`, `node_modules`, pruebas, archivos subidos ni datos.

## 2. Base de datos

1. cPanel → **Asistente de base de datos MySQL**.
2. Crea la base (por ejemplo `focuspowerfit`). cPanel le agrega el usuario del hosting como prefijo: anota el nombre completo, por ejemplo `usuario_focuspowerfit`.
3. Crea un usuario de base de datos con el generador de contraseñas y **guarda la contraseña** en un lugar seguro.
4. Dale **TODOS LOS PRIVILEGIOS** sobre la base.

### Pasar los datos del computador al hosting

En el computador, con la base local encendida (el nombre es `DB_NAME` del `.env` local):

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe" -u root -p --single-transaction --no-tablespaces --default-character-set=utf8mb4 focus_power_fit --result-file="$HOME\Documents\FocusPowerFit-despliegue\base.sql"
```

Si el hosting usa MariaDB (cPanel lo muestra en «Información general»), cambia antes la intercalación de MySQL 8, que MariaDB no reconoce:

```powershell
(Get-Content "$HOME\Documents\FocusPowerFit-despliegue\base.sql" -Raw -Encoding UTF8) -replace 'utf8mb4_0900_ai_ci','utf8mb4_unicode_ci' | Set-Content "$HOME\Documents\FocusPowerFit-despliegue\base.sql" -Encoding utf8
```

Luego cPanel → **phpMyAdmin** → elige la base → **Importar** → sube `base.sql`.

`base.sql` tiene datos reales de clientes: no lo subas al repositorio ni lo compartas, y bórralo cuando termine la importación.

Si en vez de pasar datos quieres una base vacía, en el paso 4 pon `DB_SYNC=true` la primera vez, arranca la API, vuelve a `DB_SYNC=false` y crea el administrador (paso 6).

## 3. Correo para los recordatorios

1. cPanel → **Cuentas de correo** → crea `no-responder@focuspowerfit.cl` con una contraseña segura.
2. En **Connect Devices** (Conectar dispositivos) de esa cuenta, anota el **servidor saliente (SMTP)** y el puerto **SSL/TLS** (normalmente `mail.focuspowerfit.cl` y `465`).

## 4. Subir la API

1. cPanel → **Dominios** → **Crear un nuevo dominio** → `api.focuspowerfit.cl` (desmarca «compartir la raíz de documentos»).
2. **Administrador de archivos** → en la carpeta principal (`/home/usuario`, **fuera** de `public_html`) crea la carpeta `focuspowerfit-api`.
3. Sube `api.zip` a esa carpeta → clic derecho → **Extraer** → borra el `.zip`.
4. Dentro de la carpeta, copia `.env.example` como `.env` y edítalo:

   ```ini
   NODE_ENV=production
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=usuario_focuspowerfit
   DB_USER=usuario_focuspowerfit
   DB_PASSWORD=(la del paso 2)
   DB_SYNC=false
   JWT_SECRET=(64 o más caracteres al azar, ver abajo)
   JWT_EXPIRES_IN=8h
   CORS_ORIGINS=https://focuspowerfit.cl,https://www.focuspowerfit.cl
   TRUST_PROXY=1
   EMAIL_HOST=mail.focuspowerfit.cl
   EMAIL_PORT=465
   EMAIL_SECURE=true
   EMAIL_USER=no-responder@focuspowerfit.cl
   EMAIL_PASS=(la del paso 3)
   EMAIL_FROM="Focus Power Fit <no-responder@focuspowerfit.cl>"
   RECORDATORIOS_CON_CRON=true
   FITBOT_WEBHOOK_URL=
   ```

   La clave `JWT_SECRET` se genera en el computador con:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

   Se usa `.env` y no las variables de la pantalla de Node.js porque el Cron Job (paso 8) también lo necesita. Cambia sus permisos a `600` (clic derecho → **Cambiar permisos**).

## 5. Crear la app Node.js

1. cPanel → **Setup Node.js App** → **Create Application**:

   | Campo | Valor |
   |---|---|
   | Node.js version | La más alta disponible, 20 o superior (ideal 22 o 24) |
   | Application mode | Production |
   | Application root | `focuspowerfit-api` |
   | Application URL | `api.focuspowerfit.cl` |
   | Application startup file | `servidor.cjs` |

2. **Create**. Arriba aparece un comando del tipo `source /home/usuario/nodevenv/focuspowerfit-api/22/bin/activate && cd /home/usuario/focuspowerfit-api`: cópialo.
3. cPanel → **Terminal** → pega ese comando y luego instala las dependencias de producción:

   ```bash
   npm ci --omit=dev
   ```

   No uses el botón «Run NPM Install»: instala también las herramientas de desarrollo.

4. Vuelve a **Setup Node.js App** → **Restart**.
5. Abre `https://api.focuspowerfit.cl/health`: debe decir `{"ok":true}`. Si responde 503 o un error, revisa el archivo `stderr.log` de la carpeta de la app.

## 6. Administrador

Si pasaste los datos del computador, los administradores ya existen. Si la base es nueva, en la **Terminal** (con el comando del paso 5.2):

```bash
node crear-admin.mjs
```

## 7. Subir el sitio

1. **Administrador de archivos** → `public_html` → **Configuración** → marca **Mostrar archivos ocultos**.
2. Borra lo que trae el hosting de ejemplo (no borres `cgi-bin` ni `.well-known`).
3. Sube `sitio.zip` → **Extraer** → borra el `.zip`.

## 8. HTTPS y recordatorios

1. cPanel → **SSL/TLS Status** → **Run AutoSSL**. Deben quedar con candado `focuspowerfit.cl`, `www.focuspowerfit.cl`, `api.focuspowerfit.cl` y `mail.focuspowerfit.cl`. Requiere que el dominio ya apunte al hosting (paso 0).
2. cPanel → **Cron Jobs** → cada 10 minutos (`*/10 * * * *`), con la ruta de Node del paso 5.2:

   ```bash
   cd /home/usuario/focuspowerfit-api && /home/usuario/nodevenv/focuspowerfit-api/22/bin/node src/scripts/enviarRecordatorios.js >> recordatorios.log 2>&1
   ```

## 9. Comprobar

- `https://focuspowerfit.cl` abre el sitio, con candado.
- Iniciar sesión como administrador y como cliente.
- FitBot responde «¿Dónde están?» y «horarios».
- Subir una imagen en Administración → Imágenes y verla en el sitio.
- `recordatorios.log` muestra `[RECORDATORIOS] Programados: …` cada 10 minutos.

## Actualizar

1. En la rama `focuspowerfit`: `node deploy/cpanel/empaquetar.mjs focuspowerfit.cl`.
2. Sitio: sube y extrae `sitio.zip` en `public_html`, reemplazando.
3. API: sube y extrae `api.zip` en `focuspowerfit-api`, reemplazando (no toca `.env` ni `uploads`). Si cambió `package.json`, repite `npm ci --omit=dev`. Luego **Restart**.

## Respaldos

El hosting hace una copia diaria. Además, descarga cada semana un respaldo propio: cPanel → **Copia de seguridad** → base de datos (`.sql.gz`) y carpeta `focuspowerfit-api/uploads` (contratos e imágenes). Guárdalo fuera del hosting.
