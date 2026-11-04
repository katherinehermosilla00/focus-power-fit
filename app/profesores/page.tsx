"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";
import axios from "axios";

const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/+$/, "");

type ImagenPublica = {
  id: number;
  categoria: string;
  referenciaId: number | null;
  mostrarPublicamente: boolean;
  orden: number;
};

type ProfesorAPI = {
  id: number;
  nombre: string;
  especialidad: string | null;
  instagram: string | null;
  turno: "AM" | "PM" | "AM y PM" | null;
  sucursalId: number | null;
  sucursal?: {
    id: number;
    nombre: string;
  } | null;
};

type Profesor = {
  id: number;
  nombre: string;
  rol: string;
  instagram?: string;
  turno?: string;
  fotoUrl?: string;
};

const normalizar = (texto: string) =>
  texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

function obtenerIniciales(nombre: string) {

  return nombre

    .trim()

    .split(/\s+/)

    .slice(0, 2)

    .map((parte) => parte.charAt(0).toUpperCase())

    .join("");

}

function IconoInstagram() {

  return (

    <svg

      width="18"

      height="18"

      viewBox="0 0 24 24"

      fill="none"

      stroke="currentColor"

      strokeWidth="1.8"

      strokeLinecap="round"

      strokeLinejoin="round"

      aria-hidden="true"

    >

      <rect x="2" y="2" width="20" height="20" rx="5" />

      <circle cx="12" cy="12" r="4" />

      <circle

        cx="17.5"

        cy="6.5"

        r="1"

        fill="currentColor"

        stroke="none"

      />

    </svg>

  );

}

function IconoUbicacion() {

  return (

    <svg

      width="20"

      height="20"

      viewBox="0 0 24 24"

      fill="none"

      stroke="currentColor"

      strokeWidth="1.8"

      strokeLinecap="round"

      strokeLinejoin="round"

      aria-hidden="true"

    >

      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />

      <circle cx="12" cy="10" r="2.5" />

    </svg>

  );

}

function TarjetaProfesor({

  nombre,

  rol,

  instagram,
  turno,
  fotoUrl,

}: Profesor) {

  const [seleccionado, setSeleccionado] = useState(false);

  return (

    <article

      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 sm:p-7"

      style={{

        backgroundColor: seleccionado

          ? "var(--color-card-selected)"

          : "var(--color-surface)",

        borderColor: seleccionado

          ? "var(--color-primary)"

          : "var(--color-border)",

        boxShadow: seleccionado

          ? "var(--shadow-card-selected)"

          : "var(--shadow-card-default)",

      }}

    >

      {/* BOTÓN INTERACTIVO SOBRE LA TARJETA */}

      <button

        type="button"

        onClick={() => setSeleccionado((actual) => !actual)}

        aria-pressed={seleccionado}

        aria-label={

          seleccionado

            ? `Restaurar color de la tarjeta de ${nombre}`

            : `Cambiar color de la tarjeta de ${nombre}`

        }

        className="absolute inset-0 z-0 cursor-pointer rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-(--color-primary)"

      />

      {/* LÍNEA SUPERIOR */}

      <div

        className="pointer-events-none absolute inset-x-0 top-0 h-1"

        style={{

          background: seleccionado

            ? "var(--color-primary)"

            : "var(--gradient-card-accent)",

        }}

      />

      {/* AVATAR */}

      <div

        className="pointer-events-none relative z-1 mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border text-2xl font-black tracking-wide transition-all duration-300 group-hover:scale-105"

        style={{

          backgroundColor: seleccionado

            ? "var(--color-primary)"

            : "var(--color-surface-secondary)",

          borderColor: "var(--color-primary)",

          color: "var(--foreground)",

          boxShadow: seleccionado

            ? "var(--shadow-avatar-selected)"

            : "var(--shadow-avatar-default)",

        }}

        aria-hidden="true"

      >

        {fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fotoUrl}
            alt={`Fotografía de ${nombre}`}
            className="h-full w-full rounded-2xl object-cover"
            onError={(evento) => {
              // Si el archivo no carga, recuperar las iniciales sin romper la tarjeta.
              const elemento = evento.currentTarget;
              elemento.style.display = "none";
              elemento.parentElement?.querySelector("[data-iniciales]")?.removeAttribute("hidden");
            }}
          />
        ) : null}
        <span data-iniciales hidden={Boolean(fotoUrl)}>{obtenerIniciales(nombre)}</span>

      </div>

      {/* NOMBRE */}

      <h3

        className="pointer-events-none relative z-1 text-xl font-black leading-tight tracking-tight"

        style={{

          color: "var(--foreground)",

        }}

      >

        {nombre}

      </h3>

      {/* CARGO */}

      <p

        className="pointer-events-none relative z-1 mt-3 text-sm leading-6"

        style={{

          color: seleccionado

            ? "var(--color-card-selected-text)"

            : "var(--color-text-secondary)",

        }}

      >

        {rol}

      </p>

      {/* TURNO */}
      {turno && (
        <p
          className="pointer-events-none relative z-1 mt-3 text-xs font-bold uppercase tracking-wider"
          style={{ color: "var(--color-primary)" }}
        >
          Turno: {turno}
        </p>
      )}

      {/* INSTAGRAM */}

      {instagram && (

        <div className="relative z-2 mt-auto pt-6">

          <a

            href={`https://www.instagram.com/${instagram.replace(

              "@",

              ""

            )}/`}

            target="_blank"

            rel="noopener noreferrer"

            aria-label={`Instagram de ${nombre}`}

            className="inline-flex max-w-full items-center gap-2 break-all rounded-lg border px-3 py-2 text-xs font-semibold transition-all hover:brightness-125"

            style={{

              backgroundColor: seleccionado

                ? "var(--color-card-selected-secondary)"

                : "var(--color-surface-secondary)",

              borderColor: seleccionado

                ? "var(--color-primary)"

                : "var(--color-border)",

              color: "var(--foreground)",

            }}

          >

            <span

              className="shrink-0"

              style={{

                color: seleccionado

                  ? "var(--foreground)"

                  : "var(--color-primary)",

              }}

            >

              <IconoInstagram />

            </span>

            {instagram}

          </a>

        </div>

      )}


    </article>

  );

}

