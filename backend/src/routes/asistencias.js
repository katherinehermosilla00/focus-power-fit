import express from "express";
import {
  verificarToken,
  verificarRol,
} from "../authMiddleware.js";

import {
  obtenerAsistencias,
  crearAsistencia,
  actualizarAsistencia,
  eliminarAsistencia,
} from "../controllers/asistenciaController.js";

const router = express.Router();

router.use(verificarToken, verificarRol("admin"));

router.get("/", obtenerAsistencias);
router.post("/", crearAsistencia);
router.put("/:id", actualizarAsistencia);
router.delete("/:id", eliminarAsistencia);

export default router;