
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";

// ==========================================
// CONFIGURACIÓN DE CARPETAS
// ==========================================

const carpetaImagenes = path.resolve(
  process.cwd(),
  "uploads",
  "imagenes"
);

// Crear la carpeta si todavía no existe.
fs.mkdirSync(carpetaImagenes, {
  recursive: true,
});

// ==========================================
// TIPOS DE IMÁGENES PERMITIDOS
// ==========================================

const extensiones = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

// ==========================================
// ALMACENAMIENTO
// ==========================================

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, carpetaImagenes);
  },

  filename: (req, file, callback) => {
    const extension = extensiones[file.mimetype];

    if (!extension) {
      return callback(
        new Error("Formato de imagen no permitido.")
      );
    }

    const nombre = `imagen-${randomUUID()}${extension}`;

    callback(null, nombre);
  },
});

// ==========================================
// FILTRO DE ARCHIVOS
// ==========================================

const fileFilter = (req, file, callback) => {
  if (!extensiones[file.mimetype]) {
    return callback(
      new Error(
        "Solo se permiten imágenes JPG, PNG y WebP."
      )
    );
  }

  callback(null, true);
};

// ==========================================
// CONFIGURACIÓN DE MULTER
// ==========================================

const uploadImagenes = multer({
  storage,

  fileFilter,

  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 5,
  },
});

export default uploadImagenes;
