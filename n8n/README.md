# FitBot en n8n local con Docker

FitBot responde primero con reglas en JavaScript. Solo si no reconocen la pregunta, una IA local con Ollama elige el tema más cercano entre categorías cerradas. La respuesta visible siempre sale de un texto aprobado.

```text
Navegador → Backend → n8n → Reglas ─ entendieron ───────────────────────────────┐
                                  └─ no → Filtro ─ bloqueado ────────────────────┤
                                            └─ permitido → IA → Validación ──────┴→ Respuesta
```

## Límites de la IA

- **No redacta:** solo elige una categoría; no puede inventar precios, horarios ni servicios.
- **No actúa:** no tiene herramientas ni acceso a clientes, base de datos o sistemas externos.
- **Es local:** el mensaje se procesa en este equipo con Ollama.
- **Pasa un filtro:** RUT, correos, teléfonos, claves, consultas de salud e intentos de manipulación no llegan al modelo.
- **Se valida:** cualquier categoría desconocida o salida inválida entrega el mensaje original.
- **Tiene tiempo máximo:** si Ollama falla o tarda más de 9 segundos, también responde el mensaje original.

El mensaje original es: "Lo siento, solo puedo responder preguntas sobre Focus Power Fit", seguido de los temas disponibles. Sin Ollama, también aparece ante preguntas del gimnasio que las reglas no reconocen.

El bot avisa lo que interpretó ("Entendí que preguntas por..."), para que la persona note si hubo un error. Las ejecuciones guardadas por n8n pueden incluir los mensajes recibidos; se borran a los 7 días (`EXECUTIONS_DATA_MAX_AGE` en `docker-compose.yml`).

## Encender FitBot

Si el contenedor ya existe:

```bash
docker start focus-power-fit-n8n
```

Para crearlo o aplicar cambios de `docker-compose.yml`, desde esta carpeta:

```bash
docker compose up -d
```

Espera hasta un minuto: justo después de iniciar, n8n puede responder 404 mientras activa el flujo (se midieron 46 segundos). El editor queda en http://localhost:5679.

## Preparar la IA

Instala [Ollama](https://ollama.com) y descarga el modelo una vez (unos 2 GB):

```bash
ollama pull llama3.2:3b
```

Antes de una demostración, deja el modelo cargado en memoria. Sin esto, las primeras preguntas pueden responder con el mensaje original mientras el modelo carga:

```bash
ollama run llama3.2:3b --keepalive 60m "ok"
```

Si Ollama no está disponible, FitBot sigue funcionando con sus reglas.

## Conectar el backend

En `backend/.env`:

```env
FITBOT_WEBHOOK_URL=http://localhost:5679/webhook/e46ddba5-479d-4fb9-bf0d-806ab54a6344/chat
```

Reinicia el backend después de cambiar este valor.

## Instalar o actualizar el flujo

El archivo `fitbot-workflow.json` es la versión oficial. Después de importarlo hay que publicarlo y reiniciar n8n:

```bash
docker cp fitbot-workflow.json focus-power-fit-n8n:/tmp/fitbot.json
```

```bash
docker exec focus-power-fit-n8n n8n import:workflow --input=/tmp/fitbot.json
```

```bash
docker exec focus-power-fit-n8n n8n publish:workflow --id=bvKR30I8TghqakFM
```

```bash
docker restart focus-power-fit-n8n
```

Si cambias el flujo desde el editor, publícalo y expórtalo otra vez para mantener este archivo al día:

```bash
docker exec focus-power-fit-n8n n8n export:workflow --id=bvKR30I8TghqakFM --published --output=/tmp/fitbot.json
```

```bash
docker cp focus-power-fit-n8n:/tmp/fitbot.json fitbot-workflow.json
```

## Probar las preguntas frecuentes

Con el backend y n8n encendidos:

```bash
node n8n/probar-fitbot.mjs
```

La prueba pasa por el backend, por lo que tarda más de un minuto: respeta el límite de 20 mensajes por minuto.

## Si no responde

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| "No pude procesar tu consulta" | n8n apagado o URL incorrecta | Enciende el contenedor y revisa `FITBOT_WEBHOOK_URL` |
| Error 404 en n8n | Flujo no publicado o n8n recién iniciado | Espera hasta un minuto; si sigue, publícalo y reinicia |
| Error 503 en el backend | Falta `FITBOT_WEBHOOK_URL` | Agrégala y reinicia el backend |
| Error 429 | Más de 20 mensajes por minuto desde la misma IP | Espera un minuto |
| Nunca aparece "Entendí que preguntas por..." | Ollama apagado, sin modelo o modelo sin cargar | Revisa `ollama list` y precalienta el modelo |
| La IA responde lento | Equipo sin GPU o modelo recién cargado | Es normal tardar unos 3 segundos; sobre 9 s responde el mensaje original |
