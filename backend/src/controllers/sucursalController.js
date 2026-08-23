import Sucursal from "../models/sucursal.js";

export const obtenerSucursales = async (req, res) => {
  try {
    const sucursales = await Sucursal.findAll({
      order: [["nombre", "ASC"]],
    });

    res.json(sucursales);
  } catch (error) {
    console.error(
      "Error al obtener sucursales:",
      error.message
    );

    res.status(500).json({
      ok: false,
      mensaje: "Error al obtener sucursales",
    });
  }
};

export const crearSucursal = async (req, res) => {
  try {
    const {
      nombre,
      direccion,
      comuna,
      telefono,
      estado,
    } = req.body;

    if (!nombre || !comuna) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "Nombre y comuna son obligatorios",
      });
    }

    const sucursal = await Sucursal.create({
      nombre,
      direccion: direccion || null,
      comuna,
      telefono: telefono || null,
      estado: estado || "Activa",
    });

    res.status(201).json({
      ok: true,
      mensaje:
        "Sucursal registrada correctamente",
      sucursal,
    });
  } catch (error) {
    console.error(
      "Error al crear sucursal:",
      error.message
    );

    res.status(400).json({
      ok: false,
      mensaje:
        "No se pudo registrar la sucursal",
      error: error.message,
    });
  }
};

export const actualizarSucursal = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const sucursal = await Sucursal.findByPk(id);

    if (!sucursal) {
      return res.status(404).json({
        ok: false,
        mensaje: "Sucursal no encontrada",
      });
    }

    await sucursal.update(req.body);

    res.json({
      ok: true,
      mensaje:
        "Sucursal actualizada correctamente",
      sucursal,
    });
  } catch (error) {
    console.error(
      "Error al actualizar sucursal:",
      error.message
    );

    res.status(400).json({
      ok: false,
      mensaje:
        "No se pudo actualizar la sucursal",
      error: error.message,
    });
  }
};

export const eliminarSucursal = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const sucursal = await Sucursal.findByPk(id);

    if (!sucursal) {
      return res.status(404).json({
        ok: false,
        mensaje: "Sucursal no encontrada",
      });
    }

    await sucursal.destroy();

    res.json({
      ok: true,
      mensaje:
        "Sucursal eliminada correctamente",
    });
  } catch (error) {
    console.error(
      "Error al eliminar sucursal:",
      error.message
    );

    res.status(500).json({
      ok: false,
      mensaje:
        "No se pudo eliminar la sucursal",
      error: error.message,
    });
  }
};