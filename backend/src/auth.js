import express from "express";
import { loginUsuario } from "./authController.js";

const router = express.Router();

router.post("/login", loginUsuario);

export default router;

