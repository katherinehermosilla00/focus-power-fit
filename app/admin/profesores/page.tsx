
"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../auth/AuthContext";

type EstadoProfesor = "Activo" | "Inactivo";
type TurnoProfesor = "AM" | "PM" | "AM y PM";

type Sucursal = {
  id: number;
  nombre: string;
  comuna: string | null;
  estado: "Activa" | "Inactiva";
};

type Profesor = {
  id: number;
  sucursalId: number | null;
  nombre: string;
  rut: string | null;
  email: string | null;
  telefono: string | null;
  turno: TurnoProfesor | null;
  instagram: string | null;
  especialidad: string | null;
  estado: EstadoProfesor;
  sucursal?: Sucursal | null;
};

type FormularioProfesor = {
  nombre: string;
  rut: string;
  email: string;
  telefono: string;
  turno: TurnoProfesor | "";
  especialidad: string;
  instagram: string;
  sucursalId: string;
};

const API_PROFESORES =
  "http://localhost:3001/api/profesores";
const API_SUCURSALES =
  "http://localhost:3001/api/sucursales/admin";
const POR_PAGINA = 10;

const FORMULARIO_INICIAL: FormularioProfesor = {
  nombre: "",
  rut: "",
  email: "",
  telefono: "",
  turno: "",
  especialidad: "",
  instagram: "",
  sucursalId: "",
};

function iniciales(nombre: string) {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join("");
}

function mensajeError(error: unknown, defecto: string) {
  if (axios.isAxiosError(error)) {
    const mensaje = error.response?.data?.mensaje;

    if (typeof mensaje === "string") return mensaje;

    if (error.response?.status === 401) {
      return "Tu sesión expiró. Inicia sesión nuevamente.";
    }

    if (error.response?.status === 403) {
      return "No tienes permisos para realizar esta operación.";
    }
  }

  return defecto;
}

function AvatarProfesor({
  nombre,
  grande = false,
}: {
  nombre: string;
  grande?: boolean;
}) {
  return (
    <div
      className={`profesores-avatar ${
        grande ? "profesores-avatar--grande" : ""
      }`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        width: grande ? 76 : 52,
        height: grande ? 76 : 52,
        borderRadius: "50%",
        background: "#292929",
        border: "1px solid #555",
        color: "#fff",
        fontWeight: 800,
        fontSize: grande ? 24 : 16,
      }}
      aria-label={`Avatar de ${nombre}`}
    >
      {iniciales(nombre)}
    </div>
  );
}

