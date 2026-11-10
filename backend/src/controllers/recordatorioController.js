import Asignacion from "../models/asignacion.js";
import Recordatorio from "../models/recordatorio.js";
import Cliente from "../models/cliente.js";
import Horario from "../models/horario.js";
import Plan from "../models/plan.js";
import Profesor from "../models/profesor.js";
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
const DIAS_AGENDA = 6;

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

const formatearFecha = (fecha) =>
  new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(fecha);

async function obtenerClasesAgendadas(ahora = new Date()) {
  const asignaciones = await Asignacion.findAll({
    where: { estado: "Activa" },
    include: [
      {
        model: Cliente,
        as: "cliente",
        attributes: ["id", "nombre", "rut", "email"],
      },
      {
        model: Plan,
        as: "plan",
        attributes: ["id", "nombre", "modalidad"],
      },
      {
        model: Horario,
        as: "horario",
        where: { estado: "Activo" },
        include: [
          {
            model: Profesor,
            as: "profesor",
            attributes: ["id", "nombre"],
          },
        ],
      },
    ],
  });

  const hoy = new Date(ahora);
  hoy.setHours(0, 0, 0, 0);
  const fechaMinima = obtenerFechaLocal(hoy);
  const clases = [];

  for (let desplazamiento = 0; desplazamiento <= DIAS_AGENDA; desplazamiento += 1) {
    const fecha = new Date(hoy);
    fecha.setDate(fecha.getDate() + desplazamiento);
    const fechaTexto = obtenerFechaLocal(fecha);

    for (const asignacion of asignaciones) {
      if (!asignacion.horario || !asignacion.cliente) continue;
      if (DIAS_SEMANA[fecha.getDay()] !== asignacion.horario.diaSemana) {
        continue;
      }

      const fechaInicio = String(asignacion.fechaInicio).slice(0, 10);
      const fechaTermino = asignacion.fechaTermino
        ? String(asignacion.fechaTermino).slice(0, 10)
        : null;

      if (
        fechaTexto < fechaInicio ||
        (fechaTermino && fechaTexto > fechaTermino)
      ) {
        continue;
      }

      const inicio = crearFechaClase(fecha, asignacion.horario.horaInicio);
      if (inicio <= ahora) continue;

      clases.push({
        asignacionId: asignacion.id,
        clienteId: asignacion.clienteId,
        cliente: {
          id: asignacion.cliente.id,
          nombre: asignacion.cliente.nombre,
          rut: asignacion.cliente.rut,
          email: asignacion.cliente.email,
        },
        plan: asignacion.plan
          ? {
              id: asignacion.plan.id,
              nombre: asignacion.plan.nombre,
              modalidad: asignacion.plan.modalidad,
            }
          : null,
        profesor: asignacion.horario.profesor?.nombre ?? null,
        fecha: fechaTexto,
        diaSemana: asignacion.horario.diaSemana,
        horaInicio: String(asignacion.horario.horaInicio).slice(0, 5),
        horaFin: String(asignacion.horario.horaFin).slice(0, 5),
      });
    }
  }

  clases.sort(
    (a, b) =>
      a.fecha.localeCompare(b.fecha) ||
      a.horaInicio.localeCompare(b.horaInicio) ||
      a.cliente.nombre.localeCompare(b.cliente.nombre, "es")
  );

  return { fechaMinima, clases };
}

function crearContenidoCorreo(clase) {
  const fecha = new Date(`${clase.fecha}T12:00:00`);
  const fechaBonita = formatearFecha(fecha);
  const titulo = `Recordatorio de tu clase - ${fechaBonita}`;
  const mensaje = [
    `Hola ${clase.cliente.nombre},`,
    `te recordamos que tienes una clase reservada para el ${fechaBonita}, de ${clase.horaInicio} a ${clase.horaFin}.`,
    clase.profesor ? `Te recibirá ${clase.profesor}.` : "",
    "¡Te esperamos! Si necesitas ayuda, responde a este correo o comunícate con nuestro equipo.",
    "Focus Power Fit",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    titulo,
    mensaje,
    html: mensaje
      .split(/(?<=\.)\s+/)
      .map((parrafo) => `<p>${escaparHtml(parrafo)}</p>`)
      .join(""),
  };
}

