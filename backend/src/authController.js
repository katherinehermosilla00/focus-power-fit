
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";

import sequelize from "./config/database.js";
import { enviarCorreo } from "./config/mailer.js";
import Usuario from "./models/Usuario.js";
import Cliente from "./models/cliente.js";
import { ocultarEmail, registrarEvento } from "./utils/auditoria.js";
import { huellaPassword } from "./utils/sesion.js";
import {
  buscarPorCorreo,
  emailValido,
  normalizarEmail,
  normalizarRut,
  validarPassword,
} from "./utils/validaciones.js";

// ==========================================
// CONFIGURACIÓN
// ==========================================

// Los códigos pendientes se guardan en memoria: se pierden al reiniciar el
// backend y no se comparten entre instancias. Es suficiente para una instancia.
const registrosPendientes = new Map();
const recuperacionesPendientes = new Map();
const ultimoCorreo = new Map();

const VIGENCIA_CODIGO_MS = 10 * 60 * 1000;
const ESPERA_ENTRE_CORREOS_MS = 60 * 1000;
const MAXIMO_INTENTOS = 5;

const NOMBRE_REGEX =
  /^[\p{L}][\p{L}\p{M}]*(?:[ '-][\p{L}\p{M}]+)*$/u;

// Las respuestas son iguales exista o no la cuenta, para no revelar
// a terceros quién es cliente del gimnasio.
const RESPUESTA_REGISTRO = {
  ok: true,
  mensaje:
    "Si los datos pueden registrarse, enviamos un código de verificación a",
};

const RESPUESTA_RECUPERACION = {
  ok: true,
  mensaje:
    "Si existe una cuenta activa con ese correo, enviamos un código de recuperación",
};

const RESPUESTA_CODIGO_INVALIDO = {
  ok: false,
  mensaje: "El código es incorrecto o venció; solicita uno nuevo",
};

const RESPUESTA_MESON = {
  ok: false,
  mensaje:
    "No se pudo completar el registro; acércate al mesón de tu sucursal",
};

// Hash real para comparar cuando el correo no existe y así evitar
// que el tiempo de respuesta revele si la cuenta existe.
const HASH_FICTICIO = bcrypt.hashSync("cuenta-inexistente", 10);

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

const normalizarNombre = (valor) =>
  valor
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es-CL")
    .replace(/(^|[\s'-])(\p{L})/gu, (_, separador, letra) =>
      `${separador}${letra.toLocaleUpperCase("es-CL")}`
    );

const hashCodigo = (codigo) =>
  createHash("sha256")
    .update(codigo)
    .digest("hex");

const generarCodigo = () => String(randomInt(100000, 1000000));

const codigoCoincide = (codigo, codigoHash) =>
  /^\d{6}$/.test(codigo)
    ? timingSafeEqual(
        Buffer.from(codigoHash, "hex"),
        Buffer.from(hashCodigo(codigo), "hex")
      )
    : false;

const obtenerVigente = (almacen, email) => {
  const pendiente = almacen.get(email);

  if (pendiente && Date.now() > pendiente.vence) {
    almacen.delete(email);
    return undefined;
  }

  return pendiente;
};

const limpiarVencidos = () => {
  const ahora = Date.now();

  for (const almacen of [registrosPendientes, recuperacionesPendientes]) {
    for (const [email, pendiente] of almacen) {
      if (ahora > pendiente.vence) almacen.delete(email);
    }
  }

  for (const [email, fecha] of ultimoCorreo) {
    if (ahora - fecha > ESPERA_ENTRE_CORREOS_MS) ultimoCorreo.delete(email);
  }
};

// Evita usar el sistema para saturar la bandeja de un tercero.
const puedeEnviarCorreo = (email) => {
  const anterior = ultimoCorreo.get(email);

  return !anterior || Date.now() - anterior >= ESPERA_ENTRE_CORREOS_MS;
};

const enviarCorreoLimitado = async (datos) => {
  await enviarCorreo(datos);
  ultimoCorreo.set(datos.to, Date.now());
};

// Envía sin esperar la respuesta del servidor de correo. Si la solicitud
// esperara el envío solo cuando la cuenta existe, el tiempo de respuesta
// revelaría qué correos tienen cuenta.
const enviarCorreoSinEsperar = (datos, contexto) => {
  ultimoCorreo.set(datos.to, Date.now());

  enviarCorreo(datos).catch((error) => {
    // Si falló, se permite pedirlo de nuevo sin esperar.
    ultimoCorreo.delete(datos.to);
    console.error(`${contexto}:`, error.message);
  });
};

const plantillaCodigo = (titulo, codigo) => `
  <p>${titulo}</p>
  <p style="font-size:24px;font-weight:bold;letter-spacing:4px">
    ${codigo}
  </p>
  <p>Este código vence en 10 minutos. Si no lo solicitaste, ignora este correo.</p>
`;

const crearTokenUsuario = (usuario) =>
  jwt.sign(
    {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      sv: huellaPassword(usuario.passwordHash),
    },
    process.env.JWT_SECRET,
    {
      algorithm: "HS256",
      expiresIn: process.env.JWT_EXPIRES_IN || "8h",
    }
  );

const respuestaSesion = (usuario) => ({
  ok: true,
  token: crearTokenUsuario(usuario),
  user: {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
  },
});

// Decide qué hacer con una solicitud de registro:
// - "nuevo": no existe ficha; se creará una.
// - "vincular": el gimnasio ya tiene la ficha; se le creará su cuenta.
// - "cuenta_existente": no se entrega código.
// - "revisar_mesón": el RUT no calza. Recibe el mismo correo que los demás, para
//   no delatar a quién pertenece ese RUT, y se rechaza al verificar.
const resolverRegistro = async (email, rut) => {
  const usuario = await buscarPorCorreo(Usuario, email);

  if (usuario) return { caso: "cuenta_existente" };

  // El RUT es opcional. Sin RUT no se busca por ese campo: encontraría fichas
  // ajenas que tampoco lo tienen. Quien vincula su ficha prueba ser el dueño
  // del correo con el código que recibe.
  const [clientePorEmail, clientePorRut] = await Promise.all([
    buscarPorCorreo(Cliente, email),
    rut ? Cliente.findOne({ where: { rut } }) : null,
  ]);

  const rutOtraFicha =
    clientePorRut && clientePorRut.id !== clientePorEmail?.id;

  const rutDistinto =
    rut &&
    clientePorEmail?.rut &&
    (normalizarRut(clientePorEmail.rut) ?? clientePorEmail.rut) !== rut;

  if (rutOtraFicha || rutDistinto) {
    return { caso: "revisar_mesón" };
  }

  return clientePorEmail
    ? { caso: "vincular", clienteId: clientePorEmail.id }
    : { caso: "nuevo", clienteId: null };
};

// ==========================================
// REGISTRAR USUARIO
// ==========================================

export const registrarUsuario = async (req, res) => {
  try {
    const {
      nombre,
      apellidos,
      email,
      password,
      rut,
      telefono,
      aceptaTerminos,
    } = req.body ?? {};

    if (
      typeof nombre !== "string" ||
      typeof apellidos !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      (rut !== undefined && rut !== null && typeof rut !== "string") ||
      typeof telefono !== "string"
    ) {
      return res.status(400).json({
        ok: false,
        mensaje: "Completa todos los campos obligatorios",
      });
    }

    const nombreNormalizado = normalizarNombre(nombre);
    const apellidosNormalizados = normalizarNombre(apellidos);
    const nombreCompleto =
      `${nombreNormalizado} ${apellidosNormalizados}`;
    const emailNormalizado = normalizarEmail(email);
    const rutIngresado = Boolean(rut?.trim());
    const rutNormalizado = rutIngresado ? normalizarRut(rut) : null;
    const telefonoNormalizado = telefono.replace(/\D/g, "");

    if (
      !NOMBRE_REGEX.test(nombreNormalizado) ||
      !NOMBRE_REGEX.test(apellidosNormalizados) ||
      Array.from(nombreCompleto).length > 120
    ) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "Ingresa nombre y apellidos válidos (máximo 120 caracteres en total)",
      });
    }

    if (!emailValido(emailNormalizado)) {
      return res.status(400).json({
        ok: false,
        mensaje: "Ingresa un correo electrónico válido",
      });
    }

    const errorPassword = validarPassword(password);

    if (errorPassword) {
      return res.status(400).json({
        ok: false,
        mensaje: errorPassword,
      });
    }

    if (rutIngresado && !rutNormalizado) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "El RUT no es válido; revisa sus dígitos y el verificador",
      });
    }

    if (!/^\d{9}$/.test(telefonoNormalizado)) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "El teléfono debe contener exactamente 9 dígitos",
      });
    }

    if (aceptaTerminos !== true) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "Debes aceptar los términos y el tratamiento de tus datos personales",
      });
    }

    limpiarVencidos();

    // Se calcula siempre para que el tiempo de respuesta sea similar en
    // todos los casos.
    const passwordHash = await bcrypt.hash(password, 10);

    const resolucion = await resolverRegistro(
      emailNormalizado,
      rutNormalizado
    );

    if (!puedeEnviarCorreo(emailNormalizado)) {
      return res.status(202).json(RESPUESTA_REGISTRO);
    }

    try {
      if (resolucion.caso === "cuenta_existente") {
        await enviarCorreoLimitado({
          to: emailNormalizado,
          subject: "Ya tienes una cuenta - Focus Power Fit",
          html: "<p>Este correo ya tiene una cuenta. Inicia sesión o usa la opción para recuperar tu contraseña.</p>",
        });
      } else {
        const codigo = generarCodigo();

        await enviarCorreoLimitado({
          to: emailNormalizado,
          subject: "Verifica tu correo - Focus Power Fit",
          html: plantillaCodigo("Tu código de verificación es:", codigo),
        });

        // Un registro nuevo reemplaza al anterior y deja sin efecto su código.
        registrosPendientes.set(emailNormalizado, {
          nombres: nombreNormalizado,
          apellidos: apellidosNormalizados,
          nombre: nombreCompleto,
          email: emailNormalizado,
          passwordHash,
          rut: rutNormalizado,
          telefono: telefonoNormalizado,
          clienteId: resolucion.clienteId,
          revisarMeson: resolucion.caso === "revisar_mesón",
          terminosAceptadosAt: new Date(),
          codigoHash: hashCodigo(codigo),
          intentos: 0,
          vence: Date.now() + VIGENCIA_CODIGO_MS,
        });
      }
    } catch (error) {
      console.error(
        "No se pudo enviar el correo de registro:",
        error.message
      );

      return res.status(503).json({
        ok: false,
        mensaje:
          "No se pudo enviar el correo. Inténtalo nuevamente más tarde.",
      });
    }

    return res.status(202).json(RESPUESTA_REGISTRO);
  } catch (error) {
    console.error("Error en registro:", error.message);

    return res.status(500).json({
      ok: false,
      mensaje: "Error al registrar usuario",
    });
  }
};

