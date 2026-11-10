import Asistencia from "../models/asistencia.js";
import Asignacion from "../models/asignacion.js";
import Cliente from "../models/cliente.js";
import Plan from "../models/plan.js";
import Horario from "../models/horario.js";
import Profesor from "../models/profesor.js";
import { Op } from "sequelize";
import {
  errorDatos,
  responderError,
  soloCampos,
  validarAsistencia,
} from "../utils/reglas.js";

export const obtenerAsistencias = async (req, res) => {
  try {
    const asistencias = await Asistencia.findAll({
      include: [
        {
          model: Asignacion,
          as: "asignacion",
          include: [
            {
              model: Cliente,
              as: "cliente",
              attributes: [
                "id",
                "nombre",
                "rut",
              ],
            },
            {
              model: Plan,
              as: "plan",
              attributes: [
                "id",
                "nombre",
              ],
            },
            {
              model: Horario,
              as: "horario",
              include: [
                {
                  model: Profesor,
                  as: "profesor",
                  attributes: [
                    "id",
                    "nombre",
                  ],
                },
              ],
            },
          ],
        },
      ],
      order: [
        ["fecha", "DESC"],
        ["id", "DESC"],
      ],
    });

    res.json(asistencias);
  } catch (error) {
    console.error(
      "Error al obtener asistencias:",
      error.message
    );

    res.status(500).json({
      ok: false,
      mensaje: "Error al obtener asistencias",
    });
  }
};

const CAMPOS_EDITABLES = ["asignacionId", "fecha", "estado", "observaciones"];

const exigirAsignacion = async (asignacionId) => {
  const asignacion = await Asignacion.findByPk(asignacionId);

  if (!asignacion) {
    throw errorDatos(404, "Asignación no encontrada");
  }

  return asignacion;
};

// Solo se registra asistencia de un plan activo y dentro de su período: un
// plan congelado o finalizado no descuenta sesiones.
const exigirDentroDelPlan = (asignacion, fecha) => {
  if (asignacion.estado !== "Activa") {
    throw errorDatos(
      409,
      `La asignación está ${asignacion.estado}; no se puede registrar asistencia`
    );
  }

  const inicio = String(asignacion.fechaInicio).slice(0, 10);
  const termino = asignacion.fechaTermino
    ? String(asignacion.fechaTermino).slice(0, 10)
    : null;

  if (fecha < inicio || (termino && fecha > termino)) {
    throw errorDatos(400, "La fecha está fuera del período de la asignación");
  }
};

// Una misma clase no se registra dos veces el mismo día.
const exigirSinDuplicado = async ({ asignacionId, fecha }, idActual = null) => {
  const repetida = await Asistencia.findOne({
    where: {
      asignacionId,
      fecha,
      ...(idActual ? { id: { [Op.ne]: idActual } } : {}),
    },
    attributes: ["id"],
  });

  if (repetida) {
    throw errorDatos(409, "Ya existe una asistencia para esa asignación y fecha");
  }
};

export const crearAsistencia = async (req, res) => {
  try {
    const asignacion = await exigirAsignacion(req.body?.asignacionId);
    const datos = validarAsistencia(soloCampos(req.body, CAMPOS_EDITABLES));

    exigirDentroDelPlan(asignacion, datos.fecha);
    await exigirSinDuplicado(datos);

    res.status(201).json(await Asistencia.create(datos));
  } catch (error) {
    responderError(res, error, "Error al crear asistencia", "No se pudo crear la asistencia");
  }
};

export const actualizarAsistencia = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const asistencia =
      await Asistencia.findByPk(id);

    if (!asistencia) {
      return res.status(404).json({
        ok: false,
        mensaje: "Asistencia no encontrada",
      });
    }

    const cambios = soloCampos(req.body, CAMPOS_EDITABLES);

    const datos = validarAsistencia({ ...asistencia.get(), ...cambios }, cambios);

    // Cambiar solo el estado u observaciones de un registro antiguo sigue
    // permitido; mover la asistencia a otra asignación o fecha se revisa.
    if (Object.hasOwn(cambios, "asignacionId") || Object.hasOwn(cambios, "fecha")) {
      exigirDentroDelPlan(await exigirAsignacion(datos.asignacionId), datos.fecha);
      await exigirSinDuplicado(datos, asistencia.id);
    }

    await asistencia.update(datos);

    res.json(asistencia);
  } catch (error) {
    responderError(
      res,
      error,
      "Error al actualizar asistencia",
      "No se pudo actualizar la asistencia"
    );
  }
};

export const eliminarAsistencia = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const asistencia =
      await Asistencia.findByPk(id);

    if (!asistencia) {
      return res.status(404).json({
        ok: false,
        mensaje: "Asistencia no encontrada",
      });
    }

    await asistencia.destroy();

    res.json({
      ok: true,
      mensaje:
        "Asistencia eliminada correctamente",
    });
  } catch (error) {
    console.error(
      "Error al eliminar asistencia:",
      error.message
    );

    res.status(500).json({
      ok: false,
      mensaje:
        "No se pudo eliminar la asistencia",
    });
  }
};