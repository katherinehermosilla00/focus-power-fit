
import jwt from "jsonwebtoken";
import Usuario from "./models/Usuario.js";

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

    decoded = jwt.verify(token, process.env.JWT_SECRET);

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

    // Cuenta desactivada.
    if (usuario.estado !== "activo") {
      return res.status(403).json({
        ok: false,
        mensaje: "Usuario inactivo",
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
        if (
          res.statusCode >= 200 &&
          res.statusCode < 400
        ) {
          console.log(
            `[ADMIN] ${req.usuario.email} realizó ${req.method} ${req.originalUrl} (${res.statusCode})`
          );
        }
      });
    }

    return next();
  };
};
