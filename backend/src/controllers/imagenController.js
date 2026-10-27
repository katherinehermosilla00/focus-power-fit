
import fs from "node:fs/promises";
import path from "node:path";
import { Op } from "sequelize";

import Imagen from "../models/imagen.js";
import Profesor from "../models/profesor.js";
import Sucursal from "../models/sucursal.js";
import Maquina from "../models/maquina.js";

// ==========================================
// CONFIGURACIÓN
// ==========================================

const carpetaImagenes = path.resolve(
  process.cwd(),
  "uploads",
  "imagenes"
);

const categoriasPermitidas = [
  "profesor",
  "sucursal",
  "maquina",
  "sitio",
];

const tiposPermitidos = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const camposPublicos = [
  "id",
  "categoria",
  "referenciaId",
  "mostrarPublicamente",
  "orden",
  "createdAt",
  "updatedAt",
];

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

const obtenerId = (valor) => {
  const numero = Number(valor);

  return Number.isSafeInteger(numero) && numero > 0
    ? numero
    : null;
};

const convertirBooleano = (valor) => {
  if (valor === true || valor === "true" || valor === 1) {
    return true;
  }

  if (valor === false || valor === "false" || valor === 0) {
    return false;
  }

  return null;
};

const rutaSegura = (nombreArchivo) => {
  if (
    typeof nombreArchivo !== "string" ||
    path.basename(nombreArchivo) !== nombreArchivo ||
    !/^imagen-[a-f0-9-]+\.(jpg|png|webp)$/.test(nombreArchivo)
  ) {
    return null;
  }

  return path.join(carpetaImagenes, nombreArchivo);
};

const borrarArchivo = async (nombreArchivo) => {
  const ruta = rutaSegura(nombreArchivo);

  if (!ruta) return;

  try {
    await fs.unlink(ruta);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Error al borrar imagen:", error);
    }
  }
};

const validarReferencia = async (categoria, referenciaId) => {
  if (categoria === "sitio") {
    return referenciaId === null;
  }

  if (!referenciaId) return false;

  const modelos = {
    profesor: Profesor,
    sucursal: Sucursal,
    maquina: Maquina,
  };

  const modelo = modelos[categoria];

  if (!modelo) return false;

  const registro = await modelo.findByPk(referenciaId);

  return Boolean(registro);
};

// Validación de la firma real del archivo.
const detectarTipo = (buffer) => {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    )
  ) {
    return "image/png";
  }

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
};

const responderError = (res, error) => {
  console.error("Error en gestión de imágenes:", error);

  return res.status(500).json({
    ok: false,
    mensaje: "Ocurrió un error al gestionar las imágenes.",
  });
};

// ==========================================
// LISTAR IMÁGENES - ADMIN
// ==========================================

export const obtenerImagenes = async (req, res) => {
  try {
    const { categoria, referenciaId } = req.query;
    const where = {};

    if (categoria) {
      if (!categoriasPermitidas.includes(categoria)) {
        return res.status(400).json({
          ok: false,
          mensaje: "Categoría no válida.",
        });
      }

      where.categoria = categoria;
    }

    if (referenciaId !== undefined) {
      const id = obtenerId(referenciaId);

      if (!id) {
        return res.status(400).json({
          ok: false,
          mensaje: "Referencia no válida.",
        });
      }

      where.referenciaId = id;
    }

    const imagenes = await Imagen.findAll({
      where,
      order: [
        ["categoria", "ASC"],
        ["orden", "ASC"],
        ["id", "DESC"],
      ],
    });

    return res.json(imagenes);
  } catch (error) {
    return responderError(res, error);
  }
};

// ==========================================
// SUBIR IMAGEN - ADMIN
// ==========================================

