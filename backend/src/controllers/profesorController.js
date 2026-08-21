import Profesor from "../models/profesor.js";

export const obtenerProfesores = async (req, res) => {
  try {
    const profesores = await Profesor.findAll({
      order: [["id", "DESC"]],
    });

    res.json(profesores);
  } catch (error) {
    console.error("Error al obtener profesores:", error.message);

    res.status(500).json({
      ok: false,
      mensaje: "Error al obtener profesores",
    });
  }
};

export const crearProfesor = async (req, res) => {
  try {
    const {
      nombre,
      rut,
      email,
      telefono,
      especialidad,
    } = req.body;

    const profesor = await Profesor.create({
      nombre,
      rut,
      email,
      telefono,
      especialidad,
    });

    res.status(201).json(profesor);
  } catch (error) {
    console.error("Error al crear profesor:", error.message);

    res.status(400).json({
      ok: false,
      mensaje: "No se pudo crear el profesor",
      error: error.message,
    });
  }
};

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

    await profesor.update(req.body);

    res.json(profesor);
  } catch (error) {
    console.error("Error al actualizar profesor:", error.message);

    res.status(400).json({
      ok: false,
      mensaje: "No se pudo actualizar el profesor",
      error: error.message,
    });
  }
};

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

    res.json({
      ok: true,
      mensaje: "Profesor eliminado correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar profesor:", error.message);

    res.status(500).json({
      ok: false,
      mensaje: "No se pudo eliminar el profesor",
    });
  }
};