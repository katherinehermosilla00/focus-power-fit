"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useAuth } from "../../auth/AuthContext";
import AdminSectionHeader from "../components/AdminSectionHeader";

type Cliente = {
  id: number;
  nombre: string;
  email: string;
  rut: string;
};

type Plan = {
  id: number;
  nombre: string;
  modalidad: "Individual" | "Compartido" | null;
  duracionMeses: number | null;
  precio: string | number | null;
  estado: "Activo" | "Inactivo";
};

type Profesor = {
  id: number;
  nombre: string;
  especialidad: string | null;
};

type Horario = {
  id: number;
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
  modalidad: "Individual" | "Compartido";
  estado: "Activo" | "Inactivo";
  profesor: Profesor | null;
};

type Asignacion = {
  id: number;
  clienteId: number;
  fechaInicio: string;
  fechaTermino: string | null;
  estado: "Activa" | "Finalizada" | "Congelada";
  observaciones: string | null;
  cliente: Cliente | null;
  plan: Plan | null;
  horario: Horario | null;
};

const API_BASE = "http://localhost:3001/api";

function mensajeError(error: unknown, mensajePredeterminado: string) {
  if (axios.isAxiosError<{ mensaje?: string }>(error)) {
    return error.response?.data?.mensaje ?? mensajePredeterminado;
  }

  return mensajePredeterminado;
}

function horaCorta(hora: string) {
  return hora.slice(0, 5);
}

