import Asignacion from "../models/asignacion.js";
import Cliente from "../models/cliente.js";
import Plan from "../models/plan.js";
import Horario from "../models/horario.js";
import Profesor from "../models/profesor.js";

export const obtenerAsignaciones = async (req, res) => {
  try {
    const asignaciones = await Asignacion.findAll({
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
        {
          model: Plan,
          as: "plan",
          attributes: [
            "id",
            "nombre",
            "modalidad",
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
                "especialidad",
              ],
            },
          ],
        },
      ],
      order: [["id", "DESC"]],
    });

    res.json(asignaciones);
  } catch (error) {
    console.error(
      "Error al obtener asignaciones:",
      error.message
    );

    res.status(500).json({
      ok: false,
      mensaje:
        "Error al obtener asignaciones",
    });
  }
};

export const crearAsignacion = async (req, res) => {
  try {
    const {
      clienteId,
      planId,
      horarioId,
      fechaInicio,
      fechaTermino,
      observaciones,
    } = req.body;

    const cliente =
      await Cliente.findByPk(clienteId);

    if (!cliente) {
      return res.status(404).json({
        ok: false,
        mensaje: "Cliente no encontrado",
      });
    }

    const plan =
      await Plan.findByPk(planId);

    if (!plan) {
      return res.status(404).json({
        ok: false,
        mensaje: "Plan no encontrado",
      });
    }

    const horario =
      await Horario.findByPk(horarioId);

    if (!horario) {
      return res.status(404).json({
        ok: false,
        mensaje: "Horario no encontrado",
      });
    }

    const asignacion =
      await Asignacion.create({
        clienteId,
        planId,
        horarioId,
        fechaInicio,
        fechaTermino,
        observaciones,
      });

    res.status(201).json(asignacion);
  } catch (error) {
    console.error(
      "Error al crear asignación:",
      error.message
    );

    res.status(400).json({
      ok: false,
      mensaje:
        "No se pudo crear la asignación",
      error: error.message,
    });
  }
};

export const actualizarAsignacion = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const asignacion =
      await Asignacion.findByPk(id);

    if (!asignacion) {
      return res.status(404).json({
        ok: false,
        mensaje:
          "Asignación no encontrada",
      });
    }

    await asignacion.update(req.body);

    res.json(asignacion);
  } catch (error) {
    console.error(
      "Error al actualizar asignación:",
      error.message
    );

    res.status(400).json({
      ok: false,
      mensaje:
        "No se pudo actualizar la asignación",
      error: error.message,
    });
  }
};

export const eliminarAsignacion = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const asignacion =
      await Asignacion.findByPk(id);

    if (!asignacion) {
      return res.status(404).json({
        ok: false,
        mensaje:
          "Asignación no encontrada",
      });
    }

    await asignacion.destroy();

    res.json({
      ok: true,
      mensaje:
        "Asignación eliminada correctamente",
    });
  } catch (error) {
    console.error(
      "Error al eliminar asignación:",
      error.message
    );

    res.status(500).json({
      ok: false,
      mensaje:
        "No se pudo eliminar la asignación",
    });
  }
};