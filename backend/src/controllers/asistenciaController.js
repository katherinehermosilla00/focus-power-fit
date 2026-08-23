import Asistencia from "../models/asistencia.js";
import Asignacion from "../models/asignacion.js";
import Cliente from "../models/cliente.js";
import Plan from "../models/plan.js";
import Horario from "../models/horario.js";
import Profesor from "../models/profesor.js";

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

export const crearAsistencia = async (req, res) => {
  try {
    const {
      asignacionId,
      fecha,
      estado,
      observaciones,
    } = req.body;

    const asignacion =
      await Asignacion.findByPk(asignacionId);

    if (!asignacion) {
      return res.status(404).json({
        ok: false,
        mensaje: "Asignación no encontrada",
      });
    }

    const asistencia = await Asistencia.create({
      asignacionId,
      fecha,
      estado,
      observaciones,
    });

    res.status(201).json(asistencia);
  } catch (error) {
    console.error(
      "Error al crear asistencia:",
      error.message
    );

    res.status(400).json({
      ok: false,
      mensaje: "No se pudo crear la asistencia",
      error: error.message,
    });
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

    await asistencia.update(req.body);

    res.json(asistencia);
  } catch (error) {
    console.error(
      "Error al actualizar asistencia:",
      error.message
    );

    res.status(400).json({
      ok: false,
      mensaje:
        "No se pudo actualizar la asistencia",
      error: error.message,
    });
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