export default function AsignacionesPage() {
  const router = useRouter();
  const { usuario, token, cargando } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [busquedaRutCliente, setBusquedaRutCliente] = useState("");
  const [planId, setPlanId] = useState("");
  const [horarioId, setHorarioId] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaTermino, setFechaTermino] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [errorFormulario, setErrorFormulario] = useState("");
  const [errorCarga, setErrorCarga] = useState("");

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
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [clientesRes, planesRes, horariosRes, asignacionesRes] =
        await Promise.all([
          axios.get<Cliente[]>(`${API_BASE}/clientes`, config),
          axios.get<Plan[]>(`${API_BASE}/planes`, config),
          axios.get<Horario[]>(`${API_BASE}/horarios`, config),
          axios.get<Asignacion[]>(`${API_BASE}/asignaciones`, config),
        ]);

      setClientes(clientesRes.data);
      setPlanes(planesRes.data);
      setHorarios(horariosRes.data);
      setAsignaciones(asignacionesRes.data);
      setErrorCarga("");
    } catch (error) {
      console.error("Error al cargar datos de asignaciones:", error);
      setErrorCarga(mensajeError(error, "No se pudieron cargar los datos."));
    } finally {
      setCargandoDatos(false);
    }
  }, [token]);

  const reintentarCarga = () => {
    setCargandoDatos(true);
    setErrorCarga("");
    void cargarDatos();
  };

  useEffect(() => {
    if (!cargando && usuario?.rol === "admin" && token) {
      void Promise.resolve().then(cargarDatos);
    }
  }, [cargando, cargarDatos, token, usuario]);

  const planesActivos = useMemo(
    () => planes.filter((plan) => plan.estado === "Activo"),
    [planes]
  );
  const horariosActivos = useMemo(
    () => horarios.filter((horario) => horario.estado === "Activo"),
    [horarios]
  );
  const clientesConAsignacionActiva = useMemo(
    () =>
      new Set(
        asignaciones
          .filter((asignacion) => asignacion.estado === "Activa")
          .map((asignacion) => asignacion.clienteId)
      ),
    [asignaciones]
  );
  const clientesDisponibles = clientes.filter(
    (cliente) => !clientesConAsignacionActiva.has(cliente.id)
  );
  const rutBuscado = busquedaRutCliente
    .trim()
    .replace(/[.\-\s]/g, "")
    .toLowerCase();
  const clientesFiltrados = clientesDisponibles.filter((cliente) =>
    cliente.rut
      .replace(/[.\-\s]/g, "")
      .toLowerCase()
      .includes(rutBuscado)
  );
  const clienteSeleccionado = clientesDisponibles.find(
    (cliente) => String(cliente.id) === clienteId
  );
  const opcionesCliente = clienteSeleccionado &&
    !clientesFiltrados.some((cliente) => cliente.id === clienteSeleccionado.id)
    ? [clienteSeleccionado, ...clientesFiltrados]
    : clientesFiltrados;

  const guardarAsignacion = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!token) return;

    setGuardando(true);
    setMensaje("");
    setErrorFormulario("");

    try {
      await axios.post(
        `${API_BASE}/asignaciones`,
        {
          clienteId: Number(clienteId),
          planId: Number(planId),
          horarioId: Number(horarioId),
          fechaInicio,
          fechaTermino: fechaTermino || null,
          observaciones: observaciones.trim() || null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setClienteId("");
      setBusquedaRutCliente("");
      setPlanId("");
      setHorarioId("");
      setFechaInicio("");
      setFechaTermino("");
      setObservaciones("");
      setMensaje("Asignación creada correctamente.");
      await cargarDatos();
    } catch (error) {
      console.error("Error al crear asignación:", error);
      setErrorFormulario(
        mensajeError(error, "No se pudo crear la asignación.")
      );
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        Cargando...
      </main>
    );
  }

  if (!usuario || usuario.rol !== "admin") {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        Verificando acceso...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white p-6 md:p-10">
      <AdminSectionHeader
        titulo="Asignar"
        destacado="plan y horario"
        descripcion="Vincula un cliente con un plan, un horario y su profesor."
      />

      <div className="grid lg:grid-cols-3 gap-8">
        <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 sm:p-8">
          <h2 className="text-2xl font-bold mb-2">Nueva asignación</h2>
          <p className="text-sm text-gray-400 mb-6">
            El profesor se asigna según el horario seleccionado.
          </p>

          {errorCarga && (
            <div role="alert" className="mb-5 rounded-lg border border-red-800 bg-red-950/50 p-3 text-red-200">
              {errorCarga}
              <button
                type="button"
                onClick={reintentarCarga}
                className="ml-2 underline"
              >
                Reintentar
              </button>
            </div>
          )}

          <form onSubmit={guardarAsignacion} className="space-y-5">
            <div>
              <label htmlFor="busqueda-rut-cliente" className="block mb-2 font-semibold">
                Buscar cliente por RUT
              </label>
              <input
                id="busqueda-rut-cliente"
                type="search"
                value={busquedaRutCliente}
                onChange={(evento) => setBusquedaRutCliente(evento.target.value)}
                placeholder="Ej: 12.345.678-9"
                className="w-full bg-black border border-zinc-700 rounded-lg p-3 outline-none focus:border-red-600 mb-4"
              />
              <label htmlFor="cliente" className="block mb-2 font-semibold">
                Cliente
              </label>
              <select
                id="cliente"
                value={clienteId}
                onChange={(evento) => setClienteId(evento.target.value)}
                required
                disabled={cargandoDatos || clientesDisponibles.length === 0}
                className="w-full bg-black border border-zinc-700 rounded-lg p-3 outline-none focus:border-red-600 disabled:opacity-60"
              >
                <option value="">Seleccionar cliente</option>
                {opcionesCliente.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre} — {cliente.rut}
                  </option>
                ))}
                {clientesFiltrados.length === 0 && clientesDisponibles.length > 0 && (
                  <option value="" disabled>
                    No se encontraron clientes con ese RUT
                  </option>
                )}
              </select>
              {clientesDisponibles.length === 0 && !cargandoDatos && (
                <p className="text-sm text-amber-300 mt-2">
                  No hay clientes disponibles sin asignación activa.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="plan" className="block mb-2 font-semibold">
                Plan activo
              </label>
              <select
                id="plan"
                value={planId}
                onChange={(evento) => setPlanId(evento.target.value)}
                required
                disabled={cargandoDatos || planesActivos.length === 0}
                className="w-full bg-black border border-zinc-700 rounded-lg p-3 outline-none focus:border-red-600 disabled:opacity-60"
              >
                <option value="">Seleccionar plan</option>
                {planesActivos.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.nombre}
                    {plan.modalidad ? ` — ${plan.modalidad}` : ""}
                    {plan.duracionMeses ? ` — ${plan.duracionMeses} meses` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="horario" className="block mb-2 font-semibold">
                Horario y profesor
              </label>
              <select
                id="horario"
                value={horarioId}
                onChange={(evento) => setHorarioId(evento.target.value)}
                required
                disabled={cargandoDatos || horariosActivos.length === 0}
                className="w-full bg-black border border-zinc-700 rounded-lg p-3 outline-none focus:border-red-600 disabled:opacity-60"
              >
                <option value="">Seleccionar horario</option>
                {horariosActivos.map((horario) => (
                  <option key={horario.id} value={horario.id}>
                    {horario.diaSemana}, {horaCorta(horario.horaInicio)}–
                    {horaCorta(horario.horaFin)} ·{" "}
                    {horario.profesor?.nombre ?? "Profesor no disponible"} ·{" "}
                    {horario.modalidad}
                  </option>
                ))}
              </select>
              {horariosActivos.length === 0 && !cargandoDatos && (
                <p className="text-sm text-amber-300 mt-2">
                  No hay horarios activos disponibles.
                </p>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="fechaInicio" className="block mb-2 font-semibold">
                  Fecha de inicio
                </label>
                <input
                  id="fechaInicio"
                  type="date"
                  value={fechaInicio}
                  onChange={(evento) => setFechaInicio(evento.target.value)}
                  required
                  className="w-full bg-black border border-zinc-700 rounded-lg p-3 outline-none focus:border-red-600"
                />
              </div>
              <div>
                <label htmlFor="fechaTermino" className="block mb-2 font-semibold">
                  Fecha de término
                </label>
                <input
                  id="fechaTermino"
                  type="date"
                  value={fechaTermino}
                  min={fechaInicio || undefined}
                  onChange={(evento) => setFechaTermino(evento.target.value)}
                  className="w-full bg-black border border-zinc-700 rounded-lg p-3 outline-none focus:border-red-600"
                />
              </div>
            </div>

            <div>
              <label htmlFor="observaciones" className="block mb-2 font-semibold">
                Observaciones
              </label>
              <textarea
                id="observaciones"
                value={observaciones}
                onChange={(evento) => setObservaciones(evento.target.value)}
                rows={3}
                className="w-full bg-black border border-zinc-700 rounded-lg p-3 outline-none focus:border-red-600"
              />
            </div>

            {mensaje && <p role="status" className="text-sm text-green-300">{mensaje}</p>}
            {errorFormulario && <p role="alert" className="text-sm text-red-300">{errorFormulario}</p>}

            <button
              type="submit"
              disabled={guardando || cargandoDatos || Boolean(errorCarga)}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition py-3 rounded-xl font-bold"
            >
              {guardando ? "Guardando..." : "Crear asignación"}
            </button>
          </form>
        </section>

        <section className="lg:col-span-2 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-950">
          <div className="p-6 border-b border-zinc-800">
            <h2 className="text-2xl font-bold">Asignaciones registradas</h2>
            <p className="text-gray-400 mt-1">
              Total: {asignaciones.length}
            </p>
          </div>
          {cargandoDatos ? (
            <p className="p-6 text-gray-400">Cargando asignaciones...</p>
          ) : asignaciones.length === 0 ? (
            <p className="p-6 text-gray-400">Todavía no hay asignaciones.</p>
          ) : (
            <div className="divide-y divide-zinc-800">
              {asignaciones.map((asignacion) => (
                <article key={asignacion.id} className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold">
                        {asignacion.cliente?.nombre ?? "Cliente"}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {asignacion.cliente?.email ?? ""}
                      </p>
                    </div>
                    <span
                      className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
                        asignacion.estado === "Activa"
                          ? "bg-green-950 text-green-300"
                          : "bg-zinc-800 text-gray-300"
                      }`}
                    >
                      {asignacion.estado}
                    </span>
                  </div>
                  <div className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
                    <p>
                      <span className="text-gray-400">Plan:</span>{" "}
                      {asignacion.plan?.nombre ?? "No disponible"}
                    </p>
                    <p>
                      <span className="text-gray-400">Profesor:</span>{" "}
                      {asignacion.horario?.profesor?.nombre ?? "No disponible"}
                    </p>
                    <p>
                      <span className="text-gray-400">Horario:</span>{" "}
                      {asignacion.horario
                        ? `${asignacion.horario.diaSemana}, ${horaCorta(
                            asignacion.horario.horaInicio
                          )}–${horaCorta(asignacion.horario.horaFin)}`
                        : "No disponible"}
                    </p>
                    <p>
                      <span className="text-gray-400">Vigencia:</span>{" "}
                      {asignacion.fechaInicio}
                      {asignacion.fechaTermino
                        ? ` al ${asignacion.fechaTermino}`
                        : ""}
                    </p>
                  </div>
                  {asignacion.observaciones && (
                    <p className="text-sm text-gray-400 mt-3">
                      {asignacion.observaciones}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
