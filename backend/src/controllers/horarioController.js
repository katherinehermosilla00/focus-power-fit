import { Op } from "sequelize";

import Asignacion from "../models/asignacion.js";
import Horario from "../models/horario.js";
import Profesor from "../models/profesor.js";
import {
  errorDatos,
  responderError,
  soloCampos,
  validarHorario,
} from "../utils/reglas.js";

const CAMPOS_EDITABLES = [
  "profesorId",
  "diaSemana",
  "horaInicio",
  "horaFin",
  "modalidad",
  "cupos",
  "estado",
];

const CAMPOS_DE_AGENDA = ["profesorId", "diaSemana", "horaInicio", "horaFin", "estado"];

// Alumnos que ocupan el horario: los activos y los congelados, que conservan
// su cupo.
const contarOcupados = (horarioId) =>
  Asignacion.count({
    where: { horarioId, estado: { [Op.in]: ["Activa", "Congelada"] } },
  });

// Bajar los cupos no puede dejar alumnos fuera del horario.
const exigirCuposSuficientes = async (horarioId, cupos) => {
  const ocupados = await contarOcupados(horarioId);

  if (ocupados > cupos) {
    throw errorDatos(
      409,
      `El horario tiene ${ocupados} alumno(s); no puede quedar con ${cupos} cupo(s)`
    );
  }
};

// Desactivar un horario con alumnos los dejaría sin recordatorios.
const exigirSinAlumnos = async (horarioId) => {
  const ocupados = await contarOcupados(horarioId);

  if (ocupados > 0) {
    throw errorDatos(
      409,
      `El horario tiene ${ocupados} alumno(s) activo(s) o congelado(s). Finaliza o cambia sus asignaciones antes de desactivarlo.`
    );
  }
};

// Un profesor no puede estar en dos clases activas a la misma hora.
const exigirSinSolapamiento = async (datos, idActual = null) => {
  if (datos.estado !== "Activo") return;

  const choque = await Horario.findOne({
    where: {
      profesorId: datos.profesorId,
      diaSemana: datos.diaSemana,
      estado: "Activo",
      horaInicio: { [Op.lt]: datos.horaFin },
      horaFin: { [Op.gt]: datos.horaInicio },
      ...(idActual ? { id: { [Op.ne]: idActual } } : {}),
    },
    attributes: ["id"],
  });

  if (choque) {
    throw errorDatos(409, "El profesor ya tiene otra clase activa en ese horario");
  }
};

const exigirProfesor = async (profesorId) => {
  if (!(await Profesor.findByPk(profesorId))) {
    throw errorDatos(404, "Profesor no encontrado");
  }
};

export const obtenerHorarios = async (req, res) => {
  try {
    const horarios = await Horario.findAll({
      include: [
        {
          model: Profesor,
          as: "profesor",
          attributes: ["id", "nombre", "especialidad"],
        },
      ],
      order: [
        ["diaSemana", "ASC"],
        ["horaInicio", "ASC"],
      ],
    });

    res.json(horarios);
  } catch (error) {
    responderError(res, error, "Error al obtener horarios", "Error al obtener horarios", 500);
  }
};

export const crearHorario = async (req, res) => {
  try {
    await exigirProfesor(req.body?.profesorId);

    const datos = validarHorario(soloCampos(req.body, CAMPOS_EDITABLES));

    await exigirSinSolapamiento(datos);

    res.status(201).json(await Horario.create(datos));
  } catch (error) {
    responderError(res, error, "Error al crear horario", "No se pudo crear el horario");
  }
};

export const actualizarHorario = async (req, res) => {
  try {
    const horario = await Horario.findByPk(req.params.id);

    if (!horario) {
      return res.status(404).json({
        ok: false,
        mensaje: "Horario no encontrado",
      });
    }

    const cambios = soloCampos(req.body, CAMPOS_EDITABLES);

    if (cambios.profesorId !== undefined) {
      await exigirProfesor(cambios.profesorId);
    }

    const datos = validarHorario({ ...horario.get(), ...cambios }, cambios);

    if (CAMPOS_DE_AGENDA.some((campo) => Object.hasOwn(cambios, campo))) {
      await exigirSinSolapamiento(datos, horario.id);
    }

    if (Object.hasOwn(cambios, "cupos") || Object.hasOwn(cambios, "modalidad")) {
      await exigirCuposSuficientes(horario.id, datos.cupos);
    }

    if (horario.estado === "Activo" && datos.estado === "Inactivo") {
      await exigirSinAlumnos(horario.id);
    }

    await horario.update(datos);

    res.json(horario);
  } catch (error) {
    responderError(res, error, "Error al actualizar horario", "No se pudo actualizar el horario");
  }
};

// Borrar un horario con alumnos borraría sus asignaciones y asistencias.
export const eliminarHorario = async (req, res) => {
  try {
    const horario = await Horario.findByPk(req.params.id);

    if (!horario) {
      return res.status(404).json({
        ok: false,
        mensaje: "Horario no encontrado",
      });
    }

    const asignaciones = await Asignacion.count({
      where: { horarioId: horario.id },
    });

    if (asignaciones > 0) {
      return res.status(409).json({
        ok: false,
        mensaje: `El horario tiene ${asignaciones} asignación(es). Desactívalo para conservar el historial.`,
      });
    }

    await horario.destroy();

    res.json({
      ok: true,
      mensaje: "Horario eliminado correctamente",
    });
  } catch (error) {
    responderError(res, error, "Error al eliminar horario", "No se pudo eliminar el horario", 500);
  }
};
