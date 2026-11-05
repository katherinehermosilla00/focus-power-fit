
import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

process.env.NODE_ENV = "test";

const [
  { default: app },
  { default: sequelize },
  { default: Usuario },
] = await Promise.all([
  import("../index.js"),
  import("../config/database.js"),
  import("../models/Usuario.js"),
]);

const passwordHash = await bcrypt.hash("Prueba123", 10);

// ==========================================
// PREPARACIÓN DE LA BASE DE DATOS DE PRUEBAS
// ==========================================

test.before(async () => {
  await sequelize.sync({ force: true });

  await Usuario.bulkCreate([
    {
      id: 101,
      nombre: "Usuario Inactivo",
      email: "inactivo@prueba.cl",
      passwordHash,
      rol: "cliente",
      estado: "inactivo",
    },
    {
      id: 102,
      nombre: "Usuario Eliminable",
      email: "eliminable@prueba.cl",
      passwordHash,
      rol: "cliente",
      estado: "activo",
    },
    {
      id: 103,
      nombre: "Usuario Cambio Rol",
      email: "cambiorol@prueba.cl",
      passwordHash,
      rol: "cliente",
      estado: "activo",
    },
  ]);
});

test.after(async () => {
  await sequelize.close();
});

// ==========================================
// FUNCIÓN AUXILIAR PARA GENERAR JWT
// ==========================================

function generarToken(usuario) {
  return jwt.sign(
    {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
}

// ==========================================
// PRUEBA 1: USUARIO INACTIVO
// ==========================================

test("Bloquea el acceso de un usuario inactivo", async () => {
  const token = generarToken({
    id: 101,
    email: "inactivo@prueba.cl",
    rol: "cliente",
  });

  const respuesta = await request(app)
    .get("/api/clientes/mi-dashboard")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(respuesta.status, 403);
  assert.equal(respuesta.body.ok, false);
  assert.equal(respuesta.body.mensaje, "Usuario inactivo");
});

// ==========================================
// PRUEBA 2: USUARIO ELIMINADO
// ==========================================

test("Bloquea un JWT perteneciente a un usuario eliminado", async () => {
  const token = generarToken({
    id: 102,
    email: "eliminable@prueba.cl",
    rol: "cliente",
  });

  await Usuario.destroy({
    where: { id: 102 },
  });

  const respuesta = await request(app)
    .get("/api/clientes/mi-dashboard")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(respuesta.status, 401);
  assert.equal(respuesta.body.ok, false);
  assert.equal(respuesta.body.mensaje, "Usuario no autorizado");
});

// ==========================================
// PRUEBA 3: CAMBIO DE ROL
// ==========================================

test("Impide conservar permisos de administrador después de cambiar a cliente", async () => {
  const token = generarToken({
    id: 103,
    email: "cambiorol@prueba.cl",
    rol: "admin",
  });

  const respuesta = await request(app)
    .get("/api/clientes")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(respuesta.status, 403);
  assert.equal(respuesta.body.ok, false);
  assert.equal(
    respuesta.body.mensaje,
    "No tienes permisos para esta acción"
  );
});


// ==========================================
// PRUEBA 4: TOKEN NO PROPORCIONADO
// ==========================================

test("Rechaza solicitudes sin token JWT", async () => {
  const respuesta = await request(app)
    .get("/api/clientes/mi-dashboard");

  assert.equal(respuesta.status, 401);
  assert.equal(respuesta.body.ok, false);
  assert.equal(respuesta.body.mensaje, "Token no proporcionado");
});

// ==========================================
// PRUEBA 5: TOKEN MALFORMADO
// ==========================================

test("Rechaza un token JWT malformado", async () => {
  const respuesta = await request(app)
    .get("/api/clientes/mi-dashboard")
    .set("Authorization", "Bearer token.invalido");

  assert.equal(respuesta.status, 401);
  assert.equal(respuesta.body.ok, false);
  assert.equal(respuesta.body.mensaje, "Token inválido o expirado");
});

// ==========================================
// PRUEBA 6: FIRMA JWT INCORRECTA
// ==========================================

test("Rechaza un JWT firmado con otra clave", async () => {
  const token = jwt.sign(
    { id: 103, rol: "cliente" },
    "clave-incorrecta-para-pruebas",
    { expiresIn: "1h" }
  );

  const respuesta = await request(app)
    .get("/api/clientes/mi-dashboard")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(respuesta.status, 401);
  assert.equal(respuesta.body.ok, false);
  assert.equal(respuesta.body.mensaje, "Token inválido o expirado");
});

// ==========================================
// PRUEBA 7: TOKEN EXPIRADO
// ==========================================

test("Rechaza un JWT expirado", async () => {
  const token = jwt.sign(
    { id: 103, rol: "cliente" },
    process.env.JWT_SECRET,
    { expiresIn: -10 }
  );

  const respuesta = await request(app)
    .get("/api/clientes/mi-dashboard")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(respuesta.status, 401);
  assert.equal(respuesta.body.ok, false);
  assert.equal(respuesta.body.mensaje, "Token inválido o expirado");
});

// ==========================================
// PRUEBA 8: ID DE USUARIO INVÁLIDO
// ==========================================

test("Rechaza un JWT con ID de usuario inválido", async () => {
  const token = jwt.sign(
    { id: "usuario-falso", rol: "cliente" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  const respuesta = await request(app)
    .get("/api/clientes/mi-dashboard")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(respuesta.status, 401);
  assert.equal(respuesta.body.ok, false);
  assert.equal(respuesta.body.mensaje, "Token inválido o expirado");
});
