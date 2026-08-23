import fs from "fs";
import Contrato from "../models/contrato.js";
import Cliente from "../models/cliente.js";

// OBTENER TODOS LOS CONTRATOS
export const obtenerContratos = async (req, res) => {
  try {
    const contratos = await Contrato.findAll({
      include: [
        {
          model: Cliente,
          as: "cliente",
          attributes: ["id", "nombre", "rut", "email"],
        },
      ],
      order: [["id", "DESC"]],
    });

    res.json(contratos);
  } catch (error) {
    console.error(
      "Error al obtener contratos:",
      error.message
    );

    res.status(500).json({
      ok: false,
      mensaje: "Error al obtener contratos",
    });
  }
};

// CREAR CONTRATO
export const crearContrato = async (req, res) => {
  try {
    const {
      clienteId,
      fechaInicio,
      fechaTermino,
      estado,
      observaciones,
    } = req.body;

    if (!clienteId) {
      if (req.file?.path) {
        fs.unlinkSync(req.file.path);
      }

      return res.status(400).json({
        ok: false,
        mensaje: "El cliente es obligatorio",
      });
    }

    const cliente = await Cliente.findByPk(clienteId);

    if (!cliente) {
      if (req.file?.path) {
        fs.unlinkSync(req.file.path);
      }

      return res.status(404).json({
        ok: false,
        mensaje: "Cliente no encontrado",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "Debe adjuntar una copia digital del contrato",
      });
    }

    const contrato = await Contrato.create({
      clienteId,
      nombreArchivo: req.file.originalname,
      rutaArchivo: `/uploads/contratos/${req.file.filename}`,
      fechaInicio: fechaInicio || null,
      fechaTermino: fechaTermino || null,
      estado: estado || "Vigente",
      observaciones: observaciones || null,
    });

    res.status(201).json({
      ok: true,
      mensaje: "Contrato registrado correctamente",
      contrato,
    });
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    console.error(
      "Error al crear contrato:",
      error.message
    );

    res.status(400).json({
      ok: false,
      mensaje: "No se pudo registrar el contrato",
      error: error.message,
    });
  }
};

// ACTUALIZAR DATOS DEL CONTRATO
export const actualizarContrato = async (req, res) => {
  try {
    const { id } = req.params;

    const contrato = await Contrato.findByPk(id);

    if (!contrato) {
      return res.status(404).json({
        ok: false,
        mensaje: "Contrato no encontrado",
      });
    }

    const {
      fechaInicio,
      fechaTermino,
      estado,
      observaciones,
    } = req.body;

    await contrato.update({
      fechaInicio:
        fechaInicio !== undefined
          ? fechaInicio || null
          : contrato.fechaInicio,

      fechaTermino:
        fechaTermino !== undefined
          ? fechaTermino || null
          : contrato.fechaTermino,

      estado:
        estado !== undefined
          ? estado
          : contrato.estado,

      observaciones:
        observaciones !== undefined
          ? observaciones
          : contrato.observaciones,
    });

    res.json({
      ok: true,
      mensaje: "Contrato actualizado correctamente",
      contrato,
    });
  } catch (error) {
    console.error(
      "Error al actualizar contrato:",
      error.message
    );

    res.status(400).json({
      ok: false,
      mensaje: "No se pudo actualizar el contrato",
      error: error.message,
    });
  }
};

// ELIMINAR CONTRATO
export const eliminarContrato = async (req, res) => {
  try {
    const { id } = req.params;

    const contrato = await Contrato.findByPk(id);

    if (!contrato) {
      return res.status(404).json({
        ok: false,
        mensaje: "Contrato no encontrado",
      });
    }

    const rutaFisica = contrato.rutaArchivo
      ? contrato.rutaArchivo.replace(/^\/+/, "")
      : null;

    if (rutaFisica && fs.existsSync(rutaFisica)) {
      fs.unlinkSync(rutaFisica);
    }

    await contrato.destroy();

    res.json({
      ok: true,
      mensaje: "Contrato eliminado correctamente",
    });
  } catch (error) {
    console.error(
      "Error al eliminar contrato:",
      error.message
    );

    res.status(500).json({
      ok: false,
      mensaje: "No se pudo eliminar el contrato",
      error: error.message,
    });
  }
};