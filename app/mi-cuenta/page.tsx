"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth/AuthContext";

type PerfilCliente = {
  cliente: {
    id: number;
    nombre: string;
    email: string;
    rut: string | null;
    telefono: string | null;
    estado: string;
  } | null;
  asignacion: {
    id: number;
    fechaInicio: string;
    fechaTermino: string | null;
    fechaTerminoVigencia: string | null;
    estado: string;
    sesionesTotales: number | null;
    sesionesUtilizadas: number;
    sesionesRestantes: number | null;
  } | null;
  asistencias: {
    id: number;
    fecha: string;
    estado: "Presente" | "Ausente" | "Justificada";
    observaciones: string | null;
  }[];
  plan: {
    id: number;
    nombre: string;
    descripcion?: string | null;
    duracionMeses?: number | null;
    modalidad?: string | null;
    precio?: string | number | null;
  } | null;
  profesor: {
    id: number;
    nombre: string;
    especialidad?: string | null;
    email?: string | null;
    telefono?: string | null;
  } | null;
  horario: {
    id: number;
    diaSemana?: string | null;
    horaInicio?: string | null;
    horaFin?: string | null;
    modalidad?: string | null;
  } | null;
  contrato: {
    id: number;
    nombreArchivo: string;
    rutaArchivo: string;
    fechaInicio?: string | null;
    fechaTermino?: string | null;
    estado?: string | null;
    observaciones?: string | null;
    url?: string;
  } | null;
};

function mostrarFecha(fecha: string) {
  const [anio, mes, dia] = fecha.slice(0, 10).split("-");
  return `${dia}/${mes}/${anio}`;
}

