import express from "express";

import {
  obtenerRecordatorios,
  crearRecordatorio,
  actualizarRecordatorio,
  eliminarRecordatorio,
} from "../controllers/recordatorioController.js";

const router = express.Router();

router.get("/", obtenerRecordatorios);
router.post("/", crearRecordatorio);
router.put("/:id", actualizarRecordatorio);
router.delete("/:id", eliminarRecordatorio);

export default router;