"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";

type Sucursal = {
  id: number;
  nombre: string;
  direccion: string;
  comuna: string;
  ciudad: string;
  horarioAtencion: string;
  telefono: string | null;
};

const SUCURSALES_DEMO: Sucursal[] = [
  {
    id: -1,
    nombre: "Focus Power Fit Centro",
    direccion: "Av. Libertador 1450",
    comuna: "Santiago Centro",
    ciudad: "Santiago",
    horarioAtencion: "Lun–Vie 06:00–22:00 · Sáb 08:00–14:00",
    telefono: "+56 2 2345 6789",
  },
  {
    id: -2,
    nombre: "Focus Power Fit Providencia",
    direccion: "Av. Nueva Providencia 820",
    comuna: "Providencia",
    ciudad: "Santiago",
    horarioAtencion: "Lun–Vie 06:30–22:00 · Sáb 08:00–14:00",
    telefono: "+56 2 2987 6543",
  },
];

export default function SucursalesPage() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [usandoEjemplos, setUsandoEjemplos] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargarSucursales = useCallback(async () => {
    setCargando(true);
    setError("");
    setUsandoEjemplos(false);

    try {
      const respuesta = await axios.get<Sucursal[]>(
        "http://localhost:3001/api/sucursales"
      );

      if (respuesta.data.length === 0) {
        setSucursales(SUCURSALES_DEMO);
        setUsandoEjemplos(true);
      } else {
        setSucursales(respuesta.data);
      }
    } catch (errorCarga) {
      console.error("Error al cargar sucursales:", errorCarga);
      setError("No pudimos cargar las sucursales. Intenta nuevamente.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(cargarSucursales);
  }, [cargarSucursales]);

  return (
    <main className="min-h-screen overflow-hidden bg-[#080808] text-white">
      <nav className="border-b border-white/10 bg-black/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <Link href="/" className="flex items-center gap-3 font-black tracking-wide">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-sm">
              FP
            </span>
            <span>FOCUS <span className="text-red-500">POWER FIT</span></span>
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-gray-300 transition hover:border-red-500/60 hover:text-white"
          >
            ← Volver al inicio
          </Link>
        </div>
      </nav>

      <section className="relative isolate border-b border-white/5">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_75%_35%,rgba(153,27,27,0.24),transparent_48%),linear-gradient(115deg,#080808_35%,#160909_100%)]" />
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-red-400">
            Encuentra tu espacio
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight sm:text-5xl md:text-6xl">
            Nuestras <span className="text-red-500">sucursales</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-300">
            Cada objetivo merece un buen lugar para empezar. Conoce nuestros
            espacios, revisa sus horarios y encuentra la sucursal que mejor
            acompaña tu rutina.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-gray-400">
            <span className="rounded-full border border-red-500/30 bg-red-950/30 px-4 py-2 text-red-200">
              {sucursales.length} {sucursales.length === 1 ? "sucursal" : "sucursales"}
            </span>
            <span>Entrena cerca. Avanza cada día.</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-20">
        <div className="mb-9 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-500">
              Estamos cerca de ti
            </p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">
              Elige dónde comienza tu próximo reto
            </h2>
          </div>
          {!usandoEjemplos && !cargando && (
            <p className="text-sm text-gray-500">Información actualizada desde nuestras sucursales</p>
          )}
        </div>

        {usandoEjemplos && (
          <div className="mb-6 rounded-xl border border-amber-700/40 bg-amber-950/25 px-4 py-3 text-sm text-amber-200">
            La base de datos aún no tiene sucursales. Estas dos ubicaciones ficticias
            son solo una vista previa del diseño.
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-2xl border border-red-900 bg-red-950/30 p-6 text-red-200">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void cargarSucursales()}
              className="mt-3 font-bold underline underline-offset-4"
            >
              Reintentar
            </button>
          </div>
        )}

        {cargando ? (
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2].map((item) => (
              <div key={item} className="h-72 animate-pulse rounded-2xl border border-white/10 bg-zinc-900/70" />
            ))}
          </div>
        ) : !error ? (
          <div className="grid gap-6 md:grid-cols-2">
            {sucursales.map((sucursal, indice) => (
              <article
                key={sucursal.id}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-6 transition duration-200 hover:-translate-y-1 hover:border-red-500/50 sm:p-8"
              >
                <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full border border-red-500/10 transition group-hover:scale-110" />
                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-500/30 bg-red-950/50 text-red-400">
                      <IconoUbicacion />
                    </div>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold tracking-wider text-gray-500">
                      SEDE {String(indice + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <h3 className="mt-7 text-2xl font-black">{sucursal.nombre}</h3>
                  <p className="mt-2 font-medium text-red-300">
                    {sucursal.comuna}, {sucursal.ciudad}
                  </p>

                  <div className="mt-7 space-y-4 border-t border-white/10 pt-5">
                    <Detalle icono={<IconoUbicacion />} titulo="Dirección">
                      {sucursal.direccion}
                    </Detalle>
                    <Detalle icono={<IconoReloj />} titulo="Horario de atención">
                      {sucursal.horarioAtencion}
                    </Detalle>
                    {sucursal.telefono && (
                      <Detalle icono={<IconoTelefono />} titulo="Teléfono">
                        {sucursal.telefono}
                      </Detalle>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {!cargando && !error && (
          <div className="mt-12 rounded-2xl border border-white/10 bg-gradient-to-r from-zinc-900 to-zinc-950 p-7 sm:flex sm:items-center sm:justify-between sm:p-9">
            <div>
              <p className="text-xl font-black">¿Listo para dar el primer paso?</p>
              <p className="mt-2 text-gray-400">Te esperamos para entrenar con propósito.</p>
            </div>
            <Link
              href="/registro"
              className="mt-5 inline-flex rounded-xl bg-red-600 px-6 py-3 font-bold transition hover:bg-red-500 sm:mt-0"
            >
              Únete a Focus Power Fit
            </Link>
          </div>
        )}
      </section>

      <footer className="border-t border-white/10 bg-black/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between md:px-8">
          <p>© {new Date().getFullYear()} Focus Power Fit</p>
          <Link href="/" className="transition hover:text-white">Volver al inicio</Link>
        </div>
      </footer>
    </main>
  );
}

function Detalle({
  icono,
  titulo,
  children,
}: {
  icono: React.ReactNode;
  titulo: string;
  children: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 shrink-0 text-red-400">{icono}</span>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">{titulo}</p>
        <p className="mt-1 text-sm leading-6 text-gray-200">{children}</p>
      </div>
    </div>
  );
}

function IconoUbicacion() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10c0 5.25-7.5 11-7.5 11S4.5 15.25 4.5 10a7.5 7.5 0 1 1 15 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function IconoReloj() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
    </svg>
  );
}

function IconoTelefono() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 4h4l2 5-2.5 1.5a15 15 0 0 0 5 5L15 13l5 2v4c0 1.1-.9 2-2 2C10 21 3 14 3 6c0-1.1.9-2 2-2Z" />
    </svg>
  );
}
