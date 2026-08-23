import express from "express";

import {
  obtenerPlanes,
  crearPlan,
  actualizarPlan,
  eliminarPlan,
} from "../controllers/planController.js";

const router = express.Router();

router.get("/", obtenerPlanes);
router.post("/", crearPlan);
router.put("/:id", actualizarPlan);
router.delete("/:id", eliminarPlan);

export default router;