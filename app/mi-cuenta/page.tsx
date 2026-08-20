"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth/AuthContext";

export default function MiCuentaPage() {
  const router = useRouter();
  const { usuario, cargando, logout } = useAuth();

  useEffect(() => {
    if (cargando) return;

    if (!usuario) {
      router.replace("/login");
      return;
    }

    if (usuario.rol !== "cliente") {
      router.replace("/admin");
    }
  }, [usuario, cargando, router]);

  const cerrarSesion = () => {
    logout();
    router.replace("/login");
  };

  if (cargando) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Cargando...</p>
      </main>
    );
  }

  if (!usuario || usuario.rol !== "cliente") {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Verificando acceso...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <p className="text-gray-400">Mi cuenta</p>

          <h1 className="text-4xl font-black">
            FOCUS <span className="text-red-600">POWER FIT</span>
          </h1>

          <p className="mt-2 text-gray-300">
            Bienvenido/a, {usuario.nombre}
          </p>
        </div>

        <button
          onClick={cerrarSesion}
          className="bg-red-600 hover:bg-red-700 px-5 py-3 rounded-lg font-bold transition"
        >
          Cerrar sesión
        </button>
      </header>

      <section>
        <h2 className="text-3xl font-bold mb-8">
          Información de mi cuenta
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          <Tarjeta
            titulo="Mi Plan"
            valor="Plan Personal Training"
          />

          <Tarjeta
            titulo="Mi Profesor"
            valor="Profesor asignado"
          />

          <Tarjeta
            titulo="Mi Horario"
            valor="Horario asignado"
          />

          <Tarjeta
            titulo="Mi Contrato"
            valor="Contrato pendiente de cargar"
          />
        </div>
      </section>

      <section className="mt-8 bg-zinc-950 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-red-500 mb-3">
          Información importante
        </h2>

        <p className="text-gray-300">
          Puedes consultar tu horario desde la plataforma.
          Cualquier modificación debe coordinarse directamente
          con Focus Power Fit.
        </p>
      </section>
    </main>
  );
}

function Tarjeta({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 hover:border-red-600 transition rounded-xl p-6">
      <p className="text-red-500 font-bold text-lg mb-2">
        {titulo}
      </p>

      <p className="text-gray-300">
        {valor}
      </p>
    </div>
  );
}