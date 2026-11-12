# Guía para el equipo: Focus Power Fit en tu computador

Con esta guía levantas el sistema completo en Docker (sitio, API, MySQL y FitBot) con una copia de la base de datos real. Mientras no exista el servidor, cada integrante trabaja con **su propia copia**: lo que cambies en tu computador no lo ven los demás.

**La copia tiene datos personales reales de clientes.** Úsala solo para el proyecto, no la copies a otros lugares ni la compartas, y bórrala cuando ya no la necesites (sección «Borrar la copia»). Los correos van **siempre apagados** en tu computador (paso 3), para que el sistema nunca escriba a clientes reales.

## Lo que necesitas

- Docker Desktop instalado y abierto.
- Git y Node.js.
- Lo que te envía Katherine, **por dos medios distintos**:
  - La carpeta del respaldo cifrado, por ejemplo `respaldo-20261109-193736`, con 3 archivos (`base.sql.gz.cif`, `archivos.tar.gz.cif` y `resumen.json`).
  - La clave del respaldo.

Los comandos son para PowerShell.

## 1. Descargar el proyecto

```bash
git clone https://github.com/katherinehermosilla00/focus-power-fit.git
```

```bash
cd focus-power-fit
```

```bash
git checkout dev/khermosilla
```

## 2. Dejar el respaldo en su carpeta

Crea la carpeta `C:\FocusPowerFit\respaldos` y pon dentro la carpeta del respaldo, con sus 3 archivos:

```text
C:\FocusPowerFit\respaldos\respaldo-20261109-193736\base.sql.gz.cif
C:\FocusPowerFit\respaldos\respaldo-20261109-193736\archivos.tar.gz.cif
C:\FocusPowerFit\respaldos\respaldo-20261109-193736\resumen.json
```

## 3. Crear la configuración

```bash
copy deploy\.env.example deploy\.env
```

Genera tres claves distintas, una para cada lugar que dice `CLAVE_GENERADA`. Ejecuta este comando tres veces:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Abre `deploy\.env`, borra su contenido y pega esto, reemplazando las claves:

```env
DOMINIO=localhost
URL_PUBLICA=https://localhost:8443
PUERTO_HTTP=8080
PUERTO_HTTPS=8443
N8N_PUERTO=5680

DB_NAME=focus_power_fit
DB_USER=focus_app
DB_PASSWORD=CLAVE_GENERADA_1
DB_ROOT_PASSWORD=CLAVE_GENERADA_2
DB_SYNC=false

JWT_SECRET=CLAVE_GENERADA_3
JWT_EXPIRES_IN=8h

# Correos apagados: en tu computador nunca pongas una cuenta real.
EMAIL_HOST=127.0.0.1
EMAIL_PORT=9
EMAIL_SECURE=false
EMAIL_USER=ficticio@prueba.cl
EMAIL_PASS=ficticio
EMAIL_FROM=ficticio@prueba.cl

RESPALDOS_HOST_DIR=C:/FocusPowerFit/respaldos
RESPALDO_CLAVE=LA_CLAVE_QUE_TE_ENVIO_KATHERINE
RESPALDO_DIAS=30
```

`deploy\.env` nunca se sube a GitHub.

## 4. Restaurar la base (solo la primera vez)

```bash
cd deploy
```

```bash
docker compose up -d mysql
```

Espera unos 30 segundos y comprueba que `mysql` diga `healthy`:

```bash
docker compose ps
```

Restaura el respaldo. La primera vez tarda unos minutos, porque prepara la herramienta de respaldos:

```bash
docker compose run --rm respaldos restaurar --respaldo=/respaldos/respaldo-20261109-193736 --base=focus_power_fit --archivos=/app/backend/uploads
```

Debe terminar con `Restaurado en focus_power_fit: 13 tablas`. Si dice que la clave es incorrecta, revisa `RESPALDO_CLAVE`.

## 5. Levantar todo

La primera vez tarda varios minutos:

```bash
docker compose up -d --build
```

Comprueba que todos los servicios digan `Up`, y que `mysql` y `backend` digan `healthy`:

```bash
docker compose ps
```

## 6. Cargar FitBot (solo la primera vez)

```bash
docker compose cp ../n8n/fitbot-workflow.json n8n:/tmp/fitbot.json
```

```bash
docker compose exec n8n n8n import:workflow --input=/tmp/fitbot.json
```

```bash
docker compose exec n8n n8n publish:workflow --id=bvKR30I8TghqakFM
```

```bash
docker compose restart n8n
```

FitBot responde con sus reglas. La parte de IA necesita Ollama con el modelo `llama3.2:3b` instalado en tu computador, y es opcional.

## 7. Entrar

- Sitio: https://localhost:8443. El navegador muestra una advertencia por el certificado local: elige **Avanzado** y **Continuar a localhost**.
- Editor de n8n (FitBot): http://localhost:5680

Si todavía no tienes una cuenta de administrador, créala en tu copia:

```bash
docker compose exec backend node crear-admin.mjs
```

## Uso diario

Todos los comandos se ejecutan desde la carpeta `deploy`. Apagar y encender no borra los datos.

```bash
docker compose stop
```

```bash
docker compose start
```

Para traer los cambios nuevos del código:

```bash
git pull
```

```bash
docker compose up -d --build
```

Si cambió el flujo de FitBot, repite el paso 6.

## Borrar la copia

Cuando ya no la necesites, elimina la instalación con todos sus datos. Esto no se puede deshacer:

```bash
docker compose --profile respaldos down -v
```

Después borra la carpeta `C:\FocusPowerFit\respaldos` y el mensaje con la clave.
