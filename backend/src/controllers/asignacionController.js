import Asignacion from "../models/asignacion.js";
import Asistencia from "../models/asistencia.js";
import Cliente from "../models/cliente.js";
import Plan from "../models/plan.js";
import Horario from "../models/horario.js";
import Profesor from "../models/profesor.js";
import { Op } from "sequelize";
import {
  errorDatos,
  responderError,
  validarAsignacionFechas,
} from "../utils/reglas.js";

const CAMPOS_EDITABLES = [
  "clienteId",
  "planId",
  "horarioId",
  "fechaInicio",
  "fechaTermino",
  "estado",
  "observaciones",
];

// Se distingue "no enviado" de "enviado vacío": así se puede quitar la fecha de
// término o las observaciones. Un estado vacío no se convierte: se rechaza, en
// vez de tomar el valor por defecto y reactivar la asignación.
const camposEnviados = (cuerpo) =>
  Object.fromEntries(
    CAMPOS_EDITABLES.filter((campo) => Object.hasOwn(cuerpo ?? {}, campo)).map(
      (campo) => [
        campo,
        campo !== "estado" && cuerpo[campo] === "" ? null : cuerpo[campo],
      ]
    )
  );

// Un plan congelado conserva su cupo y sigue siendo el plan del cliente.
const OCUPAN_CUPO = ["Activa", "Congelada"];

const exigirReferencias = async ({ clienteId, planId, horarioId }) => {
  const [cliente, plan, horario] = await Promise.all([
    Cliente.findByPk(clienteId),
    Plan.findByPk(planId),
    Horario.findByPk(horarioId),
  ]);

  if (!cliente) throw errorDatos(404, "Cliente no encontrado");
  if (!plan) throw errorDatos(404, "Plan no encontrado");
  if (!horario) throw errorDatos(404, "Horario no encontrado");

  return { plan, horario };
};

// Reglas de una asignación activa: plan y horario activos, una sola asignación
// activa por cliente y sin superar los cupos del horario.
const exigirAsignacionActivaValida = async (datos, plan, horario, idActual = null) => {
  if (plan.estado !== "Activo") {
    throw errorDatos(400, "No se puede asignar un plan inactivo");
  }

  if (horario.estado !== "Activo") {
    throw errorDatos(400, "No se puede asignar un horario inactivo");
  }

  const excluir = idActual ? { id: { [Op.ne]: idActual } } : {};

  const [otraDelCliente, ocupados] = await Promise.all([
    Asignacion.findOne({
      where: {
        clienteId: datos.clienteId,
        estado: { [Op.in]: OCUPAN_CUPO },
        ...excluir,
      },
      attributes: ["estado"],
    }),
    Asignacion.count({
      where: {
        horarioId: horario.id,
        estado: { [Op.in]: OCUPAN_CUPO },
        ...excluir,
      },
    }),
  ]);

  if (otraDelCliente) {
    throw errorDatos(
      409,
      `El cliente ya tiene una asignación ${otraDelCliente.estado.toLowerCase()}; finalízala antes de asignarle otra`
    );
  }

  if (ocupados >= horario.cupos) {
    throw errorDatos(
      409,
      `El horario no tiene cupos disponibles (${ocupados} de ${horario.cupos})`
    );
  }
};

export const obtenerAsignaciones = async (req, res) => {
  try {
    const asignaciones = await Asignacion.findAll({
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
          include: [
            {
              model: Profesor,
              as: "profesor",
              attributes: ["id", "nombre", "especialidad"],
            },
          ],
        },
      ],
      order: [["id", "DESC"]],
    });

    res.json(asignaciones);
  } catch (error) {
    responderError(
      res,
      error,
      "Error al obtener asignaciones",
      "Error al obtener asignaciones",
      500
    );
  }
};

