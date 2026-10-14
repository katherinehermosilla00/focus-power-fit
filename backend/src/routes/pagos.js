import express from "express";
import {
  verificarToken,
  verificarRol,
} from "../authMiddleware.js";

import {
  obtenerPagos,
  crearPago,
  actualizarPago,
  eliminarPago,
  obtenerUltimoPagoCliente,
} from "../controllers/pagoController.js";

const router = express.Router();

router.use(verificarToken, verificarRol("admin"));

router.get("/", obtenerPagos);

router.get(
  "/cliente/:clienteId/ultimo",
  obtenerUltimoPagoCliente
);

router.post("/", crearPago);
router.put("/:id", actualizarPago);
router.delete("/:id", eliminarPago);

export default router;