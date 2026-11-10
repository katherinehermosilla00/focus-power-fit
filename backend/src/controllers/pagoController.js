import { Op } from "sequelize";

import Pago from "../models/pago.js";
import Cliente from "../models/cliente.js";
import Plan from "../models/plan.js";
import {
  errorDatos,
  estadoPago,
  hoyChile,
  responderError,
  soloCampos,
  validarPago,
} from "../utils/reglas.js";

const CAMPOS_EDITABLES = [
  "clienteId",
  "planId",
  "monto",
  "fechaPago",
  "fechaVencimiento",
  "metodoPago",
  "estado",
  "observaciones",
];

const incluir = [
  {
    model: Cliente,
    as: "cliente",
    attributes: ["id", "nombre", "rut", "email"],
  },
  {
    model: Plan,
    as: "plan",
    attributes: ["id", "nombre", "duracionMeses"],
  },
];

// El estado guardado puede quedar atrasado; se entrega el que corresponde hoy.
const conEstadoActual = (pago, hoy) => ({
  ...pago.toJSON(),
  estado: estadoPago(pago, hoy),
});

const exigirClienteYPlan = async (clienteId, planId) => {
  const [cliente, plan] = await Promise.all([
    Cliente.findByPk(clienteId),
    Plan.findByPk(planId),
  ]);

  if (!cliente) throw errorDatos(404, "Cliente no encontrado");
  if (!plan) throw errorDatos(404, "Plan no encontrado");
};

/*
 * OBTENER TODOS LOS PAGOS
 */
export const obtenerPagos = async (req, res) => {
  try {
    const pagos = await Pago.findAll({
      include: incluir,
      order: [
        ["fechaPago", "DESC"],
        ["id", "DESC"],
      ],
    });
    const hoy = hoyChile();

    res.json(pagos.map((pago) => conEstadoActual(pago, hoy)));
  } catch (error) {
    responderError(res, error, "Error al obtener pagos", "Error al obtener pagos", 500);
  }
};

/*
 * CREAR PAGO
 */
export const crearPago = async (req, res) => {
  try {
    const { clienteId, planId } = req.body ?? {};

    await exigirClienteYPlan(clienteId, planId);

    const pago = await Pago.create({
      clienteId,
      planId,
      ...validarPago(req.body),
    });

    res.status(201).json({
      ok: true,
      mensaje: "Pago registrado correctamente",
      pago: conEstadoActual(pago, hoyChile()),
    });
  } catch (error) {
    responderError(res, error, "Error al crear pago", "No se pudo registrar el pago");
  }
};

/*
 * ACTUALIZAR PAGO
 * Se valida el resultado completo, igual que al crear.
 */
export const actualizarPago = async (req, res) => {
  try {
    const pago = await Pago.findByPk(req.params.id);

    if (!pago) {
      return res.status(404).json({
        ok: false,
        mensaje: "Pago no encontrado",
      });
    }

    const cambios = soloCampos(req.body, CAMPOS_EDITABLES);
    const final = { ...pago.get(), ...cambios };

    if (cambios.clienteId !== undefined || cambios.planId !== undefined) {
      await exigirClienteYPlan(final.clienteId, final.planId);
    }

    await pago.update({
      clienteId: final.clienteId,
      planId: final.planId,
      ...validarPago(final, cambios),
    });

    res.json({
      ok: true,
      mensaje: "Pago actualizado correctamente",
      pago: conEstadoActual(pago, hoyChile()),
    });
  } catch (error) {
    responderError(res, error, "Error al actualizar pago", "No se pudo actualizar el pago");
  }
};

/*
 * ELIMINAR PAGO
 */
export const eliminarPago = async (req, res) => {
  try {
    const pago = await Pago.findByPk(req.params.id);

    if (!pago) {
      return res.status(404).json({
        ok: false,
        mensaje: "Pago no encontrado",
      });
    }

    await pago.destroy();

    res.json({
      ok: true,
      mensaje: "Pago eliminado correctamente",
    });
  } catch (error) {
    responderError(res, error, "Error al eliminar pago", "No se pudo eliminar el pago", 500);
  }
};

/*
 * OBTENER ÚLTIMO PAGO DE UN CLIENTE
 */
export const obtenerUltimoPagoCliente = async (req, res) => {
  try {
    const { clienteId } = req.params;
    const cliente = await Cliente.findByPk(clienteId);

    if (!cliente) {
      return res.status(404).json({
        ok: false,
        mensaje: "Cliente no encontrado",
      });
    }

    // Un pago anulado no cuenta: se informa el último pago válido.
    const pago = await Pago.findOne({
      where: { clienteId, estado: { [Op.ne]: "Anulado" } },
      include: incluir,
      order: [
        ["fechaPago", "DESC"],
        ["id", "DESC"],
      ],
    });

    if (!pago) {
      return res.status(404).json({
        ok: false,
        mensaje: "El cliente no registra pagos válidos",
      });
    }

    const estadoPlan = estadoPago(pago) === "Vencido" ? "Vencido" : "Vigente";

    res.json({
      ok: true,
      cliente: pago.cliente,
      plan: pago.plan,
      ultimoPago: pago.fechaPago,
      fechaVencimiento: pago.fechaVencimiento,
      monto: pago.monto,
      metodoPago: pago.metodoPago,
      estadoPlan,
      debeRenovar: estadoPlan === "Vencido",
    });
  } catch (error) {
    responderError(
      res,
      error,
      "Error al obtener último pago",
      "Error al obtener el último pago del cliente",
      500
    );
  }
};
