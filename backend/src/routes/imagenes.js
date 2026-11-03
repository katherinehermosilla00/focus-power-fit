
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

// Devuelve imágenes publicadas.
// También permite consultar promociones con:
// GET /api/imagenes/publicas?categoria=promo
// Las imágenes de máquinas están excluidas
// desde el controlador.

router.get(
  "/publicas",
  obtenerImagenesPublicas
);

// Permite visualizar archivos públicos,
// incluidas las promociones publicadas.
// GET /api/imagenes/:id/archivo

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

// Permite filtrar promociones con:
// GET /api/imagenes?categoria=promo

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

// Para subir una promoción:
// categoria = "promo"
// imagen = archivo seleccionado
// No necesita referenciaId.

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

// Permite publicar u ocultar promociones.

router.patch(
  "/:id/visibilidad",
  actualizarVisibilidadImagen
);

// ==========================================
// ACTUALIZAR ORDEN - ADMIN
// ==========================================

// Permite cambiar el orden de las promociones.

router.patch(
  "/:id/orden",
  actualizarOrdenImagen
);

// ==========================================
// ELIMINAR IMAGEN - ADMIN
// ==========================================

// Permite eliminar promociones y otras imágenes.

router.delete(
  "/:id",
  eliminarImagen
);

// IMPORTANTE:
// src/index.js importa este router por defecto.
export default router;