export default function ProfesoresPage() {
  const router = useRouter();
  const { usuario, token, cargando } = useAuth();

  const formularioRef = useRef<HTMLDivElement>(null);

  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);

  const [formulario, setFormulario] =
    useState<FormularioProfesor>({
      ...FORMULARIO_INICIAL,
    });

  const [profesorEditandoId, setProfesorEditandoId] =
    useState<number | null>(null);

  const [profesorDetalle, setProfesorDetalle] =
    useState<Profesor | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [sucursalFiltro, setSucursalFiltro] =
    useState("todas");
  const [estadoFiltro, setEstadoFiltro] =
    useState("todos");
  const [turnoFiltro, setTurnoFiltro] =
    useState("todos");
  const [paginaActual, setPaginaActual] = useState(1);

  const [cargandoProfesores, setCargandoProfesores] =
    useState(true);
  const [guardando, setGuardando] = useState(false);
  const [procesandoId, setProcesandoId] =
    useState<number | null>(null);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const esAdmin = usuario?.rol === "admin";

  const authConfig = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
    [token]
  );

  useEffect(() => {
    if (cargando) return;

    if (!usuario) {
      router.replace("/login");
    } else if (!esAdmin) {
      router.replace("/mi-cuenta");
    }
  }, [cargando, usuario, esAdmin, router]);

  const cargarDatos = useCallback(async () => {
    const [respuestaProfesores, respuestaSucursales] =
      await Promise.all([
        axios.get<Profesor[]>(
          API_PROFESORES,
          authConfig
        ),
        axios.get<Sucursal[]>(
          API_SUCURSALES,
          authConfig
        ),
      ]);

    setProfesores(respuestaProfesores.data);
    setSucursales(respuestaSucursales.data);
  }, [authConfig]);

  const cargarProfesores = useCallback(async () => {
    const respuesta = await axios.get<Profesor[]>(
      API_PROFESORES,
      authConfig
    );

    setProfesores(respuesta.data);
  }, [authConfig]);

  useEffect(() => {
    if (cargando || !esAdmin || !token) return;

    let activo = true;

    async function iniciarCarga() {
      try {
        await cargarDatos();

        if (activo) setError("");
      } catch (err) {
        if (activo) {
          setError(
            mensajeError(
              err,
              "No se pudieron cargar los profesores o las sucursales."
            )
          );
        }
      } finally {
        if (activo) setCargandoProfesores(false);
      }
    }

    void iniciarCarga();

    return () => {
      activo = false;
    };
  }, [cargando, esAdmin, token, cargarDatos]);

  function cambiarCampo<K extends keyof FormularioProfesor>(
    campo: K,
    valor: FormularioProfesor[K]
  ) {
    setFormulario((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }

  function limpiarFormulario() {
    setFormulario({ ...FORMULARIO_INICIAL });
    setProfesorEditandoId(null);
  }

  function editarProfesor(profesor: Profesor) {
    setFormulario({
      nombre: profesor.nombre ?? "",
      rut: profesor.rut ?? "",
      email: profesor.email ?? "",
      telefono: profesor.telefono ?? "",
      turno: profesor.turno ?? "",
      especialidad: profesor.especialidad ?? "",
      instagram: profesor.instagram ?? "",
      sucursalId:
        profesor.sucursalId !== null
          ? String(profesor.sucursalId)
          : "",
    });

    setProfesorEditandoId(profesor.id);
    setProfesorDetalle(null);
    setError("");
    setMensaje(`Editando a ${profesor.nombre}`);

    requestAnimationFrame(() => {
      formularioRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  async function guardarProfesor(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    if (!token || !esAdmin || guardando) return;

    setError("");
    setMensaje("");

    if (!formulario.nombre.trim()) {
      setError("Debes ingresar el nombre del profesor.");
      return;
    }

    if (
      !formulario.sucursalId &&
      profesorEditandoId === null
    ) {
      setError("Debes seleccionar una sucursal.");
      return;
    }

    const datosProfesor = {
      nombre: formulario.nombre.trim(),
      rut: formulario.rut.trim() || null,
      email: formulario.email.trim() || null,
      telefono: formulario.telefono.trim() || null,
      turno: formulario.turno || null,
      especialidad:
        formulario.especialidad.trim() || null,
      instagram:
        formulario.instagram.trim() || null,
      sucursalId: formulario.sucursalId
        ? Number(formulario.sucursalId)
        : null,
    };

    setGuardando(true);

    try {
      if (profesorEditandoId !== null) {
        await axios.put(
          `${API_PROFESORES}/${profesorEditandoId}`,
          datosProfesor,
          authConfig
        );
      } else {
        await axios.post(
          API_PROFESORES,
          datosProfesor,
          authConfig
        );
      }

      await cargarProfesores();

      setMensaje(
        profesorEditandoId !== null
          ? "Profesor actualizado correctamente."
          : "Profesor registrado correctamente."
      );

      limpiarFormulario();
    } catch (err) {
      setError(
        mensajeError(
          err,
          "No se pudo guardar el profesor."
        )
      );
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(profesor: Profesor) {
    if (!token || procesandoId !== null) return;

    const nuevoEstado: EstadoProfesor =
      profesor.estado === "Activo"
        ? "Inactivo"
        : "Activo";

    const confirmado = window.confirm(
      `¿Deseas ${
        nuevoEstado === "Activo"
          ? "activar"
          : "desactivar"
      } a ${profesor.nombre}?`
    );

    if (!confirmado) return;

    setProcesandoId(profesor.id);
    setError("");
    setMensaje("");

    try {
      await axios.put(
        `${API_PROFESORES}/${profesor.id}`,
        { estado: nuevoEstado },
        authConfig
      );

      await cargarProfesores();

      setProfesorDetalle(null);
      setMensaje(
        `${profesor.nombre}: estado actualizado a ${nuevoEstado}.`
      );
    } catch (err) {
      setError(
        mensajeError(
          err,
          "No se pudo cambiar el estado del profesor."
        )
      );
    } finally {
      setProcesandoId(null);
    }
  }

  async function eliminarProfesor(profesor: Profesor) {
    if (!token || procesandoId !== null) return;

    const confirmado = window.confirm(
      `¿Seguro que deseas eliminar a ${profesor.nombre}?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmado) return;

    setProcesandoId(profesor.id);
    setError("");
    setMensaje("");

    try {
      await axios.delete(
        `${API_PROFESORES}/${profesor.id}`,
        authConfig
      );

      await cargarProfesores();

      if (profesorEditandoId === profesor.id) {
        limpiarFormulario();
      }

      setProfesorDetalle(null);
      setMensaje("Profesor eliminado correctamente.");
    } catch (err) {
      setError(
        mensajeError(
          err,
          "No se pudo eliminar el profesor."
        )
      );
    } finally {
      setProcesandoId(null);
    }
  }

  async function actualizarDatos() {
    setCargandoProfesores(true);
    setError("");

    try {
      await cargarDatos();
    } catch (err) {
      setError(
        mensajeError(
          err,
          "No se pudieron actualizar los datos."
        )
      );
    } finally {
      setCargandoProfesores(false);
    }
  }

  const nombreSucursal = useCallback(
    (profesor: Profesor) => {
      return (
        profesor.sucursal?.nombre ||
        sucursales.find(
          (sucursal) => sucursal.id === profesor.sucursalId
        )?.nombre ||
        "Sin sucursal"
      );
    },
    [sucursales]
  );

  const indicadores = useMemo(
    () => ({
      total: profesores.length,
      activos: profesores.filter(
        (profesor) => profesor.estado === "Activo"
      ).length,
      inactivos: profesores.filter(
        (profesor) => profesor.estado === "Inactivo"
      ).length,
      sinSucursal: profesores.filter(
        (profesor) => profesor.sucursalId === null
      ).length,
    }),
    [profesores]
  );

  const profesoresFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return profesores.filter((profesor) => {
      const contenido = [
        profesor.nombre,
        profesor.rut ?? "",
        profesor.email ?? "",
        profesor.telefono ?? "",
        profesor.especialidad ?? "",
        profesor.instagram ?? "",
        profesor.turno ?? "",
        nombreSucursal(profesor),
      ]
        .join(" ")
        .toLowerCase();

      const coincideBusqueda = contenido.includes(texto);

      const coincideSucursal =
        sucursalFiltro === "todas" ||
        (sucursalFiltro === "sin-sucursal"
          ? profesor.sucursalId === null
          : profesor.sucursalId ===
            Number(sucursalFiltro));

      const coincideEstado =
        estadoFiltro === "todos" ||
        profesor.estado === estadoFiltro;

      const coincideTurno =
        turnoFiltro === "todos" ||
        (turnoFiltro === "sin turno"
          ? !profesor.turno
          : profesor.turno === turnoFiltro);

      return (
        coincideBusqueda &&
        coincideSucursal &&
        coincideEstado &&
        coincideTurno
      );
    });
  }, [
    profesores,
    busqueda,
    sucursalFiltro,
    estadoFiltro,
    turnoFiltro,
    nombreSucursal,
  ]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(profesoresFiltrados.length / POR_PAGINA)
  );

  const paginaSegura = Math.min(
    paginaActual,
    totalPaginas
  );

  const profesoresPaginados =
    profesoresFiltrados.slice(
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
    <main className="admin-clientes admin-modulo profesores-pagina">
      <div className="admin-modulo-contenedor">
        {/* ENCABEZADO */}
        <header className="admin-modulo-encabezado">
          <div>
            <p className="admin-modulo-etiqueta">
              FOCUS POWER FIT
            </p>

            <h1 className="admin-modulo-titulo">
              Gestión de <span>Profesores</span>
            </h1>

            <p className="admin-modulo-descripcion">
              Administra el equipo de profesionales,
              sus especialidades, turnos y sucursales.
            </p>
          </div>

          <Link
            href="/admin"
            className="clientes-volver fp-btn fp-btn-volver"
          >
            Volver al panel
          </Link>
        </header>

        {/* RESUMEN */}
        <section
          className="admin-modulo-resumen profesores-resumen"
          aria-label="Resumen de profesores"
        >
          <article className="admin-modulo-indicador">
            <span>Total de profesores</span>
            <strong>
              {cargandoProfesores
                ? "—"
                : indicadores.total}
            </strong>
          </article>

          <article className="admin-modulo-indicador">
            <span>Profesores activos</span>
            <strong>
              {cargandoProfesores
                ? "—"
                : indicadores.activos}
            </strong>
          </article>

          <article className="admin-modulo-indicador">
            <span>Profesores inactivos</span>
            <strong>
              {cargandoProfesores
                ? "—"
                : indicadores.inactivos}
            </strong>
          </article>

          <article className="admin-modulo-indicador">
            <span>Sin sucursal</span>
            <strong>
              {cargandoProfesores
                ? "—"
                : indicadores.sinSucursal}
            </strong>
          </article>
        </section>

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

        <div className="admin-modulo-distribucion profesores-distribucion">
          {/* FORMULARIO */}
          <section
            ref={formularioRef}
            id="formulario-profesores"
            className="admin-modulo-panel profesores-panel"
          >
            <h2 className="admin-modulo-panel-titulo">
              {profesorEditandoId !== null
                ? "Editar profesor"
                : "Registrar profesor"}
            </h2>

            <p className="admin-modulo-descripcion">
              {profesorEditandoId !== null
                ? "Modifica la información del profesional."
                : "Completa los datos del nuevo profesional."}
            </p>

            <form
              onSubmit={guardarProfesor}
              className="admin-modulo-formulario profesores-formulario"
            >
              <div className="admin-modulo-campo">
                <label htmlFor="profesor-nombre">
                  Nombre completo *
                </label>

                <input
                  id="profesor-nombre"
                  type="text"
                  required
                  value={formulario.nombre}
                  onChange={(evento) =>
                    cambiarCampo(
                      "nombre",
                      evento.target.value
                    )
                  }
                  placeholder="Ej: Pedro González"
                />
              </div>

              <div className="admin-modulo-campo">
                <label htmlFor="profesor-rut">
                  RUT (opcional)
                </label>

                <input
                  id="profesor-rut"
                  type="text"
                  value={formulario.rut}
                  onChange={(evento) =>
                    cambiarCampo(
                      "rut",
                      evento.target.value
                    )
                  }
                  placeholder="Ej: 12.345.678-9"
                />
              </div>

              <div className="admin-modulo-campo">
                <label htmlFor="profesor-email">
                  Correo electrónico (opcional)
                </label>

                <input
                  id="profesor-email"
                  type="email"
                  value={formulario.email}
                  onChange={(evento) =>
                    cambiarCampo(
                      "email",
                      evento.target.value
                    )
                  }
                  placeholder="Ej: profesor@correo.cl"
                />
              </div>

              <div className="admin-modulo-campo">
                <label htmlFor="profesor-telefono">
                  Teléfono (opcional)
                </label>

                <input
                  id="profesor-telefono"
                  type="tel"
                  value={formulario.telefono}
                  onChange={(evento) =>
                    cambiarCampo(
                      "telefono",
                      evento.target.value
                    )
                  }
                  placeholder="Ej: +56 9 1234 5678"
                />
              </div>

              <div className="admin-modulo-campo">
                <label htmlFor="profesor-especialidad">
                  Especialidad
                </label>

                <input
                  id="profesor-especialidad"
                  type="text"
                  value={formulario.especialidad}
                  onChange={(evento) =>
                    cambiarCampo(
                      "especialidad",
                      evento.target.value
                    )
                  }
                  placeholder="Ej: Personal Trainer"
                />
              </div>

              <div className="admin-modulo-campo">
                <label htmlFor="profesor-instagram">
                  Instagram
                </label>

                <input
                  id="profesor-instagram"
                  type="text"
                  value={formulario.instagram}
                  onChange={(evento) =>
                    cambiarCampo(
                      "instagram",
                      evento.target.value
                    )
                  }
                  placeholder="Ej: @profesor"
                />
              </div>

              <div className="admin-modulo-campo">
                <label htmlFor="profesor-sucursal">
                  Sucursal
                  {profesorEditandoId === null
                    ? " *"
                    : ""}
                </label>

                <select
                  id="profesor-sucursal"
                  value={formulario.sucursalId}
                  required={profesorEditandoId === null}
                  onChange={(evento) =>
                    cambiarCampo(
                      "sucursalId",
                      evento.target.value
                    )
                  }
                >
                  <option value="">
                    {profesorEditandoId !== null
                      ? "Sin sucursal"
                      : "Seleccionar sucursal"}
                  </option>

                  {sucursales.map((sucursal) => (
                    <option
                      key={sucursal.id}
                      value={sucursal.id}
                    >
                      {sucursal.nombre}
                      {sucursal.comuna
                        ? ` - ${sucursal.comuna}`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-modulo-campo">
                <label htmlFor="profesor-turno">
                  Turno (opcional)
                </label>

                <select
                  id="profesor-turno"
                  value={formulario.turno}
                  onChange={(evento) =>
                    cambiarCampo(
                      "turno",
                      evento.target
                        .value as TurnoProfesor | ""
                    )
                  }
                >
                  <option value="">
                    Sin turno asignado
                  </option>
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                  <option value="AM y PM">
                    AM y PM
                  </option>
                </select>
              </div>

              <div className="profesores-foto-futura">
                <strong>Fotografía del profesor</strong>
                <p>
                  Próximamente podrás agregar una
                  fotografía. Por ahora se mostrará un
                  avatar con las iniciales del nombre.
                </p>
              </div>

              <div className="admin-modulo-acciones profesores-formulario-acciones">
                <button
                  type="submit"
                  disabled={guardando}
                  className="admin-modulo-boton admin-modulo-boton--principal fp-btn fp-btn-primary"
                >
                  {guardando
                    ? "Guardando..."
                    : profesorEditandoId !== null
                      ? "Guardar cambios"
                      : "Registrar profesor"}
                </button>

                <button
                  type="button"
                  disabled={guardando}
                  className="fp-btn fp-btn-secondary"
                  onClick={limpiarFormulario}
                >
                  {profesorEditandoId !== null
                    ? "Cancelar edición"
                    : "Limpiar formulario"}
                </button>
              </div>
            </form>
          </section>

          {/* LISTADO */}
          <section className="admin-modulo-panel profesores-panel">
            <div className="profesores-listado-encabezado">
              <div>
                <h2 className="admin-modulo-panel-titulo">
                  Profesores registrados
                </h2>

                <p className="admin-modulo-descripcion">
                  Mostrando {profesoresFiltrados.length} de{" "}
                  {profesores.length} profesores
                </p>
              </div>

              <button
                type="button"
                className="fp-btn fp-btn-secondary"
                disabled={cargandoProfesores}
                onClick={() => void actualizarDatos()}
              >
                Actualizar
              </button>
            </div>

            {/* FILTROS */}
            <div className="profesores-filtros">
              <input
                type="search"
                className="admin-modulo-buscador"
                placeholder="Buscar profesor, RUT, especialidad..."
                aria-label="Buscar profesores"
                value={busqueda}
                onChange={(evento) => {
                  setBusqueda(evento.target.value);
                  setPaginaActual(1);
                }}
              />

              <select
                className="admin-modulo-buscador"
                aria-label="Filtrar por sucursal"
                value={sucursalFiltro}
                onChange={(evento) => {
                  setSucursalFiltro(evento.target.value);
                  setPaginaActual(1);
                }}
              >
                <option value="todas">
                  Todas las sucursales
                </option>

                {sucursales.map((sucursal) => (
                  <option
                    key={sucursal.id}
                    value={sucursal.id}
                  >
                    {sucursal.nombre}
                  </option>
                ))}

                <option value="sin-sucursal">
                  Sin sucursal
                </option>
              </select>

              <select
                className="admin-modulo-buscador"
                aria-label="Filtrar por estado"
                value={estadoFiltro}
                onChange={(evento) => {
                  setEstadoFiltro(evento.target.value);
                  setPaginaActual(1);
                }}
              >
                <option value="todos">
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
                aria-label="Filtrar por turno"
                value={turnoFiltro}
                onChange={(evento) => {
                  setTurnoFiltro(evento.target.value);
                  setPaginaActual(1);
                }}
              >
                <option value="todos">
                  Todos los turnos
                </option>
                <option value="AM">AM</option>
                <option value="PM">PM</option>
                <option value="AM y PM">
                  AM y PM
                </option>
                <option value="sin turno">
                  Sin turno
                </option>
              </select>
            </div>

            {/* TARJETAS DE PROFESORES */}
            {cargandoProfesores ? (
              <div className="admin-modulo-vacio">
                Cargando profesores...
              </div>
            ) : profesoresFiltrados.length === 0 ? (
              <div className="admin-modulo-vacio">
                No se encontraron profesores.
              </div>
            ) : (
              <>
                <div className="profesores-listado">
                  {profesoresPaginados.map((profesor) => (
                    <article
                      key={profesor.id}
                      className="profesores-tarjeta admin-modulo-panel"
                    >
                      <div className="profesores-tarjeta-contenido">
                        <AvatarProfesor
                          nombre={profesor.nombre}
                        />

                        <div className="profesores-tarjeta-informacion">
                          <div className="profesores-tarjeta-titulo">
                            <h3>{profesor.nombre}</h3>

                            <span
                              className={
                                profesor.estado === "Activo"
                                  ? "admin-modulo-estado admin-modulo-estado--activo"
                                  : "admin-modulo-estado admin-modulo-estado--inactivo"
                              }
                            >
                              {profesor.estado}
                            </span>
                          </div>

                          <div className="profesores-tarjeta-datos">
                            <p>
                              <strong>Especialidad:</strong>{" "}
                              {profesor.especialidad ||
                                "No informada"}
                            </p>

                            <p>
                              <strong>Sucursal:</strong>{" "}
                              {nombreSucursal(profesor)}
                            </p>

                            <p>
                              <strong>Turno:</strong>{" "}
                              {profesor.turno ||
                                "Sin turno asignado"}
                            </p>

                            {profesor.instagram && (
                              <p>
                                <strong>Instagram:</strong>{" "}
                                {profesor.instagram}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="profesores-tarjeta-acciones">
                        <button
                          type="button"
                          className="fp-btn fp-btn-secondary"
                          onClick={() =>
                            setProfesorDetalle(profesor)
                          }
                        >
                          Ver detalles
                        </button>

                        <button
                          type="button"
                          className="fp-btn fp-btn-secondary"
                          onClick={() =>
                            editarProfesor(profesor)
                          }
                        >
                          {profesorEditandoId === profesor.id
                            ? "Editando..."
                            : "Editar"}
                        </button>

                        <button
                          type="button"
                          disabled={procesandoId !== null}
                          className={
                            profesor.estado === "Activo"
                              ? "fp-btn fp-btn-danger"
                              : "fp-btn fp-btn-primary"
                          }
                          onClick={() =>
                            void cambiarEstado(profesor)
                          }
                        >
                          {procesandoId === profesor.id
                            ? "Procesando..."
                            : profesor.estado === "Activo"
                              ? "Desactivar"
                              : "Activar"}
                        </button>

                        <button
                          type="button"
                          className="fp-btn fp-btn-danger"
                          disabled={procesandoId !== null}
                          onClick={() =>
                            void eliminarProfesor(profesor)
                          }
                        >
                          {procesandoId === profesor.id
                            ? "Procesando..."
                            : "Eliminar"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>

                {/* PAGINACIÓN */}
                {totalPaginas > 1 && (
                  <div className="clientes-paginacion profesores-paginacion">
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

        {/* MODAL DE DETALLES */}
        {profesorDetalle && (
          <div
            className="clientes-modal-overlay"
            onClick={() => setProfesorDetalle(null)}
          >
            <div
              className="clientes-modal profesores-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="detalle-profesor-titulo"
              onClick={(evento) =>
                evento.stopPropagation()
              }
            >
              <div className="profesores-modal-encabezado">
                <AvatarProfesor
                  nombre={profesorDetalle.nombre}
                  grande
                />

                <div>
                  <p className="admin-modulo-etiqueta">
                    PERFIL DEL PROFESOR
                  </p>

                  <h2 id="detalle-profesor-titulo">
                    {profesorDetalle.nombre}
                  </h2>
                </div>
              </div>

              <div className="clientes-detalles">
                <p>
                  <strong>RUT:</strong>{" "}
                  {profesorDetalle.rut ||
                    "No informado"}
                </p>

                <p>
                  <strong>Correo electrónico:</strong>{" "}
                  {profesorDetalle.email ||
                    "No informado"}
                </p>

                <p>
                  <strong>Teléfono:</strong>{" "}
                  {profesorDetalle.telefono ||
                    "No informado"}
                </p>

                <p>
                  <strong>Especialidad:</strong>{" "}
                  {profesorDetalle.especialidad ||
                    "No informada"}
                </p>

                <p>
                  <strong>Instagram:</strong>{" "}
                  {profesorDetalle.instagram ||
                    "No informado"}
                </p>

                <p>
                  <strong>Sucursal:</strong>{" "}
                  {nombreSucursal(profesorDetalle)}
                </p>

                <p>
                  <strong>Turno:</strong>{" "}
                  {profesorDetalle.turno ||
                    "Sin turno asignado"}
                </p>

                <p>
                  <strong>Estado:</strong>{" "}
                  {profesorDetalle.estado}
                </p>
              </div>

              <div className="clientes-modal-acciones">
                <button
                  type="button"
                  className="fp-btn fp-btn-secondary"
                  onClick={() =>
                    setProfesorDetalle(null)
                  }
                >
                  Cerrar
                </button>

                <button
                  type="button"
                  className="fp-btn fp-btn-primary"
                  onClick={() =>
                    editarProfesor(profesorDetalle)
                  }
                >
                  Editar profesor
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

<style jsx global>{`
  .profesores-pagina { background:#000 !important; color:#f5f5f5 !important; min-height:100vh; padding:32px 24px 72px; }
  .profesores-pagina .admin-modulo-contenedor { max-width:1600px; margin:0 auto; }
  .profesores-pagina .admin-modulo-encabezado { display:flex; justify-content:space-between; align-items:center; gap:20px; margin-bottom:28px; flex-wrap:wrap; }
  .profesores-pagina .admin-modulo-etiqueta { color:#dc2626; font-size:12px; letter-spacing:2px; font-weight:800; }
  .profesores-pagina .admin-modulo-titulo { color:#fff; font-size:clamp(28px,3vw,42px); font-weight:800; margin:6px 0; }
  .profesores-pagina .admin-modulo-titulo span { color:#dc2626; }
  .profesores-pagina .admin-modulo-descripcion { color:#aaa; font-size:14px; line-height:1.6; }
  .profesores-pagina .admin-modulo-resumen { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:16px; margin-bottom:24px; }
  .profesores-pagina .admin-modulo-indicador { background:#000; border:1px solid #333; border-left:4px solid #dc2626; border-radius:12px; padding:22px; display:flex; flex-direction:column; gap:10px; }
  .profesores-pagina .admin-modulo-indicador span { color:#aaa; font-size:14px; }
  .profesores-pagina .admin-modulo-indicador strong { color:#fff; font-size:32px; }
  .profesores-pagina .admin-modulo-distribucion { display:grid; grid-template-columns:minmax(310px,0.9fr) minmax(0,1.7fr); gap:22px; align-items:start; }
  .profesores-pagina .admin-modulo-panel { background:#000; border:1px solid #333; border-radius:12px; padding:24px; min-width:0; }
  .profesores-pagina .admin-modulo-panel-titulo { color:#fff; font-size:21px; font-weight:750; margin:0 0 8px; }
  .profesores-pagina .admin-modulo-formulario { display:grid; gap:16px; margin-top:20px; }
  .profesores-pagina .admin-modulo-campo { display:flex; flex-direction:column; gap:7px; }
  .profesores-pagina .admin-modulo-campo label { color:#eee; font-size:13px; font-weight:650; }
  .profesores-pagina .admin-modulo-campo input,.profesores-pagina .admin-modulo-campo select,.profesores-pagina .admin-modulo-campo textarea,.profesores-pagina .admin-modulo-buscador { width:100%; min-width:0; background:#101010 !important; color:#fff !important; border:1px solid #404040 !important; border-radius:8px; padding:11px 12px; outline:none; color-scheme:dark; }
  .profesores-pagina input:focus,.profesores-pagina select:focus,.profesores-pagina textarea:focus { border-color:#dc2626 !important; }
  .profesores-pagina .admin-modulo-acciones,.profesores-pagina .profesores-tarjeta-acciones,.profesores-pagina .clientes-modal-acciones { display:flex; flex-wrap:wrap; gap:9px; }
  .profesores-pagina .fp-btn { display:inline-flex; align-items:center; justify-content:center; border-radius:8px; padding:10px 14px; font-size:13px; font-weight:650; cursor:pointer; text-decoration:none; border:1px solid #444; background:#242424; color:#fff; }
  .profesores-pagina .fp-btn-primary,.profesores-pagina .admin-modulo-boton--principal { background:#dc2626; border-color:#dc2626; color:#fff; }
  .profesores-pagina .fp-btn-danger { background:#421616; border-color:#8d2525; color:#fff; }
  .profesores-pagina .fp-btn-volver,.profesores-pagina .clientes-volver,.profesores-pagina .fp-btn-volver:hover,.profesores-pagina .clientes-volver:hover { background:#242424 !important; border-color:#444 !important; color:#fff !important; }
  .profesores-pagina .profesores-listado-encabezado { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:18px; }
  .profesores-pagina .profesores-filtros { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin-bottom:18px; }
  .profesores-pagina .profesores-filtros input { grid-column:1/-1; }
  .profesores-pagina .profesores-listado { display:grid; gap:14px; }
  .profesores-pagina .profesores-tarjeta { border-left:4px solid #dc2626; padding:18px; }
  .profesores-pagina .profesores-tarjeta-contenido { display:flex; gap:14px; align-items:flex-start; margin-bottom:16px; }
  .profesores-pagina .profesores-tarjeta-informacion { flex:1; min-width:0; }
  .profesores-pagina .profesores-tarjeta-titulo { display:flex; gap:12px; flex-wrap:wrap; align-items:center; margin-bottom:9px; }
  .profesores-pagina .profesores-tarjeta-titulo h3 { color:#fff; font-size:17px; margin:0; }
  .profesores-pagina .profesores-tarjeta-datos { display:grid; gap:5px; color:#bbb; font-size:13px; }
  .profesores-pagina .profesores-tarjeta-datos p { margin:0; }
  .profesores-pagina .profesores-tarjeta-datos strong { color:#eee; }
  .profesores-pagina .admin-modulo-estado { border-radius:99px; padding:4px 9px; font-size:11px; font-weight:700; }
  .profesores-pagina .admin-modulo-estado--activo { background:#153b25; color:#86efac; }
  .profesores-pagina .admin-modulo-estado--inactivo { background:#451a1a; color:#fca5a5; }
  .profesores-pagina .profesores-foto-futura { padding:14px; border:1px dashed #555; border-radius:9px; color:#aaa; font-size:13px; }
  .profesores-pagina .profesores-foto-futura strong { color:#eee; }
  .profesores-pagina .profesores-foto-futura p { margin:7px 0 0; }
  .profesores-pagina .admin-alert { border-radius:9px; padding:13px; margin:14px 0; display:flex; justify-content:space-between; gap:10px; align-items:center; }
  .profesores-pagina .admin-alert-error { background:#361313; border:1px solid #8a2525; }
  .profesores-pagina .admin-alert-success { background:#10301e; border:1px solid #25633b; }
  .profesores-pagina .clientes-paginacion { display:flex; justify-content:center; align-items:center; flex-wrap:wrap; gap:14px; margin-top:20px; }
  .profesores-pagina .admin-modulo-vacio { padding:24px; text-align:center; color:#aaa; }
  .profesores-pagina .clientes-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.82); display:flex; align-items:center; justify-content:center; z-index:1000; padding:16px; }
  .profesores-pagina .clientes-modal { background:#080808; border:1px solid #444; color:#fff; border-radius:14px; padding:24px; width:min(100%,560px); max-height:90vh; overflow:auto; }
  .profesores-pagina .profesores-modal-encabezado { display:flex; align-items:center; gap:15px; margin-bottom:20px; }
  .profesores-pagina .profesores-modal-encabezado h2 { margin:5px 0 0; }
  .profesores-pagina .clientes-detalles { display:grid; gap:10px; margin-bottom:22px; }
  .profesores-pagina .clientes-detalles p { margin:0; color:#bbb; }
  .profesores-pagina .clientes-detalles strong { color:#fff; }
  @media(max-width:1100px) { .profesores-pagina .admin-modulo-distribucion { grid-template-columns:1fr; } }
  @media(max-width:750px) { .profesores-pagina { padding:22px 14px 50px; } .profesores-pagina .admin-modulo-resumen { grid-template-columns:repeat(2,minmax(0,1fr)); } .profesores-pagina .admin-modulo-panel { padding:16px; } }
  @media(max-width:480px) { .profesores-pagina .profesores-filtros { grid-template-columns:1fr; } .profesores-pagina .profesores-tarjeta-contenido { flex-direction:column; } }
`}</style>
    </main>
  );
}
