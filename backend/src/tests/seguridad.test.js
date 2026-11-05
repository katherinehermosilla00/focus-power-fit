
import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

process.env.NODE_ENV = "test";

const { default: app } = await import("../index.js");

// ==========================================
// CONFIGURACIÓN DE PRUEBAS
// ==========================================

// Permitir identificar IPs simuladas únicamente
// en el entorno de pruebas automatizadas.
app.set("trust proxy", 1);

// IPs reservadas para documentación y pruebas.
// Cada escenario utiliza una IP independiente.
const IPS_PRUEBA = {
  limitador: "192.0.2.10",
  tiposInvalidos: "192.0.2.11",
  correoInvalido: "192.0.2.12",
  passwordLarga: "192.0.2.13",
};

// ==========================================
// PRUEBA 1: CABECERAS DE SEGURIDAD
// ==========================================

test("Helmet incorpora encabezados de seguridad HTTP", async () => {
  const respuesta = await request(app).get("/");

  assert.equal(respuesta.status, 200);
  assert.ok(respuesta.headers["x-content-type-options"]);
  assert.ok(respuesta.headers["x-frame-options"]);
  assert.equal(respuesta.headers["x-powered-by"], undefined);
});

// ==========================================
// PRUEBA 2: LIMITADOR DE LOGIN
// ==========================================

test("El login bloquea la solicitud número 11 con HTTP 429", async () => {
  for (let intento = 1; intento <= 11; intento++) {
    const respuesta = await request(app)
      .post("/api/auth/login")
      .set("X-Forwarded-For", IPS_PRUEBA.limitador)
      .send({});

    if (intento <= 10) {
      assert.equal(
        respuesta.status,
        400,
        `El intento ${intento} debería devolver HTTP 400`
      );
    } else {
      assert.equal(respuesta.status, 429);
      assert.equal(respuesta.body.ok, false);
    }
  }
});

// ==========================================
// PRUEBA 3: TIPOS DE DATOS INVÁLIDOS
// ==========================================

test("El login rechaza credenciales con tipos inválidos", async () => {
  const respuesta = await request(app)
    .post("/api/auth/login")
    .set("X-Forwarded-For", IPS_PRUEBA.tiposInvalidos)
    .send({
      email: { valor: "correo@ejemplo.cl" },
      password: ["12345678"],
    });

  assert.equal(respuesta.status, 400);
  assert.equal(respuesta.body.ok, false);
});

// ==========================================
// PRUEBA 4: CORREO INVÁLIDO
// ==========================================

test("El login rechaza correos con formato inválido", async () => {
  const respuesta = await request(app)
    .post("/api/auth/login")
    .set("X-Forwarded-For", IPS_PRUEBA.correoInvalido)
    .send({
      email: "correo-invalido",
      password: "Password123",
    });

  assert.equal(respuesta.status, 400);
  assert.equal(respuesta.body.ok, false);
});

// ==========================================
// PRUEBA 5: CONTRASEÑA DEMASIADO LARGA
// ==========================================

test("El login rechaza contraseñas demasiado largas", async () => {
  const respuesta = await request(app)
    .post("/api/auth/login")
    .set("X-Forwarded-For", IPS_PRUEBA.passwordLarga)
    .send({
      email: "prueba@ejemplo.cl",
      password: "A".repeat(129),
    });

  assert.equal(respuesta.status, 400);
  assert.equal(respuesta.body.ok, false);
});