// ==========================================
// VERIFICAR REGISTRO
// ==========================================

export const verificarRegistro = async (req, res) => {
  const email = normalizarEmail(req.body?.email);
  const codigo =
    typeof req.body?.codigo === "string" ? req.body.codigo : "";
  const password =
    typeof req.body?.password === "string" ? req.body.password : "";

  const pendiente = obtenerVigente(registrosPendientes, email);

  if (!pendiente) {
    return res.status(400).json(RESPUESTA_CODIGO_INVALIDO);
  }

  // También se exige la contraseña: quien recibió el código no debe activar
  // una cuenta con una contraseña elegida por otra persona.
  const valido =
    codigoCoincide(codigo, pendiente.codigoHash) &&
    (await bcrypt.compare(password, pendiente.passwordHash));

  if (!valido) {
    pendiente.intentos += 1;

    if (pendiente.intentos >= MAXIMO_INTENTOS) {
      registrosPendientes.delete(email);

      return res.status(429).json({
        ok: false,
        mensaje:
          "Se superó el máximo de intentos; vuelve a solicitar el registro",
      });
    }

    return res.status(400).json(RESPUESTA_CODIGO_INVALIDO);
  }

  if (pendiente.revisarMeson) {
    registrosPendientes.delete(email);

    return res.status(409).json(RESPUESTA_MESON);
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
        terminosAceptadosAt: pendiente.terminosAceptadosAt,
      },
      { transaction }
    );

    if (pendiente.clienteId) {
      // Ficha cargada por el gimnasio: se conservan sus datos y solo se
      // completa lo que falte.
      const cliente = await Cliente.findByPk(pendiente.clienteId, {
        transaction,
      });

      if (!cliente) throw new Error("La ficha del cliente ya no existe");

      await cliente.update(
        {
          rut: cliente.rut ?? pendiente.rut,
          telefono: cliente.telefono ?? pendiente.telefono,
        },
        { transaction }
      );
    } else {
      await Cliente.create(
        {
          nombres: pendiente.nombres,
          apellidos: pendiente.apellidos,
          nombre: pendiente.nombre,
          email: pendiente.email,
          rut: pendiente.rut,
          telefono: pendiente.telefono,
          estado: "Activo",
        },
        { transaction }
      );
    }

    await transaction.commit();

    registrosPendientes.delete(email);

    registrarEvento("registro_completado", {
      usuarioId: usuario.id,
      fichaExistente: Boolean(pendiente.clienteId),
    });

    return res.status(201).json(respuestaSesion(usuario));
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }

    console.error("Error al verificar el registro:", error.message);

    registrosPendientes.delete(email);

    return res.status(409).json(RESPUESTA_MESON);
  }
};