export const subirImagen = async (req, res) => {
  const nombreArchivo = req.file?.filename;

  try {
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        mensaje: "Debes seleccionar una imagen.",
      });
    }

    const { categoria, referenciaId, orden } = req.body;

    if (!categoriasPermitidas.includes(categoria)) {
      await borrarArchivo(nombreArchivo);

      return res.status(400).json({
        ok: false,
        mensaje: "Categoría no válida.",
      });
    }

    const idReferencia =
      categoria === "sitio"
        ? null
        : obtenerId(referenciaId);

    if (!(await validarReferencia(categoria, idReferencia))) {
      await borrarArchivo(nombreArchivo);

      return res.status(400).json({
        ok: false,
        mensaje: "El registro asociado no existe.",
      });
    }

    const ruta = rutaSegura(nombreArchivo);

    if (!ruta) {
      await borrarArchivo(nombreArchivo);

      return res.status(400).json({
        ok: false,
        mensaje: "Nombre de archivo no válido.",
      });
    }

    const contenido = await fs.readFile(ruta);
    const tipoReal = detectarTipo(contenido);

    if (
      !tipoReal ||
      !tiposPermitidos[tipoReal] ||
      tipoReal !== req.file.mimetype ||
      path.extname(nombreArchivo).toLowerCase() !==
        tiposPermitidos[tipoReal]
    ) {
      await borrarArchivo(nombreArchivo);

      return res.status(400).json({
        ok: false,
        mensaje: "El archivo no es una imagen válida.",
      });
    }

    const ordenNumero = Number(orden ?? 0);

    if (
      !Number.isSafeInteger(ordenNumero) ||
      ordenNumero < 0
    ) {
      await borrarArchivo(nombreArchivo);

      return res.status(400).json({
        ok: false,
        mensaje: "El orden debe ser un número positivo o cero.",
      });
    }

    const imagen = await Imagen.create({
      categoria,
      referenciaId: idReferencia,
      nombreArchivo,
      rutaArchivo: path.join(
        "uploads",
        "imagenes",
        nombreArchivo
      ),
      nombreOriginal: req.file.originalname,
      mostrarPublicamente: false,
      orden: ordenNumero,
    });

    return res.status(201).json({
      ok: true,
      mensaje: "Imagen subida correctamente.",
      imagen,
    });
  } catch (error) {
    if (nombreArchivo) {
      await borrarArchivo(nombreArchivo);
    }

    return responderError(res, error);
  }
};

// ==========================================
// ACTUALIZAR VISIBILIDAD - ADMIN
// ==========================================

export const actualizarVisibilidadImagen = async (req, res) => {
  try {
    const id = obtenerId(req.params.id);
    const mostrar = convertirBooleano(
      req.body.mostrarPublicamente
    );

    if (!id || mostrar === null) {
      return res.status(400).json({
        ok: false,
        mensaje: "Datos de visibilidad no válidos.",
      });
    }

    const imagen = await Imagen.findByPk(id);

    if (!imagen) {
      return res.status(404).json({
        ok: false,
        mensaje: "Imagen no encontrada.",
      });
    }

    // Las fotografías de máquinas nunca son públicas.
    if (imagen.categoria === "maquina" && mostrar) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "Las fotografías de máquinas son exclusivas para administradores.",
      });
    }

    await imagen.update({
      mostrarPublicamente: mostrar,
    });

    return res.json({
      ok: true,
      mensaje: mostrar
        ? "Imagen activada correctamente."
        : "Imagen desactivada correctamente.",
      imagen,
    });
  } catch (error) {
    return responderError(res, error);
  }
};

// ==========================================
// ACTUALIZAR ORDEN - ADMIN
// ==========================================

export const actualizarOrdenImagen = async (req, res) => {
  try {
    const id = obtenerId(req.params.id);
    const orden = Number(req.body.orden);

    if (
      !id ||
      !Number.isSafeInteger(orden) ||
      orden < 0
    ) {
      return res.status(400).json({
        ok: false,
        mensaje: "Orden no válido.",
      });
    }

    const imagen = await Imagen.findByPk(id);

    if (!imagen) {
      return res.status(404).json({
        ok: false,
        mensaje: "Imagen no encontrada.",
      });
    }

    await imagen.update({ orden });

    return res.json({
      ok: true,
      mensaje: "Orden actualizado.",
      imagen,
    });
  } catch (error) {
    return responderError(res, error);
  }
};

// ==========================================
// ELIMINAR IMAGEN - ADMIN
// ==========================================

export const eliminarImagen = async (req, res) => {
  try {
    const id = obtenerId(req.params.id);

    if (!id) {
      return res.status(400).json({
        ok: false,
        mensaje: "ID de imagen no válido.",
      });
    }

    const imagen = await Imagen.findByPk(id);

    if (!imagen) {
      return res.status(404).json({
        ok: false,
        mensaje: "Imagen no encontrada.",
      });
    }

    const nombreArchivo = imagen.nombreArchivo;

    await imagen.destroy();
    await borrarArchivo(nombreArchivo);

    return res.json({
      ok: true,
      mensaje: "Imagen eliminada correctamente.",
    });
  } catch (error) {
    return responderError(res, error);
  }
};

