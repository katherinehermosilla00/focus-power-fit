import Sucursal from "../models/sucursal.js";

export const obtenerSucursales = async (req, res) => {
  try {
    const sucursales = await Sucursal.findAll({
      where: { estado: "Activo" },
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
    console.error("Error al obtener sucursales:", error.message);

    res.status(500).json({
      ok: false,
      mensaje: "Error al obtener sucursales",
    });
  }
};
