import express from "express";
import { verificarToken, verificarRol } from "../authMiddleware.js";

import {
  obtenerAgendaRecordatorios,
  enviarRecordatoriosClases,
  obtenerRecordatorios,
  crearRecordatorio,
  actualizarRecordatorio,
  eliminarRecordatorio,
} from "../controllers/recordatorioController.js";

const router = express.Router();

router.use(verificarToken, verificarRol("admin"));

router.get("/agenda", obtenerAgendaRecordatorios);
router.post("/enviar", enviarRecordatoriosClases);
router.get("/", obtenerRecordatorios);
router.post("/", crearRecordatorio);
router.put("/:id", actualizarRecordatorio);
router.delete("/:id", eliminarRecordatorio);

export default router;