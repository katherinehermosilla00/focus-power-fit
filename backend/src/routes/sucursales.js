import express from "express";

import {
  obtenerSucursales,
  crearSucursal,
  actualizarSucursal,
  eliminarSucursal,
} from "../controllers/sucursalController.js";

const router = express.Router();

router.get("/", obtenerSucursales);
router.post("/", crearSucursal);
router.put("/:id", actualizarSucursal);
router.delete("/:id", eliminarSucursal);

export default router;