"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../auth/AuthContext";
import AdminSectionHeader from "../components/AdminSectionHeader";

const API_URL = `${(
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
).replace(/\/+$/, "")}/api`;

type ClaseReservada = {
  asignacionId: number;
  clienteId: number;
  cliente: {
    id: number;
    nombre: string;
    rut: string | null;
    email: string | null;
  };
  plan: {
    id: number;
    nombre: string;
    modalidad: string | null;
  } | null;
  profesor: string | null;
  fecha: string;
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
};

type Agenda = {
  fechaDesde: string;
  fechaHasta: string;
  clases: ClaseReservada[];
};

type Fallido = {
  asignacionId: number;
  cliente: string;
  email: string | null;
  enviado: false;
  mensaje: string;
};

type Advertencia = {
  cliente: string;
  mensaje: string;
};

type RespuestaEnvio = {
  ok: boolean;
  mensaje: string;
  enviados: number;
  fallidos: Fallido[];
  advertencias: Advertencia[];
};

type ResultadoEnvio = {
  mensaje: string;
  enviados: number;
  fallidos: Fallido[];
  advertencias: Advertencia[];
};

function obtenerMensajeError(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    const mensaje =
      typeof data === "object" && data !== null
        ? (data as { mensaje?: unknown }).mensaje
        : null;

    if (typeof mensaje === "string") return mensaje;
    if (error.response?.status === 401) {
      return "Tu sesión expiró. Inicia sesión nuevamente.";
    }
    if (error.response?.status === 403) {
      return "No tienes permisos para administrar recordatorios.";
    }
  }

  return "No se pudo completar la operación. Inténtalo nuevamente.";
}

