
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

const API_URL = "http://localhost:3001/api";
const POR_PAGINA = 10;

type Cliente = {
  id: number;
  nombre: string;
  rut: string;
};

type Plan = {
  id: number;
  nombre: string;
};

type Asignacion = {
  clienteId: number;
  planId: number;
  estado: "Activa" | "Finalizada" | "Congelada";
  plan: Plan | null;
};

type Pago = {
  id: number;
  clienteId: number;
  planId: number;
  monto: string;
  fechaPago: string;
  fechaVencimiento: string;
  metodoPago: "Efectivo" | "Transferencia" | "Tarjeta" | "Otro";
  estado: "Vigente" | "Vencido" | "Anulado";
  observaciones?: string | null;
  cliente?: Cliente;
  plan?: Plan;
};

function mensajeError(error: unknown, defecto: string) {
  if (axios.isAxiosError(error)) {
    const mensaje = error.response?.data?.mensaje;

    if (typeof mensaje === "string") return mensaje;

    if (error.response?.status === 401) {
      return "Tu sesión expiró. Inicia sesión nuevamente.";
    }

    if (error.response?.status === 403) {
      return "No tienes permisos para esta operación.";
    }
  }

  return defecto;
}

function limpiarRut(rut: string) {
  return rut.replace(/[.\s-]/g, "").toLowerCase();
}

