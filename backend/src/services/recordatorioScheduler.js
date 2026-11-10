import { Op } from "sequelize";
import Asignacion from "../models/asignacion.js";
import Asistencia from "../models/asistencia.js";
import Cliente from "../models/cliente.js";
import Horario from "../models/horario.js";
import Profesor from "../models/profesor.js";
import Recordatorio from "../models/recordatorio.js";
import { enviarCorreo } from "../config/mailer.js";
import {
  DIAS_SEMANA,
  HORAS_MINIMAS_CANCELACION,
  PREFIJO_CLASE,
  WHATSAPP_GIMNASIO,
  crearFechaClase,
  limiteDeCancelacion,
  mostrarDiaHora,
  obtenerFechaLocal,
} from "../utils/clases.js";

const INTERVALO_MS = 60_000;
const HORAS_ANTICIPACION_MS = 24 * 60 * 60 * 1000;

const escaparHtml = (valor) =>
  String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

async function programarRecordatoriosClases(ahora) {
  const asignaciones = await Asignacion.findAll({
    where: { estado: "Activa" },
    include: [
      { model: Cliente, as: "cliente", attributes: ["id", "nombre", "email"] },
      {
        model: Horario,
        as: "horario",
        where: { estado: "Activo" },
        include: [
          { model: Profesor, as: "profesor", attributes: ["id", "nombre"] },
        ],
      },
    ],
  });

  const manana = new Date(ahora);
  manana.setDate(manana.getDate() + 8);
  const limite = manana.getTime();
  let creados = 0;

  for (const asignacion of asignaciones) {
    if (!asignacion.cliente?.email || !asignacion.horario) continue;

    const fechaInicio = String(asignacion.fechaInicio).slice(0, 10);
    const fechaTermino = asignacion.fechaTermino
      ? String(asignacion.fechaTermino).slice(0, 10)
      : null;

    for (let desplazamiento = 0; desplazamiento <= 7; desplazamiento += 1) {
      const fechaClase = new Date(ahora);
      fechaClase.setHours(0, 0, 0, 0);
      fechaClase.setDate(fechaClase.getDate() + desplazamiento);

      if (DIAS_SEMANA[fechaClase.getDay()] !== asignacion.horario.diaSemana) {
        continue;
      }

      const fechaClaseTexto = obtenerFechaLocal(fechaClase);
      if (
        fechaClaseTexto < fechaInicio ||
        (fechaTermino && fechaClaseTexto > fechaTermino)
      ) {
        continue;
      }

      const inicioClase = crearFechaClase(
        fechaClase,
        asignacion.horario.horaInicio
      );
      if (inicioClase <= ahora || inicioClase.getTime() >= limite) continue;

      const fechaEnvio = new Date(
        inicioClase.getTime() - HORAS_ANTICIPACION_MS
      );
      const titulo = `${PREFIJO_CLASE}${fechaClaseTexto}`;
      const horaClase = asignacion.horario.horaInicio.slice(0, 5);
      const profesor = asignacion.horario.profesor?.nombre;
      const mensaje = [
        `Hola ${asignacion.cliente.nombre},`,
        `te recordamos tu clase del ${asignacion.horario.diaSemana} ${fechaClaseTexto} a las ${horaClase}.`,
        profesor ? `Tu profesor será ${profesor}.` : "",
        `Si no puedes asistir, cancela tu clase desde Mi cuenta o avisa por WhatsApp al ${WHATSAPP_GIMNASIO} hasta el ${mostrarDiaHora(limiteDeCancelacion(inicioClase))}, es decir, con al menos ${HORAS_MINIMAS_CANCELACION} horas de anticipación. Si cancelas después o no asistes, pierdes la clase y se descuenta de tu plan.`,
      ]
        .filter(Boolean)
        .join(" ");

      const [, creado] = await Recordatorio.findOrCreate({
        where: {
          clienteId: asignacion.clienteId,
          tipo: "Clase",
          titulo,
          fechaEnvio,
        },
        defaults: {
          clienteId: asignacion.clienteId,
          tipo: "Clase",
          titulo,
          mensaje,
          fechaEnvio,
          estado: "Pendiente",
        },
      });

      if (creado) creados += 1;
    }
  }

  return creados;
}

const esRecordatorioDeClase = (recordatorio) =>
  recordatorio.tipo === "Clase" &&
  Boolean(recordatorio.titulo?.startsWith(PREFIJO_CLASE));

