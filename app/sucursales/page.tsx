

"use client";



import { useCallback, useEffect, useRef, useState } from "react";

import Link from "next/link";

import Image from "next/image";

import axios from "axios";



type ImagenPublica = {
  id: number;
  categoria: string;
  referenciaId: number | null;
  mostrarPublicamente: boolean;
  orden: number;
};

type SucursalAPI = {

  id: number;

  nombre: string;

  direccion: string | null;

  comuna: string;

  ciudad?: string | null;

  horarioAtencion?: string | null;

  telefono: string | null;

};



type Horario = {

  dias: string;

  horas: string;

};



type Sucursal = {

  id: number;

  nombre: string;

  imagen: string | null;

  direccion: string;

  direccionMapa: string;

  horarios: Horario[];

  telefono: string | null;

};



const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/+$/, "");



const horariosPredeterminados: Horario[] = [

  { dias: "Lunes a viernes", horas: "06:00 – 22:00" },

  { dias: "Sábado y domingo", horas: "09:00 – 14:00" },

];



const datosVisuales: Record<

  string,

  { imagen: string; direccion: string }

> = {

  "la reina": {

    imagen: "/reina.webp",

    direccion:

      "Carlos Silva Vildósola 9326, local 20, segundo piso",

  },

  "penalolen": {

    imagen: "/penalolen.webp",

    direccion:

      "Las Perdices 2990, local 37, segundo piso",

  },

};



function normalizarNombre(nombre: string) {

  return nombre

    .normalize("NFD")

    .replace(/[\u0300-\u036f]/g, "")

    .trim()

    .toLowerCase();

}



