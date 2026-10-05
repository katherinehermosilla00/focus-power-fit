import express from "express";
import { verificarToken, verificarRol } from "../authMiddleware.js";

import {
  obtenerHorarios,
  crearHorario,
  actualizarHorario,
  eliminarHorario,
} from "../controllers/horarioController.js";

const router = express.Router();

router.use(verificarToken, verificarRol("admin"));

router.get("/", obtenerHorarios);
router.post("/", crearHorario);
router.put("/:id", actualizarHorario);
router.delete("/:id", eliminarHorario);

export default router;