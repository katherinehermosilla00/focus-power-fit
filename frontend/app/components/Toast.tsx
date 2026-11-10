"use client";

import { useEffect } from "react";

export type ToastTipo = "success" | "error" | "info";

interface ToastProps {
  mensaje: string;
  tipo?: ToastTipo;
  duracion?: number;
  onCerrar: () => void;
}

export default function Toast({
  mensaje,
  tipo = "success",
  duracion = 3000,
  onCerrar,
}: ToastProps) {
  useEffect(() => {
    // Los errores siempre requieren cierre manual.
    if (!mensaje || tipo === "error" || duracion <= 0) return;

    const temporizador = window.setTimeout(onCerrar, duracion);
    return () => window.clearTimeout(temporizador);
  }, [mensaje, tipo, duracion, onCerrar]);

  if (!mensaje) return null;

  const colores = {
    success: { fondo: "#062d21", borde: "#15803d", texto: "#86efac" },
    error: { fondo: "#3b1115", borde: "#b91c1c", texto: "#fca5a5" },
    info: { fondo: "#10263d", borde: "#2563eb", texto: "#93c5fd" },
  };

  const estilo = colores[tipo];

  return (
    <div
      role={tipo === "error" ? "alert" : "status"}
      style={{
        background: estilo.fondo,
        border: `1px solid ${estilo.borde}`,
        color: estilo.texto,
        padding: "14px 18px",
        borderRadius: "10px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        marginBottom: "18px",
      }}
    >
      <span style={{ lineHeight: 1.5 }}>{mensaje}</span>
      <button
        type="button"
        onClick={onCerrar}
        aria-label="Cerrar notificación"
        title="Cerrar notificación"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          width: "30px",
          height: "30px",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: "8px",
          color: "inherit",
          fontSize: "22px",
          lineHeight: 1,
          cursor: "pointer",
          transition: "background 0.2s ease, border-color 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.15)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.06)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
        }}
      >
        ×
      </button>
    </div>
  );
}
