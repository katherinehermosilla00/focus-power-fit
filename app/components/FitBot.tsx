
"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import styles from "./FitBot.module.css";

// =====================================================
// TIPOS
// =====================================================

type Message = {
  role: "bot" | "user";
  text: string;
};

// =====================================================
// CONFIGURACIÓN
// =====================================================

const WEBHOOK_URL =
  "http://localhost:3001/api/fitbot/chat";

const MAX_MESSAGE_LENGTH = 500;
const MAX_RESPONSE_LENGTH = 5000;
const MAX_RESPONSE_BYTES = 20000;
const REQUEST_TIMEOUT_MS = 15000;

const INITIAL_MESSAGE: Message = {
  role: "bot",
  text:
    "¡Hola! 👋💪 Soy FitBot, el asistente virtual " +
    "de Focus Power Fit. ¿En qué puedo ayudarte?",
};

// =====================================================
// VALIDACIÓN DE ENLACES
// =====================================================

function esEnlaceSeguro(url: string): boolean {
  try {
    const parsed = new URL(url);

    if (parsed.protocol !== "https:") {
      return false;
    }

    const host = parsed.hostname;

    // Google Maps - enlaces cortos
    if (host === "maps.app.goo.gl") {
      return /^\/[a-zA-Z0-9_-]+\/?$/.test(
        parsed.pathname
      );
    }

    // Google Maps - enlaces largos
    if (host === "www.google.com") {
      return (
        parsed.pathname === "/maps/search/" &&
        parsed.searchParams.get("api") === "1" &&
        Boolean(parsed.searchParams.get("query"))
      );
    }

    // WhatsApp
    if (host === "wa.me") {
      return /^\/[0-9]+\/?$/.test(
        parsed.pathname
      );
    }

    if (host === "wa.link") {
      return /^\/[a-zA-Z0-9_-]+\/?$/.test(
        parsed.pathname
      );
    }

    // Instagram
    if (host === "www.instagram.com") {
      return /^\/[a-zA-Z0-9._]+\/?$/.test(
        parsed.pathname
      );
    }

    return false;
  } catch {
    return false;
  }
}

// =====================================================
// TEXTO VISIBLE DE LOS ENLACES
// =====================================================

function obtenerTextoEnlace(url: string): string {
  try {
    const host = new URL(url).hostname;

    if (
      host === "maps.app.goo.gl" ||
      host === "www.google.com"
    ) {
      return "🗺️ Ver ubicación en Google Maps ↗";
    }

    if (
      host === "wa.me" ||
      host === "wa.link"
    ) {
      return "💬 Hablar por WhatsApp ↗";
    }

    if (host === "www.instagram.com") {
      return "📸 Ver Instagram ↗";
    }

    return url;
  } catch {
    return url;
  }
}

// =====================================================
// FORMATEAR MENSAJES
// =====================================================

