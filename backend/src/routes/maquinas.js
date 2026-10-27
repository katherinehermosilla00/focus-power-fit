
import express from "express";

import {
  verificarToken,
  verificarRol,
} from "../authMiddleware.js";

import {
  obtenerMaquinas,
  obtenerMaquinaPorId,
  crearMaquina,
  actualizarMaquina,
  eliminarMaquina,
} from "../controllers/maquinaController.js";

const router = express.Router();

// Todas las rutas requieren administrador.
router.use(verificarToken, verificarRol("admin"));

// Consultar máquinas y aplicar filtros.
router.get("/", obtenerMaquinas);

// Consultar una máquina por su ID.
router.get("/:id", obtenerMaquinaPorId);

// Registrar una máquina.
router.post("/", crearMaquina);

// Actualizar una máquina.
router.put("/:id", actualizarMaquina);

// Eliminar una máquina.
router.delete("/:id", eliminarMaquina);

export default router;
