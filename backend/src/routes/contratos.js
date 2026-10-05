import express from "express";
import uploadContrato from "./upload.js";
import { verificarToken, verificarRol } from "../authMiddleware.js";

import {
  obtenerContratos,
  obtenerArchivoContrato,
  crearContrato,
  actualizarContrato,
  eliminarContrato,
} from "../controllers/contratoController.js";

const router = express.Router();

router.get("/:id/archivo", verificarToken, obtenerArchivoContrato);

router.use(verificarToken, verificarRol("admin"));

router.get("/", obtenerContratos);

router.post(
  "/",
  uploadContrato.single("archivo"),
  crearContrato
);

router.put("/:id", actualizarContrato);

router.delete("/:id", eliminarContrato);

export default router;