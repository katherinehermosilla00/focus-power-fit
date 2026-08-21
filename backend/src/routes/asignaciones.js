import express from "express";

import {
  obtenerAsignaciones,
  crearAsignacion,
  actualizarAsignacion,
  eliminarAsignacion,
} from "../controllers/asignacionController.js";

const router = express.Router();

router.get("/", obtenerAsignaciones);
router.post("/", crearAsignacion);
router.put("/:id", actualizarAsignacion);
router.delete("/:id", eliminarAsignacion);

export default router;