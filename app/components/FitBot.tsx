
"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./FitBot.module.css";

type Message = {
  role: "bot" | "user";
  text: string;
};

const WEBHOOK_URL =
  "http://localhost:5679/webhook/e46ddba5-479d-4fb9-bf0d-806ab54a6344/chat";

export default function FitBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      text: "¡Hola! 👋💪 Soy FitBot, el asistente virtual de Focus Power Fit. ¿En qué puedo ayudarte?",
    },
  ]);

  // Identificador único para esta instancia del chatbot
  const sessionId = useRef<string | null>(null);

  // Referencia al final de la conversación
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Crear una sesión única al cargar el componente
  useEffect(() => {
    sessionId.current = crypto.randomUUID();
  }, []);

  // Mostrar automáticamente el último mensaje
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [messages, loading, isOpen]);

  async function sendMessage() {
    const text = message.trim();

    if (!text || loading) return;

    // Registrar mensaje del usuario
    setMessages((prev) => [
      ...prev,
      { role: "user", text },
    ]);

    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "sendMessage",
          chatInput: text,
          sessionId:
            sessionId.current ?? crypto.randomUUID(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      const answer =
        typeof data.output === "string"
          ? data.output
          : "No pude procesar tu consulta en este momento.";

      // Registrar respuesta de FitBot
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: answer },
      ]);
    } catch (error) {
      console.error("Error de FitBot:", error);

      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: "No pude conectarme en este momento. Intenta nuevamente.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>

      {/* VENTANA DEL CHAT */}
      {isOpen && (
        <section
          className={styles.chatWindow}
          aria-label="Chat de FitBot"
        >
          {/* ENCABEZADO */}
          <header className={styles.header}>
            <div className={styles.headerInfo}>
              <span className={styles.avatar}>🤖</span>

              <div>
                <h2 className={styles.title}>FitBot</h2>
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
          >
            {messages.map((item, index) => (
              <div
                key={index}
                className={
                  item.role === "user"
                    ? styles.userMessage
                    : styles.botMessage
                }
              >
                {item.text}
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

            {/* PUNTO FINAL PARA EL SCROLL */}
            <div ref={messagesEndRef} />
          </div>

          {/* CAMPO PARA ESCRIBIR */}
          <form
            className={styles.inputArea}
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage();
            }}
          >
            <input
              className={styles.input}
              type="text"
              value={message}
              onChange={(event) =>
                setMessage(event.target.value)
              }
              placeholder="Escribe tu mensaje..."
              aria-label="Mensaje para FitBot"
            />

            <button
              className={styles.sendButton}
              type="submit"
              disabled={loading || !message.trim()}
              aria-label="Enviar mensaje"
            >
              ➤
            </button>
          </form>
        </section>
      )}

      {/* BOTÓN FLOTANTE: SOLO CUANDO ESTÁ CERRADO */}
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
