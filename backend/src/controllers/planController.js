import Plan from "../models/plan.js";

export const obtenerPlanes = async (req, res) => {
  try {
    const planes = await Plan.findAll({
      order: [["id", "DESC"]],
    });

    res.json(planes);
  } catch (error) {
    console.error(
      "Error al obtener planes:",
      error.message
    );

    res.status(500).json({
      ok: false,
      mensaje: "Error al obtener planes",
    });
  }
};

export const crearPlan = async (req, res) => {
  try {
    const {
      nombre,
      descripcion,
      duracionMeses,
      sesiones,
      precio,
      modalidad,
    } = req.body;

    const plan = await Plan.create({
      nombre,
      descripcion,
      duracionMeses,
      sesiones,
      precio,
      modalidad,
    });

    res.status(201).json(plan);
  } catch (error) {
    console.error(
      "Error al crear plan:",
      error.message
    );

    res.status(400).json({
      ok: false,
      mensaje: "No se pudo crear el plan",
      error: error.message,
    });
  }
};

export const actualizarPlan = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await Plan.findByPk(id);

    if (!plan) {
      return res.status(404).json({
        ok: false,
        mensaje: "Plan no encontrado",
      });
    }

    await plan.update(req.body);

    res.json(plan);
  } catch (error) {
    console.error(
      "Error al actualizar plan:",
      error.message
    );

    res.status(400).json({
      ok: false,
      mensaje: "No se pudo actualizar el plan",
      error: error.message,
    });
  }
};

export const eliminarPlan = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await Plan.findByPk(id);

    if (!plan) {
      return res.status(404).json({
        ok: false,
        mensaje: "Plan no encontrado",
      });
    }

    await plan.destroy();

    res.json({
      ok: true,
      mensaje: "Plan eliminado correctamente",
    });
  } catch (error) {
    console.error(
      "Error al eliminar plan:",
      error.message
    );

    res.status(500).json({
      ok: false,
      mensaje: "No se pudo eliminar el plan",
    });
  }
};