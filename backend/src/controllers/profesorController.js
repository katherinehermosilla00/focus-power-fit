
import Profesor from "../models/profesor.js";
import Sucursal from "../models/sucursal.js";

const includeSucursal = [
  {
    model: Sucursal,
    as: "sucursal",
    attributes: ["id", "nombre", "comuna", "estado"],
  },
];

const TURNOS_VALIDOS = ["AM", "PM", "AM y PM"];

// Convierte campos opcionales vacíos a null.
const limpiarOpcional = (valor) => {
  return typeof valor === "string"
    ? valor.trim() || null
    : null;
};

const turnoEsValido = (turno) =>
  turno === null || TURNOS_VALIDOS.includes(turno);

// ============================================
// OBTENER TODOS LOS PROFESORES (ADMIN)
// ============================================
export const obtenerProfesores = async (req, res) => {
  try {
    const profesores = await Profesor.findAll({
      include: includeSucursal,
      order: [["id", "DESC"]],
    });

    return res.json(profesores);
  } catch (error) {
    console.error("Error al obtener profesores:", error);

    return res.status(500).json({
      ok: false,
      mensaje: "Error al obtener profesores",
    });
  }
};

// ============================================
// CREAR PROFESOR
// ============================================
export const crearProfesor = async (req, res) => {
  try {
    const {
      nombre,
      rut,
      email,
      telefono,
      especialidad,
      sucursalId,
      instagram,
      turno,
    } = req.body;

    if (typeof nombre !== "string" || !nombre.trim()) {
      return res.status(400).json({
        ok: false,
        mensaje: "El nombre es obligatorio",
      });
    }

    if (!sucursalId) {
      return res.status(400).json({
        ok: false,
        mensaje: "La sucursal es obligatoria",
      });
    }

    const sucursal = await Sucursal.findByPk(sucursalId);

    if (!sucursal) {
      return res.status(404).json({
        ok: false,
        mensaje: "Sucursal no encontrada",
      });
    }

    const rutLimpio = limpiarOpcional(rut);
    const emailLimpio = limpiarOpcional(email);
    const turnoLimpio = limpiarOpcional(turno);

    if (!turnoEsValido(turnoLimpio)) {
      return res.status(400).json({
        ok: false,
        mensaje: "Turno inválido. Usa AM, PM o AM y PM.",
      });
    }

    // Validar RUT duplicado cuando se informa.
    if (rutLimpio) {
      const existente = await Profesor.findOne({
        where: { rut: rutLimpio },
      });

      if (existente) {
        return res.status(409).json({
          ok: false,
          mensaje: "Ya existe un profesor con ese RUT",
        });
      }
    }

    // Validar correo duplicado cuando se informa.
    if (emailLimpio) {
      const existente = await Profesor.findOne({
        where: { email: emailLimpio },
      });

      if (existente) {
        return res.status(409).json({
          ok: false,
          mensaje: "Ya existe un profesor con ese correo",
        });
      }
    }

    const profesor = await Profesor.create({
      nombre: nombre.trim(),
      rut: rutLimpio,
      email: emailLimpio,
      telefono: limpiarOpcional(telefono),
      especialidad: limpiarOpcional(especialidad),
      sucursalId: sucursal.id,
      instagram: limpiarOpcional(instagram),
      turno: turnoLimpio,
      estado: "Activo",
    });

    const profesorCreado = await Profesor.findByPk(profesor.id, {
      include: includeSucursal,
    });

    return res.status(201).json({
      ok: true,
      mensaje: "Profesor creado correctamente",
      profesor: profesorCreado,
    });
  } catch (error) {
    console.error("Error al crear profesor:", error);

    return res.status(400).json({
      ok: false,
      mensaje: "No se pudo crear el profesor",
      error: error.message,
    });
  }
};

