# Despliegue con Docker

Todo el sistema corre en un servidor con Docker:

| Servicio | Qué hace | Visible desde internet |
|---|---|---|
| `caddy` | HTTPS con certificado automático; reparte entre el sitio y la API | Sí, puertos 80 y 443 |
| `frontend` | Sitio web (Next.js) | No, a través de Caddy |
| `backend` | API (Express) | No, a través de Caddy en `/api` |
| `mysql` | Base de datos MySQL 8.0 | No |
| `n8n` | Flujo de FitBot | No; editor solo desde el servidor |
| `respaldos` | Respaldo cifrado y prueba de restauración | No; se ejecuta y termina |

Los datos viven en volúmenes de Docker (`datos-mysql`, `subidas`, `datos-n8n`): actualizar o recrear un contenedor no los borra. **Nunca ejecutes `docker compose down -v` en el servidor: `-v` borra los volúmenes con todos los datos.**

## Requisitos

- Un servidor Linux con 2 GB de RAM como mínimo (4 GB si también corre Ollama para la IA de FitBot), Docker y Docker Compose.
- Un dominio cuyo registro DNS apunte a la IP del servidor.
- Puertos 80 y 443 abiertos. El resto, cerrados.

## Primera instalación

1. Copia el proyecto al servidor, por ejemplo en `/srv/focus-power-fit`.
2. Crea la configuración y complétala. Las claves se generan con el comando que indica el archivo:

   ```bash
   cp deploy/.env.example deploy/.env
   ```

3. Crea la carpeta de respaldos, fuera del proyecto, con la ruta de `RESPALDOS_HOST_DIR`:

   ```bash
   sudo mkdir -p /srv/focus-power-fit/respaldos
   ```

4. Elige uno de los dos caminos:

   **A. Pasar los datos actuales (lo normal).** En el computador donde está la base hoy, crea un respaldo cifrado (`npm run respaldo:crear` en `backend`) y copia su carpeta `respaldo-AAAAMMDD-HHMMSS` a la carpeta de respaldos del servidor. En `deploy/.env` usa **la misma `RESPALDO_CLAVE`** y `DB_SYNC=false`. Luego, desde `deploy`:

   ```bash
   docker compose up -d mysql
   ```

   ```bash
   docker compose run --rm respaldos restaurar --respaldo=/respaldos/respaldo-AAAAMMDD-HHMMSS --base=focus_power_fit --archivos=/app/backend/uploads
   ```

   La restauración se hace **antes** de levantar el backend, porque exige una base y una carpeta vacías. Así los datos viajan cifrados y nunca como un `.sql` legible.

   **B. Empezar con una base vacía.** Pon `DB_SYNC=true` solo para el primer arranque y vuelve a `false` después.

5. Levanta todo:

   ```bash
   docker compose up -d --build
   ```

6. Comprueba el estado. Todos deben quedar `Up`, y `mysql` y `backend` como `healthy`:

   ```bash
   docker compose ps
   ```

7. Carga FitBot en n8n (solo la primera vez y cuando cambie el flujo):

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

8. Si empezaste con la base vacía, crea el primer administrador:

   ```bash
   docker compose exec backend node crear-admin.mjs
   ```

## Respaldos

Programa los respaldos con `cron` (`crontab -e`). La ruta del script depende de dónde copiaste el proyecto:

```
0 22 * * *  /srv/focus-power-fit/deploy/respaldo.sh crear
30 22 * * 0 /srv/focus-power-fit/deploy/respaldo.sh probar
```

El resultado queda en `/var/log/focus-power-fit-respaldos.log`, solo con totales. Revísalo cada semana: una línea `FALLO` se trata como incidente. **Copia la carpeta de respaldos fuera del servidor**: si el servidor se pierde, los respaldos se pierden con él.

## Actualizar

```bash
git pull
```

```bash
docker compose up -d --build
```

Los códigos de registro y recuperación de contraseña se guardan en memoria y se pierden al reiniciar el backend: actualiza fuera del horario de atención. Ejecuta una sola instancia del backend.

## FitBot e IA

FitBot responde con sus reglas aunque no haya IA. Para la IA local, instala Ollama en el servidor (fuera de Docker) con el modelo `llama3.2:3b`; n8n lo encuentra en `host.docker.internal:11434`.

El editor de n8n no se publica en internet. Para entrar desde tu computador, abre un túnel SSH y visita `http://localhost:5679`:

```bash
ssh -L 5679:127.0.0.1:5679 usuario@servidor
```

## Probar en un computador

Para que un integrante del equipo levante el sistema en su computador con una copia de la base, sigue la [guía para el equipo](guia-equipo.md).

En un equipo que ya usa los puertos 80, 443 o 5679, descomenta `PUERTO_HTTP`, `PUERTO_HTTPS` y `N8N_PUERTO` en `deploy/.env`, usa `DOMINIO=localhost` y `URL_PUBLICA=https://localhost:8443`. Caddy usa un certificado local, así que el navegador mostrará una advertencia.

Para borrar por completo una instalación **de prueba**, con sus datos:

```bash
docker compose --profile respaldos down -v
```

## Comprobado el 8 de noviembre de 2026

En Docker Desktop, con datos ficticios: los cinco servicios levantan; el sitio, el inicio de sesión, la API y FitBot responden por HTTPS; HTTP redirige a HTTPS; MySQL usa `utf8mb4_unicode_ci` y la hora de Chile; el respaldo y su prueba de restauración funcionan dentro de Docker; y un respaldo se restauró en una instalación nueva y vacía con sus 13 tablas.
