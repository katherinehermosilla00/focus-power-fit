"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth/AuthContext";

export default function AdminPage() {
  const router = useRouter();
  const { usuario, cargando } = useAuth();

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

  if (cargando) {
    return (
      <main className="fpf-page flex min-h-screen items-center justify-center">
        <p className="fpf-text-secondary">
          Cargando panel administrativo...
        </p>
      </main>
    );
  }

  if (!usuario || usuario.rol !== "admin") {
    return (
      <main className="fpf-page flex min-h-screen items-center justify-center">
        <p className="fpf-text-secondary">
          Verificando acceso...
        </p>
      </main>
    );
  }

  return (
    <main className="fpf-page min-h-screen p-6 md:p-10">
      {/* ENCABEZADO */}
      <header className="mb-10">
        <p className="fpf-text-secondary">
          Focus Power Fit
        </p>

        <h1 className="mt-2 text-4xl font-black md:text-5xl">
          Panel{" "}
          <span className="fpf-title-accent">
            Administrativo
          </span>
        </h1>

        <p className="fpf-text-secondary mt-3 max-w-2xl">
          Gestiona los principales módulos de Focus Power Fit.
        </p>
      </header>

      {/* MÓDULOS */}
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Tarjeta
          titulo="Clientes"
          descripcion="Registra, consulta y administra los clientes."
          href="/admin/clientes"
        />

        <Tarjeta
          titulo="Profesores"
          descripcion="Gestiona la información de los profesores."
          href="/profesores"
        />

        <Tarjeta
          titulo="Sucursales"
          descripcion="Gestiona las sucursales de Focus Power Fit."
          href="/sucursales"
        />

        <Tarjeta
          titulo="Planes"
          descripcion="Consulta y administra los planes disponibles."
          href="/admin/planes"
        />

        <Tarjeta
          titulo="Sesiones"
          descripcion="Gestiona las sesiones y horarios de entrenamiento."
          href="/admin/sesiones"
        />

        <Tarjeta
          titulo="Contratos"
          descripcion="Administra los contratos asociados a los clientes."
          href="/admin/contratos"
        />

        <Tarjeta
          titulo="Asistencia"
          descripcion="Consulta y administra el registro de asistencias."
          href="/admin/asistencia"
        />
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
    <Link
      href={href}
      className="
        fpf-card
        fpf-border-hover
        group
        block
        min-h-45
        p-6
        transition
        duration-200
      "
    >
      <div className="flex h-full flex-col justify-between">
        <div>
          <h2 className="text-2xl font-bold transition">
            {titulo}
          </h2>

          <p className="fpf-text-secondary mt-3 leading-relaxed">
            {descripcion}
          </p>
        </div>

        <div className="mt-6 font-bold fpf-title-accent">
          Ir al módulo →
        </div>
      </div>
    </Link>
  );
}