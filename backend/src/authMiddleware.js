
import jwt from "jsonwebtoken";
import Usuario from "./models/Usuario.js";
import { registrarEvento } from "./utils/auditoria.js";
import { huellaPassword } from "./utils/sesion.js";

// ==========================================
// VERIFICAR TOKEN Y ESTADO DEL USUARIO
// ==========================================

export const verificarToken = async (req, res, next) => {
  let decoded;

  // ========================================
  // 1. VALIDAR TOKEN JWT
  // ========================================

  try {
    const authHeader = req.headers.authorization;

    if (
      typeof authHeader !== "string" ||
      !authHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        ok: false,
        mensaje: "Token no proporcionado",
      });
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        ok: false,
        mensaje: "Token no proporcionado",
      });
    }

    decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });

    if (
      !decoded ||
      !Number.isSafeInteger(decoded.id) ||
      decoded.id <= 0
    ) {
      return res.status(401).json({
        ok: false,
        mensaje: "Token inválido o expirado",
      });
    }
  } catch {
    return res.status(401).json({
      ok: false,
      mensaje: "Token inválido o expirado",
    });
  }

  // ========================================
  // 2. CONSULTAR USUARIO EN BASE DE DATOS
  // ========================================

  try {
    const usuario = await Usuario.findByPk(decoded.id);

    // Usuario eliminado o inexistente.
    if (!usuario) {
      return res.status(401).json({
        ok: false,
        mensaje: "Usuario no autorizado",
      });
    }

    // Cuenta desactivada: 401 y no 403, porque la sesión deja de valer y el
    // frontend debe volver al inicio de sesión. El login también la rechaza.
    if (usuario.estado !== "activo") {
      return res.status(401).json({
        ok: false,
        mensaje: "Usuario inactivo",
      });
    }

    // La contraseña cambió después de emitir el token: la sesión ya no vale.
    // Los tokens emitidos antes de esta medida no traen la huella y
    // expiran solos, según JWT_EXPIRES_IN.
    if (
      decoded.sv !== undefined &&
      decoded.sv !== huellaPassword(usuario.passwordHash)
    ) {
      return res.status(401).json({
        ok: false,
        mensaje: "Token inválido o expirado",
      });
    }

    // ======================================
    // 3. UTILIZAR DATOS ACTUALES
    // ======================================

    req.usuario = {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
    };

    return next();
  } catch (error) {
    console.error(
      "Error al consultar usuario autenticado:",
      error.message
    );

    return res.status(500).json({
      ok: false,
      mensaje: "Error al validar la sesión",
    });
  }
};

// ==========================================
// VERIFICAR PERMISOS POR ROL
// ==========================================

export const verificarRol = (...rolesPermitidos) => {
  return (req, res, next) => {
    // ======================================
    // 1. COMPROBAR AUTENTICACIÓN
    // ======================================

    if (!req.usuario) {
      return res.status(401).json({
        ok: false,
        mensaje: "No autenticado",
      });
    }

    // ======================================
    // 2. COMPROBAR ROL AUTORIZADO
    // ======================================

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      registrarEvento("acceso_denegado", {
        usuarioId: req.usuario.id,
        rol: req.usuario.rol,
        metodo: req.method,
        ruta: req.originalUrl,
      });

      return res.status(403).json({
        ok: false,
        mensaje: "No tienes permisos para esta acción",
      });
    }

    // ======================================
    // 3. REGISTRAR ACCIONES ADMINISTRATIVAS
    // ======================================

    if (req.usuario.rol === "admin") {
      res.on("finish", () => {
        registrarEvento("accion_admin", {
          usuarioId: req.usuario.id,
          metodo: req.method,
          ruta: req.originalUrl,
          estado: res.statusCode,
        });
      });
    }

    return next();
  };
};
