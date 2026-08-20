import Cliente from "../models/Cliente.js";

export const obtenerClientes = async (req, res) => {
  try {
    const clientes = await Cliente.findAll({
      order: [["id", "DESC"]],
    });

    res.json(clientes);
  } catch (error) {
    console.error("Error al obtener clientes:", error.message);

    res.status(500).json({
      ok: false,
      mensaje: "Error al obtener clientes",
    });
  }
};

export const crearCliente = async (req, res) => {
  try {
    const {
      nombre,
      rut,
      email,
      telefono,
      plan,
    } = req.body;

    const cliente = await Cliente.create({
      nombre,
      rut,
      email,
      telefono,
      plan,
    });

    res.status(201).json(cliente);
  } catch (error) {
    console.error("Error al crear cliente:", error.message);

    res.status(400).json({
      ok: false,
      mensaje: "No se pudo crear el cliente",
      error: error.message,
    });
  }
};

export const actualizarCliente = async (req, res) => {
  try {
    const { id } = req.params;

    const cliente = await Cliente.findByPk(id);

    if (!cliente) {
      return res.status(404).json({
        ok: false,
        mensaje: "Cliente no encontrado",
      });
    }

    await cliente.update(req.body);

    res.json(cliente);
  } catch (error) {
    console.error("Error al actualizar cliente:", error.message);

    res.status(400).json({
      ok: false,
      mensaje: "No se pudo actualizar el cliente",
      error: error.message,
    });
  }
};

export const eliminarCliente = async (req, res) => {
  try {
    const { id } = req.params;

    const cliente = await Cliente.findByPk(id);

    if (!cliente) {
      return res.status(404).json({
        ok: false,
        mensaje: "Cliente no encontrado",
      });
    }

    await cliente.destroy();

    res.json({
      ok: true,
      mensaje: "Cliente eliminado correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar cliente:", error.message);

    res.status(500).json({
      ok: false,
      mensaje: "No se pudo eliminar el cliente",
    });
  }
};