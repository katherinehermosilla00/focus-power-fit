import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";

const carpetaContratos = path.join(
  process.cwd(),
  "uploads",
  "contratos"
);

fs.mkdirSync(carpetaContratos, {
  recursive: true,
});

// La extensión se decide en el servidor; nunca se usa la del archivo recibido.
const extensiones = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, carpetaContratos);
  },

  filename: (req, file, cb) => {
    cb(null, `contrato-${randomUUID()}${extensiones[file.mimetype]}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (extensiones[file.mimetype]) {
    cb(null, true);
    return;
  }

  cb(
    Object.assign(
      new Error("Solo se permiten archivos PDF, JPG o PNG"),
      { status: 400, expuesto: true }
    ),
    false
  );
};

const uploadContrato = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
});

export default uploadContrato;
