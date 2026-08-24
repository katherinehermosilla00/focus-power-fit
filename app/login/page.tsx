"use client";

import { FormEvent, useEffect, useState } from "react";
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

    const correcto = await login(email, password);

    if (!correcto) {
      setError("Correo o contraseña incorrectos.");
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
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-zinc-950 border border-red-600 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black">
            FOCUS <span className="text-red-600">POWER FIT</span>
          </h1>
          <p className="text-gray-400 mt-3">Inicia sesión en tu cuenta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block mb-2 text-sm font-semibold">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.cl"
              required
              className="w-full bg-black border border-zinc-700 rounded-lg p-3 outline-none focus:border-red-600"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              required
              className="w-full bg-black border border-zinc-700 rounded-lg p-3 outline-none focus:border-red-600"
            />
          </div>

          {error && (
            <div className="bg-red-950 border border-red-700 text-red-300 p-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 transition py-3 rounded-lg font-bold"
          >
            Iniciar sesión
          </button>
        </form>
      </div>
    </main>
  );
}