export default function MiCuentaPage() {
  const router = useRouter();
  const { usuario, cargando, token, logout } = useAuth();

  const [perfil, setPerfil] = useState<PerfilCliente | null>(null);
  const [cargandoPerfil, setCargandoPerfil] = useState(true);
  const [errorContrato, setErrorContrato] = useState("");

  useEffect(() => {
    if (cargando) return;

    if (!usuario) {
      router.replace("/login");
      return;
    }

    if (usuario.rol !== "cliente") {
      router.replace("/admin");
      return;
    }

    const cargarPerfil = async () => {
      try {
        const respuesta = await fetch(
          "http://localhost:3001/api/clientes/mi-dashboard",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!respuesta.ok) {
          throw new Error("No se pudo cargar la información del cliente");
        }

        const data = await respuesta.json();

        setPerfil(data);
      } catch (error) {
        console.error("Error al cargar dashboard:", error);
      } finally {
        setCargandoPerfil(false);
      }
    };

    cargarPerfil();
  }, [usuario, cargando, token, router]);

  const cerrarSesion = () => {
    logout();
    router.replace("/login");
  };

  if (cargando || cargandoPerfil) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Cargando información de tu cuenta...</p>
      </main>
    );
  }

  if (!usuario || usuario.rol !== "cliente") {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Verificando acceso...</p>
      </main>
    );
  }

  const abrirContrato = async () => {
    if (!perfil?.contrato || !token) return;

    const ventana = window.open("about:blank", "_blank");
    if (!ventana) {
      setErrorContrato("Permite las ventanas emergentes para abrir el contrato.");
      return;
    }

    try {
      setErrorContrato("");
      const respuesta = await fetch(
        `http://localhost:3001/api/contratos/${perfil.contrato.id}/archivo`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!respuesta.ok) {
        const data = await respuesta.json();
        throw new Error(data.mensaje || "No se pudo abrir el contrato.");
      }

      const archivo = URL.createObjectURL(await respuesta.blob());
      ventana.location.href = archivo;
    } catch (error) {
      console.error("Error al abrir el contrato:", error);
      ventana.close();
      setErrorContrato(
        error instanceof Error ? error.message : "No se pudo abrir el contrato."
      );
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#080808] text-white">
      <header className="border-b border-white/10 bg-black/70">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 md:px-8">
          <Link href="/" className="flex items-center gap-3 font-black tracking-wide">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-sm">FP</span>
            <span>FOCUS <span className="text-red-500">POWER FIT</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-gray-300 transition hover:border-white/30 hover:text-white"
            >
              Inicio
            </Link>
            <button
              onClick={cerrarSesion}
              className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold transition hover:bg-red-500"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <section className="relative isolate border-b border-white/5">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_80%_35%,rgba(153,27,27,0.22),transparent_45%),linear-gradient(115deg,#080808_35%,#160909_100%)]" />
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-7 px-5 py-12 sm:flex-row sm:items-end md:px-8 md:py-16">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-red-400">Tu espacio personal</p>
            <h1 className="mt-3 text-4xl font-black sm:text-5xl">
              ¡Hola, <span className="text-red-500">{perfil?.cliente?.nombre || usuario.nombre}</span>!
            </h1>
            <p className="mt-4 max-w-2xl leading-7 text-gray-300">
              Aquí puedes consultar tu plan, tus sesiones y todo lo relacionado con tu entrenamiento.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 backdrop-blur">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Estado de cuenta</p>
            <p className="mt-1 font-semibold text-white">{perfil?.cliente?.estado || "Activa"}</p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-14">
      <section className="space-y-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-500">Tu entrenamiento</p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">Resumen de mi cuenta</h2>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
          <Tarjeta
            titulo="Mi plan"
            contenido={
              perfil?.plan
                ? `${perfil.plan.nombre} (${perfil.plan.modalidad || "Sin modalidad"})`
                : "Sin plan asignado"
            }
          />

          <Tarjeta
            titulo="Mi profesor"
            contenido={
              perfil?.profesor
                ? `${perfil.profesor.nombre} · ${perfil.profesor.especialidad || "Sin especialidad"}`
                : "Sin profesor asignado"
            }
          />

          <Tarjeta
            titulo="Mi horario"
            contenido={
              perfil?.horario
                ? `${perfil.horario.diaSemana} · ${perfil.horario.horaInicio} - ${perfil.horario.horaFin}`
                : "Sin horario asignado"
            }
          />

          <Tarjeta
            titulo="Vigencia de mi plan"
            contenido={
              perfil?.asignacion
                ? `Desde ${mostrarFecha(perfil.asignacion.fechaInicio)} · ${
                    perfil.asignacion.fechaTerminoVigencia
                      ? `hasta ${mostrarFecha(perfil.asignacion.fechaTerminoVigencia)}`
                      : "sin fecha de término"
                  }`
                : "Sin asignación activa"
            }
          />

          <Tarjeta
            titulo="Sesiones disponibles"
            contenido={
              perfil?.asignacion && perfil.asignacion.sesionesTotales !== null
                ? `${perfil.asignacion.sesionesRestantes} de ${perfil.asignacion.sesionesTotales} · ${perfil.asignacion.sesionesUtilizadas} utilizadas`
                : perfil?.asignacion
                  ? `${perfil.asignacion.sesionesUtilizadas} utilizadas · plan sin límite configurado`
                  : "Sin plan asignado"
            }
          />

          <Tarjeta
            titulo="Mi contrato"
            contenido={
              perfil?.contrato
                ? `Contrato ${perfil.contrato.estado || "vigente"}`
                : "Sin contrato cargado"
            }
          />
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 sm:p-8">
        <h3 className="mb-5 text-xl font-bold">
          Historial de <span className="text-red-500">sesiones</span>
        </h3>
        {!perfil?.asistencias?.length ? (
          <p className="text-gray-400">No hay sesiones registradas para tu asignación actual.</p>
        ) : (
          <div className="space-y-3">
            {perfil.asistencias.map((asistencia) => (
              <article
                key={asistencia.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-zinc-800 pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <p className="font-semibold">{mostrarFecha(asistencia.fecha)}</p>
                  {asistencia.observaciones && (
                    <p className="text-sm text-gray-400">{asistencia.observaciones}</p>
                  )}
                </div>
                <span
                  className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
                    asistencia.estado === "Presente"
                      ? "bg-green-950 text-green-300"
                      : asistencia.estado === "Justificada"
                        ? "bg-amber-950 text-amber-300"
                        : "bg-red-950 text-red-300"
                  }`}
                >
                  {asistencia.estado}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 sm:p-8">
          <h3 className="mb-5 text-xl font-bold"><span className="text-red-500">Datos</span> personales</h3>

          <ul className="space-y-3 text-gray-300">
            <li>
              <span className="font-semibold text-white">Nombre:</span>{" "}
              {perfil?.cliente?.nombre || "No disponible"}
            </li>
            <li>
              <span className="font-semibold text-white">Email:</span>{" "}
              {perfil?.cliente?.email || "No disponible"}
            </li>
            <li>
              <span className="font-semibold text-white">RUT:</span>{" "}
              {perfil?.cliente?.rut || "No disponible"}
            </li>
            <li>
              <span className="font-semibold text-white">Teléfono:</span>{" "}
              {perfil?.cliente?.telefono || "No disponible"}
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 sm:p-8">
          <h3 className="mb-5 text-xl font-bold">Detalle del <span className="text-red-500">plan</span></h3>

          {perfil?.plan ? (
            <div className="text-gray-300 space-y-2">
              <p>
                <span className="font-semibold text-white">Plan:</span>{" "}
                {perfil.plan.nombre}
              </p>
              <p>
                <span className="font-semibold text-white">Modalidad:</span>{" "}
                {perfil.plan.modalidad || "No especificada"}
              </p>
              <p>
                <span className="font-semibold text-white">Duración:</span>{" "}
                {perfil.plan.duracionMeses
                  ? `${perfil.plan.duracionMeses} meses`
                  : "No especificada"}
              </p>
              <p>
                <span className="font-semibold text-white">Descripción:</span>{" "}
                {perfil.plan.descripcion || "Sin descripción"}
              </p>
            </div>
          ) : (
            <p className="text-gray-400">Todavía no tienes un plan asignado.</p>
          )}
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 sm:p-8">
          <h3 className="mb-5 text-xl font-bold">Profesor <span className="text-red-500">asignado</span></h3>

          {perfil?.profesor ? (
            <div className="text-gray-300 space-y-2">
              <p>
                <span className="font-semibold text-white">Nombre:</span>{" "}
                {perfil.profesor.nombre}
              </p>
              <p>
                <span className="font-semibold text-white">Especialidad:</span>{" "}
                {perfil.profesor.especialidad || "No disponible"}
              </p>
              <p>
                <span className="font-semibold text-white">Email:</span>{" "}
                {perfil.profesor.email || "No disponible"}
              </p>
              <p>
                <span className="font-semibold text-white">Teléfono:</span>{" "}
                {perfil.profesor.telefono || "No disponible"}
              </p>
            </div>
          ) : (
            <p className="text-gray-400">Aún no tienes profesor asignado.</p>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 sm:p-8">
          <h3 className="mb-5 text-xl font-bold"><span className="text-red-500">Mi</span> horario</h3>

          {perfil?.horario ? (
            <div className="text-gray-300 space-y-2">
              <p>
                <span className="font-semibold text-white">Día:</span>{" "}
                {perfil.horario.diaSemana || "No disponible"}
              </p>
              <p>
                <span className="font-semibold text-white">Horario:</span>{" "}
                {perfil.horario.horaInicio || "No disponible"} -{" "}
                {perfil.horario.horaFin || "No disponible"}
              </p>
              <p>
                <span className="font-semibold text-white">Modalidad:</span>{" "}
                {perfil.horario.modalidad || "No disponible"}
              </p>

              <div className="mt-4 p-3 border border-zinc-700 rounded-lg bg-black/20">
                <p className="text-sm text-yellow-300">
                  Este horario es de solo consulta. No se puede modificar directamente desde aquí.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-400">Todavía no tienes horario asignado.</p>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 sm:p-8">
        <h3 className="mb-5 text-xl font-bold">Copia digital de mi <span className="text-red-500">contrato</span></h3>

        {perfil?.contrato ? (
          <div className="space-y-3">
            <p className="text-gray-300">
              Archivo: {perfil.contrato.nombreArchivo}
            </p>

            <button
              type="button"
              onClick={abrirContrato}
              className="inline-block bg-red-600 hover:bg-red-700 px-5 py-3 rounded-lg font-bold transition"
            >
              Ver contrato
            </button>
            {errorContrato && (
              <p role="alert" className="text-sm text-red-300">{errorContrato}</p>
            )}
          </div>
        ) : (
          <p className="text-gray-400">
            Aún no tienes un contrato disponible para visualizar.
          </p>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-red-900/40 bg-red-950/20 p-6">
        <h2 className="mb-3 text-xl font-bold text-red-400">
          Información importante
        </h2>

        <p className="text-gray-300">
          Puedes consultar tu plan, profesor, horario y contrato desde esta sección.
          La información de horario es solo lectura; cualquier cambio debe ser coordinado
          con Focus Power Fit.
        </p>
      </section>
      </div>
      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-sm text-gray-500 sm:flex-row sm:justify-between md:px-8">
          <span>© {new Date().getFullYear()} Focus Power Fit</span>
          <Link href="/" className="transition hover:text-white">Volver al inicio</Link>
        </div>
      </footer>
    </main>
  );
}

function Tarjeta({
  titulo,
  contenido,
}: {
  titulo: string;
  contenido: string;
}) {
  return (
    <div className="group rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 transition hover:-translate-y-0.5 hover:border-red-500/40">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-red-400">{titulo}</p>
      <p className="leading-6 text-gray-200">{contenido}</p>
    </div>
  );
}