async function enviarRecordatorioClase(clase) {
  if (!clase.cliente.email) {
    return {
      asignacionId: clase.asignacionId,
      cliente: clase.cliente.nombre,
      email: null,
      enviado: false,
      mensaje: "El cliente no tiene un correo electrónico registrado.",
    };
  }

  const contenido = crearContenidoCorreo(clase);
  let errorEnvio = null;
  try {
    await enviarCorreo({
      to: clase.cliente.email,
      subject: contenido.titulo,
      html: contenido.html,
    });
  } catch (error) {
    errorEnvio = error;
    console.error(
      `No se pudo enviar el recordatorio de la asignación ${clase.asignacionId}:`,
      error.message
    );
  }

  try {
    await Recordatorio.create({
      clienteId: clase.clienteId,
      tipo: "Clase",
      titulo: contenido.titulo,
      mensaje: contenido.mensaje,
      fechaEnvio: new Date(),
      estado: errorEnvio ? "Cancelado" : "Enviado",
    });
  } catch (error) {
    console.error(
      `No se pudo registrar el recordatorio de la asignación ${clase.asignacionId}:`,
      error.message
    );

    if (errorEnvio) {
      return {
        asignacionId: clase.asignacionId,
        cliente: clase.cliente.nombre,
        email: clase.cliente.email,
        enviado: false,
        mensaje: "No se pudo enviar el correo ni registrar el intento.",
      };
    }

    return {
      asignacionId: clase.asignacionId,
      cliente: clase.cliente.nombre,
      email: clase.cliente.email,
      enviado: true,
      advertencia:
        "El correo se envió, pero no se pudo guardar el registro del envío.",
    };
  }

  if (errorEnvio) {
    return {
      asignacionId: clase.asignacionId,
      cliente: clase.cliente.nombre,
      email: clase.cliente.email,
      enviado: false,
      mensaje: "No se pudo enviar el correo. Revisa la configuración del servicio de correo.",
    };
  }

  return {
    asignacionId: clase.asignacionId,
    cliente: clase.cliente.nombre,
    email: clase.cliente.email,
    enviado: true,
  };
}

export const obtenerAgendaRecordatorios = async (req, res) => {
  try {
    const { fechaMinima, clases } = await obtenerClasesAgendadas();
    const fechaMaxima = new Date(`${fechaMinima}T12:00:00`);
    fechaMaxima.setDate(fechaMaxima.getDate() + DIAS_AGENDA);

    res.json({
      fechaDesde: fechaMinima,
      fechaHasta: obtenerFechaLocal(fechaMaxima),
      clases,
    });
  } catch (error) {
    console.error("Error al obtener la agenda de clases:", error.message);
    res.status(500).json({
      ok: false,
      mensaje: "No se pudo cargar la agenda de clases.",
    });
  }
};

export const enviarRecordatoriosClases = async (req, res) => {
  try {
    const { fecha, asignacionId } = req.body;

    if (
      typeof fecha !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
      Number.isNaN(new Date(`${fecha}T12:00:00`).getTime()) ||
      obtenerFechaLocal(new Date(`${fecha}T12:00:00`)) !== fecha
    ) {
      return res.status(400).json({
        ok: false,
        mensaje: "Indica una fecha válida para enviar el recordatorio.",
      });
    }

    if (
      asignacionId !== undefined &&
      (!Number.isSafeInteger(Number(asignacionId)) ||
        Number(asignacionId) < 1)
    ) {
      return res.status(400).json({
        ok: false,
        mensaje: "La clase seleccionada no es válida.",
      });
    }

    const { fechaMinima, clases } = await obtenerClasesAgendadas();
    const fechaMinimaDate = new Date(`${fechaMinima}T12:00:00`);
    const fechaMaximaDate = new Date(fechaMinimaDate);
    fechaMaximaDate.setDate(fechaMaximaDate.getDate() + DIAS_AGENDA);
    const fechaMaxima = obtenerFechaLocal(fechaMaximaDate);

    if (fecha < fechaMinima || fecha > fechaMaxima) {
      return res.status(400).json({
        ok: false,
        mensaje: "Solo puedes enviar recordatorios de hoy y los próximos seis días.",
      });
    }

    const clasesSeleccionadas = clases.filter(
      (clase) =>
        clase.fecha === fecha &&
        (asignacionId === undefined ||
          clase.asignacionId === Number(asignacionId))
    );

    if (clasesSeleccionadas.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: "No hay una clase futura reservada para esa selección.",
      });
    }

    const resultados = [];
    for (const clase of clasesSeleccionadas) {
      resultados.push(await enviarRecordatorioClase(clase));
    }

    const enviados = resultados.filter((resultado) => resultado.enviado);
    const fallidos = resultados.filter((resultado) => !resultado.enviado);
    const advertencias = resultados
      .filter((resultado) => resultado.advertencia)
      .map((resultado) => ({
        cliente: resultado.cliente,
        mensaje: resultado.advertencia,
      }));

    res.json({
      ok: fallidos.length === 0,
      mensaje:
        fallidos.length === 0
          ? `Se enviaron ${enviados.length} recordatorio(s).`
          : `Se enviaron ${enviados.length} recordatorio(s); ${fallidos.length} no se pudieron enviar.`,
      enviados: enviados.length,
      fallidos,
      advertencias,
    });
  } catch (error) {
    console.error("Error al enviar recordatorios de clases:", error.message);
    res.status(500).json({
      ok: false,
      mensaje: "No se pudieron enviar los recordatorios.",
    });
  }
};

