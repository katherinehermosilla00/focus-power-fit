import express from "express";
import {
  verificarToken,
  verificarRol,
} from "../authMiddleware.js";

import {
  obtenerPlanes,
  crearPlan,
  actualizarPlan,
} from "../controllers/planController.js";

const router = express.Router();

router.use(verificarToken, verificarRol("admin"));

router.get("/", obtenerPlanes);
router.post("/", crearPlan);
router.put("/:id", actualizarPlan);

export default router;