function formatearMensaje(texto: string): ReactNode[] {
  const regex = /https:\/\/[^\s<>"']+/g;

  const resultado: ReactNode[] = [];
  let posicion = 0;
  let indice = 0;

  for (const coincidencia of texto.matchAll(regex)) {
    const urlOriginal = coincidencia[0];
    const inicio = coincidencia.index ?? 0;

    if (inicio > posicion) {
      resultado.push(
        <span key={`texto-${indice}`}>
          {texto.slice(posicion, inicio)}
        </span>
      );
    }

    const url = urlOriginal.replace(
      /[.,;!?]+$/,
      ""
    );

    const resto = urlOriginal.slice(url.length);

    if (esEnlaceSeguro(url)) {
      resultado.push(
        <a
          key={`enlace-${indice}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={obtenerTextoEnlace(url)}
          style={{
            display: "inline-block",
            margin: "6px 0",
            color: "#2563eb",
            fontWeight: 700,
            textDecoration: "underline",
            textUnderlineOffset: "3px",
            overflowWrap: "anywhere",
          }}
        >
          {obtenerTextoEnlace(url)}
        </a>
      );
    } else {
      resultado.push(
        <span key={`enlace-${indice}`}>
          {url}
        </span>
      );
    }

    if (resto) {
      resultado.push(
        <span key={`resto-${indice}`}>
          {resto}
        </span>
      );
    }

    posicion = inicio + urlOriginal.length;
    indice++;
  }

  if (posicion < texto.length) {
    resultado.push(
      <span key="texto-final">
        {texto.slice(posicion)}
      </span>
    );
  }

  return resultado;
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export default function FitBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [messages, setMessages] = useState<Message[]>([
    INITIAL_MESSAGE,
  ]);

  const sessionId = useRef<string | null>(null);
  const messagesEndRef =
    useRef<HTMLDivElement | null>(null);
  const inputRef =
    useRef<HTMLInputElement | null>(null);
  const requestController =
    useRef<AbortController | null>(null);
  const sendingRef = useRef(false);

  // ===================================================
  // IDENTIFICADOR DE CONVERSACIÓN
  // ===================================================

  useEffect(() => {
    sessionId.current = crypto.randomUUID();
  }, []);

  // ===================================================
  // CANCELAR SOLICITUDES AL DESMONTAR
  // ===================================================

  useEffect(() => {
    return () => {
      requestController.current?.abort();
    };
  }, []);

  // ===================================================
  // SCROLL AUTOMÁTICO
  // ===================================================

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [messages, loading, isOpen]);

  // ===================================================
  // ENFOCAR CAMPO DE TEXTO
  // ===================================================

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // ===================================================
  // ENVIAR MENSAJE
  // ===================================================

  async function sendMessage() {
    const text = message.trim();

    if (!text || sendingRef.current) {
      return;
    }

    if (text.length > MAX_MESSAGE_LENGTH) {
      setErrorMessage(
        `El mensaje no puede superar los ${MAX_MESSAGE_LENGTH} caracteres.`
      );
      return;
    }

    sendingRef.current = true;
    setLoading(true);
    setErrorMessage("");
    setMessage("");

    setMessages(prev => [
      ...prev,
      {
        role: "user",
        text,
      },
    ]);

    const controller = new AbortController();
    requestController.current = controller;

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
      const currentSessionId =
        sessionId.current ?? crypto.randomUUID();

      sessionId.current = currentSessionId;

      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "sendMessage",
          chatInput: text,
          sessionId: currentSessionId,
        }),
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("FITBOT_REQUEST_FAILED");
      }

      const contentType =
        response.headers.get("content-type") ?? "";

      if (
        !contentType
          .toLowerCase()
          .includes("application/json")
      ) {
        throw new Error("FITBOT_INVALID_CONTENT_TYPE");
      }

      const reader = response.body?.getReader();

      if (!reader) {
        throw new Error("FITBOT_EMPTY_RESPONSE");
      }

      const decoder = new TextDecoder();
      let rawResponse = "";
      let totalBytes = 0;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        totalBytes += value.byteLength;

        if (totalBytes > MAX_RESPONSE_BYTES) {
          await reader.cancel();
          throw new Error("FITBOT_RESPONSE_TOO_LARGE");
        }

        rawResponse += decoder.decode(value, {
          stream: true,
        });
      }

      rawResponse += decoder.decode();

      const data: unknown = JSON.parse(rawResponse);

      if (
        typeof data !== "object" ||
        data === null ||
        !("output" in data) ||
        typeof data.output !== "string"
      ) {
        throw new Error("FITBOT_INVALID_RESPONSE");
      }

      const answer = data.output.trim();

      if (
        !answer ||
        answer.length > MAX_RESPONSE_LENGTH
      ) {
        throw new Error("FITBOT_INVALID_ANSWER");
      }

      setMessages(prev => [
        ...prev,
        {
          role: "bot",
          text: answer,
        },
      ]);
    } catch {
      const errorText = controller.signal.aborted
        ? "La respuesta está tardando demasiado. " +
          "Intenta nuevamente en unos momentos."
        : "No pude procesar tu consulta en este " +
          "momento. Por favor, intenta nuevamente.";

      setMessages(prev => [
        ...prev,
        {
          role: "bot",
          text: errorText,
        },
      ]);
    } finally {
      clearTimeout(timeoutId);

      if (requestController.current === controller) {
        requestController.current = null;
      }

      sendingRef.current = false;
      setLoading(false);
    }
  }

  // ===================================================
  // CONTADOR DE CARACTERES
  // ===================================================

  const remainingCharacters =
    MAX_MESSAGE_LENGTH - message.length;

  // ===================================================
  // INTERFAZ DEL CHATBOT
  // ===================================================

  return (
    <div className={styles.container}>
      {isOpen && (
        <section
          className={styles.chatWindow}
          aria-label="Chat de FitBot"
        >
          {/* ENCABEZADO */}
          <header className={styles.header}>
            <div className={styles.headerInfo}>

              {/* EMOJI DEL BOT EN EL ENCABEZADO */}
              <span
                className={styles.avatar}
                aria-hidden="true"
              >
                🤖
              </span>

              <div>
                <h2 className={styles.title}>
                  FitBot
                </h2>

                <p className={styles.subtitle}>
                  Asistente de Focus Power Fit
                </p>
              </div>
            </div>

            <button
              type="button"
              className={styles.closeButton}
              onClick={() => setIsOpen(false)}
              aria-label="Cerrar chatbot"
            >
              ✕
            </button>
          </header>

          {/* MENSAJES */}
          <div
            className={styles.messages}
            aria-live="polite"
            aria-relevant="additions text"
          >
            {messages.map((item, index) => (
              <div
                key={index}
                className={
                  item.role === "user"
                    ? styles.userMessage
                    : styles.botMessage
                }
                style={{
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                }}
              >
                {item.role === "bot"
                  ? formatearMensaje(item.text)
                  : item.text}
              </div>
            ))}

            {loading && (
              <div
                className={styles.botMessage}
                role="status"
              >
                FitBot está escribiendo...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* CAMPO PARA ESCRIBIR */}
          <form
            className={styles.inputArea}
            onSubmit={event => {
              event.preventDefault();
              void sendMessage();
            }}
          >
            <input
              ref={inputRef}
              className={styles.input}
              type="text"
              value={message}
              onChange={event => {
                setMessage(event.target.value);

                if (errorMessage) {
                  setErrorMessage("");
                }
              }}
              maxLength={MAX_MESSAGE_LENGTH}
              placeholder="Escribe tu mensaje..."
              aria-label="Mensaje para FitBot"
              aria-invalid={Boolean(errorMessage)}
              disabled={loading}
              autoComplete="off"
            />

            <button
              className={styles.sendButton}
              type="submit"
              disabled={
                loading ||
                !message.trim() ||
                message.length > MAX_MESSAGE_LENGTH
              }
              aria-label="Enviar mensaje"
            />
          </form>

          {/* MENSAJE DE ERROR */}
          {errorMessage && (
            <p role="alert">
              {errorMessage}
            </p>
          )}

          {/* CONTADOR */}
          <span
            aria-live="off"
            style={{
              display: "block",
              fontSize: "11px",
              textAlign: "right",
              padding: "0 12px 8px",
              opacity: 0.7,
            }}
          >
            {remainingCharacters} caracteres disponibles
          </span>
        </section>
      )}

      {/* BOTÓN FLOTANTE CON EMOJI */}
      {!isOpen && (
        <button
          type="button"
          className={styles.floatingButton}
          onClick={() => setIsOpen(true)}
          aria-label="Abrir FitBot"
          aria-expanded={false}
        >
          🤖
        </button>
      )}
    </div>
  );
}