export const obtenerRecordatorios = async (
  req,
  res
) => {
  try {
    const recordatorios =
      await Recordatorio.findAll({
        include: [
          {
            model: Cliente,
            as: "cliente",
            attributes: [
              "id",
              "nombre",
              "rut",
              "email",
            ],
          },
        ],
        order: [
          ["fechaEnvio", "ASC"],
          ["id", "DESC"],
        ],
      });

    res.json(recordatorios);
  } catch (error) {
    console.error(
      "Error al obtener recordatorios:",
      error.message
    );

    res.status(500).json({
      ok: false,
      mensaje:
        "Error al obtener recordatorios",
    });
  }
};

export const crearRecordatorio = async (
  req,
  res
) => {
  try {
    const {
      clienteId,
      tipo,
      titulo,
      mensaje,
      fechaEnvio,
    } = req.body;

    if (
      !clienteId ||
      !tipo ||
      !titulo ||
      !mensaje ||
      !fechaEnvio
    ) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "Todos los campos son obligatorios",
      });
    }

    const cliente =
      await Cliente.findByPk(clienteId);

    if (!cliente) {
      return res.status(404).json({
        ok: false,
        mensaje: "Cliente no encontrado",
      });
    }

    const recordatorio =
      await Recordatorio.create({
        clienteId,
        tipo,
        titulo,
        mensaje,
        fechaEnvio,
        estado: "Pendiente",
      });

    res.status(201).json({
      ok: true,
      mensaje:
        "Recordatorio registrado correctamente",
      recordatorio,
    });
  } catch (error) {
    console.error(
      "Error al crear recordatorio:",
      error.message
    );

    res.status(400).json({
      ok: false,
      mensaje:
        "No se pudo registrar el recordatorio",
      error: error.message,
    });
  }
};

export const actualizarRecordatorio = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const recordatorio =
      await Recordatorio.findByPk(id);

    if (!recordatorio) {
      return res.status(404).json({
        ok: false,
        mensaje:
          "Recordatorio no encontrado",
      });
    }

    await recordatorio.update(req.body);

    res.json({
      ok: true,
      mensaje:
        "Recordatorio actualizado correctamente",
      recordatorio,
    });
  } catch (error) {
    console.error(
      "Error al actualizar recordatorio:",
      error.message
    );

    res.status(400).json({
      ok: false,
      mensaje:
        "No se pudo actualizar el recordatorio",
      error: error.message,
    });
  }
};

export const eliminarRecordatorio = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const recordatorio =
      await Recordatorio.findByPk(id);

    if (!recordatorio) {
      return res.status(404).json({
        ok: false,
        mensaje:
          "Recordatorio no encontrado",
      });
    }

    await recordatorio.destroy();

    res.json({
      ok: true,
      mensaje:
        "Recordatorio eliminado correctamente",
    });
  } catch (error) {
    console.error(
      "Error al eliminar recordatorio:",
      error.message
    );

    res.status(500).json({
      ok: false,
      mensaje:
        "No se pudo eliminar el recordatorio",
    });
  }
};