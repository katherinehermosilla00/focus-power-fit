import Cliente from "../models/cliente.js";
import Maquina from "../models/maquina.js";
import Profesor from "../models/profesor.js";
import Sucursal from "../models/sucursal.js";
import { responderError, soloCampos, validarSucursal } from "../utils/reglas.js";

const CAMPOS_EDITABLES = [
  "nombre",
  "direccion",
  "comuna",
  "ciudad",
  "horarioAtencion",
  "telefono",
  "estado",
];

export const obtenerSucursales = async (req, res) => {
  try {
    const sucursales = await Sucursal.findAll({
      order: [["nombre", "ASC"]],
    });

    res.json(sucursales);
  } catch (error) {
    responderError(res, error, "Error al obtener sucursales", "Error al obtener sucursales", 500);
  }
};

export const crearSucursal = async (req, res) => {
  try {
    const sucursal = await Sucursal.create(
      validarSucursal(soloCampos(req.body, CAMPOS_EDITABLES))
    );

    res.status(201).json({
      ok: true,
      mensaje: "Sucursal registrada correctamente",
      sucursal,
    });
  } catch (error) {
    responderError(res, error, "Error al crear sucursal", "No se pudo registrar la sucursal");
  }
};

export const actualizarSucursal = async (req, res) => {
  try {
    const sucursal = await Sucursal.findByPk(req.params.id);

    if (!sucursal) {
      return res.status(404).json({
        ok: false,
        mensaje: "Sucursal no encontrada",
      });
    }

    const cambios = soloCampos(req.body, CAMPOS_EDITABLES);

    await sucursal.update(validarSucursal({ ...sucursal.get(), ...cambios }, cambios));

    res.json({
      ok: true,
      mensaje: "Sucursal actualizada correctamente",
      sucursal,
    });
  } catch (error) {
    responderError(res, error, "Error al actualizar sucursal", "No se pudo actualizar la sucursal");
  }
};

// Borrar una sucursal con datos borraría sus máquinas y dejaría a sus clientes
// y profesores sin sucursal.
export const eliminarSucursal = async (req, res) => {
  try {
    const sucursal = await Sucursal.findByPk(req.params.id);

    if (!sucursal) {
      return res.status(404).json({
        ok: false,
        mensaje: "Sucursal no encontrada",
      });
    }

    const where = { sucursalId: sucursal.id };
    const [clientes, profesores, maquinas] = await Promise.all([
      Cliente.count({ where }),
      Profesor.count({ where }),
      Maquina.count({ where }),
    ]);

    if (clientes + profesores + maquinas > 0) {
      return res.status(409).json({
        ok: false,
        mensaje: `La sucursal tiene ${clientes} cliente(s), ${profesores} profesor(es) y ${maquinas} máquina(s). Desactívala para conservar sus datos.`,
      });
    }

    await sucursal.destroy();

    res.json({
      ok: true,
      mensaje: "Sucursal eliminada correctamente",
    });
  } catch (error) {
    responderError(res, error, "Error al eliminar sucursal", "No se pudo eliminar la sucursal", 500);
  }
};

export const obtenerSucursalesPublicas = async (req, res) => {
  try {
    const sucursales = await Sucursal.findAll({
      where: { estado: "Activa" },
      attributes: [
        "id",
        "nombre",
        "direccion",
        "comuna",
        "ciudad",
        "horarioAtencion",
        "telefono",
      ],
      order: [["nombre", "ASC"]],
    });

    res.json(sucursales);
  } catch (error) {
    responderError(
      res,
      error,
      "Error al obtener sucursales publicas",
      "Error al obtener sucursales",
      500
    );
  }
};
