import Profesor from "../models/profesor.js";
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

export const obtenerProfesores = async (
  req,
  res
) => {
  try {
    const profesores =
      await Profesor.findAll({
        include: includeSucursal,
        order: [["id", "DESC"]],
      });

    res.json(profesores);
  } catch (error) {
    console.error(
      "Error al obtener profesores:",
      error.message
    );

    res.status(500).json({
      ok: false,
      mensaje:
        "Error al obtener profesores",
    });
  }
};

export const crearProfesor = async (
  req,
  res
) => {
  try {
    const {
      nombre,
      rut,
      email,
      telefono,
      especialidad,
      sucursalId,
    } = req.body;

    if (!nombre) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "El nombre es obligatorio",
      });
    }

    if (!rut) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "El RUT es obligatorio",
      });
    }

    if (!email) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "El correo es obligatorio",
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
      await Sucursal.findByPk(
        sucursalId
      );

    if (!sucursal) {
      return res.status(404).json({
        ok: false,
        mensaje:
          "Sucursal no encontrada",
      });
    }

    const profesor =
      await Profesor.create({
        nombre,
        rut,
        email,
        telefono:
          telefono || null,
        especialidad:
          especialidad || null,
        sucursalId,
      });

    const profesorCreado =
      await Profesor.findByPk(
        profesor.id,
        {
          include:
            includeSucursal,
        }
      );

    res.status(201).json({
      ok: true,
      mensaje:
        "Profesor creado correctamente",
      profesor:
        profesorCreado,
    });
  } catch (error) {
    console.error(
      "Error al crear profesor:",
      error.message
    );

    res.status(400).json({
      ok: false,
      mensaje:
        "No se pudo crear el profesor",
      error:
        error.message,
    });
  }
};

export const actualizarProfesor = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const profesor =
      await Profesor.findByPk(id);

    if (!profesor) {
      return res.status(404).json({
        ok: false,
        mensaje:
          "Profesor no encontrado",
      });
    }

    if (
      req.body.sucursalId !==
        undefined &&
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

    await profesor.update(
      req.body
    );

    const profesorActualizado =
      await Profesor.findByPk(
        id,
        {
          include:
            includeSucursal,
        }
      );

    res.json({
      ok: true,
      mensaje:
        "Profesor actualizado correctamente",
      profesor:
        profesorActualizado,
    });
  } catch (error) {
    console.error(
      "Error al actualizar profesor:",
      error.message
    );

    res.status(400).json({
      ok: false,
      mensaje:
        "No se pudo actualizar el profesor",
      error:
        error.message,
    });
  }
};

export const eliminarProfesor = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const profesor =
      await Profesor.findByPk(id);

    if (!profesor) {
      return res.status(404).json({
        ok: false,
        mensaje:
          "Profesor no encontrado",
      });
    }

    await profesor.destroy();

    res.json({
      ok: true,
      mensaje:
        "Profesor eliminado correctamente",
    });
  } catch (error) {
    console.error(
      "Error al eliminar profesor:",
      error.message
    );

    res.status(500).json({
      ok: false,
      mensaje:
        "No se pudo eliminar el profesor",
    });
  }
};