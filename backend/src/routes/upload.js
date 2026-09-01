import multer from "multer";
import path from "path";
import fs from "fs";

const carpetaContratos = path.join(
  process.cwd(),
  "uploads",
  "contratos"
);

if (!fs.existsSync(carpetaContratos)) {
  fs.mkdirSync(carpetaContratos, {
    recursive: true,
  });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, carpetaContratos);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);

    const nombreArchivo = `contrato-${Date.now()}${extension}`;

    cb(null, nombreArchivo);
  },
});

const fileFilter = (req, file, cb) => {
  const tiposPermitidos = [
    "application/pdf",
    "image/jpeg",
    "image/png",
  ];

  if (tiposPermitidos.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Solo se permiten archivos PDF, JPG o PNG"),
      false
    );
  }
};

const uploadContrato = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

export default uploadContrato;