// ==========================================
// INICIAR SESIÓN
// ==========================================

export const loginUsuario = async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        ok: false,
        mensaje: "Email y contraseña son obligatorios",
      });
    }

    const emailNormalizado = normalizarEmail(email);

    if (!emailValido(emailNormalizado) || password.length > 128) {
      return res.status(400).json({
        ok: false,
        mensaje: "Formato de credenciales inválido",
      });
    }

    const usuario = await buscarPorCorreo(Usuario, emailNormalizado);

    const passwordValida = await bcrypt.compare(
      password,
      usuario?.passwordHash ?? HASH_FICTICIO
    );

    if (!usuario || !passwordValida) {
      registrarEvento("login_fallido", {
        email: ocultarEmail(emailNormalizado),
        ip: req.ip,
      });

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

    registrarEvento("login_exitoso", {
      usuarioId: usuario.id,
      rol: usuario.rol,
    });

    return res.status(200).json(respuestaSesion(usuario));
  } catch (error) {
    console.error("Error en login:", error.message);

    return res.status(500).json({
      ok: false,
      mensaje: "Error al iniciar sesión",
    });
  }
};

// ==========================================
// RECUPERAR CONTRASEÑA
// ==========================================

export const solicitarRecuperacion = async (req, res) => {
  const email = normalizarEmail(req.body?.email);

  if (!emailValido(email)) {
    return res.status(400).json({
      ok: false,
      mensaje: "Ingresa un correo electrónico válido",
    });
  }

  try {
    limpiarVencidos();

    const usuario = await buscarPorCorreo(Usuario, email);

    if (usuario?.estado === "activo" && puedeEnviarCorreo(email)) {
      const codigo = generarCodigo();

      recuperacionesPendientes.set(email, {
        codigoHash: hashCodigo(codigo),
        intentos: 0,
        vence: Date.now() + VIGENCIA_CODIGO_MS,
      });

      enviarCorreoSinEsperar(
        {
          to: email,
          subject: "Recupera tu contraseña - Focus Power Fit",
          html: plantillaCodigo("Tu código de recuperación es:", codigo),
        },
        "No se pudo enviar el correo de recuperación"
      );

      registrarEvento("recuperacion_solicitada", {
        usuarioId: usuario.id,
      });
    } else if (!usuario) {
      // Cliente cargado por el gimnasio que todavía no crea su contraseña.
      const ficha = await buscarPorCorreo(Cliente, email, {
        attributes: ["id", "email"],
      });

      if (ficha && puedeEnviarCorreo(email)) {
        enviarCorreoSinEsperar(
          {
            to: email,
            subject: "Activa tu cuenta - Focus Power Fit",
            html: "<p>Aún no has activado tu cuenta. Para crear tu contraseña, entra a la página de Focus Power Fit, elige Crear cuenta y usa este mismo correo.</p>",
          },
          "No se pudo enviar el correo de activación"
        );
      }
    }
  } catch (error) {
    // Se registra sin cambiar la respuesta, para no revelar si la cuenta existe.
    console.error("Error al solicitar recuperación:", error.message);
  }

  return res.status(202).json(RESPUESTA_RECUPERACION);
};

