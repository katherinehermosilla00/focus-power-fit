"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "../auth/AuthContext";
import "../login/login.css";

const API = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/auth/password`;

const enviar = async (ruta: string, cuerpo: Record<string, string>) => {
  const respuesta = await fetch(`${API}/${ruta}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  const datos = await respuesta.json();

  return { ok: respuesta.ok, mensaje: String(datos.mensaje ?? "") };
};

export default function RecuperarPage() {
  const { logout } = useAuth();

  const [etapa, setEtapa] = useState<"correo" | "codigo" | "listo">("correo");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const solicitar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setEnviando(true);

    try {
      const resultado = await enviar("forgot", { email });

      if (!resultado.ok) {
        setError(resultado.mensaje || "No se pudo procesar la solicitud.");
        return;
      }

      setMensaje(resultado.mensaje);
      setEtapa("codigo");
    } catch {
      setError("No se pudo conectar. Inténtalo nuevamente.");
    } finally {
      setEnviando(false);
    }
  };

  const restablecer = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (password !== confirmacion) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setEnviando(true);

    try {
      const resultado = await enviar("reset", { email, codigo, password });

      if (!resultado.ok) {
        setError(resultado.mensaje || "No se pudo actualizar la contraseña.");
        return;
      }

      // Las sesiones anteriores quedan invalidadas por el servidor.
      logout();
      setMensaje(resultado.mensaje);
      setEtapa("listo");
    } catch {
      setError("No se pudo conectar. Inténtalo nuevamente.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-background" aria-hidden="true" />

      <Link href="/login" className="login-back">
        Volver a iniciar sesión
      </Link>

      <div className="login-shell">
        <section className="login-content" aria-labelledby="recuperar-titulo">
          <div className="login-intro">
            <p className="login-intro-kicker">Acceso a tu cuenta</p>
            <h1 id="recuperar-titulo" className="login-heading">
              Recupera tu contraseña
            </h1>
            <p className="login-intro-text">
              {etapa === "correo"
                ? "Te enviaremos un código a tu correo."
                : mensaje}
            </p>
          </div>

          {etapa === "correo" && (
            <form method="post" onSubmit={solicitar} className="login-form">
              <div className="login-field">
                <label htmlFor="email">Correo electrónico</label>
                <input
                  id="email"
                  className="login-input"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.cl"
                  disabled={enviando}
                  required
                />
              </div>

              {error && <p role="alert" className="login-error">{error}</p>}

              <button type="submit" className="login-submit" disabled={enviando}>
                {enviando ? "Enviando..." : "Enviar código"}
              </button>
            </form>
          )}

          {etapa === "codigo" && (
            <form method="post" onSubmit={restablecer} className="login-form">
              <div className="login-field">
                <label htmlFor="codigo">Código de 6 dígitos</label>
                <input
                  id="codigo"
                  className="login-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  disabled={enviando}
                  required
                />
              </div>

              <div className="login-field">
                <label htmlFor="password">Nueva contraseña</label>
                <input
                  id="password"
                  className="login-input"
                  type="password"
                  autoComplete="new-password"
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres, una mayúscula y un número"
                  disabled={enviando}
                  required
                />
              </div>

              <div className="login-field">
                <label htmlFor="confirmacion">Confirmar contraseña</label>
                <input
                  id="confirmacion"
                  className="login-input"
                  type="password"
                  autoComplete="new-password"
                  maxLength={128}
                  value={confirmacion}
                  onChange={(e) => setConfirmacion(e.target.value)}
                  placeholder="Repite la contraseña"
                  disabled={enviando}
                  required
                />
              </div>

              {error && <p role="alert" className="login-error">{error}</p>}

              <button type="submit" className="login-submit" disabled={enviando}>
                {enviando ? "Actualizando..." : "Actualizar contraseña"}
              </button>
            </form>
          )}

          {etapa === "listo" && (
            <Link href="/login" className="login-submit login-enlace-boton">
              Ir a iniciar sesión
            </Link>
          )}
        </section>
      </div>
    </main>
  );
}
