"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth/AuthContext";

export default function RegistroPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [form, setForm] = useState({
    nombre: "",
    email: "",
    password: "",
    confirmPassword: "",
    rut: "",
    telefono: "",
  });

  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.nombre || !form.email || !form.password || !form.rut) {
      setError("Nombre, email, contraseña y RUT son obligatorios.");
      return;
    }

    if (form.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setCargando(true);

    const ok = await register(
      form.nombre,
      form.email,
      form.password,
      form.rut,
      form.telefono
    );

    setCargando(false);

    if (!ok) {
      setError("No se pudo crear la cuenta. Verifica los datos.");
      return;
    }

    router.push("/bienvenida");
  };

  return (
    <main className="bg-black text-white min-h-screen px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-red-500 hover:underline">
            ← Volver al inicio
          </Link>
        </div>

        <div className="bg-gray-900 border border-red-500 rounded-2xl p-8 shadow-lg">
          <h1 className="text-4xl font-bold text-red-500 mb-6 text-center">
            Registro
          </h1>

          <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm mb-2">Nombre</label>
              <input
                type="text"
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-700 bg-black px-4 py-3 text-white"
                placeholder="Tu nombre"
              />
            </div>

            <div>
              <label className="block text-sm mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-700 bg-black px-4 py-3 text-white"
                placeholder="correo@correo.com"
              />
            </div>

            <div>
              <label className="block text-sm mb-2">RUT</label>
              <input
                type="text"
                name="rut"
                value={form.rut}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-700 bg-black px-4 py-3 text-white"
                placeholder="12.345.678-9"
              />
            </div>

            <div>
              <label className="block text-sm mb-2">Contraseña</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-700 bg-black px-4 py-3 text-white"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm mb-2">Confirmar contraseña</label>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-700 bg-black px-4 py-3 text-white"
                placeholder="Repite la contraseña"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm mb-2">Teléfono</label>
              <input
                type="text"
                name="telefono"
                value={form.telefono}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-700 bg-black px-4 py-3 text-white"
                placeholder="+56 9 1234 5678"
              />
            </div>

            {error && (
              <div className="md:col-span-2 text-red-400 text-sm font-medium">
                {error}
              </div>
            )}

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={cargando}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-3 rounded-lg transition disabled:opacity-60"
              >
                {cargando ? "Creando cuenta..." : "Registrarme"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}