"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { usuario, cargando, login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

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
    setError("");

    const resultado = await login(email, password);

    if (!resultado.ok) {
      setError(resultado.mensaje || "No se pudo iniciar sesión.");
      return;
    }
  };

  if (cargando) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        Cargando...
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080808] px-4 py-12 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_18%_20%,rgba(153,27,27,0.22),transparent_42%),radial-gradient(ellipse_at_90%_85%,rgba(127,29,29,0.14),transparent_38%)]" />
      <Link
        href="/"
        className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm font-semibold text-gray-300 backdrop-blur transition hover:border-red-500/50 hover:text-white sm:left-8 sm:top-8"
      >
        <span aria-hidden="true">←</span>
        Volver al inicio
      </Link>

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/90 shadow-2xl shadow-black/50 md:grid-cols-[0.9fr_1.1fr]">
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-red-950 via-red-900 to-zinc-950 p-10 md:flex">
          <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full border border-white/10" />
          <div className="absolute -bottom-12 -right-12 h-56 w-56 rounded-full border border-white/10" />
          <div className="relative flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 text-sm font-black">FP</span>
            <span className="font-black tracking-wide">FOCUS POWER FIT</span>
          </div>
          <div className="relative py-12">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-red-200">Tu siguiente nivel</p>
            <h1 className="mt-5 text-4xl font-black leading-tight">
              La constancia<br />te lleva más lejos.
            </h1>
            <p className="mt-5 max-w-xs leading-7 text-red-100/75">
              Accede a tu espacio Focus Power Fit y sigue avanzando hacia tus objetivos.
            </p>
          </div>
          <p className="relative text-xs font-medium uppercase tracking-[0.2em] text-red-200/70">
            Entrena con propósito
          </p>
        </aside>

        <div className="p-7 sm:p-10 md:p-12">
          <div className="mb-8">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/25 bg-red-950/40 text-red-400 md:hidden">
              FP
            </div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-red-500">Bienvenido de vuelta</p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">Inicia sesión</h2>
            <p className="mt-3 text-gray-400">Ingresa tus datos para continuar a tu cuenta.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.cl"
                required
                className="w-full rounded-xl border border-zinc-700 bg-black/70 p-3.5 outline-none transition placeholder:text-zinc-600 focus:border-red-600 focus:ring-2 focus:ring-red-600/20"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña"
                required
                className="w-full rounded-xl border border-zinc-700 bg-black/70 p-3.5 outline-none transition placeholder:text-zinc-600 focus:border-red-600 focus:ring-2 focus:ring-red-600/20"
              />
            </div>

            {error && (
              <div role="alert" className="rounded-xl border border-red-700 bg-red-950/70 p-3.5 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-red-600 py-3.5 font-bold shadow-lg shadow-red-950/40 transition hover:-translate-y-0.5 hover:bg-red-500"
            >
              Iniciar sesión
            </button>
          </form>
          <p className="mt-7 text-center text-sm text-gray-500">
            ¿Aún no tienes cuenta?{" "}
            <Link href="/registro" className="font-bold text-red-400 transition hover:text-red-300">
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}