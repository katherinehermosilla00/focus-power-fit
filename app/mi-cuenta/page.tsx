"use client";

import { useEffect, useState } from "react";
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

export default function MiCuentaPage() {
  const router = useRouter();
  const { usuario, cargando, token, logout } = useAuth();

  const [perfil, setPerfil] = useState<PerfilCliente | null>(null);
  const [cargandoPerfil, setCargandoPerfil] = useState(true);

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

  const contratoUrl =
    perfil?.contrato?.url ||
    (perfil?.contrato?.rutaArchivo
      ? `http://localhost:3001${perfil.contrato.rutaArchivo}`
      : null);

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <p className="text-gray-400">Mi cuenta</p>
          <h1 className="text-4xl font-black">
            FOCUS <span className="text-red-600">POWER FIT</span>
          </h1>
          <p className="mt-2 text-gray-300">
            Bienvenido/a, {perfil?.cliente?.nombre || usuario.nombre}
          </p>
        </div>

        <button
          onClick={cerrarSesion}
          className="bg-red-600 hover:bg-red-700 px-5 py-3 rounded-lg font-bold transition"
        >
          Cerrar sesión
        </button>
      </header>

      <section className="space-y-6">
        <h2 className="text-3xl font-bold">Información de mi cuenta</h2>

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
            titulo="Mi contrato"
            contenido={
              perfil?.contrato
                ? `Contrato ${perfil.contrato.estado || "vigente"}`
                : "Sin contrato cargado"
            }
          />
        </div>
      </section>

      <section className="mt-10 grid lg:grid-cols-2 gap-6">
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-xl font-bold text-red-500 mb-4">
            Datos personales
          </h3>

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

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-xl font-bold text-red-500 mb-4">
            Detalle del plan
          </h3>

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

      <section className="mt-10 grid lg:grid-cols-2 gap-6">
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-xl font-bold text-red-500 mb-4">
            Profesor asignado
          </h3>

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

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-xl font-bold text-red-500 mb-4">
            Horario
          </h3>

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

      <section className="mt-10 bg-zinc-950 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-xl font-bold text-red-500 mb-4">
          Copia digital de mi contrato
        </h3>

        {perfil?.contrato && contratoUrl ? (
          <div className="space-y-3">
            <p className="text-gray-300">
              Archivo: {perfil.contrato.nombreArchivo}
            </p>

            <a
              href={contratoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block bg-red-600 hover:bg-red-700 px-5 py-3 rounded-lg font-bold transition"
            >
              Ver contrato
            </a>
          </div>
        ) : (
          <p className="text-gray-400">
            Aún no tienes un contrato disponible para visualizar.
          </p>
        )}
      </section>

      <section className="mt-8 bg-zinc-950 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-red-500 mb-3">
          Información importante
        </h2>

        <p className="text-gray-300">
          Puedes consultar tu plan, profesor, horario y contrato desde esta sección.
          La información de horario es solo lectura; cualquier cambio debe ser coordinado
          con Focus Power Fit.
        </p>
      </section>
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
    <div className="bg-zinc-950 border border-zinc-800 hover:border-red-600 transition rounded-xl p-6">
      <p className="text-red-500 font-bold text-lg mb-2">{titulo}</p>
      <p className="text-gray-300">{contenido}</p>
    </div>
  );
}