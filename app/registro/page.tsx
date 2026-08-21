"use client";

import Link from "next/link";
import { useState } from "react";

export default function Registro() {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [sucursal, setSucursal] = useState("La Reina");
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !correo || !telefono) return;

    const registrosGuardados = localStorage.getItem("registros");
    const registros = registrosGuardados ? JSON.parse(registrosGuardados) : [];
    const nuevosRegistros = [...registros, { nombre, correo, telefono, sucursal }];
    localStorage.setItem("registros", JSON.stringify(nuevosRegistros));

    setEnviado(true);
  };

  return (
    <main className="bg-black text-white min-h-screen p-8 md:p-12">

      <Link href="/" className="text-red-500 hover:underline text-sm">
        ← Volver al inicio
      </Link>

      <p className="font-[family-name:var(--font-geist-mono)] text-red-500 text-xs md:text-sm tracking-[0.35em] uppercase mt-10 mb-2">
        ● Únete al equipo
      </p>

      <h1 className="font-[family-name:var(--font-bebas-neue)] text-6xl md:text-8xl leading-[0.9] tracking-wide mb-2">
        REGÍSTRATE <span className="text-red-500">AHORA</span>
      </h1>

      <div className="h-2 w-24 bg-red-600 -skew-x-12 mb-12" />

      <div className="max-w-md">
        {enviado ? (
          <div className="bg-gray-900 border border-red-500 rounded-xl p-6 text-center">
            <h2 className="text-2xl font-bold text-red-400 mb-2">¡Gracias, {nombre}! 🎉</h2>
            <p className="text-gray-400">
              Recibimos tu registro para la sucursal de {sucursal}. Pronto nos pondremos en contacto contigo.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-gray-900 border border-red-500 rounded-xl p-6">
            <label className="block text-sm text-gray-400 mb-1">Nombre completo</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu nombre"
              className="w-full p-2 mb-4 bg-black border border-gray-700 rounded"
            />

            <label className="block text-sm text-gray-400 mb-1">Correo electrónico</label>
            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="tu@correo.com"
              className="w-full p-2 mb-4 bg-black border border-gray-700 rounded"
            />

            <label className="block text-sm text-gray-400 mb-1">Teléfono</label>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="+56 9 1234 5678"
              className="w-full p-2 mb-4 bg-black border border-gray-700 rounded"
            />

            <label className="block text-sm text-gray-400 mb-1">Sucursal de tu preferencia</label>
            <select
              value={sucursal}
              onChange={(e) => setSucursal(e.target.value)}
              className="w-full p-2 mb-6 bg-black border border-gray-700 rounded"
            >
              <option value="La Reina">La Reina</option>
              <option value="Peñalolén">Peñalolén</option>
            </select>

            <button
              type="submit"
              className="w-full bg-red-500 hover:bg-red-600 px-4 py-2 rounded font-bold"
            >
              Registrarme
            </button>
          </form>
        )}
      </div>

    </main>
  );
}