
"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../auth/AuthContext";

type EstadoPlan = "Activo" | "Inactivo";
type ModalidadPlan = "Individual" | "Compartido";

type Plan = {
  id: number;
  nombre: string;
  descripcion: string | null;
  duracionMeses: number | null;
  sesiones: number | null;
  precio: string | number | null;
  modalidad: ModalidadPlan | null;
  estado: EstadoPlan;
};

type FormularioPlan = {
  nombre: string;
  descripcion: string;
  duracionMeses: string;
  sesiones: string;
  precio: string;
  modalidad: ModalidadPlan | "";
};

const API_URL = "http://localhost:3001/api/planes";
const POR_PAGINA = 10;

const FORMULARIO_INICIAL: FormularioPlan = {
  nombre: "",
  descripcion: "",
  duracionMeses: "",
  sesiones: "",
  precio: "",
  modalidad: "",
};

function obtenerError(error: unknown, mensaje: string) {
  if (axios.isAxiosError(error)) {
    const respuesta = error.response?.data;

    if (typeof respuesta?.mensaje === "string") {
      return respuesta.mensaje;
    }

    if (error.response?.status === 401) {
      return "Tu sesión expiró. Inicia sesión nuevamente.";
    }

    if (error.response?.status === 403) {
      return "No tienes permisos para esta operación.";
    }
  }

  return mensaje;
}

function mostrarPrecio(precio: Plan["precio"]) {
  if (precio === null || precio === "") {
    return "Sin precio";
  }

  const valor = Number(precio);

  return Number.isFinite(valor)
    ? `$${valor.toLocaleString("es-CL")}`
    : "Sin precio";
}

function mostrarValorPorClase(precio: Plan["precio"], sesiones: Plan["sesiones"]) {
  const total = Number(precio);
  if (precio === null || sesiones === null || sesiones <= 0 || !Number.isFinite(total)) {
    return "Sin calcular";
  }
  return `$${Math.round(total / sesiones).toLocaleString("es-CL")}`;
}

