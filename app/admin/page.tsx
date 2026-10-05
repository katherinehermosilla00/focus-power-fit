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
    <main className="min-h-screen overflow-hidden bg-[#080808] text-white">
      <header className="border-b border-white/10 bg-black/70">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 md:px-8">
          <Link href="/" className="flex items-center gap-3 font-black tracking-wide">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-sm">FP</span>
            <span>FOCUS <span className="text-red-500">POWER FIT</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-gray-300 transition hover:border-white/30 hover:text-white"
            >
              Inicio
            </Link>
            <button
              onClick={cerrarSesion}
              className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold transition hover:bg-red-500"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <section className="relative isolate border-b border-white/5">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_80%_35%,rgba(153,27,27,0.22),transparent_45%),linear-gradient(115deg,#080808_35%,#160909_100%)]" />
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 px-5 py-14 sm:flex-row sm:items-end md:px-8 md:py-20">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-red-400">Espacio de gestión</p>
            <h1 className="mt-3 text-4xl font-black sm:text-5xl">
              Hola, <span className="text-red-500">{usuario.nombre}</span>
            </h1>
            <p className="mt-4 max-w-2xl leading-7 text-gray-300">
              Administra las operaciones de Focus Power Fit desde un solo lugar.
              Selecciona un módulo para comenzar.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 backdrop-blur">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Sesión activa</p>
            <p className="mt-1 font-semibold text-white">Administrador</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-500">Panel administrativo</p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">Módulos de gestión</h2>
          </div>
          <p className="text-sm text-gray-500">9 herramientas para administrar tu gimnasio</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
            titulo="Asignaciones"
            descripcion="Asignar planes, profesores y horarios a clientes."
            href="/admin/asignaciones"
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

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-sm text-gray-500 sm:flex-row sm:justify-between md:px-8">
          <span>© {new Date().getFullYear()} Focus Power Fit</span>
          <span>Administración segura de tu gimnasio</span>
        </div>
      </footer>
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
    <Link
      href={href}
      className="group h-full rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 transition duration-200 hover:-translate-y-1 hover:border-red-500/50"
    >
      <div className="flex items-center justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-red-500/20 bg-red-950/40 text-sm font-black text-red-400">
          {titulo.slice(0, 2).toUpperCase()}
        </span>
        <span className="text-xl text-gray-600 transition group-hover:translate-x-1 group-hover:text-red-400" aria-hidden="true">→</span>
      </div>
      <h3 className="mb-2 mt-6 text-xl font-bold text-white">
        {titulo}
      </h3>
      <p className="min-h-12 text-sm leading-6 text-gray-400">
        {descripcion}
      </p>
    </Link>
  );
}