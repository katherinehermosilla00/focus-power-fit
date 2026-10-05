"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";

type Profesor = {
  id: number;
  nombre: string;
  especialidad: string | null;
};

const PROFESORES_DEMO: Profesor[] = [
  { id: -1, nombre: "Camila Torres", especialidad: "Entrenamiento funcional" },
  { id: -2, nombre: "Diego Fuentes", especialidad: "Preparación física" },
  { id: -3, nombre: "Valentina Rojas", especialidad: "Fuerza y acondicionamiento" },
  { id: -4, nombre: "Matías Herrera", especialidad: "Musculación" },
  { id: -5, nombre: "Antonia Silva", especialidad: "Movilidad y flexibilidad" },
  { id: -6, nombre: "Joaquín Morales", especialidad: "Entrenamiento funcional" },
  { id: -7, nombre: "Fernanda Castro", especialidad: "Acondicionamiento físico" },
  { id: -8, nombre: "Benjamín Soto", especialidad: "Fuerza y potencia" },
  { id: -9, nombre: "Isidora Vega", especialidad: "Entrenamiento personalizado" },
  { id: -10, nombre: "Tomás Contreras", especialidad: "Musculación" },
  { id: -11, nombre: "Josefina Reyes", especialidad: "Preparación física" },
  { id: -12, nombre: "Vicente Navarro", especialidad: "Entrenamiento funcional" },
  { id: -13, nombre: "Emilia González", especialidad: "Movilidad y flexibilidad" },
  { id: -14, nombre: "Agustín Paredes", especialidad: "Fuerza y acondicionamiento" },
  { id: -15, nombre: "Catalina Muñoz", especialidad: "Acondicionamiento físico" },
  { id: -16, nombre: "Lucas Araya", especialidad: "Entrenamiento personalizado" },
  { id: -17, nombre: "Florencia Vidal", especialidad: "Musculación" },
  { id: -18, nombre: "Gabriel Campos", especialidad: "Fuerza y potencia" },
  { id: -19, nombre: "Trinidad Espinoza", especialidad: "Entrenamiento funcional" },
  { id: -20, nombre: "Maximiliano León", especialidad: "Preparación física" },
];

const INICIALES_COLORES = [
  "from-red-600 to-rose-900",
  "from-orange-600 to-red-900",
  "from-rose-600 to-purple-900",
  "from-zinc-500 to-zinc-800",
];

export default function ProfesoresPage() {
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [usandoEjemplos, setUsandoEjemplos] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargarProfesores = useCallback(async () => {
    setCargando(true);
    setError("");
    setUsandoEjemplos(false);

    try {
      const respuesta = await axios.get<Profesor[]>(
        "http://localhost:3001/api/profesores/publicos"
      );

      if (respuesta.data.length === 0) {
        setProfesores(PROFESORES_DEMO);
        setUsandoEjemplos(true);
      } else {
        setProfesores(respuesta.data);
      }
    } catch (errorCarga) {
      console.error("Error al cargar profesores:", errorCarga);
      setError("No pudimos cargar la información del equipo. Intenta nuevamente.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(cargarProfesores);
  }, [cargarProfesores]);

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
            El equipo que te impulsa
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight sm:text-5xl md:text-6xl">
            Nuestros <span className="text-red-500">profesores</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-300">
            Detrás de cada avance hay un equipo preparado para acompañarte.
            Conoce a nuestros profesores, sus especialidades y encuentra la
            motivación para llevar tu entrenamiento al siguiente nivel.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-gray-400">
            <span className="rounded-full border border-red-500/30 bg-red-950/30 px-4 py-2 text-red-200">
              {profesores.length} {profesores.length === 1 ? "profesor" : "profesores"}
            </span>
            <span>Experiencia, energía y orientación en cada entrenamiento.</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-20">
        <div className="mb-9">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-500">
            Conoce a nuestros especialistas
          </p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">
            Personas reales. Apoyo en cada meta.
          </h2>
        </div>

        {usandoEjemplos && (
          <div className="mb-6 rounded-xl border border-amber-700/40 bg-amber-950/25 px-4 py-3 text-sm text-amber-200">
            La base de datos aún no tiene profesores activos. Estos 20 perfiles
            ficticios son solo una vista previa del diseño.
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-2xl border border-red-900 bg-red-950/30 p-6 text-red-200">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void cargarProfesores()}
              className="mt-3 font-bold underline underline-offset-4"
            >
              Reintentar
            </button>
          </div>
        )}

        {cargando ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, indice) => (
              <div key={indice} className="h-64 animate-pulse rounded-2xl border border-white/10 bg-zinc-900/70" />
            ))}
          </div>
        ) : !error ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {profesores.map((profesor, indice) => {
              const iniciales = profesor.nombre
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((parte) => parte.charAt(0).toLocaleUpperCase("es-CL"))
                .join("");

              return (
                <article
                  key={profesor.id}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-6 transition duration-200 hover:-translate-y-1 hover:border-red-500/50"
                >
                  <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full border border-white/5 transition group-hover:scale-110" />
                  <div className="relative">
                    <div className={`flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${INICIALES_COLORES[indice % INICIALES_COLORES.length]} text-2xl font-black shadow-lg`}>
                      {iniciales}
                    </div>
                    <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-red-400">
                      Profesor {String(indice + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-2 text-xl font-black">{profesor.nombre}</h3>
                    <div className="mt-4 border-t border-white/10 pt-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                        Especialidad
                      </p>
                      <p className="mt-2 min-h-12 leading-6 text-gray-300">
                        {profesor.especialidad || "Entrenamiento personalizado"}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}

        {!cargando && !error && (
          <div className="mt-12 rounded-2xl border border-white/10 bg-gradient-to-r from-zinc-900 to-zinc-950 p-7 sm:flex sm:items-center sm:justify-between sm:p-9">
            <div>
              <p className="text-xl font-black">¿Listo para comenzar?</p>
              <p className="mt-2 text-gray-400">Nuestro equipo está preparado para acompañarte.</p>
            </div>
            <Link
              href="/registro"
              className="mt-5 inline-flex rounded-xl bg-red-600 px-6 py-3 font-bold transition hover:bg-red-500 sm:mt-0"
            >
              Entrena con nosotros
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
