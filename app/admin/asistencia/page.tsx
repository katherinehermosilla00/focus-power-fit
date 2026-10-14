"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useAuth } from "../../auth/AuthContext";
import AdminSectionHeader from "../components/AdminSectionHeader";

type EstadoAsistencia = "Presente" | "Ausente" | "Justificada";

type Cliente = {
  id: number;
  nombre: string;
  rut: string;
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

const API_BASE = "http://localhost:3001/api";
const ESTADOS: EstadoAsistencia[] = ["Presente", "Ausente", "Justificada"];

function mensajeError(error: unknown, predeterminado: string) {
  if (axios.isAxiosError<{ mensaje?: string }>(error)) {
    return error.response?.data?.mensaje ?? predeterminado;
  }

  return predeterminado;
}

function fechaHoy() {
  const fecha = new Date();
  const zona = fecha.getTimezoneOffset() * 60_000;
  return new Date(fecha.getTime() - zona).toISOString().slice(0, 10);
}

function etiquetaAsignacion(asignacion: Asignacion) {
  const cliente = asignacion.cliente?.nombre ?? "Cliente";
  const plan = asignacion.plan?.nombre ?? "Plan";
  const horario = asignacion.horario;
  const clase = horario
    ? `${horario.diaSemana} ${horario.horaInicio.slice(0, 5)}–${horario.horaFin.slice(0, 5)}`
    : "Horario no disponible";

  return `${cliente} · ${plan} · ${clase}`;
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
  const [asistenciaEditandoId, setAsistenciaEditandoId] = useState<number | null>(null);
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
    if (usuario.rol !== "admin") router.replace("/mi-cuenta");
  }, [cargando, router, usuario]);

  const cargarDatos = useCallback(async () => {
    if (!token) return;

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [asignacionesRes, asistenciasRes] = await Promise.all([
        axios.get<Asignacion[]>(`${API_BASE}/asignaciones`, config),
        axios.get<Asistencia[]>(`${API_BASE}/asistencias`, config),
      ]);
      setAsignaciones(asignacionesRes.data);
      setAsistencias(asistenciasRes.data);
      setErrorCarga("");
    } catch (error) {
      console.error("Error al cargar asistencias:", error);
      setErrorCarga(mensajeError(error, "No se pudieron cargar las asistencias."));
    } finally {
      setCargandoDatos(false);
    }
  }, [token]);

  useEffect(() => {
    if (!cargando && usuario?.rol === "admin" && token) {
      void Promise.resolve().then(cargarDatos);
    }
  }, [cargando, cargarDatos, token, usuario]);

  const asignacionesActivas = useMemo(
    () => {
      const asignacionActualId = asistencias.find(
        (asistencia) => asistencia.id === asistenciaEditandoId
      )?.asignacionId;

      return asignaciones.filter(
        (asignacion) =>
          asignacion.estado === "Activa" || asignacion.id === asignacionActualId
      );
    },
    [asignaciones, asistenciaEditandoId, asistencias]
  );

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

  const guardarAsistencia = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!token) return;

    setGuardando(true);
    setMensaje("");
    setErrorFormulario("");
    const datos = {
      asignacionId: Number(asignacionId),
      fecha,
      estado,
      observaciones: observaciones.trim() || null,
    };
    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      const mensajeExito =
        asistenciaEditandoId !== null
          ? "Asistencia actualizada correctamente."
          : "Asistencia registrada correctamente.";
      if (asistenciaEditandoId !== null) {
        await axios.put(`${API_BASE}/asistencias/${asistenciaEditandoId}`, datos, config);
      } else {
        await axios.post(`${API_BASE}/asistencias`, datos, config);
      }
      limpiarFormulario(false);
      setMensaje(mensajeExito);
      await cargarDatos();
    } catch (error) {
      console.error("Error al guardar asistencia:", error);
      setErrorFormulario(mensajeError(error, "No se pudo guardar la asistencia."));
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (cargando) {
    return <main className="min-h-screen bg-black text-white flex items-center justify-center">Cargando...</main>;
  }

  if (!usuario || usuario.rol !== "admin") {
    return <main className="min-h-screen bg-black text-white flex items-center justify-center">Verificando acceso...</main>;
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white p-6 md:p-10">
      <AdminSectionHeader
        titulo="Registro de"
        destacado="asistencia"
        descripcion="Registra la asistencia y actualiza los registros existentes."
      />

      <div className="grid lg:grid-cols-3 gap-8">
        <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 sm:p-8">
          <h2 className="text-2xl font-bold mb-6">
            {asistenciaEditandoId === null ? "Registrar asistencia" : "Actualizar asistencia"}
          </h2>
          {errorCarga && (
            <div role="alert" className="mb-5 rounded-lg border border-red-800 bg-red-950/50 p-3 text-red-200">
              {errorCarga}
              <button
                type="button"
                onClick={() => {
                  setCargandoDatos(true);
                  void cargarDatos();
                }}
                className="ml-2 underline"
              >
                Reintentar
              </button>
            </div>
          )}
          <form onSubmit={guardarAsistencia} className="space-y-5">
            <div>
              <label htmlFor="asignacion" className="block mb-2 font-semibold">
                Cliente y horario
              </label>
              <select
                id="asignacion"
                value={asignacionId}
                onChange={(evento) => setAsignacionId(evento.target.value)}
                required
                disabled={cargandoDatos}
                className="w-full bg-black border border-zinc-700 rounded-lg p-3 outline-none focus:border-red-600 disabled:opacity-60"
              >
                <option value="">Seleccionar cliente</option>
                {asignacionesActivas.map((asignacion) => (
                  <option key={asignacion.id} value={asignacion.id}>
                    {etiquetaAsignacion(asignacion)}
                  </option>
                ))}
              </select>
              {asignacionesActivas.length === 0 && !cargandoDatos && (
                <p className="text-sm text-amber-300 mt-2">
                  No hay clientes con asignación activa.
                </p>
              )}
            </div>
            <div>
              <label htmlFor="fecha" className="block mb-2 font-semibold">Fecha</label>
              <input
                id="fecha"
                type="date"
                value={fecha}
                onChange={(evento) => setFecha(evento.target.value)}
                required
                className="w-full bg-black border border-zinc-700 rounded-lg p-3 outline-none focus:border-red-600"
              />
            </div>
            <div>
              <label htmlFor="estado" className="block mb-2 font-semibold">Estado</label>
              <select
                id="estado"
                value={estado}
                onChange={(evento) => setEstado(evento.target.value as EstadoAsistencia)}
                className="w-full bg-black border border-zinc-700 rounded-lg p-3 outline-none focus:border-red-600"
              >
                {ESTADOS.map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="observaciones" className="block mb-2 font-semibold">Observaciones</label>
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
              {guardando ? "Guardando..." : asistenciaEditandoId === null ? "Registrar asistencia" : "Guardar cambios"}
            </button>
            {asistenciaEditandoId !== null && (
              <button type="button" onClick={() => limpiarFormulario()} className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 py-3 rounded-xl">
                Cancelar edición
              </button>
            )}
          </form>
        </section>

        <section className="lg:col-span-2 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-950">
          <div className="p-6 border-b border-zinc-800">
            <h2 className="text-2xl font-bold">Asistencias registradas</h2>
            <p className="text-gray-400 mt-1">Total: {asistencias.length}</p>
          </div>
          {cargandoDatos ? (
            <p className="p-6 text-gray-400">Cargando asistencias...</p>
          ) : asistencias.length === 0 ? (
            <p className="p-6 text-gray-400">Todavía no hay asistencias registradas.</p>
          ) : (
            <div className="divide-y divide-zinc-800">
              {asistencias.map((asistencia) => (
                <article key={asistencia.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold">
                      {asistencia.asignacion?.cliente?.nombre ?? "Cliente no disponible"}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                      {asistencia.asignacion ? etiquetaAsignacion(asistencia.asignacion) : "Asignación no disponible"}
                    </p>
                    <p className="text-sm text-gray-300 mt-2">
                      {asistencia.fecha.slice(0, 10)} · {asistencia.estado}
                    </p>
                    {asistencia.observaciones && (
                      <p className="text-sm text-gray-400 mt-1">{asistencia.observaciones}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => editarAsistencia(asistencia)}
                    className="w-fit bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 px-4 py-2 rounded-lg font-semibold"
                  >
                    Editar
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
