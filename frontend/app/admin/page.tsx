"use client";

import Link from "next/link";
import LogoFocus from "../components/LogoFocus";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { useAuth, fetchConSesion } from "../auth/AuthContext";

type IconoNombre =

  | "dashboard"

  | "clientes"

  | "entrenadores"

  | "planes"

  | "asistencias"

  | "sucursales"

  | "imagenes"

  | "maquinas"

  | "calendario"

  | "contratos"

  | "pagos"

  | "recordatorios"

  | "buscar"

  | "salir";

const navegacion: {

  nombre: string;

  ruta: string;

  icono: IconoNombre;

}[] = [

  {

    nombre: "Dashboard",

    ruta: "/admin",

    icono: "dashboard",

  },

  {

    nombre: "Clientes",

    ruta: "/admin/clientes",

    icono: "clientes",

  },

  {

    nombre: "Entrenadores",

    ruta: "/admin/profesores",

    icono: "entrenadores",

  },

  {

    nombre: "Planes",

    ruta: "/admin/planes",

    icono: "planes",

  },

  {

    nombre: "Asignaciones",

    ruta: "/admin/asignaciones",

    icono: "calendario",

  },

  {

    nombre: "Asistencias",

    ruta: "/admin/asistencia",

    icono: "asistencias",

  },

  {

    nombre: "Sucursales",

    ruta: "/admin/sucursales",

    icono: "sucursales",

  },

  {

    nombre: "Máquinas",

    ruta: "/admin/maquinas",

    icono: "maquinas",

  },

  {

    nombre: "Imágenes",

    ruta: "/admin/imagenes",

    icono: "imagenes",

  },

  {

    nombre: "Horarios",

    ruta: "/admin/horarios",

    icono: "calendario",

  },

  {

    nombre: "Contratos",

    ruta: "/admin/contratos",

    icono: "contratos",

  },

  {

    nombre: "Pagos",

    ruta: "/admin/pagos",

    icono: "pagos",

  },

  {

    nombre: "Recordatorios",

    ruta: "/admin/recordatorios",

    icono: "recordatorios",

  },

];

type ClienteResumen = {

  id: number;

  sucursalId: number | null;

};

type SucursalResumen = {

  id: number;

  nombre: string;

};

type ConteoSucursal = {
  id: number;
  nombre: string;
  total: number;
};

type Conteos = {
  total: number;
  porSucursal: ConteoSucursal[];
  sinSucursal: number;
};

// Colores para el gráfico; se repiten si hay más sucursales que colores.
const COLORES_SUCURSAL = ["#b91c1c", "#525252", "#f87171", "#a3a3a3", "#7f1d1d", "#d4d4d4"];

const colorSucursal = (indice: number) =>
  COLORES_SUCURSAL[indice % COLORES_SUCURSAL.length];

// Gráfico circular calculado con los datos, no con un porcentaje fijo.
function fondoDistribucion(conteos: Conteos | null) {
  if (!conteos || conteos.total === 0) return "#404040";

  let acumulado = 0;
  const tramos = conteos.porSucursal.map((sucursal, indice) => {
    const inicio = acumulado;
    acumulado += (sucursal.total / conteos.total) * 100;
    return `${colorSucursal(indice)} ${inicio.toFixed(2)}% ${acumulado.toFixed(2)}%`;
  });

  return `conic-gradient(${tramos.join(", ")})`;
}

const API = (

  process.env.NEXT_PUBLIC_API_URL ||

  "http://localhost:3001"

).replace(/\/+$/, "");

function porcentaje(cantidad: number, total: number) {

  if (total === 0) return "0,0";

  return ((cantidad / total) * 100)

    .toFixed(1)

    .replace(".", ",");

}

