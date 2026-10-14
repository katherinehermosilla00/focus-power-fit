
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth/AuthContext";


type IconoNombre =
  | "dashboard"
  | "clientes"
  | "entrenadores"
  | "planes"
  | "asistencias"
  | "sucursales"
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
  pendiente?: boolean;
}[] = [
  { nombre: "Dashboard", ruta: "/admin", icono: "dashboard" },
  { nombre: "Clientes", ruta: "/admin/clientes", icono: "clientes" },
  { nombre: "Entrenadores", ruta: "/admin/profesores", icono: "entrenadores" },
  { nombre: "Planes", ruta: "/admin/planes", icono: "planes" },
  {
    nombre: "Asignaciones",
    ruta: "/admin/asignaciones",
    icono: "calendario",
  },
  { nombre: "Asistencias", ruta: "/admin/asistencia", icono: "asistencias" },
  {
    nombre: "Sucursales",
    ruta: "",
    icono: "sucursales",
    pendiente: true,
  },
  { nombre: "Horarios", ruta: "/admin/horarios", icono: "calendario" },
  { nombre: "Contratos", ruta: "/admin/contratos", icono: "contratos" },
  { nombre: "Pagos", ruta: "/admin/pagos", icono: "pagos" },
  {
    nombre: "Recordatorios",
    ruta: "/admin/recordatorios",
    icono: "recordatorios",
  },
];

const clientes = {
  total: 910,
  penalolen: 629,
  laReina: 281,
};

function porcentaje(cantidad: number) {
  return ((cantidad / clientes.total) * 100)
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

  const buscar = (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();

    if (!busqueda.trim()) return;

    router.push(
      `/admin/clientes?buscar=${encodeURIComponent(busqueda.trim())}`
    );
  };

  if (cargando || !usuario || usuario.rol !== "admin") {
    return (
      <main className="cargando">
        {cargando ? "Cargando..." : "Verificando acceso..."}
      </main>
    );
  }

  const indicadores = [
    {
      nombre: "Clientes Totales",
      valor: clientes.total.toLocaleString("es-CL"),
      detalle: "Clientes registrados",
      icono: "clientes" as IconoNombre,
    },
    {
      nombre: "Clientes Peñalolén",
      valor: clientes.penalolen.toLocaleString("es-CL"),
      detalle: `${porcentaje(clientes.penalolen)}% del total`,
      icono: "sucursales" as IconoNombre,
    },
    {
      nombre: "Clientes La Reina",
      valor: clientes.laReina.toLocaleString("es-CL"),
      detalle: `${porcentaje(clientes.laReina)}% del total`,
      icono: "sucursales" as IconoNombre,
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
      {/* MENÚ LATERAL */}
      <aside
        className={`sidebar ${menuAbierto ? "sidebarAbierto" : ""}`}
      >
        <Link href="/admin" className="logo">
          <span className="logoMarca">▥</span>
          <span className="logoNombre">
            <strong>FOCUS</strong>
            <small>POWER FIT</small>
          </span>
        </Link>

        <nav className="navegacion">
          {navegacion.map((item) =>
            item.pendiente ? (
              <div
                key={item.nombre}
                className="navegacionPendiente"
                title="Módulo pendiente de habilitar"
              >
                <Icono nombre={item.icono} />
                <span>{item.nombre}</span>
              </div>
            ) : (
              <Link
                key={item.nombre}
                href={item.ruta}
                className={`navegacionItem ${
                  item.ruta === "/admin" ? "navegacionActivo" : ""
                }`}
                onClick={() => setMenuAbierto(false)}
              >
                <Icono nombre={item.icono} />
                <span>{item.nombre}</span>
              </Link>
            )
          )}
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

            <form onSubmit={buscar} className="buscador">
              <Icono nombre="buscar" />
              <input
                type="search"
                placeholder="Buscar clientes..."
                value={busqueda}
                onChange={(evento) => setBusqueda(evento.target.value)}
                aria-label="Buscar clientes"
              />
              <button type="submit" className="botonBuscar">
                Buscar
              </button>
            </form>

            <div className="usuario">
              <div className="avatar">
                {usuario.nombre?.charAt(0).toUpperCase() || "A"}
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
              <span className="heroEtiqueta">DASHBOARD</span>
              <h1>Resumen General</h1>
              <p>Focus Power Fit · Gestión Integral del Gimnasio</p>
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
              <EstadoVacio texto="Conectaremos aquí las asistencias reales por semana y sucursal." />
            </Panel>

            <Panel titulo="Distribución de Clientes por Sucursal">
              <div className="distribucion">
                <div className="distribucionGrafico">
                  <div className="distribucionCentro">
                    <strong>{clientes.total}</strong>
                    <span>Clientes</span>
                  </div>
                </div>

                <div className="distribucionLeyenda">
                  <div className="leyendaItem">
                    <span className="leyendaPenalolen" />
                    <div>
                      <strong>Peñalolén</strong>
                      <small>
                        {clientes.penalolen} clientes ·{" "}
                        {porcentaje(clientes.penalolen)}%
                      </small>
                    </div>
                  </div>

                  <div className="leyendaItem">
                    <span className="leyendaLaReina" />
                    <div>
                      <strong>La Reina</strong>
                      <small>
                        {clientes.laReina} clientes ·{" "}
                        {porcentaje(clientes.laReina)}%
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            </Panel>

            <Panel titulo="Estado de Planes">
              <EstadoVacio texto="Los estados de los planes se mostrarán cuando estén conectados al backend." />
            </Panel>
          </section>

          {/* TABLAS INFERIORES */}
          <section className="tablas">
            <Panel
              titulo="Planes Más Contratados"
              enlace="Ver planes →"
              ruta="/admin/planes"
            >
              <div className="tablaEncabezado">
                <span>Plan</span>
                <span>Clientes</span>
              </div>
              <EstadoVacio texto="Sin estadísticas de contrataciones disponibles." />
            </Panel>

            <Panel
              titulo="Rendimiento de Entrenadores"
              enlace="Ver todos →"
              ruta="/admin/profesores"
            >
              <div className="tablaEncabezado">
                <span>Entrenador</span>
                <span>Asistencias</span>
              </div>
              <EstadoVacio texto="Sin estadísticas de entrenadores disponibles." />
            </Panel>

            <Panel
              titulo="Últimas Asistencias"
              enlace="Ver todas →"
              ruta="/admin/asistencia"
            >
              <div className="tablaEncabezado">
                <span>Cliente</span>
                <span>Estado</span>
              </div>
              <EstadoVacio texto="Sin registros recientes conectados." />
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
