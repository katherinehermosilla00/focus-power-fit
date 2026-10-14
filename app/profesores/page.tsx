"use client";

import { useState } from "react";

import Link from "next/link";

type Profesor = {

  nombre: string;

  rol: string;

  instagram?: string;

};

const profesoresLaReina: Profesor[] = [

  {

    nombre: "Bastián Bustos",

    rol: "Profesor de Educación Física / Personal Trainer",

  },

  {

    nombre: "Juan Carlos Ignamarca",

    rol: "Personal Trainer",

  },

  {

    nombre: "Fabián Rodriguez",

    rol: "Personal Trainer",

    instagram: "@jesuss__fabian",

  },

  {

    nombre: "Carlos Cabrera",

    rol: "Personal Trainer",

    instagram: "@carlosalbertocabreramardones",

  },

  {

    nombre: "Fernando San Juan",

    rol: "Preparador Físico / Personal Trainer",

  },

];

const profesoresPenalolen: Profesor[] = [

  {

    nombre: "César Salas",

    rol: "Personal Trainer",

  },

  {

    nombre: "Simón Guzmán",

    rol: "Profesor de Educación Física / Entrenador Personal",

  },

  {

    nombre: "Nicolás Pérez",

    rol: "Profesor de Educación Física / Jefe de Turno P.M.",

  },

  {

    nombre: "Francisco Andrade",

    rol: "Profesor de Educación Física / Encargado Administrativo",

  },

  {

    nombre: "Cristian Hormazabal",

    rol: "Preparador Físico",

  },

  {

    nombre: "Didier Valdebenito",

    rol: "Preparador Físico",

  },

  {

    nombre: "Fernando Carvallo",

    rol: "Preparador Físico / Encargado Turno A.M.",

  },

];

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

        className="absolute inset-0 z-0 cursor-pointer rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--color-primary)]"

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

        {obtenerIniciales(nombre)}

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

      {/* GRID DE TARJETAS */}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">

        {profesores.map((profesor) => (

          <TarjetaProfesor

            key={profesor.nombre}

            {...profesor}

          />

        ))}

      </div>

    </section>

  );

}

export default function Profesores() {

  return (

    <main

      className="min-h-screen"

      style={{

        backgroundColor: "var(--background)",

        color: "var(--foreground)",

      }}

    >

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

          profesores={profesoresLaReina}

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

          profesores={profesoresPenalolen}

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
