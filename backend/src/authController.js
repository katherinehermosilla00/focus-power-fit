import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import sequelize from "./config/database.js";
import { enviarCorreo } from "./config/mailer.js";
import Usuario from "./models/Usuario.js";
import Cliente from "./models/Cliente.js";

const registrosPendientes = new Map();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NOMBRE_REGEX = /^[\p{L}][\p{L}\p{M}]*(?:[ '-][\p{L}\p{M}]+)*$/u;

const normalizarNombre = (valor) =>
  valor
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es-CL")
    .replace(/(^|[\s'-])(\p{L})/gu, (_, separador, letra) =>
      `${separador}${letra.toLocaleUpperCase("es-CL")}`
    );

const normalizarRut = (valor) => {
  const rut = valor.replace(/[.\-\s]/g, "").toUpperCase();

  if (!/^\d{7,8}[0-9K]$/.test(rut)) return null;

  const cuerpo = rut.slice(0, -1);
  const digitoIngresado = rut.slice(-1);
  let suma = 0;
  let factor = 2;

  for (let indice = cuerpo.length - 1; indice >= 0; indice -= 1) {
    suma += Number(cuerpo[indice]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }

  const resultado = 11 - (suma % 11);
  const digitoCalculado =
    resultado === 11 ? "0" : resultado === 10 ? "K" : String(resultado);

  if (digitoIngresado !== digitoCalculado) return null;

  return `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${digitoCalculado}`;
};

const hashCodigo = (codigo) =>
  createHash("sha256").update(codigo).digest("hex");

const crearTokenUsuario = (usuario) =>
  jwt.sign(
    { id: usuario.id, email: usuario.email, rol: usuario.rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
  );

export const registrarUsuario = async (req, res) => {
  try {
    const { nombre, apellidos, email, password, rut, telefono } = req.body;

    if (
      typeof nombre !== "string" ||
      typeof apellidos !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof rut !== "string" ||
      typeof telefono !== "string"
    ) {
      return res.status(400).json({
        ok: false,
        mensaje: "Completa todos los campos obligatorios",
      });
    }

    const nombreNormalizado = normalizarNombre(nombre);
    const apellidosNormalizados = normalizarNombre(apellidos);
    const nombreCompleto = `${nombreNormalizado} ${apellidosNormalizados}`;
    const emailNormalizado = email.trim().toLowerCase();
    const rutNormalizado = normalizarRut(rut);
    const telefonoNormalizado = telefono.replace(/\D/g, "");

    if (
      !NOMBRE_REGEX.test(nombreNormalizado) ||
      !NOMBRE_REGEX.test(apellidosNormalizados) ||
      Array.from(nombreCompleto).length > 120
    ) {
      return res.status(400).json({
        ok: false,
        mensaje: "Ingresa nombre y apellidos válidos (máximo 120 caracteres en total)",
      });
    }

    if (emailNormalizado.length > 150 || !EMAIL_REGEX.test(emailNormalizado)) {
      return res.status(400).json({
        ok: false,
        mensaje: "Ingresa un correo electrónico válido",
      });
    }

    if (password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      return res.status(400).json({
        ok: false,
        mensaje: "La contraseña requiere 8 caracteres, una mayúscula y un número",
      });
    }

    if (password.length > 128) {
      return res.status(400).json({
        ok: false,
        mensaje: "La contraseña no puede superar los 128 caracteres",
      });
    }

    if (!rutNormalizado) {
      return res.status(400).json({
        ok: false,
        mensaje: "El RUT no es válido; revisa sus dígitos y el verificador",
      });
    }

    if (!/^\d{9}$/.test(telefonoNormalizado)) {
      return res.status(400).json({
        ok: false,
        mensaje: "El teléfono debe contener exactamente 9 dígitos",
      });
    }

    const usuarioExistente = await Usuario.findOne({
      where: { email: emailNormalizado },
    });

    const clienteExistente = await Cliente.findOne({
      where: { email: emailNormalizado },
    });

    if (usuarioExistente || clienteExistente) {
      return res.status(409).json({
        ok: false,
        mensaje: "El email ya está registrado",
      });
    }

    const rutExistente = await Cliente.findOne({ where: { rut: rutNormalizado } });
    if (rutExistente) {
      return res.status(409).json({
        ok: false,
        mensaje: "El RUT ya está registrado",
      });
    }

    if (registrosPendientes.has(emailNormalizado)) {
      return res.status(429).json({
        ok: false,
        mensaje: "Ya enviamos un código a ese correo; revisa tu bandeja de entrada",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const codigo = String(randomInt(100000, 1000000));

    try {
      await enviarCorreo({
        to: emailNormalizado,
        subject: "Verifica tu correo - Focus Power Fit",
        html: `<p>Tu código de verificación es:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${codigo}</p><p>Este código vence en 10 minutos.</p>`,
      });
    } catch (error) {
      console.error("No se pudo enviar el código de registro:", error.message);
      return res.status(503).json({
        ok: false,
        mensaje: "No se pudo enviar el código al correo. Revisa la configuración del servicio de email.",
      });
    }

    registrosPendientes.set(emailNormalizado, {
      nombre: nombreCompleto,
      email: emailNormalizado,
      passwordHash,
      rut: rutNormalizado,
      telefono: telefonoNormalizado,
      codigoHash: hashCodigo(codigo),
      intentos: 0,
      vence: Date.now() + 10 * 60 * 1000,
    });

    return res.status(202).json({
      ok: true,
      mensaje: "Enviamos un código de verificación a tu correo",
    });
  } catch (error) {
    console.error("Error en registro:", error.message);

    return res.status(500).json({
      ok: false,
      mensaje: "Error al registrar usuario",
    });
  }
};

export const verificarRegistro = async (req, res) => {
  const email =
    typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const codigo = typeof req.body.codigo === "string" ? req.body.codigo : "";
  const pendiente = registrosPendientes.get(email);

  if (!pendiente) {
    return res.status(404).json({
      ok: false,
      mensaje: "No hay un registro pendiente para ese correo",
    });
  }

  if (Date.now() > pendiente.vence) {
    registrosPendientes.delete(email);
    return res.status(410).json({
      ok: false,
      mensaje: "El código venció; vuelve a solicitar el registro",
    });
  }

  if (pendiente.intentos >= 5) {
    registrosPendientes.delete(email);
    return res.status(429).json({
      ok: false,
      mensaje: "Se superó el máximo de intentos; vuelve a solicitar el registro",
    });
  }

  const codigoValido = /^\d{6}$/.test(codigo)
    ? timingSafeEqual(
        Buffer.from(pendiente.codigoHash, "hex"),
        Buffer.from(hashCodigo(codigo), "hex")
      )
    : false;

  if (!codigoValido) {
    pendiente.intentos += 1;
    return res.status(400).json({
      ok: false,
      mensaje: "El código de verificación es incorrecto",
    });
  }

  let transaction;
  try {
    transaction = await sequelize.transaction();
    const usuario = await Usuario.create(
      {
        nombre: pendiente.nombre,
        email: pendiente.email,
        passwordHash: pendiente.passwordHash,
        rol: "cliente",
        estado: "activo",
      },
      { transaction }
    );

    await Cliente.create(
      {
        nombre: pendiente.nombre,
        email: pendiente.email,
        rut: pendiente.rut,
        telefono: pendiente.telefono,
        plan: "Básico",
        estado: "Activo",
      },
      { transaction }
    );

    await transaction.commit();
    registrosPendientes.delete(email);

    return res.status(201).json({
      ok: true,
      token: crearTokenUsuario(usuario),
      user: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error("Error al verificar el registro:", error.message);
    return res.status(409).json({
      ok: false,
      mensaje: "No se pudo completar el registro; verifica si el correo o RUT ya están registrados",
    });
  }
};

export const loginUsuario = async (req, res) => {
  try {
    const { email, password } = req.body;
    const emailNormalizado = email?.trim().toLowerCase();

    if (!emailNormalizado || !password) {
      return res.status(400).json({
        ok: false,
        mensaje: "Email y contraseña son obligatorios",
      });
    }

    const usuario = await Usuario.findOne({
      where: { email: emailNormalizado },
    });

    if (!usuario) {
      return res.status(401).json({
        ok: false,
        codigo: "EMAIL_NO_REGISTRADO",
        mensaje: "Email no registrado.",
      });
    }

    const passwordValida = await bcrypt.compare(password, usuario.passwordHash);

    if (!passwordValida) {
      return res.status(401).json({
        ok: false,
        codigo: "CREDENCIALES_INVALIDAS",
        mensaje: "Correo o contraseña incorrectos.",
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