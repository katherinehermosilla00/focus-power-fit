
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

type Sucursal = {
  nombre: string;
  imagen: string;
  direccion: string;
  direccionMapa: string;
  horarios: {
    dias: string;
    horas: string;
  }[];
};

const sucursales: Sucursal[] = [
  {
    nombre: "La Reina",
    imagen: "/reina.webp",
    direccion:
      "Carlos Silva Vildósola 9326, local 20, segundo piso",
    direccionMapa:
      "Carlos Silva Vildósola 9326, La Reina, Santiago, Chile",
    horarios: [
      { dias: "Lunes a viernes", horas: "06:00 – 22:00" },
      { dias: "Sábado y domingo", horas: "09:00 – 14:00" },
    ],
  },
  {
    nombre: "Peñalolén",
    imagen: "/penalolen.webp",
    direccion:
      "Las Perdices 2990, local 37, segundo piso",
    direccionMapa:
      "Las Perdices 2990, Peñalolén, Santiago, Chile",
    horarios: [
      { dias: "Lunes a viernes", horas: "06:00 – 22:00" },
      { dias: "Sábado y domingo", horas: "09:00 – 14:00" },
    ],
  },
];

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

function IconoReloj() {
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
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export default function Sucursales() {
  const [sucursalMapa, setSucursalMapa] =
    useState<Sucursal | null>(null);

  const botonCerrarRef = useRef<HTMLButtonElement>(null);
  const botonAbrirRef = useRef<HTMLButtonElement | null>(null);

  const abrirMapa = (
    sucursal: Sucursal,
    boton: HTMLButtonElement
  ) => {
    botonAbrirRef.current = boton;
    setSucursalMapa(sucursal);
  };

  useEffect(() => {
    if (!sucursalMapa) return;

    const scrollAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    botonCerrarRef.current?.focus();

    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSucursalMapa(null);
      }
    };

    window.addEventListener("keydown", cerrarConEscape);

    return () => {
      document.body.style.overflow = scrollAnterior;
      window.removeEventListener("keydown", cerrarConEscape);
      botonAbrirRef.current?.focus();
    };
  }, [sucursalMapa]);

  return (
    <main
      className="min-h-screen text-white"
      style={{ backgroundColor: "var(--background)" }}
    >
      {/* =========================================
          BARRA DE NAVEGACIÓN
          ========================================= */}
      <nav
        aria-label="Navegación principal"
        className="relative z-10 flex flex-wrap items-center justify-between gap-6 border-b px-5 py-4 md:px-10 lg:px-12"
        style={{
          backgroundColor: "var(--background)",
          borderColor: "var(--color-border)",
        }}
      >
        {/* MARCA */}
        <Link
          href="/"
          className="flex items-center gap-3 no-underline"
        >
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl font-black text-white"
            style={{
              backgroundColor: "var(--color-primary)",
              boxShadow: "0 0 20px rgba(185, 28, 28, 0.18)",
            }}
          >
            F
          </span>

          <span className="text-xl font-extrabold tracking-tight text-white">
            Focus Power Fit
          </span>
        </Link>

        {/* ENLACES */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link
            href="/"
            className="py-2 text-sm font-semibold transition-colors hover:text-white"
            style={{
              color: "var(--color-text-secondary)",
            }}
          >
            Inicio
          </Link>

          <Link
            href="/#planes"
            className="py-2 text-sm font-semibold transition-colors hover:text-white"
            style={{
              color: "var(--color-text-secondary)",
            }}
          >
            Planes
          </Link>

          <Link
            href="/sucursales"
            aria-current="page"
            className="border-b-2 py-2 text-sm font-bold"
            style={{
              color: "var(--color-primary)",
              borderColor: "var(--color-primary)",
            }}
          >
            Sucursales
          </Link>

          <Link
            href="/profesores"
            className="py-2 text-sm font-semibold transition-colors hover:text-white"
            style={{
              color: "var(--color-text-secondary)",
            }}
          >
            Profesores
          </Link>

          <Link
            href="/registro"
            className="py-2 text-sm font-semibold transition-colors hover:text-white"
            style={{
              color: "var(--color-text-secondary)",
            }}
          >
            Registro
          </Link>

          <Link
            href="/login"
            className="inline-flex min-h-11 items-center justify-center rounded-xl px-5 py-3 text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110"
            style={{
              backgroundColor: "var(--color-primary)",
            }}
          >
            Iniciar sesión
          </Link>
        </div>
      </nav>

      {/* =========================================
          CONTENIDO
          ========================================= */}
      <div className="mx-auto max-w-6xl px-5 pb-20 pt-12 md:px-10 md:pt-16">
        {/* ENCABEZADO */}
        <header className="mb-10 text-center md:mb-12">
          <p
            className="mb-3 text-xs font-bold uppercase tracking-[0.3em]"
            style={{ color: "var(--color-primary)" }}
          >
            FOCUS POWER FIT
          </p>

          <h1 className="text-4xl font-black uppercase tracking-tight sm:text-5xl md:text-6xl">
            NUESTRAS{" "}
            <span style={{ color: "var(--color-primary)" }}>
              SUCURSALES
            </span>
          </h1>

          <div
            className="mx-auto mt-4 h-1 w-20 rounded-full"
            style={{
              backgroundColor: "var(--color-primary)",
            }}
          />

          <p
            className="mx-auto mt-5 max-w-xl text-sm leading-7 md:text-base"
            style={{
              color: "var(--color-text-secondary)",
            }}
          >
            Dos espacios para entrenar, superar tus metas
            y avanzar con el acompañamiento de nuestro equipo.
          </p>
        </header>

        {/* =========================================
            TARJETAS DE SUCURSALES
            ========================================= */}
        <section
          aria-label="Sucursales de Focus Power Fit"
          className="grid items-stretch gap-7 lg:grid-cols-2"
        >
          {sucursales.map((suc) => {
            const destino = encodeURIComponent(
              suc.direccionMapa
            );

            const urlIndicaciones =
              `https://www.google.com/maps/dir/?api=1&destination=${destino}`;

            return (
              <article
                key={suc.nombre}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
                style={{
                  backgroundColor: "var(--color-surface)",
                  borderColor: "var(--color-border)",
                }}
              >
                {/* FOTO CON NOMBRE */}
                <div className="relative h-56 overflow-hidden sm:h-64">
                  <Image
                    src={suc.imagen}
                    alt={`Fachada de Focus Power Fit ${suc.nombre}`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                  />

                  <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/90 via-black/15 to-transparent" />

                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <p
                      className="mb-1 text-xs font-bold uppercase tracking-[0.25em]"
                      style={{
                        color: "var(--color-primary)",
                      }}
                    >
                      FOCUS POWER FIT
                    </p>

                    <h2 className="text-3xl font-black uppercase tracking-tight sm:text-4xl">
                      {suc.nombre}
                    </h2>
                  </div>
                </div>

                {/* INFORMACIÓN */}
                <div className="flex flex-1 flex-col p-6">
                  {/* DIRECCIÓN */}
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor:
                          "var(--color-surface-secondary)",
                        color: "var(--color-primary)",
                      }}
                    >
                      <IconoUbicacion />
                    </div>

                    <div>
                      <h3 className="mb-1 text-sm font-bold uppercase tracking-wide">
                        Dirección
                      </h3>

                      <p
                        className="text-sm leading-6"
                        style={{
                          color:
                            "var(--color-text-secondary)",
                        }}
                      >
                        {suc.direccion}
                      </p>
                    </div>
                  </div>

                  <div
                    className="my-5 h-px"
                    style={{
                      backgroundColor: "var(--color-border)",
                    }}
                  />

                  {/* HORARIOS */}
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor:
                          "var(--color-surface-secondary)",
                        color: "var(--color-primary)",
                      }}
                    >
                      <IconoReloj />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide">
                        Horarios de atención
                      </h3>

                      <div className="space-y-2">
                        {suc.horarios.map((horario) => (
                          <div
                            key={horario.dias}
                            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1"
                          >
                            <span
                              className="text-sm"
                              style={{
                                color:
                                  "var(--color-text-secondary)",
                              }}
                            >
                              {horario.dias}
                            </span>

                            <span className="text-sm font-semibold text-white">
                              {horario.horas}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* BOTONES */}
                  <div className="mt-auto grid grid-cols-1 gap-3 pt-7 sm:grid-cols-2">
                    <a
                      href={urlIndicaciones}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-12 items-center justify-center rounded-xl px-5 py-3 text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110"
                      style={{
                        backgroundColor:
                          "var(--color-primary)",
                      }}
                    >
                      Cómo llegar
                    </a>

                    <button
                      type="button"
                      onClick={(event) =>
                        abrirMapa(suc, event.currentTarget)
                      }
                      className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-xl border px-5 py-3 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 hover:brightness-125"
                      style={{
                        backgroundColor:
                          "var(--color-surface-secondary)",
                        borderColor:
                          "var(--color-border)",
                        color: "var(--foreground)",
                      }}
                    >
                      Ver mapa
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </div>

      {/* =========================================
          MODAL DE GOOGLE MAPS
          ========================================= */}
      {sucursalMapa && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSucursalMapa(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-modal-mapa"
            className="w-full max-w-3xl overflow-hidden rounded-2xl border shadow-2xl"
            style={{
              backgroundColor: "var(--color-surface)",
              borderColor: "var(--color-border)",
            }}
          >
            {/* CABECERA */}
            <div
              className="flex items-center justify-between gap-4 border-b p-5 md:px-7"
              style={{
                borderColor: "var(--color-border)",
              }}
            >
              <div>
                <p
                  className="mb-1 text-xs font-bold uppercase tracking-[0.2em]"
                  style={{
                    color: "var(--color-primary)",
                  }}
                >
                  UBICACIÓN
                </p>

                <h2
                  id="titulo-modal-mapa"
                  className="text-xl font-black sm:text-2xl"
                >
                  Focus Power Fit {sucursalMapa.nombre}
                </h2>
              </div>

              <button
                ref={botonCerrarRef}
                type="button"
                onClick={() => setSucursalMapa(null)}
                aria-label="Cerrar mapa"
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border text-xl font-bold transition-colors hover:bg-neutral-700"
                style={{
                  borderColor: "var(--color-border)",
                  color: "var(--foreground)",
                }}
              >
                ×
              </button>
            </div>

            {/* MAPA */}
            <iframe
              title={`Mapa de Focus Power Fit ${sucursalMapa.nombre}`}
              src={`https://www.google.com/maps?q=${encodeURIComponent(
                sucursalMapa.direccionMapa
              )}&output=embed`}
              className="block h-[50vh] min-h-70 w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />

            {/* PIE */}
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between md:px-7">
              <p
                className="text-sm"
                style={{
                  color: "var(--color-text-secondary)",
                }}
              >
                {sucursalMapa.direccion}
              </p>

              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                  sucursalMapa.direccionMapa
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center justify-center rounded-xl px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: "var(--color-primary)",
                }}
              >
                Cómo llegar
              </a>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
