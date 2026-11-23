// FitBot sin n8n: responde con las mismas reglas del flujo de n8n.
//
// Se usa cuando FITBOT_WEBHOOK_URL está vacío, por ejemplo en un hosting
// compartido donde no pueden correr n8n ni la IA local. Las consultas que
// las reglas no entienden reciben la misma respuesta que da n8n cuando la
// IA no está disponible.

import { nodoFiltro, nodoReglas } from "./reglasN8n.js";

// Memoria de conversación por sessionId, como la de n8n. El nodo de reglas
// borra solo las conversaciones con más de 30 minutos sin mensajes.
const memoria = {};

const EMOJI_INICIAL = /^[\s\u{1F300}-\u{1FAFF}☀-➿]+/gu;

export const responderConReglas = (chatInput, sessionId) => {
  const [{ json: reglas }] = nodoReglas(
    { all: () => [{ json: { chatInput, sessionId } }] },
    () => memoria
  );

  if (!reglas.usarIA) {
    return reglas.output;
  }

  const [{ json: filtro }] = nodoFiltro({ first: () => ({ json: reglas }) });

  // Si el filtro habría consultado a la IA, se entrega la respuesta de
  // respaldo, igual que hace n8n cuando la IA no responde.
  return filtro.permitirIA
    ? String(filtro.output).replace(EMOJI_INICIAL, "").trim()
    : filtro.output;
};