function fechaLocal(fecha: Date) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function mostrarFecha(fecha: string) {
  return new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${fecha}T12:00:00`));
}

export default function RecordatoriosPage() {
  const router = useRouter();
  const { usuario, cargando, token } = useAuth();
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [cargandoAgenda, setCargandoAgenda] = useState(true);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState<ResultadoEnvio | null>(null);
  const [enviando, setEnviando] = useState("");

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

  const cargarAgenda = useCallback(async () => {
    const respuesta = await axios.get<Agenda>(
      `${API_URL}/recordatorios/agenda`,
      config
    );
    setAgenda(respuesta.data);
  }, [config]);

  useEffect(() => {
    if (cargando || !usuario || usuario.rol !== "admin" || !token) {
      return;
    }

    let activo = true;

    async function iniciarCarga() {
      setCargandoAgenda(true);
      setError("");

      try {
        await cargarAgenda();
      } catch (err) {
        if (activo) setError(obtenerMensajeError(err));
      } finally {
        if (activo) setCargandoAgenda(false);
      }
    }

    void iniciarCarga();

    return () => {
      activo = false;
    };
  }, [cargando, usuario, token, cargarAgenda]);

  const dias = useMemo(() => {
    if (!agenda) return [];

    const inicio = new Date(`${agenda.fechaDesde}T12:00:00`);
    return Array.from({ length: 7 }, (_, desplazamiento) => {
      const fecha = new Date(inicio);
      fecha.setDate(fecha.getDate() + desplazamiento);
      const fechaTexto = fechaLocal(fecha);

      return {
        fecha: fechaTexto,
        titulo: mostrarFecha(fechaTexto),
        clases: agenda.clases.filter(
          (clase) => clase.fecha === fechaTexto
        ),
      };
    });
  }, [agenda]);

  async function enviarRecordatorio(fecha: string, asignacionId?: number) {
    if (!token || enviando) return;

    setError("");
    setResultado(null);
    setEnviando(
      asignacionId === undefined
        ? `dia:${fecha}`
        : `clase:${asignacionId}`
    );

    try {
      const respuesta = await axios.post<RespuestaEnvio>(
        `${API_URL}/recordatorios/enviar`,
        {
          fecha,
          ...(asignacionId === undefined ? {} : { asignacionId }),
        },
        config
      );

      setResultado({
        mensaje: respuesta.data.mensaje,
        enviados: respuesta.data.enviados,
        fallidos: respuesta.data.fallidos,
        advertencias: respuesta.data.advertencias,
      });

      try {
        await cargarAgenda();
      } catch (err) {
        setError(
          `El envío se procesó, pero no se pudo actualizar la agenda. ${obtenerMensajeError(err)}`
        );
      }
    } catch (err) {
      setError(obtenerMensajeError(err));
    } finally {
      setEnviando("");
    }
  }

  if (cargando || !usuario || usuario.rol !== "admin") {
    return (
      <main className="min-h-screen bg-black p-6 text-white">
        <p>{cargando ? "Cargando..." : "Verificando acceso..."}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black p-6 text-white md:p-10">
      <AdminSectionHeader
        titulo="Recordatorios de"
        destacado="Clases"
        descripcion="Consulta las sesiones reservadas para hoy y los próximos seis días. Envía un aviso por correo a toda la jornada o a una clase específica."
      />

      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-400">
              Los correos se envían al email asociado a cada cliente y quedan
              registrados en el sistema.
            </p>
          </div>
          <Link
            href="/admin"
            className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-gray-300 transition hover:border-red-500/50 hover:text-white"
          >
            Volver al panel
          </Link>
        </div>

        {error && (
          <div
            className="flex items-start justify-between gap-4 rounded-xl border border-red-500/30 bg-red-950/40 px-5 py-4 text-sm text-red-200"
            role="alert"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              className="font-semibold text-red-100 hover:text-white"
              aria-label="Cerrar mensaje de error"
            >
              Cerrar
            </button>
          </div>
        )}

        {resultado && (
          <div
            className={`rounded-xl border px-5 py-4 ${
              resultado.fallidos.length
                ? "border-amber-500/30 bg-amber-950/30 text-amber-100"
                : "border-emerald-500/30 bg-emerald-950/30 text-emerald-100"
            }`}
            role="status"
          >
            <p className="font-semibold">{resultado.mensaje}</p>
            {resultado.fallidos.length > 0 && (
              <ul className="mt-3 space-y-2 text-sm">
                {resultado.fallidos.map((fallido, indice) => (
                  <li
                    key={`${fallido.asignacionId}-${indice}`}
                    className="rounded-lg bg-black/20 px-3 py-2"
                  >
                    <span className="font-semibold">{fallido.cliente}</span>
                    {fallido.email ? ` (${fallido.email})` : ""}
                    {`: ${fallido.mensaje}`}
                  </li>
                ))}
              </ul>
            )}
            {resultado.advertencias.length > 0 && (
              <ul className="mt-3 space-y-2 text-sm">
                {resultado.advertencias.map((advertencia, indice) => (
                  <li
                    key={`${advertencia.cliente}-${indice}`}
                    className="rounded-lg bg-black/20 px-3 py-2"
                  >
                    <span className="font-semibold">
                      {advertencia.cliente}
                    </span>
                    {`: ${advertencia.mensaje}`}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {cargandoAgenda ? (
          <div className="rounded-2xl border border-white/10 bg-neutral-900 px-6 py-14 text-center text-gray-400">
            Cargando clases reservadas...
          </div>
        ) : !agenda ? (
          <div className="rounded-2xl border border-white/10 bg-neutral-900 px-6 py-14 text-center">
            <p className="font-semibold text-white">
              No se pudo cargar la agenda.
            </p>
            <button
              type="button"
              onClick={() => {
                setError("");
                setCargandoAgenda(true);
                void cargarAgenda()
                  .catch((err: unknown) => setError(obtenerMensajeError(err)))
                  .finally(() => setCargandoAgenda(false));
              }}
              className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold hover:bg-red-600"
            >
              Reintentar
            </button>
          </div>
        ) : agenda.clases.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-neutral-900 px-6 py-14 text-center">
            <p className="text-lg font-semibold text-white">
              No hay clases reservadas para los próximos siete días.
            </p>
            <p className="mt-2 text-sm text-gray-400">
              Se mostrarán aquí las clases asociadas a asignaciones activas.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {dias.map((dia, indice) => (
              <section
                key={dia.fecha}
                aria-labelledby={`dia-${dia.fecha}`}
                className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900"
              >
                <header className="flex flex-col justify-between gap-4 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-center md:px-7">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2
                        id={`dia-${dia.fecha}`}
                        className="text-lg font-bold capitalize sm:text-xl"
                      >
                        {dia.titulo}
                      </h2>
                      {indice === 0 && (
                        <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-300">
                          Hoy
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-400">
                      {dia.clases.length}{" "}
                      {dia.clases.length === 1
                        ? "clase reservada"
                        : "clases reservadas"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void enviarRecordatorio(dia.fecha)}
                    disabled={dia.clases.length === 0 || enviando !== ""}
                    className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {enviando === `dia:${dia.fecha}`
                      ? "Enviando correos..."
                      : "Recordar todas las clases del día"}
                  </button>
                </header>

                {dia.clases.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-gray-500 md:px-7">
                    No hay clases futuras reservadas para este día.
                  </p>
                ) : (
                  <ul className="divide-y divide-white/5">
                    {dia.clases.map((clase) => (
                      <li
                        key={`${clase.asignacionId}-${clase.fecha}`}
                        className="flex flex-col justify-between gap-4 px-5 py-5 sm:flex-row sm:items-center md:px-7"
                      >
                        <div className="flex min-w-0 gap-4">
                          <div className="flex h-12 min-w-20 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 px-3 text-sm font-bold text-red-200">
                            {clase.horaInicio}
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate font-semibold text-white">
                              {clase.cliente.nombre}
                            </h3>
                            <p className="mt-1 break-all text-sm text-gray-400">
                              {clase.cliente.email ||
                                "Sin correo electrónico registrado"}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                              <span>
                                {clase.horaInicio}–{clase.horaFin}
                              </span>
                              {clase.plan?.nombre && (
                                <span>Plan: {clase.plan.nombre}</span>
                              )}
                              {clase.profesor && (
                                <span>Profesor: {clase.profesor}</span>
                              )}
                              {clase.plan?.modalidad && (
                                <span>{clase.plan.modalidad}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            void enviarRecordatorio(
                              clase.fecha,
                              clase.asignacionId
                            )
                          }
                          disabled={!clase.cliente.email || enviando !== ""}
                          title={
                            clase.cliente.email
                              ? "Enviar recordatorio a este cliente"
                              : "Registra un correo electrónico para este cliente antes de enviarle un recordatorio"
                          }
                          className="shrink-0 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-gray-200 transition hover:border-red-500/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {enviando === `clase:${clase.asignacionId}`
                            ? "Enviando..."
                            : "Recordar esta clase"}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