export default function PlanesPage() {
  const router = useRouter();
  const { usuario, token, cargando } = useAuth();

  const [planes, setPlanes] = useState<Plan[]>([]);
  const [formulario, setFormulario] =
    useState<FormularioPlan>({ ...FORMULARIO_INICIAL });

  const [planEditandoId, setPlanEditandoId] =
    useState<number | null>(null);
  const [planDetalle, setPlanDetalle] =
    useState<Plan | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroModalidad, setFiltroModalidad] =
    useState("Todas");
  const [paginaActual, setPaginaActual] = useState(1);

  const [cargandoPlanes, setCargandoPlanes] =
    useState(true);
  const [guardando, setGuardando] = useState(false);
  const [cambiandoId, setCambiandoId] =
    useState<number | null>(null);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const esAdmin = usuario?.rol === "admin";

  useEffect(() => {
    if (cargando) return;

    if (!usuario) {
      router.replace("/login");
      return;
    }

    if (!esAdmin) {
      router.replace("/mi-cuenta");
    }
  }, [cargando, usuario, esAdmin, router]);

  const cargarPlanes = useCallback(async () => {
    if (!token) return;

    const respuesta = await axios.get<Plan[]>(
      API_URL,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    setPlanes(respuesta.data);
  }, [token]);

  useEffect(() => {
    if (cargando || !esAdmin || !token) return;

    let activo = true;

    async function iniciarCarga() {
      try {
        await cargarPlanes();
        if (activo) setError("");
      } catch (err) {
        if (activo) {
          setError(
            obtenerError(
              err,
              "No se pudieron cargar los planes."
            )
          );
        }
      } finally {
        if (activo) setCargandoPlanes(false);
      }
    }

    void iniciarCarga();

    return () => {
      activo = false;
    };
  }, [cargando, esAdmin, token, cargarPlanes]);

  function cambiarCampo<K extends keyof FormularioPlan>(
    campo: K,
    valor: FormularioPlan[K]
  ) {
    setFormulario((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }

  function limpiarFormulario() {
    setFormulario({ ...FORMULARIO_INICIAL });
    setPlanEditandoId(null);
  }

  function editarPlan(plan: Plan) {
    setFormulario({
      nombre: plan.nombre,
      descripcion: plan.descripcion ?? "",
      duracionMeses:
        plan.duracionMeses?.toString() ?? "",
      sesiones: plan.sesiones?.toString() ?? "",
      precio: plan.precio?.toString() ?? "",
      modalidad: plan.modalidad ?? "",
    });

    setPlanEditandoId(plan.id);
    setPlanDetalle(null);
    setError("");
    setMensaje("");

    document
      .getElementById("formulario-planes")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }

  async function guardarPlan(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    if (!token || !esAdmin || guardando) return;

    setError("");
    setMensaje("");

    if (!formulario.nombre.trim()) {
      setError("El nombre del plan es obligatorio.");
      return;
    }

    const duracion = formulario.duracionMeses
      ? Number(formulario.duracionMeses)
      : null;

    const sesiones = formulario.sesiones
      ? Number(formulario.sesiones)
      : null;

    const precio = formulario.precio
      ? Number(formulario.precio)
      : null;

    if (
      (duracion !== null &&
        (!Number.isSafeInteger(duracion) || duracion < 1)) ||
      (sesiones !== null &&
        (!Number.isSafeInteger(sesiones) || sesiones < 1))
    ) {
      setError(
        "La duración y las sesiones deben ser números enteros mayores que cero."
      );
      return;
    }

    if (
      precio !== null &&
      (!Number.isFinite(precio) || precio < 0)
    ) {
      setError("Ingresa un precio válido.");
      return;
    }

    const datos = {
      nombre: formulario.nombre.trim(),
      descripcion:
        formulario.descripcion.trim() || null,
      duracionMeses: duracion,
      sesiones,
      precio,
      modalidad: formulario.modalidad || null,
    };

    setGuardando(true);

    try {
      const configuracion = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      if (planEditandoId !== null) {
        await axios.put(
          `${API_URL}/${planEditandoId}`,
          datos,
          configuracion
        );
      } else {
        await axios.post(
          API_URL,
          datos,
          configuracion
        );
      }

      await cargarPlanes();

      setMensaje(
        planEditandoId !== null
          ? "Plan actualizado correctamente."
          : "Plan registrado correctamente."
      );

      limpiarFormulario();
    } catch (err) {
      setError(
        obtenerError(
          err,
          "No se pudo guardar el plan."
        )
      );
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(plan: Plan) {
    if (!token || !esAdmin || cambiandoId !== null) {
      return;
    }

    const nuevoEstado: EstadoPlan =
      plan.estado === "Activo"
        ? "Inactivo"
        : "Activo";

    const confirmado = window.confirm(
      `¿Deseas ${nuevoEstado === "Activo" ? "activar" : "desactivar"} el plan "${plan.nombre}"?`
    );

    if (!confirmado) return;

    setCambiandoId(plan.id);
    setError("");
    setMensaje("");

    try {
      await axios.put(
        `${API_URL}/${plan.id}`,
        { estado: nuevoEstado },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      await cargarPlanes();

      setPlanDetalle(null);
      setMensaje(
        `Plan ${nuevoEstado.toLowerCase()} correctamente.`
      );
    } catch (err) {
      setError(
        obtenerError(
          err,
          "No se pudo cambiar el estado del plan."
        )
      );
    } finally {
      setCambiandoId(null);
    }
  }

  async function actualizarPlanes() {
    setCargandoPlanes(true);
    setError("");

    try {
      await cargarPlanes();
    } catch (err) {
      setError(
        obtenerError(
          err,
          "No se pudieron actualizar los planes."
        )
      );
    } finally {
      setCargandoPlanes(false);
    }
  }

  const indicadores = useMemo(
    () => ({
      total: planes.length,
      activos: planes.filter(
        (plan) => plan.estado === "Activo"
      ).length,
      inactivos: planes.filter(
        (plan) => plan.estado === "Inactivo"
      ).length,
      compartidos: planes.filter(
        (plan) => plan.modalidad === "Compartido"
      ).length,
    }),
    [planes]
  );

  const planesFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return planes.filter((plan) => {
      const coincideBusqueda = [
        plan.nombre,
        plan.descripcion ?? "",
        plan.modalidad ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(texto);

      const coincideEstado =
        filtroEstado === "Todos" ||
        plan.estado === filtroEstado;

      const coincideModalidad =
        filtroModalidad === "Todas" ||
        (filtroModalidad === "Sin modalidad"
          ? plan.modalidad === null
          : plan.modalidad === filtroModalidad);

      return (
        coincideBusqueda &&
        coincideEstado &&
        coincideModalidad
      );
    });
  }, [
    planes,
    busqueda,
    filtroEstado,
    filtroModalidad,
  ]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(planesFiltrados.length / POR_PAGINA)
  );

  const paginaSegura = Math.min(
    paginaActual,
    totalPaginas
  );

  const planesPaginados = planesFiltrados.slice(
    (paginaSegura - 1) * POR_PAGINA,
    paginaSegura * POR_PAGINA
  );

  if (cargando || !usuario || !esAdmin) {
    return (
      <main className="admin-clientes">
        <p>
          {cargando
            ? "Cargando..."
            : "Verificando acceso..."}
        </p>
      </main>
    );
  }

  return (
    <main className="admin-clientes admin-modulo planes-pagina">

      <style jsx global>{`
        .planes-pagina { background:#000 !important; color:#fff !important; min-height:100vh; padding:32px 22px 60px; }
        .planes-pagina .admin-modulo-contenedor { max-width:1600px; margin:0 auto; }
        .planes-pagina .admin-modulo-encabezado { display:flex; justify-content:space-between; align-items:flex-start; gap:20px; margin-bottom:28px; }
        .planes-pagina .admin-modulo-etiqueta { color:#dc2626; font-size:12px; font-weight:800; letter-spacing:2px; }
        .planes-pagina .admin-modulo-titulo { color:#fff; font-size:clamp(28px,3vw,40px); font-weight:800; margin:8px 0; }
        .planes-pagina .admin-modulo-titulo span { color:#dc2626; }
        .planes-pagina .admin-modulo-descripcion { color:#aaa; font-size:14px; }
        .planes-pagina .planes-volver { display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; background:#252529 !important; color:#fff !important; border:1px solid #45454b; border-radius:9px; padding:13px 19px; text-decoration:none; font-size:13px; font-weight:700; transition:none; }
        .planes-pagina .planes-volver:hover { background:#252529 !important; color:#fff !important; border-color:#45454b !important; }
        .planes-pagina .admin-modulo-resumen { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:16px; margin-bottom:24px; }
        .planes-pagina .admin-modulo-indicador { background:#0c0c0d !important; border:1px solid #28282c !important; border-left:4px solid #dc2626 !important; border-radius:12px; padding:21px; display:flex; flex-direction:column; gap:10px; }
        .planes-pagina .admin-modulo-indicador span { color:#b8b8be; font-size:13px; }
        .planes-pagina .admin-modulo-indicador strong { color:#fff; font-size:30px; font-weight:800; }
        .planes-pagina .admin-modulo-distribucion { display:grid; grid-template-columns:minmax(300px,0.9fr) minmax(0,1.7fr); gap:22px; align-items:start; }
        .planes-pagina .admin-modulo-panel { background:#0c0c0d !important; border:1px solid #29292e !important; border-radius:13px; padding:24px; min-width:0; }
        .planes-pagina .admin-modulo-panel-titulo { color:#fff; font-size:20px; font-weight:800; margin:0 0 12px; }
        .planes-pagina .admin-modulo-formulario { display:flex; flex-direction:column; gap:16px; margin-top:22px; }
        .planes-pagina .admin-modulo-campo { display:flex; flex-direction:column; gap:7px; }
        .planes-pagina .admin-modulo-campo label { color:#e5e5e5; font-size:13px; font-weight:650; }
        .planes-pagina .admin-modulo-campo input, .planes-pagina .admin-modulo-campo textarea, .planes-pagina .admin-modulo-campo select, .planes-pagina .admin-modulo-buscador { background:#171719 !important; color:#fff !important; border:1px solid #38383d !important; border-radius:8px; padding:11px 12px; width:100%; min-width:0; color-scheme:dark; }
        .planes-pagina input::placeholder, .planes-pagina textarea::placeholder { color:#888 !important; }
        .planes-pagina input:focus, .planes-pagina textarea:focus, .planes-pagina select:focus { outline:1px solid #dc2626; border-color:#dc2626 !important; }
        .planes-pagina .admin-modulo-acciones, .planes-pagina .planes-tabla-acciones { display:flex; gap:8px; flex-wrap:wrap; }
        .planes-pagina .fp-btn { border-radius:8px; padding:10px 13px; font-weight:700; font-size:12px; cursor:pointer; }
        .planes-pagina .fp-btn-primary, .planes-pagina .admin-modulo-boton--principal { background:#dc2626 !important; color:#fff !important; border:1px solid #dc2626 !important; }
        .planes-pagina .fp-btn-secondary { background:#242427 !important; color:#fff !important; border:1px solid #45454a !important; }
        .planes-pagina .fp-btn-danger { background:#451717 !important; color:#fff !important; border:1px solid #a52b2b !important; }
        .planes-pagina .fp-btn:disabled { opacity:.5; cursor:not-allowed; }
        .planes-pagina .planes-listado-encabezado { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:18px; }
        .planes-pagina .planes-filtros { display:grid; grid-template-columns:minmax(0,1.5fr) repeat(2,minmax(0,1fr)); gap:10px; margin-bottom:18px; }
        .planes-pagina .admin-modulo-tabla-contenedor { overflow-x:auto; border:1px solid #29292e; border-radius:10px; }
        .planes-pagina .admin-modulo-tabla { width:100%; border-collapse:collapse; color:#eaeaea; font-size:13px; }
        .planes-pagina .admin-modulo-tabla th { background:#19191c; color:#c9c9cf; text-align:left; padding:14px 12px; white-space:nowrap; }
        .planes-pagina .admin-modulo-tabla td { padding:14px 12px; border-top:1px solid #2c2c31; vertical-align:middle; }
        .planes-pagina .admin-modulo-tabla tbody tr:hover { background:#151518; }
        .planes-pagina .admin-modulo-tabla td p { margin:4px 0 0; color:#999; }
        .planes-pagina .planes-valor-clase { color:#fff; font-weight:800; white-space:nowrap; }
        .planes-pagina .planes-valor-leyenda { display:block; margin-top:5px; color:#ef4444; font-size:11px; font-weight:650; }
        .planes-pagina .admin-modulo-estado { display:inline-flex; padding:5px 9px; border-radius:6px; font-size:12px; font-weight:700; background:#3b1c1c; color:#ff9d9d; }
        .planes-pagina .admin-modulo-estado--activo { background:#173b2a; color:#80d8a4; }
        .planes-pagina .admin-modulo-vacio { padding:32px; color:#aaa; text-align:center; }
        .planes-pagina .clientes-paginacion { display:flex; justify-content:center; align-items:center; gap:14px; padding-top:20px; color:#ddd; }
        .planes-pagina .admin-alert { display:flex; justify-content:space-between; align-items:center; gap:12px; border-radius:8px; padding:12px 16px; margin-bottom:16px; color:#fff; }
        .planes-pagina .admin-alert-error { background:#451818; border:1px solid #a32b2b; }
        .planes-pagina .admin-alert-success { background:#163c28; border:1px solid #34734c; }
        .planes-pagina .clientes-modal-overlay { position:fixed; inset:0; z-index:1000; background:rgba(0,0,0,.78); display:flex; align-items:center; justify-content:center; padding:20px; }
        .planes-pagina .clientes-modal { width:min(100%,520px); max-height:90vh; overflow:auto; background:#111113 !important; border:1px solid #39393d; border-radius:14px; padding:26px; color:#fff; }
        .planes-pagina .clientes-modal h2 { color:#fff; margin:0 0 18px; }
        .planes-pagina .clientes-detalles p { color:#ddd; padding:8px 0; margin:0; border-bottom:1px solid #29292d; }
        .planes-pagina .clientes-modal-acciones { display:flex; justify-content:flex-end; gap:10px; margin-top:22px; }
        @media(max-width:1050px) { .planes-pagina .admin-modulo-distribucion { grid-template-columns:1fr; } }
        @media(max-width:700px) { .planes-pagina { padding:22px 12px 42px; } .planes-pagina .admin-modulo-encabezado { flex-direction:column; } .planes-pagina .admin-modulo-resumen { grid-template-columns:repeat(2,minmax(0,1fr)); } .planes-pagina .planes-filtros { grid-template-columns:1fr; } .planes-pagina .admin-modulo-panel { padding:16px; } }
      `}</style>

      <div className="admin-modulo-contenedor">
        {/* ENCABEZADO */}
        <header className="admin-modulo-encabezado">
          <div>
            <p className="admin-modulo-etiqueta">
              FOCUS POWER FIT
            </p>

            <h1 className="admin-modulo-titulo">
              Gestión de <span>Planes</span>
            </h1>

            <p className="admin-modulo-descripcion">
              Crea, edita y administra los planes de
              entrenamiento del gimnasio.
            </p>
          </div>

          <Link
            href="/admin"
            className="planes-volver"
          >
            Volver al panel
          </Link>
        </header>

        {/* MENSAJES */}
        {error && (
          <div
            className="admin-alert admin-alert-error"
            role="alert"
          >
            <span>{error}</span>

            <button
              type="button"
              className="fp-btn fp-btn-secondary"
              onClick={() => setError("")}
            >
              Cerrar
            </button>
          </div>
        )}

        {mensaje && (
          <div
            className="admin-alert admin-alert-success"
            role="status"
          >
            <span>{mensaje}</span>

            <button
              type="button"
              className="fp-btn fp-btn-secondary"
              onClick={() => setMensaje("")}
            >
              Cerrar
            </button>
          </div>
        )}

        {/* INDICADORES */}
        <section
          className="admin-modulo-resumen planes-resumen"
          aria-label="Resumen de planes"
        >
          <article className="admin-modulo-indicador">
            <span>Total de planes</span>
            <strong>
              {cargandoPlanes ? "—" : indicadores.total}
            </strong>
          </article>

          <article className="admin-modulo-indicador">
            <span>Planes activos</span>
            <strong>
              {cargandoPlanes ? "—" : indicadores.activos}
            </strong>
          </article>

          <article className="admin-modulo-indicador">
            <span>Planes inactivos</span>
            <strong>
              {cargandoPlanes ? "—" : indicadores.inactivos}
            </strong>
          </article>

          <article className="admin-modulo-indicador">
            <span>Planes compartidos</span>
            <strong>
              {cargandoPlanes
                ? "—"
                : indicadores.compartidos}
            </strong>
          </article>
        </section>

        <div className="admin-modulo-distribucion planes-distribucion">
          {/* FORMULARIO */}
          <section
            id="formulario-planes"
            className="admin-modulo-panel planes-panel"
          >
            <h2 className="admin-modulo-panel-titulo">
              {planEditandoId !== null
                ? "Editar plan"
                : "Registrar plan"}
            </h2>

            <p className="admin-modulo-descripcion">
              Configura las características del plan
              de entrenamiento.
            </p>

            <form
              onSubmit={guardarPlan}
              className="admin-modulo-formulario planes-formulario"
            >
              <div className="admin-modulo-campo">
                <label htmlFor="plan-nombre">
                  Nombre del plan *
                </label>

                <input
                  id="plan-nombre"
                  type="text"
                  required
                  value={formulario.nombre}
                  onChange={(evento) =>
                    cambiarCampo(
                      "nombre",
                      evento.target.value
                    )
                  }
                  placeholder="Ej: Plan mensual"
                />
              </div>

              <div className="admin-modulo-campo">
                <label htmlFor="plan-descripcion">
                  Descripción
                </label>

                <textarea
                  id="plan-descripcion"
                  rows={4}
                  value={formulario.descripcion}
                  onChange={(evento) =>
                    cambiarCampo(
                      "descripcion",
                      evento.target.value
                    )
                  }
                  placeholder="Describe los beneficios y características del plan..."
                />
              </div>

              <div className="admin-modulo-campo">
                <label htmlFor="plan-duracion">
                  Duración (meses)
                </label>

                <input
                  id="plan-duracion"
                  type="number"
                  min="1"
                  step="1"
                  value={formulario.duracionMeses}
                  onChange={(evento) =>
                    cambiarCampo(
                      "duracionMeses",
                      evento.target.value
                    )
                  }
                  placeholder="Ej: 1"
                />
              </div>

              <div className="admin-modulo-campo">
                <label htmlFor="plan-sesiones">
                  Cantidad de sesiones
                </label>

                <input
                  id="plan-sesiones"
                  type="number"
                  min="1"
                  step="1"
                  value={formulario.sesiones}
                  onChange={(evento) =>
                    cambiarCampo(
                      "sesiones",
                      evento.target.value
                    )
                  }
                  placeholder="Ej: 12"
                />
              </div>

              <div className="admin-modulo-campo">
                <label htmlFor="plan-precio">
                  Precio (CLP)
                </label>

                <input
                  id="plan-precio"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formulario.precio}
                  onChange={(evento) =>
                    cambiarCampo(
                      "precio",
                      evento.target.value
                    )
                  }
                  placeholder="Ej: 45000"
                />
              </div>

              <div className="admin-modulo-campo">
                <label>Valor por clase (calculado automáticamente)</label>
                <div className="planes-valor-clase">
                  {mostrarValorPorClase(
                    formulario.precio === "" ? null : formulario.precio,
                    formulario.sesiones === "" ? null : Number(formulario.sesiones)
                  )}
                  <span className="planes-valor-leyenda">Úsalas cuando quieras</span>
                </div>
              </div>

              <div className="admin-modulo-campo">
                <label htmlFor="plan-modalidad">
                  Modalidad
                </label>

                <select
                  id="plan-modalidad"
                  value={formulario.modalidad}
                  onChange={(evento) =>
                    cambiarCampo(
                      "modalidad",
                      evento.target
                        .value as ModalidadPlan | ""
                    )
                  }
                >
                  <option value="">
                    Seleccionar modalidad
                  </option>
                  <option value="Individual">
                    Individual
                  </option>
                  <option value="Compartido">
                    Compartido
                  </option>
                </select>
              </div>

              <div className="admin-modulo-acciones planes-formulario-acciones">
                <button
                  type="submit"
                  disabled={guardando}
                  className="admin-modulo-boton admin-modulo-boton--principal fp-btn fp-btn-primary"
                >
                  {guardando
                    ? "Guardando..."
                    : planEditandoId !== null
                      ? "Guardar cambios"
                      : "Registrar plan"}
                </button>

                <button
                  type="button"
                  disabled={guardando}
                  onClick={limpiarFormulario}
                  className="fp-btn fp-btn-secondary"
                >
                  {planEditandoId !== null
                    ? "Cancelar edición"
                    : "Limpiar formulario"}
                </button>
              </div>
            </form>
          </section>

          {/* LISTADO */}
          <section className="admin-modulo-panel planes-panel">
            <div className="planes-listado-encabezado">
              <div>
                <h2 className="admin-modulo-panel-titulo">
                  Planes registrados
                </h2>

                <p className="admin-modulo-descripcion">
                  Mostrando {planesFiltrados.length} de{" "}
                  {planes.length} planes
                </p>
              </div>

              <button
                type="button"
                className="fp-btn fp-btn-secondary"
                disabled={cargandoPlanes}
                onClick={() => void actualizarPlanes()}
              >
                Actualizar
              </button>
            </div>

            {/* FILTROS */}
            <div className="planes-filtros">
              <input
                type="search"
                className="admin-modulo-buscador"
                placeholder="Buscar plan..."
                aria-label="Buscar planes"
                value={busqueda}
                onChange={(evento) => {
                  setBusqueda(evento.target.value);
                  setPaginaActual(1);
                }}
              />

              <select
                className="admin-modulo-buscador"
                aria-label="Filtrar por estado"
                value={filtroEstado}
                onChange={(evento) => {
                  setFiltroEstado(evento.target.value);
                  setPaginaActual(1);
                }}
              >
                <option value="Todos">
                  Todos los estados
                </option>
                <option value="Activo">
                  Activos
                </option>
                <option value="Inactivo">
                  Inactivos
                </option>
              </select>

              <select
                className="admin-modulo-buscador"
                aria-label="Filtrar por modalidad"
                value={filtroModalidad}
                onChange={(evento) => {
                  setFiltroModalidad(evento.target.value);
                  setPaginaActual(1);
                }}
              >
                <option value="Todas">
                  Todas las modalidades
                </option>
                <option value="Individual">
                  Individual
                </option>
                <option value="Compartido">
                  Compartido
                </option>
                <option value="Sin modalidad">
                  Sin modalidad
                </option>
              </select>
            </div>

            {cargandoPlanes ? (
              <div className="admin-modulo-vacio">
                Cargando planes...
              </div>
            ) : planesFiltrados.length === 0 ? (
              <div className="admin-modulo-vacio">
                No se encontraron planes.
              </div>
            ) : (
              <>
                <div className="admin-modulo-tabla-contenedor">
                  <table className="admin-modulo-tabla">
                    <thead>
                      <tr>
                        <th>Plan</th>
                        <th>Duración</th>
                        <th>Sesiones</th>
                        <th>Precio</th>
                        <th>Valor por clase</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>

                    <tbody>
                      {planesPaginados.map((plan) => (
                        <tr key={plan.id}>
                          <td>
                            <strong>{plan.nombre}</strong>
                            <p className="text-gray-400">
                              {plan.modalidad ??
                                "Sin modalidad"}
                            </p>
                          </td>

                          <td>
                            {plan.duracionMeses !== null
                              ? `${plan.duracionMeses} mes${plan.duracionMeses === 1 ? "" : "es"}`
                              : "Sin duración"}
                          </td>

                          <td>
                            {plan.sesiones ?? "Sin sesiones"}
                          </td>

                          <td>
                            <strong>
                              {mostrarPrecio(plan.precio)}
                            </strong>
                          </td>

                          <td>
                            <strong className="planes-valor-clase">
                              {mostrarValorPorClase(plan.precio, plan.sesiones)}
                            </strong>
                            <span className="planes-valor-leyenda">Úsalas cuando quieras</span>
                          </td>

                          <td>
                            <span
                              className={
                                plan.estado === "Activo"
                                  ? "admin-modulo-estado admin-modulo-estado--activo"
                                  : "admin-modulo-estado admin-modulo-estado--inactivo"
                              }
                            >
                              {plan.estado}
                            </span>
                          </td>

                          <td>
                            <div className="planes-tabla-acciones">
                              <button
                                type="button"
                                className="fp-btn fp-btn-secondary"
                                onClick={() =>
                                  setPlanDetalle(plan)
                                }
                              >
                                Ver
                              </button>

                              <button
                                type="button"
                                className="fp-btn fp-btn-secondary"
                                onClick={() => editarPlan(plan)}
                              >
                                Editar
                              </button>

                              <button
                                type="button"
                                className={
                                  plan.estado === "Activo"
                                    ? "fp-btn fp-btn-danger"
                                    : "fp-btn fp-btn-primary"
                                }
                                disabled={cambiandoId !== null}
                                onClick={() =>
                                  void cambiarEstado(plan)
                                }
                              >
                                {cambiandoId === plan.id
                                  ? "Procesando..."
                                  : plan.estado === "Activo"
                                    ? "Desactivar"
                                    : "Activar"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPaginas > 1 && (
                  <div className="clientes-paginacion planes-paginacion">
                    <button
                      type="button"
                      className="fp-btn fp-btn-secondary"
                      disabled={paginaSegura === 1}
                      onClick={() =>
                        setPaginaActual(
                          Math.max(1, paginaSegura - 1)
                        )
                      }
                    >
                      Anterior
                    </button>

                    <span>
                      Página {paginaSegura} de{" "}
                      {totalPaginas}
                    </span>

                    <button
                      type="button"
                      className="fp-btn fp-btn-secondary"
                      disabled={
                        paginaSegura === totalPaginas
                      }
                      onClick={() =>
                        setPaginaActual(
                          Math.min(
                            totalPaginas,
                            paginaSegura + 1
                          )
                        )
                      }
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>

        {/* DETALLE DEL PLAN */}
        {planDetalle && (
          <div
            className="clientes-modal-overlay"
            onClick={() => setPlanDetalle(null)}
          >
            <div
              className="clientes-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="detalle-plan-titulo"
              onClick={(evento) =>
                evento.stopPropagation()
              }
            >
              <h2 id="detalle-plan-titulo">
                Detalle del plan
              </h2>

              <div className="clientes-detalles">
                <p>
                  <strong>Nombre:</strong>{" "}
                  {planDetalle.nombre}
                </p>

                <p>
                  <strong>Descripción:</strong>{" "}
                  {planDetalle.descripcion ||
                    "Sin descripción"}
                </p>

                <p>
                  <strong>Duración:</strong>{" "}
                  {planDetalle.duracionMeses !== null
                    ? `${planDetalle.duracionMeses} meses`
                    : "Sin duración"}
                </p>

                <p>
                  <strong>Sesiones:</strong>{" "}
                  {planDetalle.sesiones ??
                    "Sin sesiones"}
                </p>

                <p>
                  <strong>Precio:</strong>{" "}
                  {mostrarPrecio(planDetalle.precio)}
                </p>

                <p>
                  <strong>Valor por clase:</strong>{" "}
                  {mostrarValorPorClase(planDetalle.precio, planDetalle.sesiones)}
                  <span className="planes-valor-leyenda">Úsalas cuando quieras</span>
                </p>

                <p>
                  <strong>Modalidad:</strong>{" "}
                  {planDetalle.modalidad ||
                    "Sin modalidad"}
                </p>

                <p>
                  <strong>Estado:</strong>{" "}
                  {planDetalle.estado}
                </p>
              </div>

              <div className="clientes-modal-acciones">
                <button
                  type="button"
                  className="fp-btn fp-btn-secondary"
                  onClick={() => setPlanDetalle(null)}
                >
                  Cerrar
                </button>

                <button
                  type="button"
                  className="fp-btn fp-btn-primary"
                  onClick={() => editarPlan(planDetalle)}
                >
                  Editar plan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
