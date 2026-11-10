import Plan from "../models/plan.js";
import { responderError, soloCampos, validarPlan } from "../utils/reglas.js";

const CAMPOS_EDITABLES = [
  "nombre",
  "descripcion",
  "duracionMeses",
  "sesiones",
  "precio",
  "modalidad",
  "estado",
];

export const obtenerPlanes = async (req, res) => {
  try {
    const planes = await Plan.findAll({
      order: [["id", "DESC"]],
    });

    res.json(planes);
  } catch (error) {
    responderError(res, error, "Error al obtener planes", "Error al obtener planes", 500);
  }
};

export const crearPlan = async (req, res) => {
  try {
    const plan = await Plan.create(
      validarPlan(soloCampos(req.body, CAMPOS_EDITABLES))
    );

    res.status(201).json(plan);
  } catch (error) {
    responderError(res, error, "Error al crear plan", "No se pudo crear el plan");
  }
};

export const actualizarPlan = async (req, res) => {
  try {
    const plan = await Plan.findByPk(req.params.id);

    if (!plan) {
      return res.status(404).json({
        ok: false,
        mensaje: "Plan no encontrado",
      });
    }

    const cambios = soloCampos(req.body, CAMPOS_EDITABLES);

    await plan.update(validarPlan({ ...plan.get(), ...cambios }, cambios));

    res.json(plan);
  } catch (error) {
    responderError(res, error, "Error al actualizar plan", "No se pudo actualizar el plan");
  }
};

// Sin ruta: un plan con pagos o asignaciones se desactiva, no se elimina.
export const eliminarPlan = async (req, res) => {
  try {
    const plan = await Plan.findByPk(req.params.id);

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
    responderError(res, error, "Error al eliminar plan", "No se pudo eliminar el plan", 500);
  }
};