export const crearAsignacion = async (req, res) => {
  try {
    const enviados = camposEnviados(req.body);

    if (
      !enviados.clienteId ||
      !enviados.planId ||
      !enviados.horarioId ||
      !enviados.fechaInicio
    ) {
      return res.status(400).json({
        ok: false,
        mensaje: "Cliente, plan, horario y fecha de inicio son obligatorios",
      });
    }

    const datos = {
      clienteId: enviados.clienteId,
      planId: enviados.planId,
      horarioId: enviados.horarioId,
      ...validarAsignacionFechas({ ...enviados, estado: "Activa" }),
    };
    const { plan, horario } = await exigirReferencias(datos);

    await exigirAsignacionActivaValida(datos, plan, horario);

    res.status(201).json(await Asignacion.create(datos));
  } catch (error) {
    responderError(res, error, "Error al crear asignación", "No se pudo crear la asignación");
  }
};

export const actualizarAsignacion = async (req, res) => {
  try {
    const asignacion = await Asignacion.findByPk(req.params.id);

    if (!asignacion) {
      return res.status(404).json({
        ok: false,
        mensaje: "Asignación no encontrada",
      });
    }

    const cambios = camposEnviados(req.body);
    const final = { ...asignacion.get(), ...cambios };
    const datos = {
      clienteId: final.clienteId,
      planId: final.planId,
      horarioId: final.horarioId,
      ...validarAsignacionFechas(final, cambios),
    };
    const { plan, horario } = await exigirReferencias(datos);

    // Las reglas de activa se revisan cuando algo puede romperlas: se activa,
    // cambia de cliente, plan u horario.
    const afectaActiva = ["clienteId", "planId", "horarioId", "estado"].some(
      (campo) => Object.hasOwn(cambios, campo)
    );

    // Reactivar una congelada no vuelve a pedir cupo: lo conservó.
    const reactivaCongelada =
      asignacion.estado === "Congelada" &&
      datos.estado === "Activa" &&
      !["clienteId", "planId", "horarioId"].some((campo) =>
        Object.hasOwn(cambios, campo)
      );

    if (datos.estado === "Activa" && afectaActiva && !reactivaCongelada) {
      await exigirAsignacionActivaValida(datos, plan, horario, asignacion.id);
    } else if (reactivaCongelada) {
      if (plan.estado !== "Activo" || horario.estado !== "Activo") {
        throw errorDatos(400, "No se puede reactivar con un plan u horario inactivo");
      }

      // Antes del 8 de noviembre de 2026 un plan congelado no impedía crear
      // otro; con esos datos, reactivar dejaría al cliente con dos activos.
      const otraActiva = await Asignacion.findOne({
        where: {
          clienteId: datos.clienteId,
          estado: { [Op.in]: OCUPAN_CUPO },
          id: { [Op.ne]: asignacion.id },
        },
        attributes: ["id"],
      });

      if (otraActiva) {
        throw errorDatos(
          409,
          "El cliente ya tiene otra asignación activa o congelada; finalízala antes de reactivar esta"
        );
      }
    }

    await asignacion.update(datos);

    res.json(asignacion);
  } catch (error) {
    responderError(
      res,
      error,
      "Error al actualizar asignación",
      "No se pudo actualizar la asignación"
    );
  }
};

export const eliminarAsignacion = async (req, res) => {
  try {
    const asignacion = await Asignacion.findByPk(req.params.id);

    if (!asignacion) {
      return res.status(404).json({
        ok: false,
        mensaje: "Asignación no encontrada",
      });
    }

    // Borrarla eliminaría en cascada todo su historial de asistencia.
    const asistencias = await Asistencia.count({
      where: { asignacionId: asignacion.id },
    });

    if (asistencias > 0) {
      return res.status(409).json({
        ok: false,
        mensaje: `La asignación tiene ${asistencias} asistencia(s) registradas. Usa Finalizar para conservar el historial.`,
      });
    }

    await asignacion.destroy();

    res.json({
      ok: true,
      mensaje: "Asignación eliminada correctamente",
    });
  } catch (error) {
    responderError(
      res,
      error,
      "Error al eliminar asignación",
      "No se pudo eliminar la asignación",
      500
    );
  }
};
