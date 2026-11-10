"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import LogoFocus from "../components/LogoFocus";
import { useRouter } from "next/navigation";
import { useAuth, fetchConSesion } from "../auth/AuthContext";
import FitBot from "../components/FitBot";
import "./mi-cuenta.css";

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
    fechaInicio?: string | null;
    fechaTermino?: string | null;
    estado?: string | null;
    observaciones?: string | null;
    url?: string;
  } | null;
  proximaClase?: {
    fecha: string;
    inicio: string;
    limiteCancelacion: string;
    horasMinimasCancelacion: number;
    estadoRegistrado: "Presente" | "Ausente" | "Justificada" | null;
  } | null;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Vista previa con datos ficticios: solo en desarrollo y si se pide
// expresamente con NEXT_PUBLIC_MODO_DEMO=true. Nunca consulta datos privados.
const MODO_DEMO =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_MODO_DEMO === "true";

const PERFIL_DEMO: PerfilCliente = {
  cliente: { id: 0, nombre: "Cliente de prueba", email: "cliente.demo@ejemplo.cl", rut: null, telefono: null, estado: "Activa" },
  asignacion: { id: 0, fechaInicio: "2026-11-01", fechaTermino: "2027-01-01", fechaTerminoVigencia: "2027-01-01", estado: "Activa", sesionesTotales: 12, sesionesUtilizadas: 4, sesionesRestantes: 8 },
  asistencias: [
    { id: 1, fecha: "2026-11-02", estado: "Presente", observaciones: null },
    { id: 2, fecha: "2026-10-30", estado: "Presente", observaciones: null },
    { id: 3, fecha: "2026-10-28", estado: "Justificada", observaciones: "Sesión justificada (ejemplo)" },
  ],
  plan: { id: 0, nombre: "Plan Individual 12 clases", descripcion: "Entrenamiento personalizado de demostración.", duracionMeses: 2, modalidad: "Individual", precio: 216000 },
  profesor: { id: 0, nombre: "Profesor de ejemplo", especialidad: "Entrenamiento personalizado", email: null, telefono: null },
  horario: { id: 0, diaSemana: "Lunes y miércoles", horaInicio: "18:00", horaFin: "19:00", modalidad: "Presencial" },
  contrato: null,
};

// MySQL entrega las horas con segundos (18:00:00).
function horaCorta(hora?: string | null) {
  return hora ? hora.slice(0, 5) : "";
}

function mostrarFecha(fecha: string) {
  const [anio, mes, dia] = fecha.slice(0, 10).split("-");
  return `${dia}/${mes}/${anio}`;
}

