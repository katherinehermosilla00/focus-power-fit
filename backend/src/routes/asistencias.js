import express from "express";

import {
  obtenerAsistencias,
  crearAsistencia,
  actualizarAsistencia,
  eliminarAsistencia,
} from "../controllers/asistenciaController.js";

const router = express.Router();

router.get("/", obtenerAsistencias);
router.post("/", crearAsistencia);
router.put("/:id", actualizarAsistencia);
router.delete("/:id", eliminarAsistencia);

export default router;