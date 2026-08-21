import Recordatorio from "../models/recordatorio.js";
import Cliente from "../models/cliente.js";

export const obtenerRecordatorios = async (
  req,
  res
) => {
  try {
    const recordatorios =
      await Recordatorio.findAll({
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
        ],
        order: [
          ["fechaEnvio", "ASC"],
          ["id", "DESC"],
        ],
      });

    res.json(recordatorios);
  } catch (error) {
    console.error(
      "Error al obtener recordatorios:",
      error.message
    );

    res.status(500).json({
      ok: false,
      mensaje:
        "Error al obtener recordatorios",
    });
  }
};

export const crearRecordatorio = async (
  req,
  res
) => {
  try {
    const {
      clienteId,
      tipo,
      titulo,
      mensaje,
      fechaEnvio,
    } = req.body;

    if (
      !clienteId ||
      !tipo ||
      !titulo ||
      !mensaje ||
      !fechaEnvio
    ) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "Todos los campos son obligatorios",
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

    const recordatorio =
      await Recordatorio.create({
        clienteId,
        tipo,
        titulo,
        mensaje,
        fechaEnvio,
        estado: "Pendiente",
      });

    res.status(201).json({
      ok: true,
      mensaje:
        "Recordatorio registrado correctamente",
      recordatorio,
    });
  } catch (error) {
    console.error(
      "Error al crear recordatorio:",
      error.message
    );

    res.status(400).json({
      ok: false,
      mensaje:
        "No se pudo registrar el recordatorio",
      error: error.message,
    });
  }
};

export const actualizarRecordatorio = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const recordatorio =
      await Recordatorio.findByPk(id);

    if (!recordatorio) {
      return res.status(404).json({
        ok: false,
        mensaje:
          "Recordatorio no encontrado",
      });
    }

    await recordatorio.update(req.body);

    res.json({
      ok: true,
      mensaje:
        "Recordatorio actualizado correctamente",
      recordatorio,
    });
  } catch (error) {
    console.error(
      "Error al actualizar recordatorio:",
      error.message
    );

    res.status(400).json({
      ok: false,
      mensaje:
        "No se pudo actualizar el recordatorio",
      error: error.message,
    });
  }
};

export const eliminarRecordatorio = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const recordatorio =
      await Recordatorio.findByPk(id);

    if (!recordatorio) {
      return res.status(404).json({
        ok: false,
        mensaje:
          "Recordatorio no encontrado",
      });
    }

    await recordatorio.destroy();

    res.json({
      ok: true,
      mensaje:
        "Recordatorio eliminado correctamente",
    });
  } catch (error) {
    console.error(
      "Error al eliminar recordatorio:",
      error.message
    );

    res.status(500).json({
      ok: false,
      mensaje:
        "No se pudo eliminar el recordatorio",
    });
  }
};