// ==========================================
// LISTAR IMÁGENES VISIBLES - PÚBLICO
// ==========================================

export const obtenerImagenesPublicas = async (req, res) => {
  try {
    const { categoria, referenciaId } = req.query;

    if (
      categoria &&
      !categoriasPermitidas.includes(categoria)
    ) {
      return res.status(400).json({
        ok: false,
        mensaje: "Categoría no válida.",
      });
    }

    // Las fotografías de máquinas no son públicas.
    if (categoria === "maquina") {
      return res.json([]);
    }

    const where = {
      mostrarPublicamente: true,
      categoria: categoria || {
        [Op.ne]: "maquina",
      },
    };

    if (referenciaId !== undefined) {
      const id = obtenerId(referenciaId);

      if (!id) {
        return res.status(400).json({
          ok: false,
          mensaje: "Referencia no válida.",
        });
      }

      where.referenciaId = id;
    }

    const imagenes = await Imagen.findAll({
      attributes: camposPublicos,
      where,
      order: [
        ["orden", "ASC"],
        ["id", "DESC"],
      ],
    });

    // Excluir fotografías de profesores inactivos.
    const idsProfesores = imagenes
      .filter(
        (imagen) =>
          imagen.categoria === "profesor" &&
          imagen.referenciaId !== null
      )
      .map((imagen) => imagen.referenciaId);

    let profesoresActivos = new Set();

    if (idsProfesores.length > 0) {
      const profesores = await Profesor.findAll({
        attributes: ["id"],
        where: {
          id: { [Op.in]: idsProfesores },
          estado: "Activo",
        },
      });

      profesoresActivos = new Set(
        profesores.map((profesor) => profesor.id)
      );
    }

    const resultado = imagenes.filter(
      (imagen) =>
        imagen.categoria !== "profesor" ||
        profesoresActivos.has(imagen.referenciaId)
    );

    return res.json(resultado);
  } catch (error) {
    return responderError(res, error);
  }
};

// ==========================================
// ENTREGAR IMAGEN PÚBLICA
// ==========================================

export const obtenerArchivoImagen = async (req, res) => {
  try {
    const id = obtenerId(req.params.id);

    if (!id) {
      return res.sendStatus(404);
    }

    const imagen = await Imagen.findByPk(id);

    if (
      !imagen ||
      !imagen.mostrarPublicamente ||
      imagen.categoria === "maquina"
    ) {
      return res.sendStatus(404);
    }

    if (imagen.categoria === "profesor") {
      const profesor = await Profesor.findByPk(
        imagen.referenciaId
      );

      if (!profesor || profesor.estado !== "Activo") {
        return res.sendStatus(404);
      }
    }

    const ruta = rutaSegura(imagen.nombreArchivo);

    if (!ruta) {
      return res.sendStatus(404);
    }

    const extension = path.extname(ruta).toLowerCase();

    const contentTypes = {
      ".jpg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
    };

    const contentType = contentTypes[extension];

    if (!contentType) {
      return res.sendStatus(404);
    }

    res.set({
      "Content-Type": contentType,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });

    return res.sendFile(ruta, (error) => {
      if (error && !res.headersSent) {
        res.sendStatus(error.statusCode || 404);
      }
    });
  } catch (error) {
    return responderError(res, error);
  }
};

// ==========================================
// ENTREGAR IMAGEN PRIVADA - ADMINISTRADOR
// ==========================================

export const obtenerArchivoImagenAdmin = async (req, res) => {
  try {
    const id = obtenerId(req.params.id);

    if (!id) {
      return res.sendStatus(404);
    }

    const imagen = await Imagen.findByPk(id);

    if (!imagen) {
      return res.sendStatus(404);
    }

    const ruta = rutaSegura(imagen.nombreArchivo);

    if (!ruta) {
      return res.sendStatus(404);
    }

    const extension = path.extname(ruta).toLowerCase();

    const contentTypes = {
      ".jpg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
    };

    const contentType = contentTypes[extension];

    if (!contentType) {
      return res.sendStatus(404);
    }

    res.set({
      "Content-Type": contentType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });

    return res.sendFile(ruta, (error) => {
      if (error && !res.headersSent) {
        res.sendStatus(error.statusCode || 404);
      }
    });
  } catch (error) {
    return responderError(res, error);
  }
};
