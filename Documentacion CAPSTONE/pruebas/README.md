# Pruebas de QA

Pruebas automatizadas de Focus Power Fit con cinco herramientas:

| Herramienta | Qué prueba | Archivos |
|---|---|---|
| n8n | Las 52 conversaciones de FitBot y el flujo publicado | `../n8n/probar-fitbot.mjs`, `n8n/capturar-n8n.mjs` |
| Postman (Newman) | 38 casos de la API: funcionales, permisos y seguridad | `postman/` |
| Chrome DevTools | Lighthouse en celular y escritorio; consola, red, rendimiento, TLS y HAR | `devtools/auditar.mjs` |
| Playwright | 34 pruebas de punta a punta en escritorio y celular | `playwright/`, `playwright.config.mjs` |
| OWASP ZAP | Escaneo pasivo y escaneo activo con sesión de administrador | `zap/plan-activo.yaml` |

> ⚠️ **Siempre contra el entorno QA, nunca contra el sistema real.** El escaneo activo de ZAP ataca de verdad la aplicación, y Postman y Playwright crean registros. El entorno QA es una instalación Docker aparte que se borra al terminar.

## 1. Levantar el entorno QA

Es la misma instalación de `deploy/`, con otro nombre de proyecto (`fpf-qa`), los correos apagados y el certificado también para `host.docker.internal` (para que ZAP llegue desde su contenedor). Se crea un archivo de configuración fuera del repositorio, por ejemplo `C:\FocusPowerFit\env-qa`, como el de la [guía para el equipo](../deploy/guia-equipo.md), con estos cambios:

```env
DOMINIO=localhost, host.docker.internal
EMAIL_HOST=127.0.0.1
EMAIL_PORT=9
```

Desde `deploy`, con la base vacía (`DB_SYNC=true`) o restaurando un respaldo cifrado (pasos 4 y 5 de la guía):

```bash
docker compose -p fpf-qa --env-file C:\FocusPowerFit\env-qa up -d --build
```

Carga FitBot (paso 6 de la guía, agregando `-p fpf-qa --env-file C:\FocusPowerFit\env-qa`) y crea las cuentas y datos ficticios de QA. Este comando también reinicia las cancelaciones del cliente QA, así que se repite antes de cada ronda de pruebas:

```bash
docker compose -p fpf-qa --env-file C:\FocusPowerFit\env-qa cp ../pruebas/qa/. backend:/app/backend/qa
```

```bash
docker compose -p fpf-qa --env-file C:\FocusPowerFit\env-qa exec -T backend node qa/crear-datos-qa.mjs
```

Las cuentas ficticias están en `qa/cuentas-qa.json` y solo existen en el entorno QA.

El inicio de sesión permite 10 intentos cada 15 minutos por IP. Entre una herramienta y otra, reinicia el backend para dejar el contador en cero:

```bash
docker compose -p fpf-qa --env-file C:\FocusPowerFit\env-qa restart backend
```

## 2. Instalar las herramientas

Desde esta carpeta (`pruebas`). Playwright usa el Google Chrome instalado, así que no descarga navegadores:

```bash
npm install
```

## 3. Ejecutar

Los resultados quedan en `resultados/`, que no se sube a GitHub.

**n8n (FitBot):**

```bash
node ../n8n/probar-fitbot.mjs http://localhost:5680/webhook/e46ddba5-479d-4fb9-bf0d-806ab54a6344/chat
```

```bash
node n8n/capturar-n8n.mjs resultados/n8n
```

**Postman.** La colección y el entorno también se pueden importar en la app Postman:

```bash
node postman/generar-coleccion.mjs
```

```bash
npm run postman
```

**Chrome DevTools:**

```bash
npm run devtools -- resultados/devtools
```

**Playwright.** El informe queda en `resultados/playwright/informe`:

```bash
npm run playwright
```

**OWASP ZAP, escaneo pasivo:**

```bash
docker run --rm --add-host host.docker.internal:host-gateway -v "%CD%\resultados\zap:/zap/wrk:rw" zaproxy/zap-stable zap-baseline.py -t https://host.docker.internal:8443 -j -m 3 -I -r zap-pasivo.html -J zap-pasivo.json
```

**OWASP ZAP, escaneo activo** (unos 30 minutos). `TOKEN_ADMIN` es el token que entrega `POST /api/auth/login` al administrador QA:

```bash
docker run --rm --add-host host.docker.internal:host-gateway -e TOKEN_ADMIN=EL_TOKEN -v "%CD%\resultados\zap:/zap/wrk:rw" -v "%CD%\zap:/zap/plan:ro" zaproxy/zap-stable zap.sh -cmd -autorun /zap/plan/plan-activo.yaml
```

## 4. Borrar el entorno QA

```bash
docker compose -p fpf-qa --env-file C:\FocusPowerFit\env-qa --profile respaldos down -v
```
