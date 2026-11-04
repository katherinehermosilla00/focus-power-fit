"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth/AuthContext";
import "./login.css";

export default function LoginPage() {
  const router = useRouter();
  const { usuario, cargando, login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (cargando || !usuario) return;

    if (usuario.rol === "admin") {
      router.replace("/admin");
    } else {
      router.replace("/mi-cuenta");
    }
  }, [usuario, cargando, router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (enviando) return;

    setError("");
    setEnviando(true);

    try {
      const resultado = await login(email, password);
      if (!resultado.ok) {
        setError(resultado.mensaje || "No se pudo iniciar sesión.");
      }
      // Si fue exitoso, useAuth actualiza usuario y el efecto redirige.
    } catch {
      setError("No se pudo conectar. Inténtalo nuevamente.");
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return <main className="login-loading">Cargando...</main>;
  }

  return (
    <main className="login-page">
      <div className="login-background" aria-hidden="true" />

      <Link href="/" className="login-back">
        <span aria-hidden="true">←</span>
        Volver al inicio
      </Link>

      <div className="login-shell">
        <aside className="login-aside">
          <div className="login-ring" aria-hidden="true" />
          <div className="login-ring login-ring-small" aria-hidden="true" />

          <div className="login-brand">
            <span className="login-brand-logo">FP</span>
            <span>FOCUS POWER FIT</span>
          </div>

          <div className="login-aside-content">
            <p className="login-eyebrow">Tu siguiente nivel</p>
            <h1 className="login-aside-title">
              La constancia<br />te lleva más lejos.
            </h1>
            <p className="login-aside-description">
              Accede a tu espacio Focus Power Fit y sigue avanzando hacia tus objetivos.
            </p>
          </div>

          <p className="login-aside-footer">Entrena con propósito</p>
        </aside>

        <section className="login-content" aria-labelledby="login-title">
          <div className="login-intro">
            <div className="login-mobile-logo" aria-hidden="true">FP</div>
            <p className="login-intro-kicker">Bienvenido de vuelta</p>
            <h2 id="login-title" className="login-heading">Inicia sesión</h2>
            <p className="login-intro-text">Ingresa tus datos para continuar a tu cuenta.</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
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

            <div className="login-field">
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                className="login-input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña"
                disabled={enviando}
                required
              />
            </div>

            {error && <p role="alert" className="login-error">{error}</p>}

            <button type="submit" className="login-submit" disabled={enviando}>
              {enviando ? "Iniciando sesión..." : "Iniciar sesión"}
            </button>
          </form>

          <p className="login-register">
            ¿Aún no tienes cuenta?{" "}
            <Link href="/registro">Regístrate</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