function SeccionProfesores({

  id,

  titulo,

  profesores,

}: {

  id: string;

  titulo: string;

  profesores: Profesor[];

}) {

  return (

    <section id={id} className="scroll-mt-28">

      {/* TÍTULO DE SUCURSAL */}

      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">

        <div className="flex items-center gap-3">

          <span

            className="flex h-11 w-11 items-center justify-center rounded-xl"

            style={{

              backgroundColor:

                "var(--color-surface-secondary)",

              color: "var(--color-primary)",

            }}

          >

            <IconoUbicacion />

          </span>

          <div>

            <p

              className="text-xs font-bold uppercase tracking-[0.2em]"

              style={{

                color: "var(--color-text-secondary)",

              }}

            >

              Equipo de profesionales

            </p>

            <h2

              className="text-2xl font-black uppercase tracking-tight sm:text-3xl"

              style={{

                color: "var(--foreground)",

              }}

            >

              {titulo}

            </h2>

          </div>

        </div>

        <span

          className="rounded-full border px-4 py-2 text-xs font-bold"

          style={{

            backgroundColor: "var(--color-surface)",

            borderColor: "var(--color-border)",

            color: "var(--color-text-secondary)",

          }}

        >

          {profesores.length} profesionales

        </span>

      </div>

      {profesores.length === 0 && (
        <p className="rounded-xl border p-6 text-sm" style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
          No hay profesores disponibles en esta sucursal por el momento.
        </p>
      )}

      {/* GRID DE TARJETAS */}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">

        {profesores.map((profesor) => (

          <TarjetaProfesor

            key={profesor.id}

            {...profesor}

          />

        ))}

      </div>

    </section>

  );

}