function Icono({ nombre }: { nombre: IconoNombre }) {

  const trazos: Record<IconoNombre, React.ReactNode> = {

    dashboard: (

      <>

        <rect x="3" y="3" width="7" height="7" rx="1" />

        <rect x="14" y="3" width="7" height="7" rx="1" />

        <rect x="3" y="14" width="7" height="7" rx="1" />

        <rect x="14" y="14" width="7" height="7" rx="1" />

      </>

    ),

    clientes: (

      <>

        <circle cx="9" cy="8" r="3" />

        <path d="M3 20v-2a6 6 0 0 1 12 0v2" />

        <path d="M17 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5v1" />

      </>

    ),

    entrenadores: (

      <>

        <circle cx="12" cy="7" r="4" />

        <path d="M4 21v-2a8 8 0 0 1 16 0v2" />

        <path d="M19 4l2 2-2 2" />

      </>

    ),

    planes: (

      <>

        <rect x="5" y="3" width="14" height="18" rx="2" />

        <path d="M9 8h6M9 12h6M9 16h4" />

      </>

    ),

    asistencias: (

      <>

        <circle cx="12" cy="12" r="9" />

        <path d="M12 7v5l3 2M8 3l1-2M16 3l-1-2" />

      </>

    ),

    sucursales: (

      <>

        <path d="M12 22s7-6 7-13a7 7 0 1 0-14 0c0 7 7 13 7 13Z" />

        <circle cx="12" cy="9" r="2" />

      </>

    ),

    maquinas: (

      <>

        <path d="M3 9v6M6 7v10M18 7v10M21 9v6" />

        <path d="M6 12h12" />

        <path d="M2 9h2M20 9h2M2 15h2M20 15h2" />

      </>

    ),

    imagenes: (

      <>

        <rect x="3" y="3" width="18" height="18" rx="2" />

        <circle cx="8.5" cy="8.5" r="1.5" />

        <path d="m3 17 5-5 4 4 3-3 6 6" />

      </>

    ),

    calendario: (

      <>

        <rect x="3" y="5" width="18" height="16" rx="2" />

        <path d="M7 3v4M17 3v4M3 10h18" />

      </>

    ),

    contratos: (

      <>

        <path d="M6 3h9l4 4v14H6z" />

        <path d="M15 3v5h4M9 13h7M9 17h7" />

      </>

    ),

    pagos: (

      <>

        <rect x="2" y="5" width="20" height="14" rx="2" />

        <path d="M2 10h20M6 15h4" />

      </>

    ),

    recordatorios: (

      <>

        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />

        <path d="M10 21h4" />

      </>

    ),

    buscar: (

      <>

        <circle cx="10" cy="10" r="7" />

        <path d="m15 15 6 6" />

      </>

    ),

    salir: (

      <>

        <path d="M10 4H4v16h6M14 8l4 4-4 4M8 12h10" />

      </>

    ),

  };

  return (

    <svg

      className="icono"

      viewBox="0 0 24 24"

      fill="none"

      stroke="currentColor"

      strokeWidth="1.8"

      strokeLinecap="round"

      strokeLinejoin="round"

      aria-hidden="true"

    >

      {trazos[nombre]}

    </svg>

  );

}

function Panel({

  titulo,

  children,

  enlace,

  ruta,

}: {

  titulo: string;

  children: React.ReactNode;

  enlace?: string;

  ruta?: string;

}) {

  return (

    <section className="panel">

      <div className="panelCabecera">

        <h2>{titulo}</h2>

        {enlace && ruta && (

          <Link href={ruta} className="panelEnlace">

            {enlace}

          </Link>

        )}

      </div>

      {children}

    </section>

  );

}

function EstadoVacio({ texto }: { texto: string }) {

  return (

    <div className="estadoVacio">

      <span className="estadoVacioIcono">—</span>

      <p>{texto}</p>

    </div>

  );

}

