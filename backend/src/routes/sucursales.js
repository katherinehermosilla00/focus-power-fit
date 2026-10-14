import express from "express";
import { verificarToken, verificarRol } from "../authMiddleware.js";

import {
  obtenerSucursales,
  obtenerSucursalesPublicas,
  crearSucursal,
  actualizarSucursal,
  eliminarSucursal,
} from "../controllers/sucursalController.js";

const router = express.Router();

// Consulta publica: solo sucursales activas
router.get("/", obtenerSucursalesPublicas);

// Las siguientes rutas requieren administrador
router.use(verificarToken, verificarRol("admin"));

// Consulta administrativa: todas las sucursales
router.get("/admin", obtenerSucursales);

// Administracion de sucursales
router.post("/", crearSucursal);
router.put("/:id", actualizarSucursal);
router.delete("/:id", eliminarSucursal);

export default router;