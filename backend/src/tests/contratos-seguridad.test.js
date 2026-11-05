
import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";

process.env.NODE_ENV = "test";

const [
  { default: app },
  { default: sequelize },
  { default: Usuario },
  { default: Cliente },
  { default: Contrato },
] = await Promise.all([
  import("../index.js"),
  import("../config/database.js"),
  import("../models/Usuario.js"),
  import("../models/cliente.js"),
  import("../models/contrato.js"),
]);

const carpeta = path.join(
  process.cwd(),
  "uploads",
  "contratos"
);

const archivoPrueba = path.join(
  carpeta,
  "contrato-test-seguridad.pdf"
);

let contratoId;
let tokenPropietario;
let tokenOtroCliente;
let tokenAdmin;

function generarToken(id, rol) {
  return jwt.sign(
    { id, rol },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
}

test.before(async () => {
  await sequelize.sync({ force: true });

  const passwordHash = await bcrypt.hash("Prueba123", 10);

  await Usuario.bulkCreate([
    {
      id: 201,
      nombre: "Cliente Uno",
      email: "cliente1@test.local",
      passwordHash,
      rol: "cliente",
      estado: "activo",
    },
    {
      id: 202,
      nombre: "Cliente Dos",
      email: "cliente2@test.local",
      passwordHash,
      rol: "cliente",
      estado: "activo",
    },
    {
      id: 203,
      nombre: "Administrador",
      email: "admin@test.local",
      passwordHash,
      rol: "admin",
      estado: "activo",
    },
  ]);

  const propietario = await Cliente.create({
    nombre: "Cliente Uno",
    nombres: "Cliente Uno",
    email: "cliente1@test.local",
  });

  await Cliente.create({
    nombre: "Cliente Dos",
    nombres: "Cliente Dos",
    email: "cliente2@test.local",
  });

  fs.mkdirSync(carpeta, { recursive: true });

  fs.writeFileSync(
    archivoPrueba,
    "%PDF-1.4\n% Archivo ficticio para pruebas\n"
  );

  const contrato = await Contrato.create({
    clienteId: propietario.id,
    nombreArchivo: "contrato-test-seguridad.pdf",
    rutaArchivo:
      "/uploads/contratos/contrato-test-seguridad.pdf",
    estado: "Vigente",
  });

  contratoId = contrato.id;
  tokenPropietario = generarToken(201, "cliente");
  tokenOtroCliente = generarToken(202, "cliente");
  tokenAdmin = generarToken(203, "admin");
});

test.after(async () => {
  if (fs.existsSync(archivoPrueba)) {
    fs.unlinkSync(archivoPrueba);
  }

  await sequelize.close();
});

test("Contrato: rechaza descarga sin token", async () => {
  const respuesta = await request(app)
    .get(`/api/contratos/${contratoId}/archivo`);

  assert.equal(respuesta.status, 401);
});

test("Contrato: bloquea a otro cliente", async () => {
  const respuesta = await request(app)
    .get(`/api/contratos/${contratoId}/archivo`)
    .set("Authorization", `Bearer ${tokenOtroCliente}`);

  assert.equal(respuesta.status, 403);
});

test("Contrato: permite acceso al propietario", async () => {
  const respuesta = await request(app)
    .get(`/api/contratos/${contratoId}/archivo`)
    .set("Authorization", `Bearer ${tokenPropietario}`);

  assert.equal(respuesta.status, 200);
});

test("Contrato: permite acceso al administrador", async () => {
  const respuesta = await request(app)
    .get(`/api/contratos/${contratoId}/archivo`)
    .set("Authorization", `Bearer ${tokenAdmin}`);

  assert.equal(respuesta.status, 200);
});

test("Contrato: bloquea acceso público directo", async () => {
  const respuesta = await request(app)
    .get("/uploads/contratos/contrato-test-seguridad.pdf");

  assert.equal(respuesta.status, 403);
});
