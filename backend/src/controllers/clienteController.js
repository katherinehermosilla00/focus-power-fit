import Asignacion from "../models/asignacion.js";
import Cliente from "../models/cliente.js";
import Contrato from "../models/contrato.js";
import Horario from "../models/horario.js";
import Plan from "../models/plan.js";
import Profesor from "../models/profesor.js";

export const obtenerClientes = async (req, res) => {
  try {
    const clientes = await Cliente.findAll({
      order: [["id", "DESC"]],
    });

    return res.status(200).json(clientes);
  } catch (error) {
    console.error("Error al obtener clientes:", error.message);

    return res.status(500).json({
      ok: false,
      mensaje: "Error al obtener clientes",
    });
  }
};

export const crearCliente = async (req, res) => {
  try {
    const { nombre, rut, email, telefono, plan, estado } = req.body;

    if (!nombre || !rut || !email) {
      return res.status(400).json({
        ok: false,
        mensaje: "Nombre, RUT y email son obligatorios",
      });
    }

    const clienteExistente = await Cliente.findOne({
      where: { email },
    });

    if (clienteExistente) {
      return res.status(409).json({
        ok: false,
        mensaje: "Ya existe un cliente con ese email",
      });
    }

    const cliente = await Cliente.create({
      nombre,
      rut,
      email,
      telefono: telefono || null,
      plan: plan || "Básico",
      estado: estado || "Activo",
    });

    return res.status(201).json({
      ok: true,
      mensaje: "Cliente creado correctamente",
      cliente,
    });
  } catch (error) {
    console.error("Error al crear cliente:", error.message);

    return res.status(400).json({
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

    const { nombre, rut, email, telefono, plan, estado } = req.body;

    await cliente.update({
      nombre: nombre !== undefined ? nombre : cliente.nombre,
      rut: rut !== undefined ? rut : cliente.rut,
      email: email !== undefined ? email : cliente.email,
      telefono: telefono !== undefined ? telefono : cliente.telefono,
      plan: plan !== undefined ? plan : cliente.plan,
      estado: estado !== undefined ? estado : cliente.estado,
    });

    return res.status(200).json({
      ok: true,
      mensaje: "Cliente actualizado correctamente",
      cliente,
    });
  } catch (error) {
    console.error("Error al actualizar cliente:", error.message);

    return res.status(400).json({
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

    return res.status(200).json({
      ok: true,
      mensaje: "Cliente eliminado correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar cliente:", error.message);

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo eliminar el cliente",
    });
  }
};

export const obtenerMiDashboard = async (req, res) => {
  try {
    const clienteId = req.usuario.id;

    const cliente = await Cliente.findByPk(clienteId, {
      attributes: ["id", "nombre", "email", "rut", "telefono", "estado"],
    });

    if (!cliente) {
      return res.status(404).json({
        ok: false,
        mensaje: "Cliente no encontrado",
      });
    }

    const asignacion = await Asignacion.findOne({
      where: {
        clienteId,
        estado: "Activa",
      },
      include: [
        {
          model: Plan,
          as: "plan",
          attributes: [
            "id",
            "nombre",
            "descripcion",
            "duracionMeses",
            "modalidad",
            "precio",
          ],
        },
        {
          model: Horario,
          as: "horario",
          attributes: ["id", "diaSemana", "horaInicio", "horaFin", "modalidad"],
          include: [
            {
              model: Profesor,
              as: "profesor",
              attributes: ["id", "nombre", "especialidad", "email", "telefono"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const contrato = await Contrato.findOne({
      where: {
        clienteId,
      },
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      ok: true,
      cliente,
      plan: asignacion?.plan ?? null,
      profesor: asignacion?.horario?.profesor ?? null,
      horario: asignacion?.horario ?? null,
      contrato: contrato
        ? {
            id: contrato.id,
            nombreArchivo: contrato.nombreArchivo,
            rutaArchivo: contrato.rutaArchivo,
            fechaInicio: contrato.fechaInicio,
            fechaTermino: contrato.fechaTermino,
            estado: contrato.estado,
            observaciones: contrato.observaciones,
          }
        : null,
    });
  } catch (error) {
    console.error("Error al obtener dashboard del cliente:", error.message);

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo cargar la información del cliente",
      error: error.message,
    });
  }
};

export const obtenerMiContrato = async (req, res) => {
  try {
    const clienteId = req.usuario.id;

    const contrato = await Contrato.findOne({
      where: { clienteId },
      order: [["createdAt", "DESC"]],
    });

    if (!contrato) {
      return res.status(404).json({
        ok: false,
        mensaje: "El cliente no tiene contrato asociado",
      });
    }

    const baseUrl = process.env.BACKEND_URL || "http://localhost:3001";

    return res.status(200).json({
      ok: true,
      contrato: {
        id: contrato.id,
        nombreArchivo: contrato.nombreArchivo,
        rutaArchivo: contrato.rutaArchivo,
        fechaInicio: contrato.fechaInicio,
        fechaTermino: contrato.fechaTermino,
        estado: contrato.estado,
        observaciones: contrato.observaciones,
        url: `${baseUrl}${contrato.rutaArchivo}`,
      },
    });
  } catch (error) {
    console.error("Error al obtener contrato del cliente:", error.message);

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo obtener el contrato del cliente",
      error: error.message,
    });
  }
};