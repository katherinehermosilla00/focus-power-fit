import express from "express";
import {
  verificarToken,
  verificarRol,
} from "../authMiddleware.js";

import {
  obtenerClientes,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
  obtenerMiDashboard,
  obtenerMiContrato,
} from "../controllers/clienteController.js";

const router = express.Router();

router.get(
  "/",
  verificarToken,
  verificarRol("admin"),
  obtenerClientes
);

router.get(
  "/mi-dashboard",
  verificarToken,
  verificarRol("cliente"),
  obtenerMiDashboard
);

router.get(
  "/mi-contrato",
  verificarToken,
  verificarRol("cliente"),
  obtenerMiContrato
);

router.post(
  "/",
  verificarToken,
  verificarRol("admin"),
  crearCliente
);

router.put(
  "/:id",
  verificarToken,
  verificarRol("admin"),
  actualizarCliente
);

router.delete(
  "/:id",
  verificarToken,
  verificarRol("admin"),
  eliminarCliente
);

export default router;