// Día y hora locales de una fecha ISO, por ejemplo «lunes 16/11 a las 12:00».
function mostrarDiaHora(iso: string) {
  const fecha = new Date(iso);
  const dia = fecha.toLocaleDateString("es-CL", { weekday: "long", day: "2-digit", month: "2-digit" });
  const hora = fecha.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${dia.replace(",", "")} a las ${hora}`;
}

export default function MiCuentaPage() {
  const router = useRouter();
  const { usuario, cargando, token, logout } = useAuth();

  const [perfil, setPerfil] = useState<PerfilCliente | null>(MODO_DEMO ? PERFIL_DEMO : null);
  const [cargandoPerfil, setCargandoPerfil] = useState(!MODO_DEMO);
  const [errorContrato, setErrorContrato] = useState("");
  const [cancelandoClase, setCancelandoClase] = useState(false);
  const [mensajeClase, setMensajeClase] = useState("");
  const [errorClase, setErrorClase] = useState("");

  const cargarPerfil = useCallback(async () => {
    try {
      const respuesta = await fetchConSesion(
        `${API_URL}/api/clientes/mi-dashboard`,
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
  }, [token]);

  useEffect(() => {
    if (MODO_DEMO) return;
    if (cargando) return;

    if (!usuario) {
      router.replace("/login");
      return;
    }

    if (usuario.rol !== "cliente") {
      router.replace("/admin");
      return;
    }

    void Promise.resolve().then(cargarPerfil);
  }, [usuario, cargando, router, cargarPerfil]);

  const cerrarSesion = () => {
    if (MODO_DEMO) {
      router.push("/");
      return;
    }
    logout();
    router.replace("/login");
  };

  if (!MODO_DEMO && (cargando || cargandoPerfil)) {
    return (
      <main className="estilo1">
        <p>Cargando información de tu cuenta...</p>
      </main>
    );
  }

  if (!MODO_DEMO && (!usuario || usuario.rol !== "cliente")) {
    return (
      <main className="estilo1">
        <p>Verificando acceso...</p>
      </main>
    );
  }

  const abrirContrato = async () => {
    if (MODO_DEMO || !perfil?.contrato || !token) return;

    const ventana = window.open("about:blank", "_blank");
    if (!ventana) {
      setErrorContrato("Permite las ventanas emergentes para abrir el contrato.");
      return;
    }

    try {
      setErrorContrato("");
      const respuesta = await fetchConSesion(
        `${API_URL}/api/contratos/${perfil.contrato.id}/archivo`,
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

  const cancelarClase = async () => {
    const clase = perfil?.proximaClase;
    if (MODO_DEMO || !clase || !token || cancelandoClase) return;

    const horas = clase.horasMinimasCancelacion;
    const fueraDePlazo = Date.now() > new Date(clase.limiteCancelacion).getTime();
    const pregunta = fueraDePlazo
      ? `Faltan menos de ${horas} horas para tu clase del ${mostrarDiaHora(clase.inicio)}. Si la cancelas ahora, pierdes la clase. ¿Cancelar de todas formas?`
      : `¿Cancelar tu clase del ${mostrarDiaHora(clase.inicio)}? Avisas a tiempo, así que no la pierdes.`;

    if (!window.confirm(pregunta)) return;

    setCancelandoClase(true);
    setMensajeClase("");
    setErrorClase("");

    try {
      const respuesta = await fetchConSesion(
        `${API_URL}/api/clientes/mi-clase/cancelar`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ fecha: clase.fecha }),
        }
      );
      const data = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        throw new Error(data.mensaje || "No se pudo cancelar la clase.");
      }

      setMensajeClase(data.mensaje || "Tu clase fue cancelada.");
      await cargarPerfil();
    } catch (error) {
      console.error("Error al cancelar la clase:", error);
      setErrorClase(
        error instanceof Error ? error.message : "No se pudo cancelar la clase."
      );
    } finally {
      setCancelandoClase(false);
    }
  };

  return (
    <main className="estilo2">
      <header className="estilo3">
        <div className="estilo4">
          <Link href="/" className="estilo5">
            <LogoFocus alto={40} />
          </Link>
          <div className="estilo8">
            <Link
              href="/"
              className="estilo9"
            >
              Inicio
            </Link>
            <Link
              href="/recuperar"
              className="estilo9"
            >
              Cambiar contraseña
            </Link>
            <button
              onClick={cerrarSesion}
              className="estilo10"
            >
              {MODO_DEMO ? "Salir de vista previa" : "Cerrar sesión"}
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
              ¡Hola, <span className="estilo7">{perfil?.cliente?.nombre || usuario?.nombre || "Cliente"}</span>!
            </h1>
            <p className="estilo16">
              Aquí puedes consultar tu plan, tus sesiones y todo lo relacionado con tu entrenamiento.
            </p>
          </div>
          <div className="estilo17">
            <p className="estilo18">Estado de cuenta</p>
            <p className="estilo19">{perfil?.cliente?.estado || "Activa"}</p>
          </div>
        </div>
      </section>

      <div className="estilo20">
      <section className="estilo21">
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
                ? `${perfil.horario.diaSemana} · ${horaCorta(perfil.horario.horaInicio)} - ${horaCorta(perfil.horario.horaFin)}`
                : "Sin horario asignado"
            }
          />

          <Tarjeta
            titulo="Vigencia de mi plan"
            contenido={
              perfil?.asignacion
                ? `${perfil.asignacion.estado === "Congelada" ? "Plan congelado · " : ""}Desde ${mostrarFecha(perfil.asignacion.fechaInicio)} · ${
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
              <span className="estilo35">Nombre:</span>{" "}
              {perfil?.cliente?.nombre || "No disponible"}
            </li>
            <li>
              <span className="estilo35">Email:</span>{" "}
              {perfil?.cliente?.email || "No disponible"}
            </li>
            <li>
              <span className="estilo35">RUT:</span>{" "}
              {perfil?.cliente?.rut || "No disponible"}
            </li>
            <li>
              <span className="estilo35">Teléfono:</span>{" "}
              {perfil?.cliente?.telefono || "No disponible"}
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
                {horaCorta(perfil.horario.horaInicio) || "No disponible"} -{" "}
                {horaCorta(perfil.horario.horaFin) || "No disponible"}
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

              {perfil.proximaClase && (
                <div className="estilo37">
                  <p>
                    <span className="estilo35">Próxima clase:</span>{" "}
                    {mostrarDiaHora(perfil.proximaClase.inicio)}
                  </p>

                  {perfil.proximaClase.estadoRegistrado ? (
                    <p className="estilo38">
                      {perfil.proximaClase.estadoRegistrado === "Justificada"
                        ? "Cancelaste esta clase a tiempo: no la pierdes."
                        : perfil.proximaClase.estadoRegistrado === "Ausente"
                          ? "Cancelaste esta clase fuera de plazo: la clase se pierde."
                          : "Esta clase ya está registrada."}
                    </p>
                  ) : (
                    <>
                      <p className="estilo31">
                        Puedes cancelarla sin perderla hasta el{" "}
                        {mostrarDiaHora(perfil.proximaClase.limiteCancelacion)} (
                        {perfil.proximaClase.horasMinimasCancelacion} horas antes). Si cancelas
                        después o no asistes, pierdes la clase.
                      </p>
                      <button
                        type="button"
                        onClick={cancelarClase}
                        disabled={cancelandoClase}
                        className="estilo41"
                      >
                        {cancelandoClase ? "Cancelando..." : "Cancelar clase"}
                      </button>
                    </>
                  )}

                  {mensajeClase && (
                    <p role="status" className="estilo38">{mensajeClase}</p>
                  )}
                  {errorClase && (
                    <p role="alert" className="estilo42">{errorClase}</p>
                  )}
                </div>
              )}
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

      <FitBot />
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