export default function AdminPage() {

  const router = useRouter();

  const { usuario, cargando, logout } = useAuth();

  const [menuAbierto, setMenuAbierto] = useState(false);

  const [busqueda, setBusqueda] = useState("");

  const [clientes, setClientes] = useState<Conteos | null>(null);

  const [errorDatos, setErrorDatos] = useState("");

  const [cargandoDatos, setCargandoDatos] = useState(true);

  // CARGAR ESTADÍSTICAS REALES

  useEffect(() => {

    if (cargando || usuario?.rol !== "admin") return;

    const controller = new AbortController();

    async function cargarResumen() {

      try {

        const token = localStorage.getItem(

          "focusPowerFitToken"

        );

        if (!token) {

          throw new Error(

            "No se encontró la sesión del administrador."

          );

        }

        const headers = {

          Authorization: `Bearer ${token}`,

        };

        const [rClientes, rSucursales] = await Promise.all([

          fetchConSesion(`${API}/api/clientes`, {

            headers,

            signal: controller.signal,

          }),

          fetchConSesion(`${API}/api/sucursales/admin`, {

            headers,

            signal: controller.signal,

          }),

        ]);

        if (!rClientes.ok || !rSucursales.ok) {

          throw new Error(

            "No se pudieron consultar los datos del dashboard."

          );

        }

        const listaClientes: ClienteResumen[] =

          await rClientes.json();

        const listaSucursales: SucursalResumen[] =

          await rSucursales.json();

        if (

          !Array.isArray(listaClientes) ||

          !Array.isArray(listaSucursales)

        ) {

          throw new Error(

            "El backend devolvió un formato de datos inesperado."

          );

        }

        // Funciona con cualquier cantidad de sucursales y nombres.
        const sinSucursal = listaClientes.filter(
          (cliente) => cliente.sucursalId == null
        ).length;

        const porSucursal = listaSucursales.map((sucursal) => ({
          id: Number(sucursal.id),
          nombre: sucursal.nombre,
          total: listaClientes.filter(
            (cliente) => Number(cliente.sucursalId) === Number(sucursal.id)
          ).length,
        }));

        const total = listaClientes.length - sinSucursal;

        if (!controller.signal.aborted) {
          setClientes({
            total,
            porSucursal,
            sinSucursal,
          });

          setErrorDatos("");

          setCargandoDatos(false);

        }

      } catch (error) {

        if (!controller.signal.aborted) {

          setErrorDatos(

            error instanceof Error

              ? error.message

              : "Error al cargar estadísticas."

          );

          setCargandoDatos(false);

        }

      }

    }

    void cargarResumen();

    return () => controller.abort();

  }, [cargando, usuario?.rol]);

  // PROTEGER ACCESO ADMINISTRATIVO

  useEffect(() => {

    if (cargando) return;

    if (!usuario) {

      router.replace("/login");

    } else if (usuario.rol !== "admin") {

      router.replace("/mi-cuenta");

    }

  }, [usuario, cargando, router]);

  const cerrarSesion = () => {

    logout();

    router.replace("/login");

  };

  const buscar = (

    evento: React.FormEvent<HTMLFormElement>

  ) => {

    evento.preventDefault();

    if (!busqueda.trim()) return;

    router.push(

      `/admin/clientes?buscar=${encodeURIComponent(

        busqueda.trim()

      )}`

    );

  };

  if (

    cargando ||

    !usuario ||

    usuario.rol !== "admin"

  ) {

    return (

      <main className="cargando">

        {cargando

          ? "Cargando..."

          : "Verificando acceso..."}

      </main>

    );

  }

  const indicadores = [

    {

      nombre: "Clientes Totales",

      valor:

        clientes?.total.toLocaleString("es-CL") ?? "—",

      detalle: "Clientes asociados a sucursales",

      icono: "clientes" as IconoNombre,

    },

    ...(clientes?.porSucursal ?? []).map((sucursal) => ({
      nombre: `Clientes ${sucursal.nombre}`,
      valor: sucursal.total.toLocaleString("es-CL"),
      detalle: `${porcentaje(sucursal.total, clientes?.total ?? 0)}% del total`,
      icono: "sucursales" as IconoNombre,
    })),

    {

      nombre: "Sin sucursal",

      valor:

        clientes?.sinSucursal.toLocaleString("es-CL") ?? "—",

      detalle: "Registros pendientes de asignación",

      icono: "clientes" as IconoNombre,

    },

    {

      nombre: "Planes Vigentes",

      valor: "—",

      detalle: "Datos aún no conectados",

      icono: "planes" as IconoNombre,

    },

    {

      nombre: "Asistencias (Mes)",

      valor: "—",

      detalle: "Datos aún no conectados",

      icono: "asistencias" as IconoNombre,

    },

  ];

  return (

    <div className="dashboard">
      <style>{`
        .dashboard .panelEnlace::before,
        .dashboard .panelEnlace::after {
          content: none !important;
          display: none !important;
        }
        .dashboard .panelEnlace svg,
        .dashboard .panelEnlace .flecha {
          display: none !important;
        }
      `}</style>

      {/* MENÚ LATERAL */}

      <aside

        className={`sidebar ${

          menuAbierto ? "sidebarAbierto" : ""

        }`}

      >

        <Link href="/admin" className="logo">

          <LogoFocus alto={40} />

        </Link>

        <nav className="navegacion">

          {navegacion.map((item) => (

            <Link

              key={item.nombre}

              href={item.ruta}

              className={`navegacionItem ${

                item.ruta === "/admin"

                  ? "navegacionActivo"

                  : ""

              }`}

              onClick={() => setMenuAbierto(false)}

            >

              <Icono nombre={item.icono} />

              <span>{item.nombre}</span>

            </Link>

          ))}

        </nav>

        <div className="sidebarInferior">

          <strong>FOCUS POWER FIT</strong>

          <p>Gestión integral del gimnasio</p>

        </div>

      </aside>

      {menuAbierto && (

        <button

          type="button"

          className="overlay"

          aria-label="Cerrar menú"

          onClick={() => setMenuAbierto(false)}

        />

      )}

      {/* CONTENIDO PRINCIPAL */}

      <main className="principal">

        <div className="encabezado">

          <div className="barraSuperior">

            <button

              type="button"

              className="botonMenu"

              aria-label="Abrir menú"

              onClick={() => setMenuAbierto(true)}

            >

              ☰

            </button>

            <form

              onSubmit={buscar}

              className="buscador"

            >

              <Icono nombre="buscar" />

              <input

                type="search"

                placeholder="Buscar clientes..."

                value={busqueda}

                onChange={(evento) =>

                  setBusqueda(evento.target.value)

                }

                aria-label="Buscar clientes"

              />

              <button

                type="submit"

                className="botonBuscar"

              >

                Buscar

              </button>

            </form>

            <div className="usuario">

              <div className="avatar">

                {usuario.nombre

                  ?.charAt(0)

                  .toUpperCase() || "A"}

              </div>

              <div className="usuarioDatos">

                <strong>{usuario.nombre}</strong>

                <span>Administrador/a</span>

              </div>

              <button

                type="button"

                className="botonSalir"

                onClick={cerrarSesion}

                title="Cerrar sesión"

                aria-label="Cerrar sesión"

              >

                <Icono nombre="salir" />

              </button>

            </div>

          </div>

          <div className="hero">

            <div className="heroTexto">

              <span className="heroEtiqueta">

                DASHBOARD

              </span>

              <h1>Resumen General</h1>

              <p>

                Focus Power Fit · Gestión Integral del Gimnasio

              </p>

            </div>

            <p className="heroFrase">

              DISCIPLINA

              <strong>HOY,</strong>

              RESULTADOS

              <strong>SIEMPRE.</strong>

            </p>

          </div>

        </div>

        <div className="contenido">

          {/* ESTADO DE CARGA */}

          {cargandoDatos && (

            <p role="status">

              Cargando estadísticas reales...

            </p>

          )}

          {errorDatos && (

            <p role="alert">

              No se pudieron cargar las estadísticas:{" "}

              {errorDatos}

            </p>

          )}

          {/* INDICADORES */}

          <section className="indicadores">

            {indicadores.map((indicador) => (

              <article

                key={indicador.nombre}

                className="indicador"

              >

                <div className="indicadorEncabezado">

                  <span className="indicadorIcono">

                    <Icono nombre={indicador.icono} />

                  </span>

                  <span className="indicadorNombre">

                    {indicador.nombre}

                  </span>

                </div>

                <strong className="indicadorNumero">

                  {indicador.valor}

                </strong>

                <p className="indicadorDetalle">

                  {indicador.detalle}

                </p>

                <div

                  className="indicadorDecoracion"

                  aria-hidden="true"

                />

              </article>

            ))}

          </section>

          {/* GRÁFICOS */}

          <section className="graficos">

            <Panel titulo="Asistencias por Semana">

              <EstadoVacio

                texto="Conectaremos aquí las asistencias reales por semana y sucursal."

              />

            </Panel>

            <Panel titulo="Distribución de Clientes por Sucursal">

              <div className="distribucion">

                <div
                  className="distribucionGrafico"
                  style={{ background: fondoDistribucion(clientes) }}
                >

                  <div className="distribucionCentro">

                    <strong>

                      {clientes?.total ?? "—"}

                    </strong>

                    <span>Clientes</span>

                  </div>

                </div>

                <div className="distribucionLeyenda">

                  {(clientes?.porSucursal ?? []).map((sucursal, indice) => (
                    <div className="leyendaItem" key={sucursal.id}>
                      <span
                        className="leyendaPenalolen"
                        style={{ background: colorSucursal(indice) }}
                      />
                      <div>
                        <strong>{sucursal.nombre}</strong>
                        <small>
                          {sucursal.total} clientes ·{" "}
                          {porcentaje(sucursal.total, clientes?.total ?? 0)}%
                        </small>
                      </div>
                    </div>
                  ))}

                </div>

              </div>

            </Panel>

            <Panel titulo="Estado de Planes">

              <EstadoVacio

                texto="Los estados de los planes se mostrarán cuando estén conectados al backend."

              />

            </Panel>

          </section>

          {/* TABLAS INFERIORES */}

          <section className="tablas">

            <Panel

              titulo="Planes Más Contratados"

              enlace="Ver planes"

              ruta="/admin/planes"

            >

              <div className="tablaEncabezado">

                <span>Plan</span>

                <span>Clientes</span>

              </div>

              <EstadoVacio

                texto="Sin estadísticas de contrataciones disponibles."

              />

            </Panel>

            <Panel

              titulo="Rendimiento de Entrenadores"

              enlace="Ver todos"

              ruta="/admin/profesores"

            >

              <div className="tablaEncabezado">

                <span>Entrenador</span>

                <span>Asistencias</span>

              </div>

              <EstadoVacio

                texto="Sin estadísticas de entrenadores disponibles."

              />

            </Panel>

            <Panel

              titulo="Últimas Asistencias"

              enlace="Ver todas"

              ruta="/admin/asistencia"

            >

              <div className="tablaEncabezado">

                <span>Cliente</span>

                <span>Estado</span>

              </div>

              <EstadoVacio

                texto="Sin registros recientes conectados."

              />

            </Panel>

          </section>

          <footer className="footer">

            Focus Power Fit · Panel Administrativo

          </footer>

        </div>

      </main>

    </div>

  );

}
