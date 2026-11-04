
import { Router } from "express";
import { rateLimit } from "express-rate-limit";

const router = Router();

// ==========================================
// CONFIGURACIÓN DE SEGURIDAD
// ==========================================
const MAX_MESSAGE_LENGTH = 500;
const MAX_RESPONSE_LENGTH = 5000;
const MAX_RESPONSE_BYTES = 20000;
const REQUEST_TIMEOUT_MS = 12000;

// ==========================================
// PROTECCIÓN CONTRA SPAM
// ==========================================
// Máximo 20 solicitudes por minuto por IP.
const fitbotLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error:
      "Has enviado demasiados mensajes. Intenta nuevamente en un minuto.",
  },
});

// ==========================================
// POST /api/fitbot/chat
// ==========================================
router.post("/chat", fitbotLimiter, async (req, res) => {
  const { chatInput, sessionId } = req.body ?? {};

  // ======================================
  // VALIDAR MENSAJE DEL USUARIO
  // ======================================
  if (
    typeof chatInput !== "string" ||
    !chatInput.trim() ||
    chatInput.length > MAX_MESSAGE_LENGTH
  ) {
    return res.status(400).json({
      error: "Mensaje inválido",
    });
  }

  // ======================================
  // VALIDAR IDENTIFICADOR DE CONVERSACIÓN
  // ======================================
  // El UUID identifica una conversación,
  // pero no autentica al usuario.
  if (
    typeof sessionId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      sessionId
    )
  ) {
    return res.status(400).json({
      error: "Sesión inválida",
    });
  }

  // ======================================
  // CONFIGURACIÓN DE N8N
  // ======================================
  // La URL permanece en el backend.
  const webhookUrl = process.env.FITBOT_WEBHOOK_URL;

  if (!webhookUrl) {
    return res.status(503).json({
      error: "FitBot no está configurado",
    });
  }

  try {
    // ======================================
    // COMUNICACIÓN CON N8N
    // ======================================
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "sendMessage",
        chatInput: chatInput.trim(),
        sessionId,
      }),
      signal: AbortSignal.timeout(
        REQUEST_TIMEOUT_MS
      ),
    });

    // ======================================
    // VALIDAR ESTADO HTTP
    // ======================================
    if (!response.ok) {
      throw new Error("N8N_REQUEST_FAILED");
    }

    // ======================================
    // VALIDAR TIPO DE RESPUESTA
    // ======================================
    const contentType =
      response.headers.get("content-type") ?? "";

    if (
      !contentType
        .toLowerCase()
        .includes("application/json")
    ) {
      throw new Error("INVALID_CONTENT_TYPE");
    }

    // ======================================
    // CONTROLAR TAMAÑO DE RESPUESTA
    // ======================================
    const reader = response.body?.getReader();

    if (!reader) {
      throw new Error("EMPTY_RESPONSE");
    }

    const decoder = new TextDecoder();

    let rawResponse = "";
    let totalBytes = 0;

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      totalBytes += value.byteLength;

      if (totalBytes > MAX_RESPONSE_BYTES) {
        await reader.cancel();

        throw new Error("RESPONSE_TOO_LARGE");
      }

      rawResponse += decoder.decode(value, {
        stream: true,
      });
    }

    rawResponse += decoder.decode();

    // ======================================
    // CONVERTIR Y VALIDAR JSON
    // ======================================
    const data = JSON.parse(rawResponse);

    if (
      typeof data?.output !== "string" ||
      !data.output.trim() ||
      data.output.length > MAX_RESPONSE_LENGTH
    ) {
      throw new Error("INVALID_RESPONSE");
    }

    // ======================================
    // RESPUESTA SEGURA AL FRONTEND
    // ======================================
    return res.json({
      output: data.output,
    });
  } catch (error) {
    // Registrar un error técnico sin incluir
    // el mensaje del usuario ni la URL de n8n.
    console.error(
      "Error interno de FitBot:",
      error instanceof Error
        ? error.message
        : "Error desconocido"
    );

    // No exponer detalles internos al cliente.
    return res.status(502).json({
      error:
        "FitBot no está disponible en este momento",
    });
  }
});

export default router;