// Un recordatorio de clase se crea hasta 8 días antes. Si mientras tanto el
// plan se congela, se finaliza, cambia de horario o de hora, o el cliente
// cancela esa clase, ya no corresponde enviarlo.
async function claseSigueVigente(recordatorio, inicioClase) {
  if (!esRecordatorioDeClase(recordatorio)) return true;

  const fechaClase = recordatorio.titulo.slice(PREFIJO_CLASE.length, PREFIJO_CLASE.length + 10);
  const dia = DIAS_SEMANA[new Date(`${fechaClase}T12:00:00`).getDay()];
  const hora = [inicioClase.getHours(), inicioClase.getMinutes()]
    .map((valor) => String(valor).padStart(2, "0"))
    .join(":");

  const asignaciones = await Asignacion.findAll({
    where: { clienteId: recordatorio.clienteId, estado: "Activa" },
    attributes: ["id", "fechaInicio", "fechaTermino"],
    include: [
      {
        model: Horario,
        as: "horario",
        where: { estado: "Activo", diaSemana: dia },
        attributes: ["id", "horaInicio"],
      },
    ],
  });

  // Si la hora del horario cambió, este aviso trae la hora antigua: el
  // recordatorio con la hora nueva se programa aparte.
  const vigentes = asignaciones.filter((asignacion) => {
    const inicio = String(asignacion.fechaInicio).slice(0, 10);
    const termino = asignacion.fechaTermino
      ? String(asignacion.fechaTermino).slice(0, 10)
      : null;

    return (
      fechaClase >= inicio &&
      (!termino || fechaClase <= termino) &&
      String(asignacion.horario.horaInicio).slice(0, 5) === hora
    );
  });

  if (vigentes.length === 0) return false;

  // Una clase con asistencia ya registrada antes de ocurrir es una clase que
  // el cliente canceló.
  const cancelada = await Asistencia.count({
    where: {
      asignacionId: vigentes.map(({ id }) => id),
      fecha: fechaClase,
    },
  });

  return cancelada === 0;
}

async function enviarPendientes(ahora, enviar) {
  const recordatorios = await Recordatorio.findAll({
    where: {
      estado: "Pendiente",
      fechaEnvio: { [Op.lte]: ahora },
    },
    include: [
      {
        model: Cliente,
        as: "cliente",
        attributes: ["id", "nombre", "email"],
      },
    ],
    order: [["fechaEnvio", "ASC"]],
  });

  let enviados = 0;
  for (const recordatorio of recordatorios) {
    try {
      const inicioClase = new Date(
        new Date(recordatorio.fechaEnvio).getTime() + HORAS_ANTICIPACION_MS
      );

      // Si la clase ya ocurrió (por ejemplo, porque el servidor estuvo
      // apagado), el aviso llegaría tarde: se cancela sin enviarlo.
      if (esRecordatorioDeClase(recordatorio) && inicioClase <= ahora) {
        await recordatorio.update({ estado: "Cancelado" });
        continue;
      }

      // Mientras la clase no pase, queda en espera: si el plan se reactiva
      // a tiempo, se envía. Cuando la clase ocurre, se cancela arriba.
      if (!(await claseSigueVigente(recordatorio, inicioClase))) {
        continue;
      }

      if (!recordatorio.cliente?.email) {
        throw new Error(`El cliente del recordatorio ${recordatorio.id} no tiene email`);
      }

      await enviar({
        to: recordatorio.cliente.email,
        subject: recordatorio.titulo,
        html: `<p>${escaparHtml(recordatorio.mensaje)}</p>`,
      });
      await recordatorio.update({ estado: "Enviado" });
      enviados += 1;
    } catch (error) {
      console.error(
        `No se pudo enviar el recordatorio ${recordatorio.id}:`,
        error.message
      );
    }
  }

  return enviados;
}

export async function procesarRecordatorios({
  ahora = new Date(),
  enviar = enviarCorreo,
} = {}) {
  const programados = await programarRecordatoriosClases(ahora);
  const enviados = await enviarPendientes(ahora, enviar);

  return { programados, enviados };
}

export function iniciarRecordatorioScheduler() {
  let ejecutando = false;

  const ejecutar = async () => {
    if (ejecutando) return;
    ejecutando = true;

    try {
      const resultado = await procesarRecordatorios();
      if (resultado.programados || resultado.enviados) {
        console.log(
          `[RECORDATORIOS] Programados: ${resultado.programados}; enviados: ${resultado.enviados}`
        );
      }
    } catch (error) {
      console.error("Error en el proceso programado de recordatorios:", error.message);
    } finally {
      ejecutando = false;
    }
  };

  void ejecutar();
  return setInterval(ejecutar, INTERVALO_MS);
}
