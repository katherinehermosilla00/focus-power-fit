"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth/AuthContext";
import "./mi-cuenta.css";

type PerfilCliente = {
  cliente: {
    id: number;
    sucursalId: number | null;
    numeroCliente: string | null;
    nombres: string | null;
    apellidos: string | null;
    nombre: string;
    email: string;
    rut: string | null;
    telefono: string | null;
    telefonoSecundario: string | null;
    direccion: string | null;
    comuna: string | null;
    ciudad: string | null;
    edad: number | null;
    genero: string | null;
    fechaNacimiento: string | null;
    fechaCreacionOrigen: string | null;
    plan: string | null;
    estado: string;
    sucursal: {
      id: number;
      nombre: string;
    } | null;
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

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
).replace(/\/+$/, "");

function mostrarFecha(fecha: string) {
  const [anio, mes, dia] = fecha.slice(0, 10).split("-");
  return `${dia}/${mes}/${anio}`;
}

function mostrarDato(valor: string | number | null | undefined) {
  return valor === null || valor === undefined || valor === ""
    ? "No informado"
    : valor;
}

export default function MiCuentaPage() {
  const router = useRouter();
  const { usuario, cargando, token, logout } = useAuth();

  const [perfil, setPerfil] = useState<PerfilCliente | null>(null);
  const [cargandoPerfil, setCargandoPerfil] = useState(true);
  const [errorContrato, setErrorContrato] = useState("");
  const [errorPerfil, setErrorPerfil] = useState("");

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
        setErrorPerfil("");
        const respuesta = await fetch(
          `${API_BASE}/api/clientes/mi-dashboard`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!respuesta.ok) {
          const data = await respuesta.json();
          throw new Error(
            data.mensaje || "No se pudo cargar la información del cliente."
          );
        }

        const data = await respuesta.json();

        setPerfil(data);
      } catch (error) {
        console.error("Error al cargar dashboard:", error);
        setErrorPerfil(
          error instanceof Error
            ? error.message
            : "No se pudo cargar la información de tu cuenta."
        );
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
      <main className="estilo1">
        <p>Cargando información de tu cuenta...</p>
      </main>
    );
  }

  if (!usuario || usuario.rol !== "cliente") {
    return (
      <main className="estilo1">
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
        `${API_BASE}/api/contratos/${perfil.contrato.id}/archivo`,
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
    <main className="estilo2">
      <header className="estilo3">
        <div className="estilo4">
          <Link href="/" className="estilo5">
            <span className="estilo6">FP</span>
            <span>FOCUS <span className="estilo7">POWER FIT</span></span>
          </Link>
          <div className="estilo8">
            <Link
              href="/"
              className="estilo9"
            >
              Inicio
            </Link>
            <button
              onClick={cerrarSesion}
              className="estilo10"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <section className="estilo11">
        <div className="estilo12" />
        <div className="estilo13">
          <div>
            <p className="estilo14">Tu espacio personal</p>
            <h1 className="estilo15">
              ¡Hola, <span className="estilo7">{perfil?.cliente?.nombre || usuario.nombre}</span>!
            </h1>
            <p className="estilo16">
              Aquí puedes consultar tus datos y la información asociada a tu cuenta.
            </p>
          </div>
          <div className="estilo17">
            <p className="estilo18">Estado de cuenta</p>
            <p className="estilo19">{perfil?.cliente?.estado || "No disponible"}</p>
          </div>
        </div>
      </section>

      <div className="estilo20">
      <section className="estilo21">
        {errorPerfil && (
          <p role="alert" className="estilo42">
            {errorPerfil}
          </p>
        )}
        <div>
          <p className="estilo22">Tu entrenamiento</p>
          <h2 className="estilo23">Resumen de mi cuenta</h2>
        </div>

        <div className="estilo24">
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

      <section className="estilo25">
        <h3 className="estilo26">
          Historial de <span className="estilo7">sesiones</span>
        </h3>
        {!perfil?.asistencias?.length ? (
          <p className="estilo27">No hay sesiones registradas para tu asignación actual.</p>
        ) : (
          <div className="estilo28">
            {perfil.asistencias.map((asistencia) => (
              <article
                key={asistencia.id}
                className="estilo29"
              >
                <div>
                  <p className="estilo30">{mostrarFecha(asistencia.fecha)}</p>
                  {asistencia.observaciones && (
                    <p className="estilo31">{asistencia.observaciones}</p>
                  )}
                </div>
                <span
                  className={`asistenciaEstado ${asistencia.estado === "Presente" ? "asistenciaPresente" : asistencia.estado === "Justificada" ? "asistenciaJustificada" : "asistenciaAusente"}`}
                >
                  {asistencia.estado}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="estilo32">
        <div className="estilo33">
          <h3 className="estilo26"><span className="estilo7">Datos</span> personales</h3>

          <ul className="estilo34">
            <li>
              <span className="estilo35">Nombre completo:</span>{" "}
              {mostrarDato(perfil?.cliente?.nombre)}
            </li>
            <li>
              <span className="estilo35">Correo:</span>{" "}
              {mostrarDato(perfil?.cliente?.email)}
            </li>
            <li>
              <span className="estilo35">RUT:</span>{" "}
              {mostrarDato(perfil?.cliente?.rut)}
            </li>
            <li>
              <span className="estilo35">Teléfono:</span>{" "}
              {mostrarDato(perfil?.cliente?.telefono)}
            </li>
            <li>
              <span className="estilo35">Dirección:</span>{" "}
              {mostrarDato(perfil?.cliente?.direccion)}
            </li>
            <li>
              <span className="estilo35">Sucursal:</span>{" "}
              {mostrarDato(perfil?.cliente?.sucursal?.nombre)}
            </li>
            <li>
              <span className="estilo35">Plan registrado:</span>{" "}
              {mostrarDato(perfil?.cliente?.plan)}
            </li>
          </ul>
        </div>

        <div className="estilo33">
          <h3 className="estilo26">Detalle del <span className="estilo7">plan</span></h3>

          {perfil?.plan ? (
            <div className="estilo36">
              <p>
                <span className="estilo35">Plan:</span>{" "}
                {perfil.plan.nombre}
              </p>
              <p>
                <span className="estilo35">Modalidad:</span>{" "}
                {perfil.plan.modalidad || "No especificada"}
              </p>
              <p>
                <span className="estilo35">Duración:</span>{" "}
                {perfil.plan.duracionMeses
                  ? `${perfil.plan.duracionMeses} meses`
                  : "No especificada"}
              </p>
              <p>
                <span className="estilo35">Descripción:</span>{" "}
                {perfil.plan.descripcion || "Sin descripción"}
              </p>
            </div>
          ) : (
            <p className="estilo27">Todavía no tienes un plan asignado.</p>
          )}
        </div>
      </section>

      <section className="estilo32">
        <div className="estilo33">
          <h3 className="estilo26">Profesor <span className="estilo7">asignado</span></h3>

          {perfil?.profesor ? (
            <div className="estilo36">
              <p>
                <span className="estilo35">Nombre:</span>{" "}
                {perfil.profesor.nombre}
              </p>
              <p>
                <span className="estilo35">Especialidad:</span>{" "}
                {perfil.profesor.especialidad || "No disponible"}
              </p>
              <p>
                <span className="estilo35">Email:</span>{" "}
                {perfil.profesor.email || "No disponible"}
              </p>
              <p>
                <span className="estilo35">Teléfono:</span>{" "}
                {perfil.profesor.telefono || "No disponible"}
              </p>
            </div>
          ) : (
            <p className="estilo27">Aún no tienes profesor asignado.</p>
          )}
        </div>

        <div className="estilo33">
          <h3 className="estilo26"><span className="estilo7">Mi</span> horario</h3>

          {perfil?.horario ? (
            <div className="estilo36">
              <p>
                <span className="estilo35">Día:</span>{" "}
                {perfil.horario.diaSemana || "No disponible"}
              </p>
              <p>
                <span className="estilo35">Horario:</span>{" "}
                {perfil.horario.horaInicio || "No disponible"} -{" "}
                {perfil.horario.horaFin || "No disponible"}
              </p>
              <p>
                <span className="estilo35">Modalidad:</span>{" "}
                {perfil.horario.modalidad || "No disponible"}
              </p>

              <div className="estilo37">
                <p className="estilo38">
                  Este horario es de solo consulta. No se puede modificar directamente desde aquí.
                </p>
              </div>
            </div>
          ) : (
            <p className="estilo27">Todavía no tienes horario asignado.</p>
          )}
        </div>
      </section>

      <section className="estilo39">
        <h3 className="estilo26">Copia digital de mi <span className="estilo7">contrato</span></h3>

        {perfil?.contrato ? (
          <div className="estilo28">
            <p className="estilo40">
              Archivo: {perfil.contrato.nombreArchivo}
            </p>

            <button
              type="button"
              onClick={abrirContrato}
              className="estilo41"
            >
              Ver contrato
            </button>
            {errorContrato && (
              <p role="alert" className="estilo42">{errorContrato}</p>
            )}
          </div>
        ) : (
          <p className="estilo27">
            Aún no tienes un contrato disponible para visualizar.
          </p>
        )}
      </section>

      <section className="estilo43">
        <h2 className="estilo44">
          Información importante
        </h2>

        <p className="estilo40">
          Puedes consultar tu plan, profesor, horario y contrato desde esta sección.
          La información de horario es solo lectura; cualquier cambio debe ser coordinado
          con Focus Power Fit.
        </p>
      </section>
      </div>
      <footer className="estilo45">
        <div className="estilo46">
          <span>© {new Date().getFullYear()} Focus Power Fit</span>
          <Link href="/" className="estilo47">Volver al inicio</Link>
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
    <div className="estilo48">
      <p className="estilo49">{titulo}</p>
      <p className="estilo50">{contenido}</p>
    </div>
  );
}