"use client";

import Link from "next/link";
import { useAuth } from "./auth/AuthContext";

export default function Home() {
  const { usuario, cargando } = useAuth();
  const destinoCuenta = usuario?.rol === "admin" ? "/admin" : "/mi-cuenta";

  return (
    <main className="min-h-screen overflow-hidden bg-[#080808] text-white">
      <nav className="sticky top-0 z-20 border-b border-white/10 bg-black/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 md:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="Focus Power Fit, inicio">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600 text-sm font-black tracking-tight shadow-lg shadow-red-950/60">
              FP
            </span>
            <span className="text-lg font-black tracking-wide">
              FOCUS <span className="text-red-500">POWER FIT</span>
            </span>
          </Link>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-gray-300">
            <Link href="/" className="transition hover:text-white">Inicio</Link>
            <Link href="/sucursales" className="transition hover:text-white">Sucursales</Link>
            <Link href="/profesores" className="transition hover:text-white">Profesores</Link>
            {!cargando && usuario ? (
              <Link
                href={destinoCuenta}
                className="rounded-full border border-red-500/50 bg-red-600/10 px-4 py-2 font-bold text-white transition hover:border-red-500 hover:bg-red-600"
              >
                {usuario.rol === "admin" ? "Administración" : "Mi Cuenta"}
              </Link>
            ) : !cargando ? (
              <>
                <Link href="/login" className="transition hover:text-white">Iniciar sesión</Link>
                <Link
                  href="/registro"
                  className="rounded-full bg-red-600 px-4 py-2 font-bold text-white transition hover:bg-red-500"
                >
                  Registro
                </Link>
              </>
            ) : (
              <span aria-hidden="true" className="h-9 w-28 rounded-full bg-white/5" />
            )}
          </div>
        </div>
      </nav>

      <section className="relative isolate">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_75%_45%,rgba(153,27,27,0.26),transparent_46%),linear-gradient(115deg,#080808_35%,#160909_100%)]" />
        <div className="absolute -right-28 top-16 -z-10 h-80 w-80 rounded-full border border-red-500/10 md:right-12 md:top-12 md:h-[30rem] md:w-[30rem]" />
        <div className="mx-auto grid min-h-[620px] max-w-7xl items-center gap-12 px-5 py-20 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:py-24">
          <div className="max-w-2xl">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-950/30 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-red-300">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Tu mejor versión empieza aquí
            </p>
            <h1 className="text-5xl font-black leading-[1.04] tracking-tight sm:text-6xl md:text-7xl">
              Entrena fuerte.
              <span className="mt-2 block text-red-500">Vive mejor.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-gray-300">
              Un espacio para superar tus límites, con profesores especializados,
              planes para tus objetivos y el acompañamiento que necesitas para avanzar.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              {!cargando && usuario ? (
                <Link
                  href={destinoCuenta}
                  className="rounded-xl bg-red-600 px-7 py-4 font-bold shadow-lg shadow-red-950/50 transition hover:-translate-y-0.5 hover:bg-red-500"
                >
                  {usuario.rol === "admin" ? "Ir a Administración" : "Ir a Mi Cuenta"}
                </Link>
              ) : (
                <>
                  <Link
                    href="/registro"
                    className="rounded-xl bg-red-600 px-7 py-4 font-bold shadow-lg shadow-red-950/50 transition hover:-translate-y-0.5 hover:bg-red-500"
                  >
                    Comienza hoy
                  </Link>
                  <Link
                    href="/login"
                    className="rounded-xl border border-white/20 px-7 py-4 font-bold transition hover:border-white/50 hover:bg-white/5"
                  >
                    Iniciar sesión
                  </Link>
                </>
              )}
            </div>
            <div className="mt-12 flex flex-wrap gap-x-10 gap-y-5 border-t border-white/10 pt-7">
              <Dato valor="3" etiqueta="sucursales" />
              <Dato valor="100%" etiqueta="enfoque en ti" />
              <Dato valor="1:1" etiqueta="acompañamiento" />
            </div>
          </div>

          <div className="relative mx-auto flex h-[360px] w-full max-w-lg items-center justify-center md:h-[470px]">
            <div className="absolute h-[84%] w-[84%] rotate-6 rounded-[3rem] border border-red-500/20 bg-gradient-to-br from-red-950/70 via-zinc-950 to-black shadow-2xl shadow-red-950/30" />
            <div className="absolute h-[72%] w-[72%] -rotate-6 rounded-[2.5rem] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.01))] backdrop-blur-sm" />
            <div className="relative px-8 text-center">
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-red-600 text-3xl font-black shadow-xl shadow-red-950/60 md:h-28 md:w-28 md:text-4xl">
                FP
              </div>
              <p className="text-sm font-bold uppercase tracking-[0.35em] text-red-400">
                Focus Power Fit
              </p>
              <p className="mt-4 text-3xl font-black leading-tight md:text-4xl">
                Fuerza para<br />llegar más lejos.
              </p>
              <div className="mx-auto mt-7 h-1 w-20 rounded-full bg-red-500" />
            </div>
            <span className="absolute right-2 top-10 rounded-2xl border border-white/10 bg-zinc-950/90 px-4 py-3 text-sm font-bold text-gray-200 shadow-xl md:-right-4">
              DISCIPLINA <span className="text-red-500">·</span> CONSTANCIA
            </span>
            <span className="absolute bottom-8 left-0 rounded-2xl border border-white/10 bg-zinc-950/90 px-4 py-3 text-sm font-bold text-gray-200 shadow-xl md:-left-5">
              SUPERA TUS LÍMITES
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 md:px-8 md:pb-28">
        <div className="mb-10 max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-red-500">Entrena a tu manera</p>
          <h2 className="mt-3 text-3xl font-black sm:text-4xl">Todo lo que necesitas para avanzar</h2>
          <p className="mt-4 leading-7 text-gray-400">
            Encuentra el espacio, la guía y la rutina que te acerquen a tus objetivos.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <Tarjeta
            numero="01"
            titulo="Profesores especializados"
            descripcion="Recibe orientación profesional y entrena con confianza en cada etapa."
            href="/profesores"
            accion="Conoce al equipo"
          />
          <Tarjeta
            numero="02"
            titulo="Tres sucursales"
            descripcion="Elige el lugar que mejor se adapta a tu rutina y sigue en movimiento."
            href="/sucursales"
            accion="Encuentra tu sucursal"
          />
          <Tarjeta
            numero="03"
            titulo="Un plan para ti"
            descripcion="Da el primer paso y descubre una experiencia de entrenamiento hecha para ti."
            href={!cargando && usuario ? destinoCuenta : "/registro"}
            accion={!cargando && usuario ? "Ir a mi espacio" : "Únete a nosotros"}
          />
        </div>
      </section>

      <footer className="border-t border-white/10 bg-black/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between md:px-8">
          <p>© {new Date().getFullYear()} Focus Power Fit</p>
          <p>Entrena con propósito. Avanza con confianza.</p>
        </div>
      </footer>
    </main>
  );
}

function Dato({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <div>
      <p className="text-2xl font-black text-white">{valor}</p>
      <p className="mt-1 text-xs uppercase tracking-wider text-gray-500">{etiqueta}</p>
    </div>
  );
}

function Tarjeta({
  numero,
  titulo,
  descripcion,
  href,
  accion,
}: {
  numero: string;
  titulo: string;
  descripcion: string;
  href: string;
  accion: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-950 p-7 transition duration-200 hover:-translate-y-1 hover:border-red-500/50"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-black tracking-widest text-red-500">{numero}</span>
        <span className="text-xl text-gray-500 transition group-hover:translate-x-1 group-hover:text-red-400" aria-hidden="true">→</span>
      </div>
      <h3 className="mt-8 text-xl font-bold">{titulo}</h3>
      <p className="mt-3 min-h-14 leading-6 text-gray-400">{descripcion}</p>
      <p className="mt-6 text-sm font-bold text-red-400">{accion}</p>
    </Link>
  );
}
