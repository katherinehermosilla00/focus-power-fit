import Asignacion from "../models/asignacion.js";
import Cliente from "../models/cliente.js";
import Plan from "../models/plan.js";
import Horario from "../models/horario.js";
import Profesor from "../models/profesor.js";
import { Op } from "sequelize";

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

    if (!clienteId || !planId || !horarioId || !fechaInicio) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "Cliente, plan, horario y fecha de inicio son obligatorios",
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

    const plan =
      await Plan.findByPk(planId);

    if (!plan) {
      return res.status(404).json({
        ok: false,
        mensaje: "Plan no encontrado",
      });
    }

    if (plan.estado !== "Activo") {
      return res.status(400).json({
        ok: false,
        mensaje: "No se puede asignar un plan inactivo",
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

    if (horario.estado !== "Activo") {
      return res.status(400).json({
        ok: false,
        mensaje: "No se puede asignar un horario inactivo",
      });
    }

    const asignacionActiva = await Asignacion.findOne({
      where: {
        clienteId,
        estado: "Activa",
      },
    });

    if (asignacionActiva) {
      return res.status(409).json({
        ok: false,
        mensaje: "El cliente ya tiene una asignación activa",
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

    const datos = {
      clienteId: req.body.clienteId ?? asignacion.clienteId,
      planId: req.body.planId ?? asignacion.planId,
      horarioId: req.body.horarioId ?? asignacion.horarioId,
      fechaInicio: req.body.fechaInicio ?? asignacion.fechaInicio,
      fechaTermino: req.body.fechaTermino ?? asignacion.fechaTermino,
      estado: req.body.estado ?? asignacion.estado,
      observaciones:
        req.body.observaciones ?? asignacion.observaciones,
    };

    const [cliente, plan, horario] = await Promise.all([
      Cliente.findByPk(datos.clienteId),
      Plan.findByPk(datos.planId),
      Horario.findByPk(datos.horarioId),
    ]);

    if (!cliente || !plan || !horario) {
      return res.status(404).json({
        ok: false,
        mensaje: "Cliente, plan u horario no encontrado",
      });
    }

    if (datos.estado === "Activa" && horario.estado !== "Activo") {
      return res.status(400).json({
        ok: false,
        mensaje: "No se puede asignar un horario inactivo",
      });
    }

    if (datos.estado === "Activa" && plan.estado !== "Activo") {
      return res.status(400).json({
        ok: false,
        mensaje: "No se puede asignar un plan inactivo",
      });
    }

    if (datos.estado === "Activa") {
      const otraAsignacionActiva = await Asignacion.findOne({
        where: {
          clienteId: datos.clienteId,
          estado: "Activa",
          id: {
            [Op.ne]: id,
          },
        },
      });

      if (otraAsignacionActiva) {
        return res.status(409).json({
          ok: false,
          mensaje: "El cliente ya tiene otra asignación activa",
        });
      }
    }

    await asignacion.update(datos);

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