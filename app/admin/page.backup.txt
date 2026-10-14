"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth/AuthContext";

export default function AdminPage() {
  const router = useRouter();
  const { usuario, cargando, logout } = useAuth();

  useEffect(() => {
    if (cargando) return;

    if (!usuario) {
      router.replace("/login");
      return;
    }

    if (usuario.rol !== "admin") {
      router.replace("/mi-cuenta");
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

  if (!usuario || usuario.rol !== "admin") {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Verificando acceso...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-14">
        <div>
          <p className="text-gray-400 text-lg">
            Administrador
          </p>

          <h1 className="text-4xl md:text-5xl font-black mt-1">
            FOCUS{" "}
            <span className="text-red-600">
              POWER FIT
            </span>
          </h1>

          <p className="text-gray-400 mt-2">
            Bienvenido, {usuario.nombre}
          </p>
        </div>

        <button
          onClick={cerrarSesion}
          className="bg-red-600 hover:bg-red-700 transition px-6 py-3 rounded-xl font-bold"
        >
          Cerrar sesión
        </button>
      </header>

      <section>
        <h2 className="text-3xl font-bold mb-8">
          Panel Administrativo
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Tarjeta
            titulo="Clientes"
            descripcion="Administrar clientes existentes y nuevos."
            href="/admin/clientes"
          />

          <Tarjeta
            titulo="Profesores"
            descripcion="Administrar información de profesores."
            href="/admin/profesores"
          />

          <Tarjeta
            titulo="Planes"
            descripcion="Administrar los planes del gimnasio."
            href="/admin/planes"
          />

          <Tarjeta
            titulo="Horarios"
            descripcion="Gestionar horarios y clases."
            href="/admin/horarios"
          />

          <Tarjeta
            titulo="Asistencia"
            descripcion="Registrar asistencia de clientes."
            href="/admin/asistencia"
          />

          <Tarjeta
            titulo="Contratos"
            descripcion="Administrar copias digitales de contratos."
            href="/admin/contratos"
          />

          <Tarjeta
            titulo="Pagos"
            descripcion="Registrar pagos realizados presencialmente."
            href="/admin/pagos"
          />

          <Tarjeta
            titulo="Recordatorios"
            descripcion="Administrar recordatorios de clases por correo."
            href="/admin/recordatorios"
          />
        </div>
      </section>
    </main>
  );
}

function Tarjeta({
  titulo,
  descripcion,
  href,
}: {
  titulo: string;
  descripcion: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <div className="h-full bg-zinc-950 border border-zinc-800 hover:border-red-600 hover:-translate-y-1 transition-all rounded-xl p-6 cursor-pointer">
        <h3 className="text-2xl font-bold text-red-500 mb-3">
          {titulo}
        </h3>

        <p className="text-gray-400">
          {descripcion}
        </p>
      </div>
    </Link>
  );
}