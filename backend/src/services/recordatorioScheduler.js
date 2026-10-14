import { Op } from "sequelize";
import Asignacion from "../models/asignacion.js";
import Cliente from "../models/cliente.js";
import Horario from "../models/horario.js";
import Profesor from "../models/profesor.js";
import Recordatorio from "../models/recordatorio.js";
import { enviarCorreo } from "../config/mailer.js";

const DIAS_SEMANA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
const INTERVALO_MS = 60_000;
const HORAS_ANTICIPACION_MS = 24 * 60 * 60 * 1000;

const escaparHtml = (valor) =>
  String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const obtenerFechaLocal = (fecha) =>
  [
    fecha.getFullYear(),
    String(fecha.getMonth() + 1).padStart(2, "0"),
    String(fecha.getDate()).padStart(2, "0"),
  ].join("-");

const crearFechaClase = (fecha, hora) => {
  const [horas, minutos] = hora.split(":").map(Number);
  return new Date(
    fecha.getFullYear(),
    fecha.getMonth(),
    fecha.getDate(),
    horas,
    minutos,
    0,
    0
  );
};

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
      const titulo = `Recordatorio de clase - ${fechaClaseTexto}`;
      const horaClase = asignacion.horario.horaInicio.slice(0, 5);
      const profesor = asignacion.horario.profesor?.nombre;
      const mensaje = [
        `Hola ${asignacion.cliente.nombre},`,
        `te recordamos tu clase del ${asignacion.horario.diaSemana} ${fechaClaseTexto} a las ${horaClase}.`,
        profesor ? `Tu profesor será ${profesor}.` : "",
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
