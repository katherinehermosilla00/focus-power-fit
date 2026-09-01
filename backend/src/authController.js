import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Usuario from "./models/Usuario.js";
import Cliente from "./models/Cliente.js";

export const registrarUsuario = async (req, res) => {
  try {
    const { nombre, email, password, rut, telefono } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({
        ok: false,
        mensaje: "Nombre, email y contraseña son obligatorios",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        ok: false,
        mensaje: "La contraseña debe tener al menos 6 caracteres",
      });
    }

    const usuarioExistente = await Usuario.findOne({
      where: { email },
    });

    if (usuarioExistente) {
      return res.status(409).json({
        ok: false,
        mensaje: "El email ya está registrado",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const usuario = await Usuario.create({
      nombre,
      email,
      passwordHash,
      rol: "cliente",
      estado: "activo",
    });

    await Cliente.create({
      nombre,
      email,
      rut: rut || null,
      telefono: telefono || null,
      plan: "Básico",
      estado: "Activo",
    });

    const token = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "8h",
      }
    );

    return res.status(201).json({
      ok: true,
      token,
      user: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    console.error("Error en registro:", error.message);

    return res.status(500).json({
      ok: false,
      mensaje: "Error al registrar usuario",
      error: error.message,
    });
  }
};

export const loginUsuario = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        mensaje: "Email y contraseña son obligatorios",
      });
    }

    const usuario = await Usuario.findOne({
      where: { email },
    });

    if (!usuario) {
      return res.status(401).json({
        ok: false,
        mensaje: "Credenciales inválidas",
      });
    }

    const passwordValida = await bcrypt.compare(password, usuario.passwordHash);

    if (!passwordValida) {
      return res.status(401).json({
        ok: false,
        mensaje: "Credenciales inválidas",
      });
    }

    if (usuario.estado !== "activo") {
      return res.status(403).json({
        ok: false,
        mensaje: "Usuario inactivo",
      });
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "8h",
      }
    );

    return res.status(200).json({
      ok: true,
      token,
      user: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    console.error("Error en login:", error.message);

    return res.status(500).json({
      ok: false,
      mensaje: "Error al iniciar sesión",
      error: error.message,
    });
  }
};