// ============================================
// ACTUALIZAR PROFESOR
// ============================================
export const actualizarProfesor = async (req, res) => {
  try {
    const { id } = req.params;

    const profesor = await Profesor.findByPk(id);

    if (!profesor) {
      return res.status(404).json({
        ok: false,
        mensaje: "Profesor no encontrado",
      });
    }

    const cambios = {};

    // Nombre.
    if (req.body.nombre !== undefined) {
      if (
        typeof req.body.nombre !== "string" ||
        !req.body.nombre.trim()
      ) {
        return res.status(400).json({
          ok: false,
          mensaje: "El nombre no puede estar vacío",
        });
      }

      cambios.nombre = req.body.nombre.trim();
    }

    // RUT.
    if (req.body.rut !== undefined) {
      const rutLimpio = limpiarOpcional(req.body.rut);

      if (rutLimpio) {
        const existente = await Profesor.findOne({
          where: { rut: rutLimpio },
        });

        if (existente && existente.id !== profesor.id) {
          return res.status(409).json({
            ok: false,
            mensaje: "Ya existe un profesor con ese RUT",
          });
        }
      }

      cambios.rut = rutLimpio;
    }

    // Correo.
    if (req.body.email !== undefined) {
      const emailLimpio = limpiarOpcional(req.body.email);

      if (emailLimpio) {
        const existente = await Profesor.findOne({
          where: { email: emailLimpio },
        });

        if (existente && existente.id !== profesor.id) {
          return res.status(409).json({
            ok: false,
            mensaje: "Ya existe un profesor con ese correo",
          });
        }
      }

      cambios.email = emailLimpio;
    }

    // Teléfono.
    if (req.body.telefono !== undefined) {
      cambios.telefono = limpiarOpcional(req.body.telefono);
    }

    // Especialidad.
    if (req.body.especialidad !== undefined) {
      cambios.especialidad = limpiarOpcional(
        req.body.especialidad
      );
    }

    // Instagram.
    if (req.body.instagram !== undefined) {
      cambios.instagram = limpiarOpcional(
        req.body.instagram
      );
    }

    // Turno.
    if (req.body.turno !== undefined) {
      const turnoLimpio = limpiarOpcional(req.body.turno);

      if (!turnoEsValido(turnoLimpio)) {
        return res.status(400).json({
          ok: false,
          mensaje: "Turno inválido. Usa AM, PM o AM y PM.",
        });
      }

      cambios.turno = turnoLimpio;
    }

    // Sucursal.
    if (req.body.sucursalId !== undefined) {
      const sucursalId = req.body.sucursalId;

      if (sucursalId === null || sucursalId === "") {
        cambios.sucursalId = null;
      } else {
        const sucursal = await Sucursal.findByPk(sucursalId);

        if (!sucursal) {
          return res.status(404).json({
            ok: false,
            mensaje: "Sucursal no encontrada",
          });
        }

        cambios.sucursalId = sucursal.id;
      }
    }

    // Estado.
    if (req.body.estado !== undefined) {
      if (!["Activo", "Inactivo"].includes(req.body.estado)) {
        return res.status(400).json({
          ok: false,
          mensaje: "Estado inválido",
        });
      }

      cambios.estado = req.body.estado;
    }

    await profesor.update(cambios);

    const profesorActualizado = await Profesor.findByPk(id, {
      include: includeSucursal,
    });

    return res.json({
      ok: true,
      mensaje: "Profesor actualizado correctamente",
      profesor: profesorActualizado,
    });
  } catch (error) {
    console.error("Error al actualizar profesor:", error);

    return res.status(400).json({
      ok: false,
      mensaje: "No se pudo actualizar el profesor",
      error: error.message,
    });
  }
};

// ============================================
// ELIMINAR PROFESOR
// ============================================
export const eliminarProfesor = async (req, res) => {
  try {
    const { id } = req.params;

    const profesor = await Profesor.findByPk(id);

    if (!profesor) {
      return res.status(404).json({
        ok: false,
        mensaje: "Profesor no encontrado",
      });
    }

    await profesor.destroy();

    return res.json({
      ok: true,
      mensaje: "Profesor eliminado correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar profesor:", error);

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo eliminar el profesor",
    });
  }
};

// ============================================
// OBTENER PROFESORES PARA LA PÁGINA PÚBLICA
// ============================================
export const obtenerProfesoresPublicos = async (req, res) => {
  try {
    const profesores = await Profesor.findAll({
      where: { estado: "Activo" },
      attributes: [
        "id",
        "nombre",
        "especialidad",
        "instagram",
        "sucursalId",
        "turno",
      ],
      include: [
        {
          model: Sucursal,
          as: "sucursal",
          attributes: ["id", "nombre"],
        },
      ],
      order: [["nombre", "ASC"]],
    });

    return res.json(profesores);
  } catch (error) {
    console.error(
      "Error al obtener profesores públicos:",
      error
    );

    return res.status(500).json({
      ok: false,
      mensaje: "Error al obtener profesores",
    });
  }
};
