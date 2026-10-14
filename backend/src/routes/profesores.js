import express from "express";
import { verificarToken, verificarRol } from "../authMiddleware.js";

import {
  obtenerProfesoresPublicos,
  obtenerProfesores,
  crearProfesor,
  actualizarProfesor,
  eliminarProfesor,
} from "../controllers/profesorController.js";

const router = express.Router();

router.get("/publicos", obtenerProfesoresPublicos);

router.use(verificarToken, verificarRol("admin"));

router.get("/", obtenerProfesores);
router.post("/", crearProfesor);
router.put("/:id", actualizarProfesor);
router.delete("/:id", eliminarProfesor);

export default router;