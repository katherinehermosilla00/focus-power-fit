import express from "express";
import { rateLimit } from "express-rate-limit";
import {
  loginUsuario,
  registrarUsuario,
  restablecerPassword,
  solicitarRecuperacion,
  verificarRegistro,
} from "./authController.js";

const router = express.Router();

// Límite por IP para los puntos de entrada públicos de la cuenta.
// Con varias instancias del backend se debe usar un almacenamiento compartido.
const crearLimite = (limit, mensaje) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { ok: false, mensaje },
  });

const limiteLogin = crearLimite(
  10,
  "Demasiados intentos de inicio de sesión. Intenta nuevamente en 15 minutos."
);
const limiteRegistro = crearLimite(
  10,
  "Demasiadas solicitudes de registro. Intenta nuevamente en 15 minutos."
);
const limiteVerificacion = crearLimite(
  20,
  "Demasiados intentos de verificación. Intenta nuevamente en 15 minutos."
);
const limiteRecuperacion = crearLimite(
  10,
  "Demasiadas solicitudes de recuperación. Intenta nuevamente en 15 minutos."
);

router.post("/login", limiteLogin, loginUsuario);
router.post("/register", limiteRegistro, registrarUsuario);
router.post("/register/verify", limiteVerificacion, verificarRegistro);
router.post("/password/forgot", limiteRecuperacion, solicitarRecuperacion);
router.post("/password/reset", limiteVerificacion, restablecerPassword);

export default router;