function obtenerHorarios(valor?: string | null): Horario[] {

  if (!valor?.trim()) {

    return horariosPredeterminados;

  }



  // Separa horarios ingresados con ";" o saltos de línea.

  // Ejemplo:

  // Lunes a viernes: 06:00 - 22:00;

  // Sábado y domingo: 09:00 - 14:00



  return valor

    .split(/[;\n]+/)

    .map((linea) => linea.trim())

    .filter(Boolean)

    .map((linea, indice) => {

      const separador = linea.indexOf(": ");



      if (separador === -1) {

        return {

          dias: indice === 0 ? "Horario" : "Horario adicional",

          horas: linea,

        };

      }



      return {

        dias: linea.slice(0, separador).trim(),

        horas: linea.slice(separador + 2).trim(),

      };

    });

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

  const [sucursalesAPI, setSucursalesAPI] = useState<

    SucursalAPI[]

  >([]);



  const [cargando, setCargando] = useState(true);
  const [fotosSucursales, setFotosSucursales] = useState<Record<number, string>>({});

  const [error, setError] = useState("");

  const [sucursalMapa, setSucursalMapa] =

    useState<Sucursal | null>(null);



  const botonCerrarRef = useRef<HTMLButtonElement>(null);

  const botonAbrirRef = useRef<HTMLButtonElement | null>(null);



  const cargarSucursales = useCallback(

    async (signal?: AbortSignal) => {

      if (signal?.aborted) return;



      setCargando(true);

      setError("");



      try {

        const respuesta = await axios.get<SucursalAPI[]>(

          `${API}/api/sucursales`,

          { signal }

        );



        if (!Array.isArray(respuesta.data)) {

          throw new Error(

            "Respuesta de sucursales inválida."

          );

        }



        if (!signal?.aborted) {

          setSucursalesAPI(respuesta.data);

        }

      } catch (errorCarga) {

        if (signal?.aborted) return;



        console.error(

          "Error al cargar sucursales:",

          errorCarga

        );



        setError(

          "No pudimos cargar las sucursales. Intenta nuevamente."

        );

      } finally {

        if (!signal?.aborted) {

          setCargando(false);

        }

      }

    },

    []

  );



  useEffect(() => {

    const controller = new AbortController();



    const iniciarCarga = async () => {

      await Promise.resolve();



      if (!controller.signal.aborted) {

        await cargarSucursales(controller.signal);

      }

    };



    void iniciarCarga();



    return () => controller.abort();

  }, [cargarSucursales]);



  useEffect(() => {
    let vigente = true;
    const cargarImagenes = async () => {
      try {
        const respuesta = await axios.get<ImagenPublica[] | { imagenes: ImagenPublica[] }>(
          `${API}/api/imagenes/publicas`
        );
        const imagenes = Array.isArray(respuesta.data)
          ? respuesta.data
          : respuesta.data.imagenes || [];
        const fotos: Record<number, string> = {};
        imagenes
          .filter((imagen) => imagen.categoria === "sucursal" && imagen.mostrarPublicamente && imagen.referenciaId != null)
          .sort((a, b) => a.orden - b.orden)
          .forEach((imagen) => {
            const id = imagen.referenciaId!;
            if (!fotos[id]) fotos[id] = `${API}/api/imagenes/${imagen.id}/archivo`;
          });
        if (vigente) setFotosSucursales(fotos);
      } catch (errorImagenes) {
        console.error("No se pudieron cargar las imágenes públicas de sucursales:", errorImagenes);
      }
    };
    void cargarImagenes();
    return () => { vigente = false; };
  }, []);

  // La API pública devuelve únicamente sucursales activas.

  const sucursalesMostradas: Sucursal[] = sucursalesAPI.map(

    (item) => {

      const clave = normalizarNombre(item.nombre);

      const visual = datosVisuales[clave];



      const direccion =

        item.direccion?.trim() ||

        visual?.direccion ||

        "Dirección no registrada";



      const ciudad = item.ciudad?.trim() || "Santiago";



      return {

        id: item.id,

        nombre: item.nombre,

        imagen: fotosSucursales[item.id] || visual?.imagen || null,

        direccion,

        direccionMapa: [

          direccion,

          item.comuna,

          ciudad,

          "Chile",

        ].join(", "),

        horarios: obtenerHorarios(item.horarioAtencion),

        telefono: item.telefono,

      };

    }

  );



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

      {/* BARRA DE NAVEGACIÓN */}

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



      {/* CONTENIDO */}

      <div className="mx-auto max-w-6xl px-5 pb-20 pt-12 md:px-10 md:pt-16">

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

            Encuentra tu espacio para entrenar, superar tus

            metas y avanzar con el acompañamiento de

            nuestro equipo.

          </p>

        </header>



        {/* ESTADOS DE CARGA */}

        {cargando && (

          <p

            role="status"

            className="mb-6 text-center text-sm"

          >

            Cargando sucursales...

          </p>

        )}



        {error && (

          <div

            role="alert"

            className="mb-6 flex flex-wrap items-center justify-center gap-4 rounded-xl border p-4"

            style={{ borderColor: "var(--color-border)" }}

          >

            <p>{error}</p>



            <button

              type="button"

              onClick={() => void cargarSucursales()}

              className="rounded-lg border px-4 py-2 text-sm font-semibold"

            >

              Reintentar

            </button>

          </div>

        )}



        {!cargando &&

          !error &&

          sucursalesMostradas.length === 0 && (

            <p className="text-center text-sm">

              No hay sucursales disponibles por el momento.

            </p>

          )}



        {/* TARJETAS */}

        <section

          aria-label="Sucursales de Focus Power Fit"

          className="grid items-stretch gap-7 lg:grid-cols-2"

        >

          {sucursalesMostradas.map((suc) => {

            const destino = encodeURIComponent(

              suc.direccionMapa

            );



            const urlIndicaciones =

              `https://www.google.com/maps/dir/?api=1&destination=${destino}`;



            return (

              <article

                key={suc.id}

                className="group flex h-full flex-col overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"

                style={{

                  backgroundColor: "var(--color-surface)",

                  borderColor: "var(--color-border)",

                }}

              >

                {/* FOTO Y NOMBRE */}

                <div className="relative h-56 overflow-hidden bg-neutral-900 sm:h-64">

                  {suc.imagen ? (

                    <Image

                      src={suc.imagen}
                        unoptimized

                      alt={`Fachada de Focus Power Fit ${suc.nombre}`}

                      fill

                      sizes="(max-width: 1024px) 100vw, 50vw"

                      className="object-cover object-center transition-transform duration-500 group-hover:scale-105"

                    />

                  ) : (

                    <div className="flex h-full items-center justify-center text-6xl font-black text-neutral-700">

                      F

                    </div>

                  )}



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

                      backgroundColor:

                        "var(--color-border)",

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

                        {suc.horarios.map((horario, indice) => (

                          <div

                            key={`${indice}-${horario.dias}`}

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



                  {/* TELÉFONO */}

                  {suc.telefono && (

                    <p

                      className="mt-5 text-sm"

                      style={{

                        color:

                          "var(--color-text-secondary)",

                      }}

                    >

                      Teléfono:{" "}

                      <a

                        href={`tel:${suc.telefono.replace(

                          /[^\d+]/g,

                          ""

                        )}`}

                        className="font-semibold text-white underline"

                      >

                        {suc.telefono}

                      </a>

                    </p>

                  )}



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



      {/* MODAL GOOGLE MAPS */}

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
