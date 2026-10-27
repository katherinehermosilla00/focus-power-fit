
import express from "express";

import {
  verificarToken,
  verificarRol,
} from "../authMiddleware.js";

import uploadImagenes from "./uploadImagenes.js";

import {
  obtenerImagenes,
  subirImagen,
  actualizarVisibilidadImagen,
  actualizarOrdenImagen,
  eliminarImagen,
  obtenerImagenesPublicas,
  obtenerArchivoImagen,
  obtenerArchivoImagenAdmin,
} from "../controllers/imagenController.js";

const router = express.Router();

// ==========================================
// RUTAS PÚBLICAS
// ==========================================

// Solo devuelve imágenes públicas permitidas.
// Las imágenes de máquinas están excluidas
// desde el controlador.

router.get(
  "/publicas",
  obtenerImagenesPublicas
);

// Archivo público de profesores, sucursales
// y otras categorías autorizadas.

router.get(
  "/:id/archivo",
  obtenerArchivoImagen
);

// ==========================================
// PROTECCIÓN DE ADMINISTRADOR
// ==========================================

router.use(
  verificarToken,
  verificarRol("admin")
);

// ==========================================
// LISTAR IMÁGENES - ADMIN
// ==========================================

router.get(
  "/",
  obtenerImagenes
);

// ==========================================
// OBTENER ARCHIVO PRIVADO - ADMIN
// ==========================================

router.get(
  "/:id/archivo-admin",
  obtenerArchivoImagenAdmin
);

// ==========================================
// SUBIR IMAGEN - ADMIN
// ==========================================

router.post(
  "/",
  (req, res, next) => {
    uploadImagenes.single("imagen")(
      req,
      res,
      (error) => {
        if (error) {
          return res.status(400).json({
            ok: false,
            mensaje:
              error.code === "LIMIT_FILE_SIZE"
                ? "La imagen no puede superar los 5 MB."
                : error.message ||
                  "No se pudo subir la imagen.",
          });
        }

        next();
      }
    );
  },
  subirImagen
);

// ==========================================
// ACTUALIZAR VISIBILIDAD - ADMIN
// ==========================================

router.patch(
  "/:id/visibilidad",
  actualizarVisibilidadImagen
);

// ==========================================
// ACTUALIZAR ORDEN - ADMIN
// ==========================================

router.patch(
  "/:id/orden",
  actualizarOrdenImagen
);

// ==========================================
// ELIMINAR IMAGEN - ADMIN
// ==========================================

router.delete(
  "/:id",
  eliminarImagen
);

// IMPORTANTE:
// src/index.js importa este router por defecto.
export default router;
