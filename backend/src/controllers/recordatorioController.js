import Recordatorio from "../models/recordatorio.js";
import Cliente from "../models/cliente.js";
import {
  errorDatos,
  responderError,
  soloCampos,
  validarRecordatorio,
} from "../utils/reglas.js";

const CAMPOS_EDITABLES = [
  "clienteId",
  "tipo",
  "titulo",
  "mensaje",
  "fechaEnvio",
  "estado",
];

const exigirCliente = async (clienteId) => {
  if (!(await Cliente.findByPk(clienteId))) {
    throw errorDatos(404, "Cliente no encontrado");
  }
};

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
    const datos = validarRecordatorio({
      ...soloCampos(req.body, CAMPOS_EDITABLES),
      estado: "Pendiente",
    });

    await exigirCliente(datos.clienteId);

    const recordatorio = await Recordatorio.create(datos);

    res.status(201).json({
      ok: true,
      mensaje:
        "Recordatorio registrado correctamente",
      recordatorio,
    });
  } catch (error) {
    responderError(
      res,
      error,
      "Error al crear recordatorio",
      "No se pudo registrar el recordatorio"
    );
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

    const cambios = soloCampos(req.body, CAMPOS_EDITABLES);

    if (cambios.clienteId !== undefined) {
      await exigirCliente(cambios.clienteId);
    }

    await recordatorio.update(
      validarRecordatorio({ ...recordatorio.get(), ...cambios }, cambios)
    );

    res.json({
      ok: true,
      mensaje:
        "Recordatorio actualizado correctamente",
      recordatorio,
    });
  } catch (error) {
    responderError(
      res,
      error,
      "Error al actualizar recordatorio",
      "No se pudo actualizar el recordatorio"
    );
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