export default function Profesores() {
  const [profesoresAPI, setProfesoresAPI] = useState<ProfesorAPI[]>([]);
  const [fotosPorProfesor, setFotosPorProfesor] = useState<Record<number, string>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargarProfesores = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const respuesta = await axios.get<ProfesorAPI[]>(
        `${API}/api/profesores/publicos`
      );

      if (!Array.isArray(respuesta.data)) {
        throw new Error("Respuesta de profesores inválida");
      }

      setProfesoresAPI(respuesta.data);

      // Las imágenes se consultan por separado; un fallo no oculta a los profesores.
      try {
        const respuestaImagenes = await axios.get<ImagenPublica[] | { imagenes: ImagenPublica[] }>(
          `${API}/api/imagenes/publicas`
        );
        const datos = respuestaImagenes.data;
        const imagenes = Array.isArray(datos) ? datos : datos.imagenes;
        const fotos: Record<number, string> = {};
        if (Array.isArray(imagenes)) {
          for (const imagen of [...imagenes].sort((a, b) => a.orden - b.orden)) {
            if (
              imagen.categoria === "profesor" &&
              imagen.mostrarPublicamente === true &&
              imagen.referenciaId != null &&
              !fotos[imagen.referenciaId]
            ) {
              fotos[imagen.referenciaId] = `${API}/api/imagenes/${imagen.id}/archivo`;
            }
          }
        }
        setFotosPorProfesor(fotos);
      } catch (errorImagenes) {
        console.warn("No se pudieron cargar las fotografías públicas:", errorImagenes);
        setFotosPorProfesor({});
      }
    } catch (errorCarga) {
      console.error("Error al cargar profesores:", errorCarga);
      setProfesoresAPI([]);
       setError("No pudimos cargar los profesores. Intenta nuevamente.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(cargarProfesores);
  }, [cargarProfesores]);
     // La API pública ya filtra por estado Activo. No se mezclan listas fijas.
   const profesoresConvertidos: Profesor[] = profesoresAPI.map((profesor) => ({
     id: profesor.id,
     nombre: profesor.nombre,
     rol: profesor.especialidad || "Personal Trainer",
     instagram: profesor.instagram || undefined,
     turno: profesor.turno || undefined,
     fotoUrl: fotosPorProfesor[profesor.id],
   }));

   const profesoresDeSucursal = (nombre: string): Profesor[] =>
     profesoresAPI
       .filter((profesor) => normalizar(profesor.sucursal?.nombre || "") === normalizar(nombre))
       .map((profesor) =>
         profesoresConvertidos.find((item) => item.id === profesor.id)!
       );

   const profesoresLaReinaMostrados = profesoresDeSucursal("La Reina");
   const profesoresPenalolenMostrados = profesoresDeSucursal("Peñalolén");

  return (

    <main

      className="min-h-screen"

      style={{

        backgroundColor: "var(--background)",

        color: "var(--foreground)",

      }}

    >
      {(cargando || error) && (
        <div
          className="mx-auto mt-6 flex max-w-6xl flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
          role={error ? "alert" : "status"}
        >
          <p className="text-sm">
            {cargando ? "Cargando información actualizada de profesores..." : error}
          </p>

          {error && !cargando && (
            <button
              type="button"
              onClick={() => void cargarProfesores()}
              className="rounded-lg border px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-80"
            >
              Reintentar
            </button>
          )}
        </div>
      )}


      {/* ======================================

          NAVBAR

          ====================================== */}

      <nav

        aria-label="Navegación principal"

        className="relative z-10 flex flex-wrap items-center justify-between gap-6 border-b px-5 py-4 md:px-10 lg:px-12"

        style={{

          backgroundColor: "var(--background)",

          borderColor: "var(--color-border)",

        }}

      >

        <Link

          href="/"

          className="flex items-center gap-3 no-underline"

        >

          <span

            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl font-black"

            style={{

              backgroundColor: "var(--color-primary)",

              color: "var(--foreground)",

              boxShadow: "var(--shadow-logo)",

            }}

          >

            F

          </span>

          <span

            className="text-xl font-extrabold tracking-tight"

            style={{

              color: "var(--foreground)",

            }}

          >

            Focus Power Fit

          </span>

        </Link>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">

          <Link

            href="/"

            className="py-2 text-sm font-semibold transition-opacity hover:opacity-75"

            style={{

              color: "var(--color-text-secondary)",

            }}

          >

            Inicio

          </Link>

          <Link

            href="/#planes"

            className="py-2 text-sm font-semibold transition-opacity hover:opacity-75"

            style={{

              color: "var(--color-text-secondary)",

            }}

          >

            Planes

          </Link>

          <Link

            href="/sucursales"

            className="py-2 text-sm font-semibold transition-opacity hover:opacity-75"

            style={{

              color: "var(--color-text-secondary)",

            }}

          >

            Sucursales

          </Link>

          <Link

            href="/profesores"

            aria-current="page"

            className="border-b-2 py-2 text-sm font-bold"

            style={{

              color: "var(--color-primary)",

              borderColor: "var(--color-primary)",

            }}

          >

            Profesores

          </Link>

          <Link

            href="/registro"

            className="py-2 text-sm font-semibold transition-opacity hover:opacity-75"

            style={{

              color: "var(--color-text-secondary)",

            }}

          >

            Registro

          </Link>

          <Link

            href="/login"

            className="inline-flex min-h-11 items-center justify-center rounded-xl px-5 py-3 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110"

            style={{

              backgroundColor: "var(--color-primary)",

              color: "var(--foreground)",

            }}

          >

            Iniciar sesión

          </Link>

        </div>

      </nav>

      {/* ======================================

          CONTENIDO PRINCIPAL

          ====================================== */}

      <div className="w-full px-5 pb-20 pt-10 md:px-10 lg:px-14 xl:px-16">

        {/* ENCABEZADO */}

        <header className="mb-10 text-center">

          <p

            className="mb-3 text-xs font-bold uppercase tracking-[0.3em]"

            style={{

              color: "var(--color-primary)",

            }}

          >

            FOCUS POWER FIT · EQUIPO PROFESIONAL

          </p>

          <h1 className="text-4xl font-black uppercase tracking-tight sm:text-5xl md:text-6xl">

            NUESTROS{" "}

            <span style={{ color: "var(--color-primary)" }}>

              PROFESORES

            </span>

          </h1>

          <div

            className="mx-auto mt-4 h-1 w-20 rounded-full"

            style={{

              backgroundColor: "var(--color-primary)",

            }}

          />

          <p

            className="mx-auto mt-5 max-w-2xl text-sm leading-7 md:text-base"

            style={{

              color: "var(--color-text-secondary)",

            }}

          >

            Conoce a los profesionales que forman parte de

            Focus Power Fit. Nuestro equipo te acompaña

            en cada etapa de tu entrenamiento.

          </p>

          {/* BOTONES DE SUCURSALES */}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">

            <a

              href="#la-reina"

              className="inline-flex min-h-11 items-center justify-center rounded-xl px-5 py-3 text-sm font-bold transition-all hover:-translate-y-0.5 hover:brightness-110"

              style={{

                backgroundColor: "var(--color-primary)",

                color: "var(--foreground)",

              }}

            >

              Equipo La Reina

            </a>

            <a

              href="#penalolen"

              className="inline-flex min-h-11 items-center justify-center rounded-xl border px-5 py-3 text-sm font-bold transition-all hover:-translate-y-0.5 hover:brightness-125"

              style={{

                backgroundColor: "var(--color-surface)",

                borderColor: "var(--color-border)",

                color: "var(--foreground)",

              }}

            >

              Equipo Peñalolén

            </a>

          </div>

        </header>

        {/* LA REINA */}

        <SeccionProfesores

          id="la-reina"

          titulo="La Reina"

          profesores={profesoresLaReinaMostrados}

        />

        {/* SEPARADOR */}

        <div

          className="my-14 h-px w-full"

          style={{

            backgroundColor: "var(--color-border)",

          }}

        />

        {/* PEÑALOLÉN */}

        <SeccionProfesores

          id="penalolen"

          titulo="Peñalolén"

          profesores={profesoresPenalolenMostrados}

        />

        {/* LLAMADO A LA ACCIÓN */}

        <div

          className="mt-16 rounded-2xl border px-6 py-10 text-center md:px-10"

          style={{

            backgroundColor: "var(--color-surface)",

            borderColor: "var(--color-border)",

          }}

        >

          <p

            className="mb-3 text-xs font-bold uppercase tracking-[0.25em]"

            style={{

              color: "var(--color-primary)",

            }}

          >

            COMIENZA TU ENTRENAMIENTO

          </p>

          <h2 className="text-2xl font-black uppercase sm:text-3xl">

            TU PRÓXIMO OBJETIVO COMIENZA AQUÍ

          </h2>

          <p

            className="mx-auto mt-3 max-w-xl text-sm leading-7"

            style={{

              color: "var(--color-text-secondary)",

            }}

          >

            Conoce nuestros planes de entrenamiento

            y encuentra la sucursal que más te acomode.

          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">

            <Link

              href="/#planes"

              className="inline-flex min-h-12 items-center justify-center rounded-xl px-6 py-3 text-sm font-bold transition-all hover:-translate-y-0.5 hover:brightness-110"

              style={{

                backgroundColor: "var(--color-primary)",

                color: "var(--foreground)",

              }}

            >

              Ver planes

            </Link>

            <Link

              href="/sucursales"

              className="inline-flex min-h-12 items-center justify-center rounded-xl border px-6 py-3 text-sm font-bold transition-all hover:-translate-y-0.5 hover:brightness-125"

              style={{

                backgroundColor:

                  "var(--color-surface-secondary)",

                borderColor: "var(--color-border)",

                color: "var(--foreground)",

              }}

            >

              Ver sucursales

            </Link>

          </div>

        </div>

      </div>

    </main>

  );

}
