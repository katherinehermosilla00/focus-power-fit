import Pago from "../models/pago.js";
import Cliente from "../models/cliente.js";
import Plan from "../models/plan.js";

/*
 * OBTENER TODOS LOS PAGOS
 */
export const obtenerPagos = async (req, res) => {
  try {
    const pagos = await Pago.findAll({
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
            "duracionMeses",
          ],
        },
      ],
      order: [
        ["fechaPago", "DESC"],
        ["id", "DESC"],
      ],
    });

    res.json(pagos);
  } catch (error) {
    console.error(
      "Error al obtener pagos:",
      error.message
    );

    res.status(500).json({
      ok: false,
      mensaje: "Error al obtener pagos",
    });
  }
};

/*
 * CREAR PAGO
 */
export const crearPago = async (req, res) => {
  try {
    const {
      clienteId,
      planId,
      monto,
      fechaPago,
      fechaVencimiento,
      metodoPago,
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

    if (
      !monto ||
      !fechaPago ||
      !fechaVencimiento ||
      !metodoPago
    ) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "Monto, fecha de pago, fecha de vencimiento y método de pago son obligatorios",
      });
    }

    const pago = await Pago.create({
      clienteId,
      planId,
      monto,
      fechaPago,
      fechaVencimiento,
      metodoPago,
      observaciones: observaciones || null,
    });

    res.status(201).json({
      ok: true,
      mensaje: "Pago registrado correctamente",
      pago,
    });
  } catch (error) {
    console.error(
      "Error al crear pago:",
      error.message
    );

    res.status(400).json({
      ok: false,
      mensaje: "No se pudo registrar el pago",
      error: error.message,
    });
  }
};

/*
 * ACTUALIZAR PAGO
 */
export const actualizarPago = async (req, res) => {
  try {
    const { id } = req.params;

    const pago =
      await Pago.findByPk(id);

    if (!pago) {
      return res.status(404).json({
        ok: false,
        mensaje: "Pago no encontrado",
      });
    }

    await pago.update(req.body);

    res.json({
      ok: true,
      mensaje: "Pago actualizado correctamente",
      pago,
    });
  } catch (error) {
    console.error(
      "Error al actualizar pago:",
      error.message
    );

    res.status(400).json({
      ok: false,
      mensaje: "No se pudo actualizar el pago",
      error: error.message,
    });
  }
};

/*
 * ELIMINAR PAGO
 */
export const eliminarPago = async (req, res) => {
  try {
    const { id } = req.params;

    const pago =
      await Pago.findByPk(id);

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
    console.error(
      "Error al eliminar pago:",
      error.message
    );

    res.status(500).json({
      ok: false,
      mensaje: "No se pudo eliminar el pago",
    });
  }
};

/*
 * OBTENER ÚLTIMO PAGO DE UN CLIENTE
 */
export const obtenerUltimoPagoCliente = async (
  req,
  res
) => {
  try {
    const { clienteId } = req.params;

    const cliente =
      await Cliente.findByPk(clienteId);

    if (!cliente) {
      return res.status(404).json({
        ok: false,
        mensaje: "Cliente no encontrado",
      });
    }

    const pago = await Pago.findOne({
      where: {
        clienteId,
      },

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
            "duracionMeses",
          ],
        },
      ],

      order: [
        ["fechaPago", "DESC"],
        ["id", "DESC"],
      ],
    });

    if (!pago) {
      return res.status(404).json({
        ok: false,
        mensaje:
          "El cliente no registra pagos",
      });
    }

    /*
     * CALCULAR ESTADO REAL DEL PLAN
     */
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const vencimiento = new Date(
      `${pago.fechaVencimiento}T00:00:00`
    );

    const estadoPlan =
      vencimiento >= hoy
        ? "Vigente"
        : "Vencido";

    const debeRenovar =
      estadoPlan === "Vencido";

    res.json({
      ok: true,

      cliente: pago.cliente,

      plan: pago.plan,

      ultimoPago: pago.fechaPago,

      fechaVencimiento:
        pago.fechaVencimiento,

      monto: pago.monto,

      metodoPago: pago.metodoPago,

      estadoPlan,

      debeRenovar,
    });
  } catch (error) {
    console.error(
      "Error al obtener último pago:",
      error.message
    );

    res.status(500).json({
      ok: false,
      mensaje:
        "Error al obtener el último pago del cliente",
    });
  }
};