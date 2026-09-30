import express from "express";
import {
	loginUsuario,
	registrarUsuario,
	verificarRegistro,
} from "./authController.js";

const router = express.Router();

router.post("/login", loginUsuario);
router.post("/register", registrarUsuario);
router.post("/register/verify", verificarRegistro);

export default router;