
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
import Link from "next/link";
import { useAuth } from "../../auth/AuthContext";


type Estado = "Activo" | "Inactivo";

type DiaSemana =
  | "Lunes"
  | "Martes"
  | "Miércoles"
  | "Jueves"
  | "Viernes"
  | "Sábado"
  | "Domingo";

type Modalidad = "Individual" | "Compartido";

type Profesor = {
  id: number;
  nombre: string;
  especialidad: string | null;
  estado: Estado;
};

type Horario = {
  id: number;
  profesorId: number;
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
  modalidad: Modalidad;
  cupos: number;
  estado: Estado;
  profesor?: Profesor | null;
};

const API_URL = "http://localhost:3001/api";
const POR_PAGINA = 10;

const DIAS: DiaSemana[] = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

function mensajeError(error: unknown, predeterminado: string) {
  if (axios.isAxiosError<{ mensaje?: string }>(error)) {
    return error.response?.data?.mensaje ?? predeterminado;
  }
  return predeterminado;
}

const DIAS_CORTOS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const INDICE_DIA: Record<DiaSemana, number> = {
  Lunes: 0, Martes: 1, Miércoles: 2, Jueves: 3,
  Viernes: 4, Sábado: 5, Domingo: 6,
};
type VistaCalendario = "dia" | "semana" | "mes" | "anio";
const fechaLocal = (fecha: Date) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
const sumarDias = (fecha: Date, dias: number) => {
  const resultado = fechaLocal(fecha);
  resultado.setDate(resultado.getDate() + dias);
  return resultado;
};
const inicioSemana = (fecha: Date) => sumarDias(fecha, -((fecha.getDay() + 6) % 7));
const mismoDia = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const indiceDia = (fecha: Date) => (fecha.getDay() + 6) % 7;
const tituloFecha = (fecha: Date, opciones: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("es-CL", opciones).format(fecha);

function horaCorta(hora: string) {
  return hora.slice(0, 5);
}

export default function HorariosPage() {
  const router = useRouter();
  const { usuario, token, cargando } = useAuth();

  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [profesores, setProfesores] = useState<Profesor[]>([]);

  const [profesorId, setProfesorId] = useState("");
  const [diaSemana, setDiaSemana] = useState<DiaSemana | "">("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [modalidad, setModalidad] = useState<Modalidad>("Individual");
  const [cupos, setCupos] = useState("1");

  const [horarioEditandoId, setHorarioEditandoId] =
    useState<number | null>(null);
  const [horarioDetalle, setHorarioDetalle] =
    useState<Horario | null>(null);

  const [vistaCalendario, setVistaCalendario] = useState<VistaCalendario>("semana");
  const [fechaCalendario, setFechaCalendario] = useState(() => fechaLocal(new Date()));
  const [soloActivosCalendario, setSoloActivosCalendario] = useState(true);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroDia, setFiltroDia] = useState("Todos");
  const [paginaActual, setPaginaActual] = useState(1);

  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [procesandoId, setProcesandoId] =
    useState<number | null>(null);

  const [errorCarga, setErrorCarga] = useState("");
  const [errorFormulario, setErrorFormulario] = useState("");
  const [mensaje, setMensaje] = useState("");

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
        headers: { Authorization: `Bearer ${token}` },
      };

      const [horariosRespuesta, profesoresRespuesta] =
        await Promise.all([
          axios.get<Horario[]>(`${API_URL}/horarios`, config),
          axios.get<Profesor[]>(`${API_URL}/profesores`, config),
        ]);

      setHorarios(horariosRespuesta.data);
      setProfesores(profesoresRespuesta.data);
      setErrorCarga("");
    } catch (error) {
      console.error("Error al cargar horarios:", error);
      setErrorCarga(
        mensajeError(error, "No se pudieron cargar los horarios.")
      );
    } finally {
      setCargandoDatos(false);
    }
  }, [token]);

  useEffect(() => {
    if (!cargando && usuario?.rol === "admin" && token) {
      void Promise.resolve().then(cargarDatos);
    }
  }, [cargando, usuario, token, cargarDatos]);

  const reintentarCarga = () => {
    setCargandoDatos(true);
    setErrorCarga("");
    void cargarDatos();
  };

  const limpiarFormulario = (limpiarMensajes = true) => {
    setProfesorId("");
    setDiaSemana("");
    setHoraInicio("");
    setHoraFin("");
    setModalidad("Individual");
    setCupos("1");
    setHorarioEditandoId(null);

    if (limpiarMensajes) {
      setErrorFormulario("");
      setMensaje("");
    }
  };

  const profesoresDisponibles = useMemo(
    () =>
      profesores.filter(
        (profesor) =>
          profesor.estado === "Activo" ||
          String(profesor.id) === profesorId
      ),
    [profesores, profesorId]
  );

  const horariosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLocaleLowerCase("es-CL");

    return horarios.filter((horario) => {
      const coincideBusqueda =
        !texto ||
        [
          horario.profesor?.nombre,
          horario.profesor?.especialidad,
          horario.diaSemana,
          horario.horaInicio,
          horario.horaFin,
          horario.modalidad,
          horario.estado,
        ]
          .map((valor) => valor ?? "")
          .join(" ")
          .toLocaleLowerCase("es-CL")
          .includes(texto);

      const coincideEstado =
        filtroEstado === "Todos" ||
        horario.estado === filtroEstado;

      const coincideDia =
        filtroDia === "Todos" ||
        horario.diaSemana === filtroDia;

      return coincideBusqueda && coincideEstado && coincideDia;
    });
  }, [horarios, busqueda, filtroEstado, filtroDia]);

  const horariosCalendario = useMemo(() =>
    horarios.filter((horario) => !soloActivosCalendario || horario.estado === "Activo")
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio)),
    [horarios, soloActivosCalendario]
  );

  const horariosDeFecha = (fecha: Date) =>
    horariosCalendario.filter((horario) => INDICE_DIA[horario.diaSemana] === indiceDia(fecha));

  const moverCalendario = (direccion: number) => {
    setFechaCalendario((actual) => {
      if (vistaCalendario === "dia") return sumarDias(actual, direccion);
      if (vistaCalendario === "semana") return sumarDias(actual, 7 * direccion);
      const siguiente = fechaLocal(actual);
      if (vistaCalendario === "mes") siguiente.setMonth(siguiente.getMonth() + direccion, 1);
      else siguiente.setFullYear(siguiente.getFullYear() + direccion, 0, 1);
      return siguiente;
    });
  };

  const etiquetaPeriodo = () => {
    if (vistaCalendario === "dia") return tituloFecha(fechaCalendario, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    if (vistaCalendario === "semana") {
      const inicio = inicioSemana(fechaCalendario);
      const fin = sumarDias(inicio, 6);
      return `${tituloFecha(inicio, { day: "numeric", month: "short" })} – ${tituloFecha(fin, { day: "numeric", month: "short", year: "numeric" })}`;
    }
    return tituloFecha(fechaCalendario, vistaCalendario === "mes" ? { month: "long", year: "numeric" } : { year: "numeric" });
  };

  const tarjetaCalendario = (horario: Horario) => (
    <button key={horario.id} type="button" className="horarios-evento"
      onClick={() => setHorarioDetalle(horario)}
      title="Ver detalle del horario">
      <strong>{horaCorta(horario.horaInicio)}–{horaCorta(horario.horaFin)}</strong>
      <span>{horario.profesor?.nombre ?? profesores.find((p) => p.id === horario.profesorId)?.nombre ?? "Profesor no disponible"}</span>
      <small>{horario.modalidad} · {horario.cupos} {horario.cupos === 1 ? "cupo" : "cupos"}{horario.estado === "Inactivo" ? " · Inactivo" : ""}</small>
    </button>
  );

  const celdaCalendario = (fecha: Date, compacta = false) => {
    const eventos = horariosDeFecha(fecha);
    return (
      <div key={fecha.toISOString()} className={`horarios-cal-celda ${mismoDia(fecha, new Date()) ? "horarios-cal-hoy" : ""} ${compacta ? "horarios-cal-compacta" : ""}`}>
        <button type="button" className="horarios-cal-fecha" onClick={() => { setFechaCalendario(fecha); setVistaCalendario("dia"); }}
          aria-label={`Ver horarios del ${tituloFecha(fecha, { day: "numeric", month: "long" })}`}>
          {tituloFecha(fecha, { day: "numeric" })}
        </button>
        {compacta ? <span className="horarios-cal-cantidad">{eventos.length ? `${eventos.length} horario${eventos.length === 1 ? "" : "s"}` : "—"}</span>
          : eventos.length ? eventos.map(tarjetaCalendario) : <span className="horarios-cal-vacio">Sin horarios</span>}
      </div>
    );
  };

  const totalPaginas = Math.max(
    1,
    Math.ceil(horariosFiltrados.length / POR_PAGINA)
  );

  const paginaSegura = Math.min(paginaActual, totalPaginas);

  const horariosPaginados = useMemo(() => {
    const inicio = (paginaSegura - 1) * POR_PAGINA;
    return horariosFiltrados.slice(inicio, inicio + POR_PAGINA);
  }, [horariosFiltrados, paginaSegura]);

  const totalActivos = horarios.filter(
    (horario) => horario.estado === "Activo"
  ).length;

  const totalInactivos = horarios.filter(
    (horario) => horario.estado === "Inactivo"
  ).length;

  const guardarHorario = async (
    evento: FormEvent<HTMLFormElement>
  ) => {
    evento.preventDefault();

    if (!token) {
      setErrorFormulario(
        "Tu sesión ha expirado. Inicia sesión nuevamente."
      );
      return;
    }

    if (!profesorId || !diaSemana || !horaInicio || !horaFin) {
      setErrorFormulario(
        "Completa todos los campos obligatorios."
      );
      return;
    }

    if (horaFin <= horaInicio) {
      setErrorFormulario(
        "La hora de término debe ser posterior a la hora de inicio."
      );
      return;
    }

    const numeroCupos =
      modalidad === "Individual" ? 1 : Number(cupos);

    if (
      !Number.isInteger(numeroCupos) ||
      numeroCupos < 1
    ) {
      setErrorFormulario(
        "Ingresa una cantidad válida de cupos."
      );
      return;
    }

    const profesorSeleccionado = profesoresDisponibles.find(
      (profesor) => String(profesor.id) === profesorId
    );

    if (!profesorSeleccionado) {
      setErrorFormulario("Selecciona un profesor válido.");
      return;
    }

    setGuardando(true);
    setErrorFormulario("");
    setMensaje("");

    const datos = {
      profesorId: Number(profesorId),
      diaSemana,
      horaInicio,
      horaFin,
      modalidad,
      cupos: numeroCupos,
    };

    const config = {
      headers: { Authorization: `Bearer ${token}` },
    };

    try {
      const editando = horarioEditandoId !== null;

      if (editando) {
        await axios.put(
          `${API_URL}/horarios/${horarioEditandoId}`,
          datos,
          config
        );
      } else {
        await axios.post(`${API_URL}/horarios`, datos, config);
      }

      limpiarFormulario(false);

      setMensaje(
        editando
          ? "Horario actualizado correctamente."
          : "Horario registrado correctamente."
      );

      await cargarDatos();
    } catch (error) {
      console.error("Error al guardar horario:", error);
      setErrorFormulario(
        mensajeError(error, "No se pudo guardar el horario.")
      );
    } finally {
      setGuardando(false);
    }
  };

  const editarHorario = (horario: Horario) => {
    setProfesorId(String(horario.profesorId));
    setDiaSemana(horario.diaSemana);
    setHoraInicio(horaCorta(horario.horaInicio));
    setHoraFin(horaCorta(horario.horaFin));
    setModalidad(horario.modalidad);
    setCupos(String(horario.cupos));
    setHorarioEditandoId(horario.id);

    setErrorFormulario("");
    setMensaje("");
    setHorarioDetalle(null);

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cambiarEstado = async (horario: Horario) => {
    if (!token || procesandoId !== null) return;

    setProcesandoId(horario.id);
    setErrorCarga("");
    setMensaje("");

    try {
      const nuevoEstado =
        horario.estado === "Activo" ? "Inactivo" : "Activo";

      await axios.put(
        `${API_URL}/horarios/${horario.id}`,
        { estado: nuevoEstado },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await cargarDatos();
      setMensaje(
        `Horario ${
          nuevoEstado === "Activo" ? "activado" : "desactivado"
        } correctamente.`
      );
    } catch (error) {
      console.error("Error al cambiar estado:", error);
      setErrorCarga(
        mensajeError(error, "No se pudo cambiar el estado.")
      );
    } finally {
      setProcesandoId(null);
    }
  };

  const eliminarHorario = async (horario: Horario) => {
    if (!token || procesandoId !== null) return;

    if (
      !window.confirm(
        `¿Seguro que deseas eliminar el horario del ${horario.diaSemana} de ${horaCorta(horario.horaInicio)} a ${horaCorta(horario.horaFin)}?`
      )
    ) {
      return;
    }

    setProcesandoId(horario.id);
    setErrorCarga("");
    setMensaje("");

    try {
      await axios.delete(`${API_URL}/horarios/${horario.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (horarioEditandoId === horario.id) {
        limpiarFormulario(false);
      }

      setHorarioDetalle(null);
      await cargarDatos();
      setMensaje("Horario eliminado correctamente.");
    } catch (error) {
      console.error("Error al eliminar horario:", error);
      setErrorCarga(
        mensajeError(error, "No se pudo eliminar el horario.")
      );
    } finally {
      setProcesandoId(null);
    }
  };

  if (cargando) {
    return (
      <main className="admin-modulo">
        Cargando...
      </main>
    );
  }

  if (!usuario || usuario.rol !== "admin") {
    return (
      <main className="admin-modulo">
        Verificando acceso...
      </main>
    );
  }

  return (
    <main className="horarios-pagina horarios-negro-rojo">
      <style>{`
        .horarios-negro-rojo { min-height:100vh; width:100%; max-width:none !important; margin:0 !important; min-width:0; padding:28px clamp(16px,2vw,32px) 44px; background:#000 !important; color:#fff; box-sizing:border-box; font-family:Arial,Helvetica,sans-serif; }
        .horarios-negro-rojo * { box-sizing:border-box; }
        /* Evita que los contenedores habituales del panel limiten el ancho del módulo. */
        body:has(.horarios-negro-rojo) .admin-main,
        body:has(.horarios-negro-rojo) .admin-content,
        body:has(.horarios-negro-rojo) .admin-container,
        body:has(.horarios-negro-rojo) .admin-modulo { max-width:none !important; width:100%; }
        .horarios-encabezado { display:flex; justify-content:space-between; align-items:flex-start; gap:24px; margin-bottom:28px; }
        .horarios-etiqueta { color:#a1a1aa; letter-spacing:1.6px; font-size:11px; font-weight:700; margin:0 0 12px; }
        .horarios-encabezado h1 { font-size:clamp(28px,3vw,42px); font-weight:900; line-height:1.15; margin:0 0 12px; color:#fff; }
        .horarios-encabezado h1 span { color:#dc2626; }
        .horarios-subtitulo,.horarios-muted { color:#aaa; font-size:14px; line-height:1.5; margin:0; }
        .horarios-volver { display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; background:#202024; border:1px solid #414149; border-radius:12px; padding:14px 20px; color:#fff !important; text-decoration:none !important; font-weight:700; font-size:14px; white-space:nowrap; }
        .horarios-volver:hover { background:#202024; color:#fff; }
        .horarios-resumen { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; margin-bottom:24px; }
        .horarios-tarjeta { background:#000; border:1px solid #404040; border-left:4px solid #dc2626; border-radius:16px; padding:22px; min-width:0; display:flex; flex-direction:column; gap:12px; }
        .horarios-tarjeta span { color:#c4c4c4; font-size:14px; }
        .horarios-tarjeta strong { color:#fff; font-size:32px; line-height:1.1; }
        .horarios-tarjeta p { color:#aaa; font-size:12px; margin:0; }
        .horarios-distribucion { display:grid; grid-template-columns:minmax(300px,0.75fr) minmax(0,2fr); align-items:start; gap:20px; }
        .horarios-panel { min-width:0; padding:24px; background:#000; border:1px solid #404040; border-radius:16px; }
        .horarios-panel-titulo { color:#fff; font-size:21px; font-weight:700; margin:0 0 8px; }
        .horarios-formulario { display:grid; gap:16px; margin-top:22px; }
        .horarios-formulario > div { min-width:0; }
        .horarios-campo-etiqueta { display:block; color:#eee; font-size:13px; font-weight:600; margin-bottom:8px; }
        .horarios-control { width:100%; min-width:0; min-height:43px; padding:10px 12px; border:1px solid #414141; border-radius:10px; background:#000; color:#fff; color-scheme:dark; font:inherit; }
        .horarios-control:focus { outline:2px solid #dc2626; outline-offset:1px; }
        .horarios-formulario-acciones { display:flex; flex-wrap:wrap; gap:10px; }
        .horarios-boton { display:inline-flex; align-items:center; justify-content:center; padding:10px 14px; border-radius:10px; font-size:13px; font-weight:700; border:1px solid #555; background:#000; color:#fff; cursor:pointer; white-space:nowrap; }
        .horarios-boton:hover:not(:disabled) { border-color:#dc2626; }
        .horarios-boton:disabled { opacity:.5; cursor:not-allowed; }
        .horarios-boton-rojo { background:#b91c1c; border-color:#b91c1c; }
        .horarios-boton-rojo:hover:not(:disabled) { background:#991b1b; }
        .horarios-boton-peligro { border-color:#991b1b; color:#ffb4b4; }
        .horarios-listado-cabecera { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:20px; }
        .horarios-filtros { display:grid; grid-template-columns:minmax(0,2fr) minmax(120px,1fr) minmax(120px,1fr); gap:10px; margin-bottom:18px; }
        .horarios-tabla-contenedor { width:100%; overflow-x:auto; }
        .horarios-tabla { width:100%; min-width:760px; border-collapse:collapse; text-align:left; }
        .horarios-tabla th { background:#000; color:#c9c9c9; padding:14px 12px; border-bottom:1px solid #444; font-size:12px; }
        .horarios-tabla td { color:#eee; padding:14px 12px; border-bottom:1px solid #333; vertical-align:middle; font-size:13px; }
        .horarios-tabla td strong { color:#fff; }
        .horarios-tabla tbody tr:hover { background:#111; }
        .horarios-tabla-acciones { display:flex; gap:6px; flex-wrap:wrap; }
        .horarios-paginacion { display:flex; align-items:center; justify-content:center; gap:16px; margin-top:20px; }
        .horarios-detalle-acciones { display:flex; gap:10px; justify-content:flex-end; margin-top:18px; }
         .horarios-calendario { margin-bottom:24px; }
         .horarios-cal-barra { display:flex; flex-wrap:wrap; gap:12px; justify-content:space-between; align-items:center; margin-bottom:18px; }
         .horarios-cal-controles { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
         .horarios-cal-periodo { font-weight:800; text-transform:capitalize; min-width:190px; text-align:center; }
         .horarios-cal-vistas { display:flex; flex-wrap:wrap; gap:6px; }
         .horarios-cal-selector-anio { width:auto; min-width:105px; min-height:39px; padding:7px 10px; }
         .horarios-cal-seleccionado { background:#b91c1c !important; border-color:#dc2626 !important; }
         .horarios-cal-opcion { display:flex; gap:8px; align-items:center; color:#ddd; font-size:13px; }
         .horarios-cal-scroll { width:100%; overflow-x:auto; }
         .horarios-cal-grid { display:grid; grid-template-columns:repeat(7,minmax(125px,1fr)); gap:8px; min-width:875px; }
         .horarios-cal-dia { display:grid; grid-template-columns:minmax(0,1fr); gap:8px; }
         .horarios-cal-dia .horarios-cal-celda { min-height:180px; }
         .horarios-cal-nombre { padding:10px; text-align:center; color:#ddd; font-size:12px; font-weight:800; }
         .horarios-cal-celda { background:#0d0d0d; border:1px solid #333; border-radius:10px; padding:9px; min-height:120px; display:flex; flex-direction:column; gap:7px; }
         .horarios-cal-hoy { border-color:#dc2626; }
         .horarios-cal-fecha { border:0; background:transparent; color:#fff; cursor:pointer; font-weight:800; align-self:flex-start; padding:4px 7px; border-radius:6px; }
         .horarios-cal-fecha:hover { background:#991b1b; }
         .horarios-cal-vacio,.horarios-cal-cantidad { color:#777; font-size:11px; }
         .horarios-evento { display:flex; flex-direction:column; align-items:flex-start; text-align:left; gap:4px; width:100%; border:1px solid #7f1d1d; border-left:3px solid #ef4444; background:#220d0d; border-radius:8px; color:#fff; padding:8px; cursor:pointer; font-size:12px; overflow-wrap:anywhere; }
         .horarios-evento:hover { background:#401010; }
         .horarios-evento span { color:#f4f4f5; }
         .horarios-evento small { color:#d4d4d8; }
         .horarios-cal-mes { display:grid; grid-template-columns:repeat(7,minmax(0,1fr)); gap:6px; }
         .horarios-cal-mes .horarios-cal-celda { min-height:100px; }
         .horarios-cal-mes .horarios-cal-nombre { padding:8px 0; }
         .horarios-cal-fuera { opacity:.35; }
         .horarios-cal-anio { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:14px; }
         .horarios-cal-mes-mini { background:#0d0d0d; border:1px solid #333; border-radius:12px; padding:12px; }
         .horarios-cal-mes-mini h3 { margin:0 0 12px; font-size:14px; text-transform:capitalize; }
         .horarios-cal-mini-grid { display:grid; grid-template-columns:repeat(7,minmax(0,1fr)); gap:3px; }
         .horarios-cal-mini-dia { border:0; border-radius:5px; padding:6px 0; background:#181818; color:#aaa; font-size:10px; cursor:pointer; }
         .horarios-cal-mini-dia[data-tiene="true"] { background:#581313; color:#fff; }
         .horarios-cal-mini-dia:hover { outline:1px solid #ef4444; }
         @media(max-width:750px) { .horarios-cal-mes { min-width:650px; } .horarios-cal-mes .horarios-cal-celda { padding:5px; } .horarios-cal-mes .horarios-evento { font-size:10px; padding:5px; } }

        @media(max-width:1100px) { .horarios-distribucion { grid-template-columns:1fr; } }
        @media(max-width:750px) { .horarios-resumen { grid-template-columns:repeat(2,minmax(0,1fr)); } .horarios-encabezado { flex-direction:column; } .horarios-filtros { grid-template-columns:1fr; } }
        @media(max-width:520px) { .horarios-resumen { grid-template-columns:1fr; } .horarios-panel { padding:18px; } }
      `}</style>
      <header className="horarios-encabezado">
        <div>
          <p className="horarios-etiqueta">PANEL ADMINISTRATIVO / HORARIOS</p>
          <h1>Gestión de <span>Horarios</span></h1>
          <p className="horarios-subtitulo">Organiza los horarios de entrenamiento, profesores, modalidades y cupos.</p>
        </div>
        <Link href="/admin" className="horarios-volver">← Volver al panel</Link>
      </header>

      {/* TARJETAS DE RESUMEN */}
      <section
        className="horarios-resumen"
        aria-label="Resumen de horarios"
      >
        <div className="horarios-tarjeta">
          <span>Horarios registrados</span>
          <strong>{horarios.length}</strong>
          <p>Total de horarios del sistema</p>
        </div>

        <div className="horarios-tarjeta">
          <span>Horarios activos</span>
          <strong>{totalActivos}</strong>
          <p>Disponibles actualmente</p>
        </div>

        <div className="horarios-tarjeta">
          <span>Horarios inactivos</span>
          <strong>{totalInactivos}</strong>
          <p>Horarios deshabilitados</p>
        </div>
      </section>

      {mensaje && (
        <div role="status" className="admin-alert admin-alert-success">
          {mensaje}
          <button
            type="button"
            onClick={() => setMensaje("")}
            className="horarios-boton horarios-boton-secundario"
          >
            Cerrar
          </button>
        </div>
      )}

      {errorCarga && (
        <div role="alert" className="admin-alert admin-alert-error">
          <span>{errorCarga}</span>
          <button
            type="button"
            onClick={reintentarCarga}
            className="horarios-boton horarios-boton-secundario"
          >
            Reintentar
          </button>
        </div>
      )}

       {/* CALENDARIO DE HORARIOS SEMANALES RECURRENTES */}
       <section className="horarios-panel horarios-calendario" aria-label="Calendario de horarios">
         <div className="horarios-cal-barra">
           <div>
             <h2 className="horarios-panel-titulo">Calendario de horarios</h2>
             <p className="horarios-muted">Horarios semanales recurrentes. No representa reservas confirmadas.</p>
           </div>
           <div className="horarios-cal-vistas" aria-label="Vista del calendario">
             {([ ["dia", "Día"], ["semana", "Semana"], ["mes", "Mes"], ["anio", "Año"] ] as [VistaCalendario, string][]).map(([vista, texto]) => (
               <button key={vista} type="button" aria-pressed={vistaCalendario === vista}
                 className={`horarios-boton ${vistaCalendario === vista ? "horarios-cal-seleccionado" : ""}`}
                 onClick={() => setVistaCalendario(vista)}>{texto}</button>
             ))}
           </div>
         </div>
         <div className="horarios-cal-barra">
           <div className="horarios-cal-controles">
             <button type="button" className="horarios-boton" onClick={() => moverCalendario(-1)} aria-label="Periodo anterior">←</button>
             <button type="button" className="horarios-boton" onClick={() => setFechaCalendario(fechaLocal(new Date()))}>Hoy</button>
             <button type="button" className="horarios-boton" onClick={() => moverCalendario(1)} aria-label="Periodo siguiente">→</button>
             <span className="horarios-cal-periodo">{etiquetaPeriodo()}</span>
             <label htmlFor="horarios-seleccionar-anio" className="horarios-cal-opcion">Año</label>
             <select
               id="horarios-seleccionar-anio"
               className="horarios-control horarios-cal-selector-anio"
               aria-label="Seleccionar año del calendario"
               value={fechaCalendario.getFullYear()}
               onChange={(evento) => {
                 const anio = Number(evento.target.value);
                 setFechaCalendario((actual) => {
                   const siguiente = fechaLocal(actual);
                   // Ajustar el día antes de cambiar de año evita desbordes del 29 de febrero.
                   if (siguiente.getMonth() === 1 && siguiente.getDate() === 29) siguiente.setDate(28);
                   siguiente.setFullYear(anio);
                   return siguiente;
                 });
               }}
             >
               {Array.from({ length: 101 }, (_, indice) => 2020 + indice).map((anio) => (
                 <option key={anio} value={anio}>{anio}</option>
               ))}
             </select>
           </div>
           <label className="horarios-cal-opcion">
             <input type="checkbox" checked={soloActivosCalendario} onChange={(e) => setSoloActivosCalendario(e.target.checked)} />
             Solo horarios activos
           </label>
         </div>
         <div className="horarios-cal-scroll">
           {vistaCalendario === "dia" && <div className="horarios-cal-dia">{celdaCalendario(fechaCalendario)}</div>}
           {vistaCalendario === "semana" && (
             <div className="horarios-cal-grid">
               {DIAS_CORTOS.map((dia) => <div key={dia} className="horarios-cal-nombre">{dia}</div>)}
               {Array.from({ length: 7 }, (_, i) => celdaCalendario(sumarDias(inicioSemana(fechaCalendario), i)))}
             </div>
           )}
           {vistaCalendario === "mes" && (() => {
             const primero = new Date(fechaCalendario.getFullYear(), fechaCalendario.getMonth(), 1);
             const inicio = inicioSemana(primero);
             const ultimo = new Date(fechaCalendario.getFullYear(), fechaCalendario.getMonth() + 1, 0);
             const cantidad = Math.ceil((Math.round((ultimo.getTime() - inicio.getTime()) / 86400000) + 1) / 7) * 7;
             return <div className="horarios-cal-mes">
               {DIAS_CORTOS.map((dia) => <div key={dia} className="horarios-cal-nombre">{dia}</div>)}
               {Array.from({ length: cantidad }, (_, i) => {
                 const fecha = sumarDias(inicio, i);
                 return <div key={fecha.toISOString()} className={fecha.getMonth() === fechaCalendario.getMonth() ? "" : "horarios-cal-fuera"}>
                   {celdaCalendario(fecha, true)}
                 </div>;
               })}
             </div>;
           })()}
           {vistaCalendario === "anio" && (
             <div className="horarios-cal-anio">
               {Array.from({ length: 12 }, (_, mes) => {
                 const primero = new Date(fechaCalendario.getFullYear(), mes, 1);
                 const desplazamiento = indiceDia(primero);
                 const diasMes = new Date(fechaCalendario.getFullYear(), mes + 1, 0).getDate();
                 return <div key={mes} className="horarios-cal-mes-mini">
                   <h3>{tituloFecha(primero, { month: "long" })}</h3>
                   <div className="horarios-cal-mini-grid">
                     {DIAS_CORTOS.map((dia) => <span key={dia} className="horarios-cal-nombre">{dia.slice(0, 1)}</span>)}
                     {Array.from({ length: desplazamiento }, (_, i) => <span key={`vacio-${i}`} />)}
                     {Array.from({ length: diasMes }, (_, i) => {
                       const fecha = new Date(fechaCalendario.getFullYear(), mes, i + 1);
                       return <button key={i} type="button" className="horarios-cal-mini-dia"
                         data-tiene={horariosDeFecha(fecha).length > 0}
                         title={`${i + 1}: ${horariosDeFecha(fecha).length} horarios`}
                         onClick={() => { setFechaCalendario(fecha); setVistaCalendario("dia"); }}>{i + 1}</button>;
                     })}
                   </div>
                 </div>;
               })}
             </div>
           )}
         </div>
       </section>

      <div className="horarios-distribucion">
        {/* FORMULARIO */}
        <section className="horarios-panel">
          <h2 className="horarios-panel-titulo">
            {horarioEditandoId === null
              ? "Registrar horario"
              : "Editar horario"}
          </h2>

          <p className="horarios-muted">
            Completa la información para organizar las clases
            de entrenamiento.
          </p>

          {profesoresDisponibles.length === 0 &&
            !cargandoDatos && (
              <p className="admin-alert admin-alert-error">
                Registra un profesor activo antes de crear
                un horario.
              </p>
            )}

          <form
            onSubmit={guardarHorario}
            className="horarios-formulario"
          >
            <div>
              <label
                htmlFor="horario-profesor"
                className="horarios-campo-etiqueta"
              >
                Profesor
              </label>
              <select
                id="horario-profesor"
                value={profesorId}
                onChange={(evento) =>
                  setProfesorId(evento.target.value)
                }
                required
                disabled={
                  cargandoDatos ||
                  profesoresDisponibles.length === 0
                }
                className="horarios-control"
              >
                <option value="">Seleccionar profesor</option>
                {profesoresDisponibles.map((profesor) => (
                  <option key={profesor.id} value={profesor.id}>
                    {profesor.nombre}
                    {profesor.estado === "Inactivo"
                      ? " (Inactivo)"
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="horario-dia"
                className="horarios-campo-etiqueta"
              >
                Día de la semana
              </label>
              <select
                id="horario-dia"
                value={diaSemana}
                onChange={(evento) =>
                  setDiaSemana(
                    evento.target.value as DiaSemana | ""
                  )
                }
                required
                className="horarios-control"
              >
                <option value="">Seleccionar día</option>
                {DIAS.map((dia) => (
                  <option key={dia} value={dia}>
                    {dia}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="horario-inicio"
                  className="horarios-campo-etiqueta"
                >
                  Hora de inicio
                </label>
                <input
                  id="horario-inicio"
                  type="time"
                  value={horaInicio}
                  onChange={(evento) =>
                    setHoraInicio(evento.target.value)
                  }
                  required
                  className="horarios-control"
                />
              </div>

              <div>
                <label
                  htmlFor="horario-fin"
                  className="horarios-campo-etiqueta"
                >
                  Hora de término
                </label>
                <input
                  id="horario-fin"
                  type="time"
                  value={horaFin}
                  min={horaInicio || undefined}
                  onChange={(evento) =>
                    setHoraFin(evento.target.value)
                  }
                  required
                  className="horarios-control"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="horario-modalidad"
                className="horarios-campo-etiqueta"
              >
                Modalidad
              </label>
              <select
                id="horario-modalidad"
                value={modalidad}
                onChange={(evento) => {
                  const nuevaModalidad =
                    evento.target.value as Modalidad;

                  setModalidad(nuevaModalidad);

                  if (nuevaModalidad === "Individual") {
                    setCupos("1");
                  }
                }}
                className="horarios-control"
              >
                <option value="Individual">Individual</option>
                <option value="Compartido">Compartido</option>
              </select>
            </div>

            {modalidad === "Compartido" && (
              <div>
                <label
                  htmlFor="horario-cupos"
                  className="horarios-campo-etiqueta"
                >
                  Cantidad de cupos
                </label>
                <input
                  id="horario-cupos"
                  type="number"
                  min="1"
                  step="1"
                  value={cupos}
                  onChange={(evento) =>
                    setCupos(evento.target.value)
                  }
                  required
                  className="horarios-control"
                />
              </div>
            )}

            {errorFormulario && (
              <p
                role="alert"
                className="admin-alert admin-alert-error"
              >
                {errorFormulario}
              </p>
            )}

            <div className="horarios-formulario-acciones">
              <button
                type="submit"
                disabled={
                  guardando ||
                  cargandoDatos ||
                  Boolean(errorCarga) ||
                  profesoresDisponibles.length === 0
                }
                className="horarios-boton horarios-boton-rojo"
              >
                {guardando
                  ? "Guardando..."
                  : horarioEditandoId === null
                    ? "Registrar horario"
                    : "Guardar cambios"}
              </button>

              <button
                type="button"
                onClick={() => limpiarFormulario()}
                className="horarios-boton horarios-boton-secundario"
              >
                {horarioEditandoId === null
                  ? "Limpiar formulario"
                  : "Cancelar edición"}
              </button>
            </div>
          </form>
        </section>

        {/* LISTADO */}
        <section className="horarios-panel">
          <div className="horarios-listado-cabecera">
            <h2 className="horarios-panel-titulo">
              Horarios registrados
            </h2>
            <p className="horarios-muted">
              Mostrando {horariosFiltrados.length} de{" "}
              {horarios.length} horarios
            </p>
          </div>

          <div className="horarios-filtros">
            <input
              type="search"
              aria-label="Buscar horario"
              placeholder="Buscar profesor, horario o modalidad..."
              value={busqueda}
              onChange={(evento) => {
                setBusqueda(evento.target.value);
                setPaginaActual(1);
              }}
              className="horarios-control"
            />

            <select
              aria-label="Filtrar por estado"
              value={filtroEstado}
              onChange={(evento) => {
                setFiltroEstado(evento.target.value);
                setPaginaActual(1);
              }}
              className="horarios-control"
            >
              <option value="Todos">Todos los estados</option>
              <option value="Activo">Activos</option>
              <option value="Inactivo">Inactivos</option>
            </select>

            <select
              aria-label="Filtrar por día"
              value={filtroDia}
              onChange={(evento) => {
                setFiltroDia(evento.target.value);
                setPaginaActual(1);
              }}
              className="horarios-control"
            >
              <option value="Todos">Todos los días</option>
              {DIAS.map((dia) => (
                <option key={dia} value={dia}>
                  {dia}
                </option>
              ))}
            </select>
          </div>

          {cargandoDatos ? (
            <p className="admin-modulo-vacio">
              Cargando horarios...
            </p>
          ) : horariosFiltrados.length === 0 ? (
            <p className="admin-modulo-vacio">
              No hay horarios que coincidan con los filtros.
            </p>
          ) : (
            <>
              <div className="horarios-tabla-contenedor">
                <table className="horarios-tabla">
                  <thead>
                    <tr>
                      <th>Profesor</th>
                      <th>Día y hora</th>
                      <th>Modalidad</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {horariosPaginados.map((horario) => (
                      <tr key={horario.id}>
                        <td>
                          <strong>
                            {horario.profesor?.nombre ??
                              profesores.find(
                                (profesor) =>
                                  profesor.id === horario.profesorId
                              )?.nombre ??
                              "Profesor no disponible"}
                          </strong>
                          {horario.profesor?.especialidad && (
                            <p className="horarios-muted">
                              {horario.profesor.especialidad}
                            </p>
                          )}
                        </td>

                        <td>
                          <strong>{horario.diaSemana}</strong>
                          <p className="horarios-muted">
                            {horaCorta(horario.horaInicio)} -{" "}
                            {horaCorta(horario.horaFin)}
                          </p>
                        </td>

                        <td>
                          {horario.modalidad}
                          <p className="horarios-muted">
                            {horario.cupos}{" "}
                            {horario.cupos === 1 ? "cupo" : "cupos"}
                          </p>
                        </td>

                        <td>
                          <span
                            className={
                              horario.estado === "Activo"
                                ? "text-green-400 font-semibold"
                                : "text-gray-400 font-semibold"
                            }
                          >
                            {horario.estado}
                          </span>
                        </td>

                        <td>
                          <div className="horarios-tabla-acciones">
                            <button
                              type="button"
                              onClick={() =>
                                setHorarioDetalle(horario)
                              }
                              className="horarios-boton horarios-boton-secundario"
                            >
                              Ver
                            </button>

                            <button
                              type="button"
                              onClick={() => editarHorario(horario)}
                              className="horarios-boton horarios-boton-secundario"
                            >
                              Editar
                            </button>

                            <button
                              type="button"
                              disabled={procesandoId !== null}
                              onClick={() =>
                                void cambiarEstado(horario)
                              }
                              className="horarios-boton horarios-boton-secundario"
                            >
                              {horario.estado === "Activo"
                                ? "Desactivar"
                                : "Activar"}
                            </button>

                            <button
                              type="button"
                              disabled={procesandoId !== null}
                              onClick={() =>
                                void eliminarHorario(horario)
                              }
                              className="horarios-boton horarios-boton-peligro"
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPaginas > 1 && (
                <div className="horarios-paginacion">
                  <button
                    type="button"
                    disabled={paginaSegura === 1}
                    onClick={() =>
                      setPaginaActual((actual) =>
                        Math.max(1, actual - 1)
                      )
                    }
                    className="horarios-boton horarios-boton-secundario"
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
                    className="horarios-boton horarios-boton-secundario"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* VENTANA DE DETALLES */}
      {horarioDetalle && (
        <div
          className="clientes-modal-overlay"
          onClick={() => setHorarioDetalle(null)}
        >
          <div
            className="clientes-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="detalle-horario-titulo"
            onClick={(evento) => evento.stopPropagation()}
          >
            <h2 id="detalle-horario-titulo">
              Detalle del horario
            </h2>

            <div className="horarios-detalle">
              <p>
                <strong>Profesor:</strong>{" "}
                {horarioDetalle.profesor?.nombre ??
                  profesores.find(
                    (profesor) =>
                      profesor.id === horarioDetalle.profesorId
                  )?.nombre ??
                  "No disponible"}
              </p>

              <p>
                <strong>Especialidad:</strong>{" "}
                {horarioDetalle.profesor?.especialidad ??
                  "No especificada"}
              </p>

              <p>
                <strong>Día:</strong> {horarioDetalle.diaSemana}
              </p>

              <p>
                <strong>Hora de inicio:</strong>{" "}
                {horaCorta(horarioDetalle.horaInicio)}
              </p>

              <p>
                <strong>Hora de término:</strong>{" "}
                {horaCorta(horarioDetalle.horaFin)}
              </p>

              <p>
                <strong>Modalidad:</strong>{" "}
                {horarioDetalle.modalidad}
              </p>

              <p>
                <strong>Cupos:</strong> {horarioDetalle.cupos}
              </p>

              <p>
                <strong>Estado:</strong> {horarioDetalle.estado}
              </p>
            </div>

            <div className="horarios-detalle-acciones">
              <button
                type="button"
                onClick={() => setHorarioDetalle(null)}
                className="horarios-boton horarios-boton-secundario"
              >
                Cerrar
              </button>

              <button
                type="button"
                onClick={() => editarHorario(horarioDetalle)}
                className="horarios-boton horarios-boton-rojo"
              >
                Editar horario
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
