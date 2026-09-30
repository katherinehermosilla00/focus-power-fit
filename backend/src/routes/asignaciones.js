import express from "express";
import {
  verificarToken,
  verificarRol,
} from "../authMiddleware.js";

import {
  obtenerAsignaciones,
  crearAsignacion,
  actualizarAsignacion,
  eliminarAsignacion,
} from "../controllers/asignacionController.js";

const router = express.Router();

router.use(verificarToken, verificarRol("admin"));

router.get("/", obtenerAsignaciones);
router.post("/", crearAsignacion);
router.put("/:id", actualizarAsignacion);
router.delete("/:id", eliminarAsignacion);

export default router;