import express from "express";

import {
  obtenerProfesores,
  crearProfesor,
  actualizarProfesor,
  eliminarProfesor,
} from "../controllers/profesorController.js";

const router = express.Router();

router.get("/", obtenerProfesores);
router.post("/", crearProfesor);
router.put("/:id", actualizarProfesor);
router.delete("/:id", eliminarProfesor);

export default router;