import Horario from "../models/horario.js";
import Profesor from "../models/profesor.js";

export const obtenerHorarios = async (req, res) => {
  try {
    const horarios = await Horario.findAll({
      include: [
        {
          model: Profesor,
          as: "profesor",
          attributes: [
            "id",
            "nombre",
            "especialidad",
          ],
        },
      ],
      order: [
        ["diaSemana", "ASC"],
        ["horaInicio", "ASC"],
      ],
    });

    res.json(horarios);
  } catch (error) {
    console.error(
      "Error al obtener horarios:",
      error.message
    );

    res.status(500).json({
      ok: false,
      mensaje: "Error al obtener horarios",
    });
  }
};

export const crearHorario = async (req, res) => {
  try {
    const {
      profesorId,
      diaSemana,
      horaInicio,
      horaFin,
      modalidad,
      cupos,
    } = req.body;

    const profesor =
      await Profesor.findByPk(profesorId);

    if (!profesor) {
      return res.status(404).json({
        ok: false,
        mensaje: "Profesor no encontrado",
      });
    }

    if (horaInicio >= horaFin) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "La hora de inicio debe ser anterior a la hora de término",
      });
    }

    const horario = await Horario.create({
      profesorId,
      diaSemana,
      horaInicio,
      horaFin,
      modalidad,
      cupos:
        modalidad === "Individual"
          ? 1
          : cupos,
    });

    res.status(201).json(horario);
  } catch (error) {
    console.error(
      "Error al crear horario:",
      error.message
    );

    res.status(400).json({
      ok: false,
      mensaje: "No se pudo crear el horario",
      error: error.message,
    });
  }
};

export const actualizarHorario = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const horario =
      await Horario.findByPk(id);

    if (!horario) {
      return res.status(404).json({
        ok: false,
        mensaje: "Horario no encontrado",
      });
    }

    const datos = {
      ...req.body,
    };

    if (
      datos.modalidad === "Individual"
    ) {
      datos.cupos = 1;
    }

    if (
      datos.horaInicio &&
      datos.horaFin &&
      datos.horaInicio >= datos.horaFin
    ) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "La hora de inicio debe ser anterior a la hora de término",
      });
    }

    await horario.update(datos);

    res.json(horario);
  } catch (error) {
    console.error(
      "Error al actualizar horario:",
      error.message
    );

    res.status(400).json({
      ok: false,
      mensaje:
        "No se pudo actualizar el horario",
      error: error.message,
    });
  }
};

export const eliminarHorario = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const horario =
      await Horario.findByPk(id);

    if (!horario) {
      return res.status(404).json({
        ok: false,
        mensaje: "Horario no encontrado",
      });
    }

    await horario.destroy();

    res.json({
      ok: true,
      mensaje:
        "Horario eliminado correctamente",
    });
  } catch (error) {
    console.error(
      "Error al eliminar horario:",
      error.message
    );

    res.status(500).json({
      ok: false,
      mensaje:
        "No se pudo eliminar el horario",
    });
  }
};