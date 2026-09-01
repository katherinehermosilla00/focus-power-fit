import express from "express";
import { loginUsuario, registrarUsuario } from "./authController.js";

const router = express.Router();

router.post("/login", loginUsuario);
router.post("/register", registrarUsuario);

export default router;