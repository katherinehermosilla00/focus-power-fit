import express from "express";
import uploadContrato from "./upload.js";

import {
  obtenerContratos,
  crearContrato,
  actualizarContrato,
  eliminarContrato,
} from "../controllers/contratoController.js";

const router = express.Router();

router.get("/", obtenerContratos);

router.post(
  "/",
  uploadContrato.single("archivo"),
  crearContrato
);

router.put("/:id", actualizarContrato);

router.delete("/:id", eliminarContrato);

export default router;