import express from "express";

import {
  obtenerHorarios,
  crearHorario,
  actualizarHorario,
  eliminarHorario,
} from "../controllers/horarioController.js";

const router = express.Router();

router.get("/", obtenerHorarios);
router.post("/", crearHorario);
router.put("/:id", actualizarHorario);
router.delete("/:id", eliminarHorario);

export default router;