function mostrarFecha(fecha: string) {
  if (!fecha) return "No registrada";

  const partes = fecha.slice(0, 10).split("-");

  if (partes.length !== 3) return fecha;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function mostrarMonto(monto: string | number) {
  const numero = Number(monto);

  return Number.isFinite(numero)
    ? `$${numero.toLocaleString("es-CL")}`
    : "Monto no disponible";
}

function fechaHoyLocal() {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

export default function PagosPage() {
  const router = useRouter();
  const { usuario, cargando, token } = useAuth();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);

  const [clienteId, setClienteId] = useState("");
  const [busquedaRutCliente, setBusquedaRutCliente] = useState("");
  const [planId, setPlanId] = useState("");
  const [monto, setMonto] = useState("");
  const [fechaPago, setFechaPago] = useState(fechaHoyLocal);
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [metodoPago, setMetodoPago] =
    useState<Pago["metodoPago"]>("Efectivo");
  const [observaciones, setObservaciones] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroMetodo, setFiltroMetodo] = useState("Todos");
  const [paginaActual, setPaginaActual] = useState(1);

  const [pagoDetalle, setPagoDetalle] = useState<Pago | null>(null);

  const [guardando, setGuardando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const config = useMemo(
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
    } else if (usuario.rol !== "admin") {
      router.replace("/mi-cuenta");
    }
  }, [cargando, usuario, router]);

  const cargarDatos = useCallback(async () => {
    const [
      clientesRespuesta,
      asignacionesRespuesta,
      pagosRespuesta,
    ] = await Promise.all([
      axios.get<Cliente[]>(`${API_URL}/clientes`, config),
      axios.get<Asignacion[]>(`${API_URL}/asignaciones`, config),
      axios.get<Pago[]>(`${API_URL}/pagos`, config),
    ]);

    setClientes(clientesRespuesta.data);
    setAsignaciones(asignacionesRespuesta.data);
    setPagos(pagosRespuesta.data);
  }, [config]);

  const cargarPagos = useCallback(async () => {
    const respuesta = await axios.get<Pago[]>(
      `${API_URL}/pagos`,
      config
    );

    setPagos(respuesta.data);
  }, [config]);

  useEffect(() => {
    if (
      cargando ||
      !usuario ||
      usuario.rol !== "admin" ||
      !token
    ) {
      return;
    }

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
              "No se pudo cargar la información de pagos."
            )
          );
        }
      } finally {
        if (activo) setCargandoDatos(false);
      }
    }

    void iniciarCarga();

    return () => {
      activo = false;
    };
  }, [cargando, usuario, token, cargarDatos]);

  function limpiarFormulario() {
    setClienteId("");
    setBusquedaRutCliente("");
    setPlanId("");
    setMonto("");
    setFechaPago(fechaHoyLocal());
    setFechaVencimiento("");
    setMetodoPago("Efectivo");
    setObservaciones("");
  }

  const clientesFiltrados = useMemo(() => {
    const rut = limpiarRut(busquedaRutCliente.trim());

    return clientes.filter((cliente) =>
      limpiarRut(cliente.rut ?? "").includes(rut)
    );
  }, [clientes, busquedaRutCliente]);

  const clienteSeleccionado = clientes.find(
    (cliente) => String(cliente.id) === clienteId
  );

  const opcionesCliente =
    clienteSeleccionado &&
    !clientesFiltrados.some(
      (cliente) => cliente.id === clienteSeleccionado.id
    )
      ? [clienteSeleccionado, ...clientesFiltrados]
      : clientesFiltrados;

  const planesAsociados = useMemo(() => {
    return asignaciones
      .flatMap((asignacion) => {
        if (
          String(asignacion.clienteId) !== clienteId ||
          asignacion.estado !== "Activa" ||
          !asignacion.plan
        ) {
          return [];
        }

        return [asignacion.plan];
      })
      .filter(
        (plan, indice, lista) =>
          lista.findIndex(
            (otro) => otro.id === plan.id
          ) === indice
      );
  }, [asignaciones, clienteId]);

  const pagosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    const rut = limpiarRut(busqueda.trim());

    return pagos.filter((pago) => {
      const coincideBusqueda =
        !texto ||
        [
          pago.cliente?.nombre,
          pago.plan?.nombre,
          pago.metodoPago,
          pago.estado,
          String(pago.monto),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(texto) ||
        limpiarRut(pago.cliente?.rut ?? "").includes(rut);

      const coincideEstado =
        filtroEstado === "Todos" ||
        pago.estado === filtroEstado;

      const coincideMetodo =
        filtroMetodo === "Todos" ||
        pago.metodoPago === filtroMetodo;

      return (
        coincideBusqueda &&
        coincideEstado &&
        coincideMetodo
      );
    });
  }, [pagos, busqueda, filtroEstado, filtroMetodo]);

  const indicadores = useMemo(
    () => ({
      total: pagos.length,
      vigentes: pagos.filter(
        (pago) => pago.estado === "Vigente"
      ).length,
      vencidos: pagos.filter(
        (pago) => pago.estado === "Vencido"
      ).length,
      anulados: pagos.filter(
        (pago) => pago.estado === "Anulado"
      ).length,
    }),
    [pagos]
  );

  const totalPaginas = Math.max(
    1,
    Math.ceil(pagosFiltrados.length / POR_PAGINA)
  );

  const paginaSegura = Math.min(
    paginaActual,
    totalPaginas
  );

  const pagosPaginados = pagosFiltrados.slice(
    (paginaSegura - 1) * POR_PAGINA,
    paginaSegura * POR_PAGINA
  );

  async function registrarPago(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    if (!token || guardando) return;

    setError("");
    setMensaje("");

    if (!clienteId || !planId) {
      setError("Selecciona un cliente y su plan activo.");
      return;
    }

    if (
      !planesAsociados.some(
        (plan) => String(plan.id) === planId
      )
    ) {
      setError(
        "El plan seleccionado no está activo para este cliente."
      );
      return;
    }

    const montoNumerico = Number(monto);

    if (
      !Number.isSafeInteger(montoNumerico) ||
      montoNumerico <= 0
    ) {
      setError("Ingresa un monto válido mayor que cero.");
      return;
    }

    if (!fechaPago || !fechaVencimiento) {
      setError("Completa ambas fechas.");
      return;
    }

    if (fechaVencimiento < fechaPago) {
      setError(
        "La fecha de vencimiento no puede ser anterior al pago."
      );
      return;
    }

    setGuardando(true);

    try {
      await axios.post(
        `${API_URL}/pagos`,
        {
          clienteId: Number(clienteId),
          planId: Number(planId),
          monto: montoNumerico,
          fechaPago,
          fechaVencimiento,
          metodoPago,
          observaciones: observaciones.trim() || null,
        },
        config
      );

      await cargarPagos();
      limpiarFormulario();

      setMensaje(
        "Pago externo registrado correctamente."
      );
    } catch (err) {
      setError(
        mensajeError(
          err,
          "No se pudo registrar el pago."
        )
      );
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarPago(pago: Pago) {
    if (!token || eliminandoId !== null) return;

    const confirmado = window.confirm(
      `¿Seguro que deseas eliminar el pago #${pago.id} de ${mostrarMonto(pago.monto)}?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmado) return;

    setEliminandoId(pago.id);
    setError("");
    setMensaje("");

    try {
      await axios.delete(
        `${API_URL}/pagos/${pago.id}`,
        config
      );

      await cargarPagos();
      setPagoDetalle(null);

      setMensaje("Pago eliminado correctamente.");
    } catch (err) {
      setError(
        mensajeError(
          err,
          "No se pudo eliminar el pago."
        )
      );
    } finally {
      setEliminandoId(null);
    }
  }

  async function actualizarPagos() {
    setCargandoDatos(true);
    setError("");

    try {
      await cargarDatos();
    } catch (err) {
      setError(
        mensajeError(
          err,
          "No se pudieron actualizar los pagos."
        )
      );
    } finally {
      setCargandoDatos(false);
    }
  }

  if (cargando || !usuario || usuario.rol !== "admin") {
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
    <main className="admin-clientes admin-modulo pagos-pagina">
      <div className="admin-modulo-contenedor">
        {/* ENCABEZADO */}
        <header className="admin-modulo-encabezado">
          <div>
            <p className="admin-modulo-etiqueta">
              FOCUS POWER FIT
            </p>

            <h1 className="admin-modulo-titulo">
              Gestión de <span>Pagos</span>
            </h1>

            <p className="admin-modulo-descripcion">
              Registra y consulta pagos realizados en
              recepción o fuera de la plataforma.
            </p>
          </div>

          <Link
            href="/admin"
            className="clientes-volver fp-btn fp-btn-volver"
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
          className="admin-modulo-resumen pagos-resumen"
          aria-label="Resumen de pagos"
        >
          <article className="admin-modulo-indicador">
            <span>Total de pagos</span>
            <strong>
              {cargandoDatos ? "—" : indicadores.total}
            </strong>
            <p>Registros administrativos</p>
          </article>

          <article className="admin-modulo-indicador">
            <span>Pagos vigentes</span>
            <strong>
              {cargandoDatos ? "—" : indicadores.vigentes}
            </strong>
            <p>Estado vigente</p>
          </article>

          <article className="admin-modulo-indicador">
            <span>Pagos vencidos</span>
            <strong>
              {cargandoDatos ? "—" : indicadores.vencidos}
            </strong>
            <p>Estado vencido</p>
          </article>

          <article className="admin-modulo-indicador">
            <span>Pagos anulados</span>
            <strong>
              {cargandoDatos ? "—" : indicadores.anulados}
            </strong>
            <p>Estado anulado</p>
          </article>
        </section>

        <div className="admin-modulo-distribucion pagos-distribucion">
          {/* FORMULARIO */}
          <section className="admin-modulo-panel pagos-panel">
            <h2 className="admin-modulo-panel-titulo">
              Registrar pago externo
            </h2>

            <p className="admin-modulo-descripcion">
              Ingresa los datos del pago recibido
              presencialmente o por un medio externo.
            </p>

            <form
              onSubmit={registrarPago}
              className="admin-modulo-formulario pagos-formulario"
            >
              <div className="admin-modulo-campo">
                <label htmlFor="buscar-rut">
                  Buscar cliente por RUT
                </label>

                <input
                  id="buscar-rut"
                  type="search"
                  className="admin-modulo-buscador"
                  value={busquedaRutCliente}
                  onChange={(evento) =>
                    setBusquedaRutCliente(
                      evento.target.value
                    )
                  }
                  placeholder="Ej: 12.345.678-9"
                />
              </div>

              <div className="admin-modulo-campo">
                <label htmlFor="pago-cliente">
                  Cliente *
                </label>

                <select
                  id="pago-cliente"
                  className="admin-modulo-buscador"
                  value={clienteId}
                  required
                  onChange={(evento) => {
                    setClienteId(evento.target.value);
                    setPlanId("");
                  }}
                >
                  <option value="">
                    Seleccionar cliente
                  </option>

                  {opcionesCliente.map((cliente) => (
                    <option
                      key={cliente.id}
                      value={cliente.id}
                    >
                      {cliente.nombre} - {cliente.rut}
                    </option>
                  ))}
                </select>

                {busquedaRutCliente &&
                  clientesFiltrados.length === 0 && (
                    <small>
                      No se encontraron clientes con ese RUT.
                    </small>
                  )}
              </div>

              <div className="admin-modulo-campo">
                <label htmlFor="pago-plan">
                  Plan pagado *
                </label>

                <select
                  id="pago-plan"
                  className="admin-modulo-buscador"
                  value={planId}
                  required
                  disabled={!clienteId}
                  onChange={(evento) =>
                    setPlanId(evento.target.value)
                  }
                >
                  <option value="">
                    {!clienteId
                      ? "Selecciona primero un cliente"
                      : planesAsociados.length === 0
                        ? "Cliente sin plan activo"
                        : "Seleccionar plan asociado"}
                  </option>

                  {planesAsociados.map((plan) => (
                    <option
                      key={plan.id}
                      value={plan.id}
                    >
                      {plan.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-modulo-campo">
                <label htmlFor="pago-monto">
                  Monto (CLP) *
                </label>

                <input
                  id="pago-monto"
                  type="number"
                  min="1"
                  step="1"
                  required
                  className="admin-modulo-buscador"
                  value={monto}
                  onChange={(evento) =>
                    setMonto(evento.target.value)
                  }
                  placeholder="Ej: 35000"
                />
              </div>

              <div className="admin-modulo-campo">
                <label htmlFor="pago-fecha">
                  Fecha del pago *
                </label>

                <input
                  id="pago-fecha"
                  type="date"
                  required
                  className="admin-modulo-buscador"
                  value={fechaPago}
                  onChange={(evento) =>
                    setFechaPago(evento.target.value)
                  }
                />
              </div>

              <div className="admin-modulo-campo">
                <label htmlFor="pago-vencimiento">
                  Fecha de vencimiento *
                </label>

                <input
                  id="pago-vencimiento"
                  type="date"
                  required
                  min={fechaPago || undefined}
                  className="admin-modulo-buscador"
                  value={fechaVencimiento}
                  onChange={(evento) =>
                    setFechaVencimiento(
                      evento.target.value
                    )
                  }
                />
              </div>

              <div className="admin-modulo-campo">
                <label htmlFor="pago-metodo">
                  Método de pago *
                </label>

                <select
                  id="pago-metodo"
                  className="admin-modulo-buscador"
                  value={metodoPago}
                  required
                  onChange={(evento) =>
                    setMetodoPago(
                      evento.target
                        .value as Pago["metodoPago"]
                    )
                  }
                >
                  <option value="Efectivo">
                    Efectivo
                  </option>
                  <option value="Transferencia">
                    Transferencia
                  </option>
                  <option value="Tarjeta">
                    Tarjeta
                  </option>
                  <option value="Otro">
                    Otro
                  </option>
                </select>
              </div>

              <div className="admin-modulo-campo">
                <label htmlFor="pago-observaciones">
                  Observaciones
                </label>

                <textarea
                  id="pago-observaciones"
                  rows={3}
                  className="admin-modulo-buscador"
                  value={observaciones}
                  onChange={(evento) =>
                    setObservaciones(
                      evento.target.value
                    )
                  }
                  placeholder="Ej: Pago recibido en recepción"
                />
              </div>

              <div className="admin-modulo-acciones pagos-formulario-acciones">
                <button
                  type="submit"
                  disabled={
                    guardando ||
                    cargandoDatos ||
                    planesAsociados.length === 0
                  }
                  className="admin-modulo-boton admin-modulo-boton--principal fp-btn fp-btn-primary"
                >
                  {guardando
                    ? "Registrando..."
                    : "Registrar pago"}
                </button>

                <button
                  type="button"
                  disabled={guardando}
                  className="fp-btn fp-btn-secondary"
                  onClick={limpiarFormulario}
                >
                  Limpiar formulario
                </button>
              </div>
            </form>
          </section>

          {/* LISTADO */}
          <section className="admin-modulo-panel pagos-panel">
            <div className="pagos-listado-encabezado">
              <div>
                <h2 className="admin-modulo-panel-titulo">
                  Pagos registrados
                </h2>

                <p className="admin-modulo-descripcion">
                  Mostrando {pagosFiltrados.length} de{" "}
                  {pagos.length} pagos
                </p>
              </div>

              <button
                type="button"
                className="fp-btn fp-btn-secondary"
                disabled={cargandoDatos}
                onClick={() => void actualizarPagos()}
              >
                Actualizar
              </button>
            </div>

            {/* FILTROS */}
            <div className="pagos-filtros">
              <input
                type="search"
                className="admin-modulo-buscador"
                placeholder="Buscar cliente, RUT, plan..."
                aria-label="Buscar pagos"
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
                <option value="Vigente">
                  Vigentes
                </option>
                <option value="Vencido">
                  Vencidos
                </option>
                <option value="Anulado">
                  Anulados
                </option>
              </select>

              <select
                className="admin-modulo-buscador"
                aria-label="Filtrar por método de pago"
                value={filtroMetodo}
                onChange={(evento) => {
                  setFiltroMetodo(evento.target.value);
                  setPaginaActual(1);
                }}
              >
                <option value="Todos">
                  Todos los métodos
                </option>
                <option value="Efectivo">
                  Efectivo
                </option>
                <option value="Transferencia">
                  Transferencia
                </option>
                <option value="Tarjeta">
                  Tarjeta
                </option>
                <option value="Otro">
                  Otro
                </option>
              </select>
            </div>

            {cargandoDatos ? (
              <div className="admin-modulo-vacio">
                Cargando pagos...
              </div>
            ) : pagosFiltrados.length === 0 ? (
              <div className="admin-modulo-vacio">
                No se encontraron pagos.
              </div>
            ) : (
              <>
                <div className="admin-modulo-tabla-contenedor">
                  <table className="admin-modulo-tabla">
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>Plan</th>
                        <th>Monto</th>
                        <th>Fechas</th>
                        <th>Método</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>

                    <tbody>
                      {pagosPaginados.map((pago) => (
                        <tr key={pago.id}>
                          <td>
                            <strong>
                              {pago.cliente?.nombre ??
                                "Cliente no disponible"}
                            </strong>

                            <p className="text-gray-400">
                              {pago.cliente?.rut ?? "-"}
                            </p>
                          </td>

                          <td>
                            {pago.plan?.nombre ?? "-"}
                          </td>

                          <td>
                            <strong>
                              {mostrarMonto(pago.monto)}
                            </strong>
                          </td>

                          <td>
                            <p>
                              {mostrarFecha(
                                pago.fechaPago
                              )}
                            </p>

                            <p className="text-gray-400">
                              Vence:{" "}
                              {mostrarFecha(
                                pago.fechaVencimiento
                              )}
                            </p>
                          </td>

                          <td>{pago.metodoPago}</td>

                          <td>
                            <span
                              className={
                                pago.estado === "Vigente"
                                  ? "admin-modulo-estado admin-modulo-estado--activo"
                                  : "admin-modulo-estado admin-modulo-estado--inactivo"
                              }
                            >
                              {pago.estado}
                            </span>
                          </td>

                          <td>
                            <div className="pagos-tabla-acciones">
                              <button
                                type="button"
                                className="fp-btn fp-btn-secondary"
                                onClick={() =>
                                  setPagoDetalle(pago)
                                }
                              >
                                Ver
                              </button>

                              <button
                                type="button"
                                className="fp-btn fp-btn-danger"
                                disabled={
                                  eliminandoId !== null
                                }
                                onClick={() =>
                                  void eliminarPago(pago)
                                }
                              >
                                {eliminandoId === pago.id
                                  ? "Eliminando..."
                                  : "Eliminar"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPaginas > 1 && (
                  <div className="clientes-paginacion pagos-paginacion">
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

        {/* DETALLE DEL PAGO */}
        {pagoDetalle && (
          <div
            className="clientes-modal-overlay"
            onClick={() => setPagoDetalle(null)}
          >
            <div
              className="clientes-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="detalle-pago-titulo"
              onClick={(evento) =>
                evento.stopPropagation()
              }
            >
              <h2 id="detalle-pago-titulo">
                Detalle del pago
              </h2>

              <div className="clientes-detalles">
                <p>
                  <strong>Número de registro:</strong>{" "}
                  #{pagoDetalle.id}
                </p>

                <p>
                  <strong>Cliente:</strong>{" "}
                  {pagoDetalle.cliente?.nombre ??
                    "No disponible"}
                </p>

                <p>
                  <strong>RUT:</strong>{" "}
                  {pagoDetalle.cliente?.rut ?? "-"}
                </p>

                <p>
                  <strong>Plan:</strong>{" "}
                  {pagoDetalle.plan?.nombre ?? "-"}
                </p>

                <p>
                  <strong>Monto:</strong>{" "}
                  {mostrarMonto(pagoDetalle.monto)}
                </p>

                <p>
                  <strong>Fecha del pago:</strong>{" "}
                  {mostrarFecha(
                    pagoDetalle.fechaPago
                  )}
                </p>

                <p>
                  <strong>Vencimiento:</strong>{" "}
                  {mostrarFecha(
                    pagoDetalle.fechaVencimiento
                  )}
                </p>

                <p>
                  <strong>Método:</strong>{" "}
                  {pagoDetalle.metodoPago}
                </p>

                <p>
                  <strong>Estado:</strong>{" "}
                  {pagoDetalle.estado}
                </p>

                <p>
                  <strong>Observaciones:</strong>{" "}
                  {pagoDetalle.observaciones ||
                    "Sin observaciones"}
                </p>
              </div>

              <div className="clientes-modal-acciones">
                <button
                  type="button"
                  className="fp-btn fp-btn-secondary"
                  onClick={() =>
                    setPagoDetalle(null)
                  }
                >
                  Cerrar
                </button>

                <button
                  type="button"
                  className="fp-btn fp-btn-danger"
                  disabled={eliminandoId !== null}
                  onClick={() =>
                    void eliminarPago(pagoDetalle)
                  }
                >
                  Eliminar pago
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .pagos-pagina { background: #000 !important; color: #fff !important; min-height: 100vh; }
        .pagos-pagina .admin-modulo-contenedor { max-width: 1400px; }
        .pagos-pagina .admin-modulo-etiqueta, .pagos-pagina .admin-modulo-titulo span { color: #dc2626; }
        .pagos-pagina .admin-modulo-titulo, .pagos-pagina .admin-modulo-panel-titulo { color: #fff; }
        .pagos-pagina .admin-modulo-descripcion { color: #a1a1aa; }
        .pagos-pagina .admin-modulo-indicador { background: #080808 !important; border: 1px solid #303030 !important; border-left: 4px solid #dc2626 !important; border-radius: 14px; }
        .pagos-pagina .admin-modulo-indicador span, .pagos-pagina .admin-modulo-indicador p { color: #a1a1aa; }
        .pagos-pagina .admin-modulo-indicador strong { color: #fff; }
        .pagos-pagina .admin-modulo-panel { background: #080808 !important; border: 1px solid #303030 !important; border-radius: 16px; }
        .pagos-pagina .admin-modulo-campo label { color: #f4f4f5; }
        .pagos-pagina .admin-modulo-campo input,
        .pagos-pagina .admin-modulo-campo select,
        .pagos-pagina .admin-modulo-campo textarea,
        .pagos-pagina .admin-modulo-buscador { background: #111 !important; color: #fff !important; border: 1px solid #3f3f46 !important; color-scheme: dark; }
        .pagos-pagina .admin-modulo-campo input:focus,
        .pagos-pagina .admin-modulo-campo select:focus,
        .pagos-pagina .admin-modulo-campo textarea:focus,
        .pagos-pagina .admin-modulo-buscador:focus { border-color: #dc2626 !important; outline: 1px solid #dc2626; }
        .pagos-pagina input::placeholder, .pagos-pagina textarea::placeholder { color: #85858e; }
        .pagos-pagina .admin-modulo-tabla th { background: #151515 !important; color: #f4f4f5; border-color: #303030; }
        .pagos-pagina .admin-modulo-tabla td { color: #eee; border-color: #303030; }
        .pagos-pagina .admin-modulo-tabla tbody tr:hover { background: #141414; }
        .pagos-pagina .fp-btn-primary { background: #dc2626 !important; border-color: #dc2626 !important; color: #fff !important; }
        .pagos-pagina .fp-btn-secondary { background: #202024 !important; border: 1px solid #444 !important; color: #fff !important; }
        .pagos-pagina .fp-btn-danger { background: #3b1111 !important; border: 1px solid #8f2424 !important; color: #fecaca !important; }
        .pagos-pagina .clientes-volver.fp-btn-volver,
        .pagos-pagina .clientes-volver.fp-btn-volver:hover { display: inline-flex; align-items: center; justify-content: center; padding: 12px 18px; border: 1px solid #444 !important; border-radius: 9px; background: #202024 !important; color: #fff !important; text-decoration: none; font-size: 13px; font-weight: 700; }
        .pagos-pagina .clientes-modal { background: #0b0b0b !important; color: #fff !important; border: 1px solid #333; }
        .pagos-pagina .clientes-detalles, .pagos-pagina .clientes-detalles p { color: #e4e4e7; }
        .pagos-pagina .clientes-paginacion { color: #eee; }
        @media (max-width: 900px) { .pagos-pagina .admin-modulo-distribucion { grid-template-columns: 1fr; } .pagos-pagina .admin-modulo-resumen { grid-template-columns: repeat(2,minmax(0,1fr)); } }
        @media (max-width: 520px) { .pagos-pagina .admin-modulo-resumen { grid-template-columns: 1fr; } .pagos-pagina .admin-modulo-panel { padding: 16px; } }
      `}</style>
    </main>
  );
}