export const restablecerPassword = async (req, res) => {
  const email = normalizarEmail(req.body?.email);
  const codigo =
    typeof req.body?.codigo === "string" ? req.body.codigo : "";
  const { password } = req.body ?? {};

  const errorPassword = validarPassword(password);

  if (errorPassword) {
    return res.status(400).json({ ok: false, mensaje: errorPassword });
  }

  const pendiente = obtenerVigente(recuperacionesPendientes, email);

  if (!pendiente) {
    return res.status(400).json(RESPUESTA_CODIGO_INVALIDO);
  }

  if (!codigoCoincide(codigo, pendiente.codigoHash)) {
    pendiente.intentos += 1;

    if (pendiente.intentos >= MAXIMO_INTENTOS) {
      recuperacionesPendientes.delete(email);
    }

    return res.status(400).json(RESPUESTA_CODIGO_INVALIDO);
  }

  try {
    const usuario = await buscarPorCorreo(Usuario, email);

    if (!usuario || usuario.estado !== "activo") {
      recuperacionesPendientes.delete(email);

      return res.status(400).json(RESPUESTA_CODIGO_INVALIDO);
    }

    await usuario.update({
      passwordHash: await bcrypt.hash(password, 10),
    });

    recuperacionesPendientes.delete(email);

    registrarEvento("password_restablecida", {
      usuarioId: usuario.id,
    });

    return res.json({
      ok: true,
      mensaje: "Tu contraseña se actualizó. Ya puedes iniciar sesión.",
    });
  } catch (error) {
    console.error("Error al restablecer contraseña:", error.message);

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo actualizar la contraseña",
    });
  }
};
