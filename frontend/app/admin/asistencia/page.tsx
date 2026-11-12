"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useAuth } from "../../auth/AuthContext";
import Link from "next/link";
import { useCerrarSolo } from "../../components/useCerrarSolo";

type EstadoAsistencia = "Presente" | "Ausente" | "Justificada";

type Cliente = {
  id: number;
  nombre: string;
  rut: string | null;
};

type Profesor = {
  id: number;
  nombre: string;
};

type Plan = {
  id: number;
  nombre: string;
};

type Horario = {
  id: number;
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
  profesor: Profesor | null;
};

type Asignacion = {
  id: number;
  estado: "Activa" | "Finalizada" | "Congelada";
  cliente: Cliente | null;
  plan: Plan | null;
  horario: Horario | null;
};

type Asistencia = {
  id: number;
  asignacionId: number;
  fecha: string;
  estado: EstadoAsistencia;
  observaciones: string | null;
  asignacion: Asignacion | null;
};

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api`;
const ESTADOS: EstadoAsistencia[] = [
  "Presente",
  "Ausente",
  "Justificada",
];
const REGISTROS_POR_PAGINA = 10;

function mensajeError(error: unknown, predeterminado: string) {
  if (axios.isAxiosError<{ mensaje?: string }>(error)) {
    return error.response?.data?.mensaje ?? predeterminado;
  }

  return predeterminado;
}

function fechaHoy() {
  const fecha = new Date();
  const zona = fecha.getTimezoneOffset() * 60_000;

  return new Date(fecha.getTime() - zona)
    .toISOString()
    .slice(0, 10);
}

function horaCorta(hora: string) {
  return hora.slice(0, 5);
}

function etiquetaAsignacion(asignacion: Asignacion) {
  const cliente = asignacion.cliente?.nombre ?? "Cliente";
  const plan = asignacion.plan?.nombre ?? "Plan";
  const horario = asignacion.horario;

  const clase = horario
    ? `${horario.diaSemana} ${horaCorta(horario.horaInicio)}–${horaCorta(
        horario.horaFin
      )}`
    : "Horario no disponible";

  return `${cliente} · ${plan} · ${clase}`;
}

function fechaVisible(fecha: string) {
  const valor = fecha.slice(0, 10);
  const [anio, mes, dia] = valor.split("-");

  if (!anio || !mes || !dia) return valor;

  return `${dia}-${mes}-${anio}`;
}

export default function AsistenciaPage() {
  const router = useRouter();
  const { usuario, token, cargando } = useAuth();

  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);

  const [asignacionId, setAsignacionId] = useState("");
  const [fecha, setFecha] = useState(fechaHoy);
  const [estado, setEstado] = useState<EstadoAsistencia>("Presente");
  const [observaciones, setObservaciones] = useState("");

  const [asistenciaEditandoId, setAsistenciaEditandoId] =
    useState<number | null>(null);

  const [asistenciaDetalle, setAsistenciaDetalle] =
    useState<Asistencia | null>(null);

  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [mensaje, setMensaje] = useState("");
  useCerrarSolo(mensaje, setMensaje);
  const [errorFormulario, setErrorFormulario] = useState("");
  const [errorCarga, setErrorCarga] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [paginaActual, setPaginaActual] = useState(1);

  useEffect(() => {
    if (cargando) return;

    if (!usuario) {
      router.replace("/login");
      return;
    }

    if (usuario.rol !== "admin") {
      router.replace("/mi-cuenta");
    }
  }, [cargando, router, usuario]);

  const cargarDatos = useCallback(async () => {
    if (!token) return;

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      const [asignacionesRes, asistenciasRes] = await Promise.all([
        axios.get<Asignacion[]>(`${API_BASE}/asignaciones`, config),
        axios.get<Asistencia[]>(`${API_BASE}/asistencias`, config),
      ]);

      setAsignaciones(asignacionesRes.data);
      setAsistencias(asistenciasRes.data);
      setErrorCarga("");
    } catch (error) {
      console.error("Error al cargar asistencias:", error);

      setErrorCarga(
        mensajeError(error, "No se pudieron cargar las asistencias.")
      );
    } finally {
      setCargandoDatos(false);
    }
  }, [token]);

  useEffect(() => {
    if (!cargando && usuario?.rol === "admin" && token) {
      void Promise.resolve().then(cargarDatos);
    }
  }, [cargando, cargarDatos, token, usuario]);

  const reintentarCarga = () => {
    setCargandoDatos(true);
    setErrorCarga("");
    void cargarDatos();
  };

  const asignacionesActivas = useMemo(() => {
    const asignacionActualId = asistencias.find(
      (asistencia) => asistencia.id === asistenciaEditandoId
    )?.asignacionId;

    return asignaciones.filter(
      (asignacion) =>
        asignacion.estado === "Activa" ||
        asignacion.id === asignacionActualId
    );
  }, [asignaciones, asistenciaEditandoId, asistencias]);

  const asistenciasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLocaleLowerCase("es-CL");

    return asistencias.filter((asistencia) => {
      const coincideEstado =
        filtroEstado === "Todos" ||
        asistencia.estado === filtroEstado;

      const coincideBusqueda =
        !texto ||
        [
          asistencia.asignacion?.cliente?.nombre,
          asistencia.asignacion?.cliente?.rut,
          asistencia.asignacion?.plan?.nombre,
          asistencia.asignacion?.horario?.profesor?.nombre,
        ].some((valor) =>
          (valor ?? "").toLocaleLowerCase("es-CL").includes(texto)
        );

      return coincideEstado && coincideBusqueda;
    });
  }, [asistencias, busqueda, filtroEstado]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(asistenciasFiltradas.length / REGISTROS_POR_PAGINA)
  );

  const paginaSegura = Math.min(paginaActual, totalPaginas);

  const asistenciasPaginadas = useMemo(() => {
    const inicio = (paginaSegura - 1) * REGISTROS_POR_PAGINA;

    return asistenciasFiltradas.slice(
      inicio,
      inicio + REGISTROS_POR_PAGINA
    );
  }, [asistenciasFiltradas, paginaSegura]);

  const totalPresentes = asistencias.filter(
    (asistencia) => asistencia.estado === "Presente"
  ).length;

  const totalAusentes = asistencias.filter(
    (asistencia) => asistencia.estado === "Ausente"
  ).length;

  const totalJustificadas = asistencias.filter(
    (asistencia) => asistencia.estado === "Justificada"
  ).length;

  const limpiarFormulario = (limpiarMensajes = true) => {
    setAsignacionId("");
    setFecha(fechaHoy());
    setEstado("Presente");
    setObservaciones("");
    setAsistenciaEditandoId(null);

    if (limpiarMensajes) {
      setMensaje("");
      setErrorFormulario("");
    }
  };

  const guardarAsistencia = async (
    evento: FormEvent<HTMLFormElement>
  ) => {
    evento.preventDefault();

    if (!token) {
      setErrorFormulario(
        "Tu sesión ha expirado. Vuelve a iniciar sesión."
      );
      return;
    }

    if (!asignacionId || !fecha) {
      setErrorFormulario(
        "Selecciona un cliente con asignación y una fecha."
      );
      return;
    }

    const asignacionSeleccionada = asignacionesActivas.find(
      (asignacion) => String(asignacion.id) === asignacionId
    );

    if (!asignacionSeleccionada) {
      setErrorFormulario(
        "Selecciona una asignación válida."
      );
      return;
    }

    setGuardando(true);
    setMensaje("");
    setErrorFormulario("");

    const datos = {
      asignacionId: Number(asignacionId),
      fecha,
      estado,
      observaciones: observaciones.trim() || null,
    };

    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    try {
      const editando = asistenciaEditandoId !== null;

      if (editando) {
        await axios.put(
          `${API_BASE}/asistencias/${asistenciaEditandoId}`,
          datos,
          config
        );
      } else {
        await axios.post(
          `${API_BASE}/asistencias`,
          datos,
          config
        );
      }

      limpiarFormulario(false);

      setMensaje(
        editando
          ? "Asistencia actualizada correctamente."
          : "Asistencia registrada correctamente."
      );

      await cargarDatos();
    } catch (error) {
      console.error("Error al guardar asistencia:", error);

      setErrorFormulario(
        mensajeError(error, "No se pudo guardar la asistencia.")
      );
    } finally {
      setGuardando(false);
    }
  };

  const editarAsistencia = (asistencia: Asistencia) => {
    setAsignacionId(String(asistencia.asignacionId));
    setFecha(asistencia.fecha.slice(0, 10));
    setEstado(asistencia.estado);
    setObservaciones(asistencia.observaciones ?? "");
    setAsistenciaEditandoId(asistencia.id);

    setMensaje("");
    setErrorFormulario("");
    setAsistenciaDetalle(null);

    // Lleva al formulario de edición, no al inicio de la página.
    document
      .getElementById("formulario-asistencia")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (cargando) {
    return (
      <main className="admin-modulo asistencia-centro">
        Cargando...
      </main>
    );
  }

  if (!usuario || usuario.rol !== "admin") {
    return (
      <main className="admin-modulo asistencia-centro">
        Verificando acceso...
      </main>
    );
  }

  return (
    <main className="asistencia-pagina">
      <header className="asistencia-encabezado">
        <div>
          <p className="asistencia-etiqueta-superior">PANEL ADMINISTRATIVO / ASISTENCIA</p>
          <h1>Registro de <span>Asistencia</span></h1>
          <p>Registra, consulta y actualiza la asistencia de los clientes.</p>
        </div>
        <Link href="/admin" className="asistencia-volver fp-btn-volver">Volver al panel</Link>
      </header>

      {/* INDICADORES */}
      <section
        className="asistencia-resumen"
        aria-label="Resumen de asistencias"
      >
        <div className="asistencia-resumen-tarjeta">
          <span>Registros totales</span>
          <strong>{asistencias.length}</strong>
        </div>

        <div className="asistencia-resumen-tarjeta">
          <span>Presentes</span>
          <strong>{totalPresentes}</strong>
        </div>

        <div className="asistencia-resumen-tarjeta">
          <span>Ausentes</span>
          <strong>{totalAusentes}</strong>
        </div>

        <div className="asistencia-resumen-tarjeta">
          <span>Justificadas</span>
          <strong>{totalJustificadas}</strong>
        </div>
      </section>

      <div className="asistencia-distribucion">
        {/* FORMULARIO */}
        <section id="formulario-asistencia" className="asistencia-panel">
          <h2 className="admin-modulo-panel-titulo">
            {asistenciaEditandoId === null
              ? "Registrar asistencia"
              : "Actualizar asistencia"}
          </h2>

          <p className="asistencia-ayuda">
            Selecciona el cliente, la fecha y el estado de asistencia.
          </p>

          {errorCarga && (
            <div role="alert" className="admin-alert admin-alert-error">
              <span>{errorCarga}</span>

              <button
                type="button"
                onClick={reintentarCarga}
                className="asistencia-reintentar"
              >
                Reintentar
              </button>
            </div>
          )}

          <form
            onSubmit={guardarAsistencia}
            className="asistencia-formulario"
          >
            <div>
              <label
                htmlFor="asignacion"
                className="asistencia-etiqueta"
              >
                Cliente y horario
              </label>

              <select
                id="asignacion"
                value={asignacionId}
                onChange={(evento) =>
                  setAsignacionId(evento.target.value)
                }
                required
                disabled={cargandoDatos}
                className="asistencia-control"
              >
                <option value="">Seleccionar cliente</option>

                {asignacionesActivas.map((asignacion) => (
                  <option
                    key={asignacion.id}
                    value={asignacion.id}
                  >
                    {etiquetaAsignacion(asignacion)}
                  </option>
                ))}
              </select>

              {asignacionesActivas.length === 0 &&
                !cargandoDatos && (
                  <p className="asistencia-advertencia">
                    No hay clientes con asignación activa.
                  </p>
                )}
            </div>

            <div>
              <label htmlFor="fecha" className="asistencia-etiqueta">
                Fecha
              </label>

              <input
                id="fecha"
                type="date"
                value={fecha}
                onChange={(evento) =>
                  setFecha(evento.target.value)
                }
                required
                className="asistencia-control"
              />
            </div>

            <div>
              <label htmlFor="estado" className="asistencia-etiqueta">
                Estado
              </label>

              <select
                id="estado"
                value={estado}
                onChange={(evento) =>
                  setEstado(evento.target.value as EstadoAsistencia)
                }
                className="asistencia-control"
              >
                {ESTADOS.map((opcion) => (
                  <option key={opcion} value={opcion}>
                    {opcion}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="observaciones"
                className="asistencia-etiqueta"
              >
                Observaciones
              </label>

              <textarea
                id="observaciones"
                placeholder="Agrega un comentario si es necesario (opcional)"
                value={observaciones}
                onChange={(evento) =>
                  setObservaciones(evento.target.value)
                }
                rows={3}
                className="asistencia-control"
              />
            </div>

            {mensaje && (
              <p role="status" className="asistencia-exito">
                {mensaje}
              </p>
            )}

            {errorFormulario && (
              <p role="alert" className="asistencia-error">
                {errorFormulario}
              </p>
            )}

            <button
              type="submit"
              disabled={
                guardando ||
                cargandoDatos ||
                Boolean(errorCarga)
              }
              className="admin-modulo-boton admin-modulo-boton--principal fp-btn fp-btn-primary asistencia-ancho"
            >
              {guardando
                ? "Guardando..."
                : asistenciaEditandoId === null
                  ? "Registrar asistencia"
                  : "Guardar cambios"}
            </button>

            {asistenciaEditandoId !== null && (
              <button
                type="button"
                onClick={() => limpiarFormulario()}
                className="admin-modulo-boton fp-btn fp-btn-secondary asistencia-ancho"
              >
                Cancelar edición
              </button>
            )}
          </form>
        </section>

        {/* LISTADO */}
        <section className="asistencia-panel">
          <div className="asistencia-listado-cabecera">
            <div><h2 className="admin-modulo-panel-titulo">Asistencias registradas</h2>
            <p className="asistencia-texto-secundario">Mostrando {asistenciasFiltradas.length} de {asistencias.length} registros</p></div>
            <button type="button" className="fp-btn fp-btn-secondary" onClick={reintentarCarga} disabled={cargandoDatos}>Actualizar</button>
          </div>

          <div className="asistencia-filtros">
            <input
              type="search"
              aria-label="Buscar asistencia"
              placeholder="Buscar cliente, RUT, plan o profesor..."
              value={busqueda}
              onChange={(evento) => {
                setBusqueda(evento.target.value);
                setPaginaActual(1);
              }}
            />

            <select
              aria-label="Filtrar por estado"
              value={filtroEstado}
              onChange={(evento) => {
                setFiltroEstado(evento.target.value);
                setPaginaActual(1);
              }}
            >
              <option value="Todos">Todos los estados</option>

              {ESTADOS.map((opcion) => (
                <option key={opcion} value={opcion}>
                  {opcion}
                </option>
              ))}
            </select>
          </div>

          {cargandoDatos ? (
            <p className="admin-modulo-vacio">
              Cargando asistencias...
            </p>
          ) : asistenciasFiltradas.length === 0 ? (
            <p className="admin-modulo-vacio">
              No hay asistencias que coincidan con los filtros.
            </p>
          ) : (
            <>
              <div className="asistencia-tabla-scroll">
                <table className="asistencia-tabla">
                  <thead><tr><th>Cliente</th><th>Plan / horario</th><th>Fecha</th><th>Estado</th><th>Acciones</th></tr></thead>
                  <tbody>
                    {asistenciasPaginadas.map((asistencia) => (
                      <tr key={asistencia.id}>
                        <td><strong>{asistencia.asignacion?.cliente?.nombre ?? "Cliente no disponible"}</strong><small>{asistencia.asignacion?.cliente?.rut ?? "Sin RUT"}</small></td>
                        <td>{asistencia.asignacion ? etiquetaAsignacion(asistencia.asignacion) : "Asignación no disponible"}</td>
                        <td>{fechaVisible(asistencia.fecha)}</td>
                        <td><span className={`asistencia-estado asistencia-estado--${asistencia.estado.toLowerCase()}`}>{asistencia.estado}</span></td>
                        <td><div className="asistencia-tabla-acciones">
                          <button type="button" onClick={() => setAsistenciaDetalle(asistencia)} className="fp-btn fp-btn-secondary">Ver</button>
                          <button type="button" onClick={() => editarAsistencia(asistencia)} className="fp-btn fp-btn-secondary">Editar</button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPaginas > 1 && (
                <div className="asistencia-paginacion">
                  <button
                    type="button"
                    disabled={paginaSegura === 1}
                    onClick={() =>
                      setPaginaActual((actual) =>
                        Math.max(1, actual - 1)
                      )
                    }
                    className="fp-btn fp-btn-secondary"
                  >
                    Anterior
                  </button>

                  <span>
                    Página {paginaSegura} de {totalPaginas}
                  </span>

                  <button
                    type="button"
                    disabled={paginaSegura === totalPaginas}
                    onClick={() =>
                      setPaginaActual((actual) =>
                        Math.min(totalPaginas, actual + 1)
                      )
                    }
                    className="fp-btn fp-btn-secondary"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* DETALLES */}
      {asistenciaDetalle && (
        <div
          className="clientes-modal-overlay"
          onClick={() => setAsistenciaDetalle(null)}
        >
          <div
            className="clientes-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="detalle-asistencia-titulo"
            onClick={(evento) => evento.stopPropagation()}
          >
            <h2 id="detalle-asistencia-titulo">
              Detalle de asistencia
            </h2>

            <div className="asistencia-detalle">
              <p>
                <strong>Cliente:</strong>{" "}
                {asistenciaDetalle.asignacion?.cliente?.nombre ??
                  "No disponible"}
              </p>

              <p>
                <strong>RUT:</strong>{" "}
                {asistenciaDetalle.asignacion?.cliente?.rut ??
                  "No disponible"}
              </p>

              <p>
                <strong>Plan:</strong>{" "}
                {asistenciaDetalle.asignacion?.plan?.nombre ??
                  "No disponible"}
              </p>

              <p>
                <strong>Profesor:</strong>{" "}
                {asistenciaDetalle.asignacion?.horario?.profesor
                  ?.nombre ?? "No disponible"}
              </p>

              <p>
                <strong>Fecha:</strong>{" "}
                {fechaVisible(asistenciaDetalle.fecha)}
              </p>

              <p>
                <strong>Estado:</strong> {asistenciaDetalle.estado}
              </p>

              <p>
                <strong>Observaciones:</strong>{" "}
                {asistenciaDetalle.observaciones || "Sin observaciones"}
              </p>
            </div>

            <div className="asistencia-registro-acciones">
              <button
                type="button"
                onClick={() => setAsistenciaDetalle(null)}
                className="fp-btn fp-btn-secondary"
              >
                Cerrar
              </button>

              <button
                type="button"
                onClick={() =>
                  editarAsistencia(asistenciaDetalle)
                }
                className="fp-btn fp-btn-primary"
              >
                Editar asistencia
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}