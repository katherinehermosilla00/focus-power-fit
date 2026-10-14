"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth/AuthContext";

export default function BienvenidaPage() {
  const router = useRouter();
  const { usuario, cargando } = useAuth();

  useEffect(() => {
    if (!cargando && !usuario) {
      router.push("/login");
    }
  }, [cargando, usuario, router]);

  if (cargando || !usuario) {
    return (
      <main className="bg-black text-white min-h-screen flex items-center justify-center">
        <p className="text-red-500">Cargando...</p>
      </main>
    );
  }

  return (
    <main className="bg-black text-white min-h-screen">
      <nav className="flex justify-between items-center px-8 py-4 bg-black border-b border-red-500">
        <div className="flex items-center gap-3">
          <img src="/logo.png" className="w-10 h-10 rounded-full" alt="Logo" />
          <h1 className="text-xl font-bold text-red-500">Focus Power Fit</h1>
        </div>

        <ul className="flex gap-6 text-white">
          <li>
            <Link href="/" className="hover:text-red-500">
              Inicio
            </Link>
          </li>
          <li>
            <Link href="/sucursales" className="hover:text-red-500">
              Sucursales
            </Link>
          </li>
          <li>
            <Link href="/profesores" className="hover:text-red-500">
              Profesores
            </Link>
          </li>
          <li>
            <Link href="/mi-cuenta" className="hover:text-red-500">
              Mi cuenta
            </Link>
          </li>
        </ul>
      </nav>

      <section className="min-h-[70vh] flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-red-500 uppercase tracking-[0.3em] text-sm">
            Focus Power Fit
          </p>
          <h1 className="text-5xl font-bold mt-4">Bienvenido</h1>
          <p className="text-xl text-gray-300 mt-4">
            Hola, {usuario.nombre}
          </p>
        </div>
      </section>
    </main>
  );
}