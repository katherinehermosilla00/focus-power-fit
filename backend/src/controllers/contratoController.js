import fs from "fs";
import path from "path";
import Contrato from "../models/contrato.js";
import Cliente from "../models/cliente.js";
import { detectarTipoArchivo } from "../utils/firmaArchivo.js";
import { buscarPorCorreo } from "../utils/validaciones.js";
import {
  estadoContrato,
  hoyChile,
  responderError,
  soloCampos,
  validarContrato,
} from "../utils/reglas.js";

// El estado guardado puede quedar atrasado; se entrega el que corresponde hoy.
const conEstadoActual = (contrato, hoy = hoyChile()) => ({
  ...contrato.toJSON(),
  estado: estadoContrato(contrato, hoy),
});

export const obtenerArchivoContrato = async (req, res) => {
  try {
    const contrato = await Contrato.findByPk(req.params.id);

    if (!contrato) {
      return res.status(404).json({
        ok: false,
        mensaje: "Contrato no encontrado",
      });
    }

    if (req.usuario.rol !== "admin") {
      const cliente = await buscarPorCorreo(Cliente, req.usuario.email, {
        attributes: ["id", "email"],
      });

      if (!cliente || cliente.id !== contrato.clienteId) {
        return res.status(403).json({
          ok: false,
          mensaje: "No tienes permiso para acceder a este contrato",
        });
      }
    }

    const nombreArchivo = path.basename(contrato.rutaArchivo);
    const rutaArchivo = path.resolve(
      process.cwd(),
      "uploads",
      "contratos",
      nombreArchivo
    );
    const carpetaContratos = path.resolve(
      process.cwd(),
      "uploads",
      "contratos"
    );

    if (
      path.dirname(rutaArchivo) !== carpetaContratos ||
      !fs.existsSync(rutaArchivo)
    ) {
      return res.status(404).json({
        ok: false,
        mensaje: "Archivo de contrato no encontrado",
      });
    }

    return res.download(rutaArchivo, contrato.nombreArchivo);
  } catch (error) {
    console.error("Error al obtener archivo de contrato:", error.message);

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo obtener el archivo del contrato",
    });
  }
};

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
    const hoy = hoyChile();

    res.json(contratos.map((contrato) => conEstadoActual(contrato, hoy)));
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

    // El contenido debe coincidir con el tipo declarado.
    if (
      req.file &&
      (await detectarTipoArchivo(req.file.path)) !== req.file.mimetype
    ) {
      fs.unlinkSync(req.file.path);

      return res.status(400).json({
        ok: false,
        mensaje: "El archivo no es un PDF, JPG o PNG válido",
      });
    }

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
      ...validarContrato({ fechaInicio, fechaTermino, estado, observaciones }),
    });

    res.status(201).json({
      ok: true,
      mensaje: "Contrato registrado correctamente",
      contrato: conEstadoActual(contrato),
    });
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    responderError(res, error, "Error al crear contrato", "No se pudo registrar el contrato");
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

    const cambios = soloCampos(req.body, [
      "fechaInicio",
      "fechaTermino",
      "estado",
      "observaciones",
    ]);

    await contrato.update(
      validarContrato({ ...contrato.get(), ...cambios }, cambios)
    );

    res.json({
      ok: true,
      mensaje: "Contrato actualizado correctamente",
      contrato: conEstadoActual(contrato),
    });
  } catch (error) {
    if (error?.expuesto) {
      return responderError(res, error, "", "");
    }

    console.error(
      "Error al actualizar contrato:",
      error.message
    );

    res.status(400).json({
      ok: false,
      mensaje: "No se pudo actualizar el contrato",
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
    });
  }
};