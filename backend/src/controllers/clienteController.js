import Cliente from "../models/cliente.js";
import Sucursal from "../models/sucursal.js";

const includeSucursal = [
  {
    model: Sucursal,
    as: "sucursal",
    attributes: [
      "id",
      "nombre",
      "comuna",
      "estado",
    ],
  },
];

export const obtenerClientes = async (req, res) => {
  try {
    const clientes = await Cliente.findAll({
      include: includeSucursal,
      order: [["id", "DESC"]],
    });

    res.json(clientes);
  } catch (error) {
    console.error(
      "Error al obtener clientes:",
      error.message
    );

    res.status(500).json({
      ok: false,
      mensaje: "Error al obtener clientes",
    });
  }
};

export const crearCliente = async (req, res) => {
  try {
    const {
      sucursalId,
      numeroCliente,
      nombres,
      apellidos,
      nombre,
      rut,
      email,
      telefono,
      telefonoSecundario,
      direccion,
      comuna,
      ciudad,
      edad,
      genero,
      fechaNacimiento,
      fechaCreacionOrigen,
      plan,
      estado,
    } = req.body;

    /*
     * VALIDACIONES PRINCIPALES
     */

    const nombreFinal =
      nombre?.trim() ||
      [nombres, apellidos]
        .filter(Boolean)
        .join(" ")
        .trim();

    const nombresFinal =
      nombres?.trim() ||
      nombreFinal;

    if (!nombreFinal) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "El nombre del cliente es obligatorio",
      });
    }

    if (!sucursalId) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "La sucursal es obligatoria",
      });
    }

    const sucursal =
      await Sucursal.findByPk(sucursalId);

    if (!sucursal) {
      return res.status(404).json({
        ok: false,
        mensaje:
          "Sucursal no encontrada",
      });
    }

    /*
     * CREAR CLIENTE
     */

    const cliente = await Cliente.create({
      sucursalId,

      numeroCliente:
        numeroCliente || null,

      nombres:
        nombresFinal,

      apellidos:
        apellidos || null,

      nombre:
        nombreFinal,

      rut:
        rut || null,

      email:
        email || null,

      telefono:
        telefono || null,

      telefonoSecundario:
        telefonoSecundario || null,

      direccion:
        direccion || null,

      comuna:
        comuna || null,

      ciudad:
        ciudad || null,

      edad:
        edad || null,

      genero:
        genero || "No informado",

      fechaNacimiento:
        fechaNacimiento || null,

      fechaCreacionOrigen:
        fechaCreacionOrigen || null,

      plan:
        plan || null,

      estado:
        estado || "Activo",
    });

    const clienteCreado =
      await Cliente.findByPk(
        cliente.id,
        {
          include:
            includeSucursal,
        }
      );

    res.status(201).json({
      ok: true,
      mensaje:
        "Cliente creado correctamente",
      cliente:
        clienteCreado,
    });
  } catch (error) {
    console.error(
      "Error al crear cliente:",
      error.message
    );

    res.status(400).json({
      ok: false,
      mensaje:
        "No se pudo crear el cliente",
      error:
        error.message,
    });
  }
};

export const actualizarCliente = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const cliente =
      await Cliente.findByPk(id);

    if (!cliente) {
      return res.status(404).json({
        ok: false,
        mensaje:
          "Cliente no encontrado",
      });
    }

    /*
     * VALIDAR SUCURSAL SI VIENE
     */

    if (
      req.body.sucursalId !== undefined &&
      req.body.sucursalId !== null
    ) {
      const sucursal =
        await Sucursal.findByPk(
          req.body.sucursalId
        );

      if (!sucursal) {
        return res.status(404).json({
          ok: false,
          mensaje:
            "Sucursal no encontrada",
        });
      }
    }

    /*
     * MANTENER NOMBRE Y NOMBRES
     * SIN ROMPER COMPATIBILIDAD
     */

    const datosActualizar = {
      ...req.body,
    };

    if (
      req.body.nombre !== undefined
    ) {
      const nombreLimpio =
        req.body.nombre?.trim();

      if (!nombreLimpio) {
        return res.status(400).json({
          ok: false,
          mensaje:
            "El nombre no puede quedar vacío",
        });
      }

      datosActualizar.nombre =
        nombreLimpio;

      /*
       * Si no mandan "nombres",
       * usamos el nombre completo
       * para cumplir el modelo actual.
       */
      if (
        req.body.nombres ===
        undefined
      ) {
        datosActualizar.nombres =
          nombreLimpio;
      }
    }

    if (
      req.body.nombres !== undefined &&
      req.body.nombres !== null
    ) {
      datosActualizar.nombres =
        String(
          req.body.nombres
        ).trim();
    }

    /*
     * CAMPOS OPCIONALES
     */

    const camposOpcionales = [
      "numeroCliente",
      "apellidos",
      "rut",
      "email",
      "telefono",
      "telefonoSecundario",
      "direccion",
      "comuna",
      "ciudad",
      "fechaNacimiento",
      "fechaCreacionOrigen",
      "plan",
    ];

    for (
      const campo
      of camposOpcionales
    ) {
      if (
        datosActualizar[campo] ===
        ""
      ) {
        datosActualizar[campo] =
          null;
      }
    }

    if (
      datosActualizar.edad ===
      ""
    ) {
      datosActualizar.edad =
        null;
    }

    await cliente.update(
      datosActualizar
    );

    const clienteActualizado =
      await Cliente.findByPk(
        id,
        {
          include:
            includeSucursal,
        }
      );

    res.json({
      ok: true,
      mensaje:
        "Cliente actualizado correctamente",
      cliente:
        clienteActualizado,
    });
  } catch (error) {
    console.error(
      "Error al actualizar cliente:",
      error.message
    );

    res.status(400).json({
      ok: false,
      mensaje:
        "No se pudo actualizar el cliente",
      error:
        error.message,
    });
  }
};

export const eliminarCliente = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const cliente =
      await Cliente.findByPk(id);

    if (!cliente) {
      return res.status(404).json({
        ok: false,
        mensaje:
          "Cliente no encontrado",
      });
    }

    await cliente.destroy();

    res.json({
      ok: true,
      mensaje:
        "Cliente eliminado correctamente",
    });
  } catch (error) {
    console.error(
      "Error al eliminar cliente:",
      error.message
    );

    res.status(500).json({
      ok: false,
      mensaje:
        "No se pudo eliminar el cliente",
      error:
        error.message,
    });
  }
};