import test, { mock } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import bcrypt from "bcryptjs";

const [
  { default: app },
  { default: sequelize },
  { default: Usuario },
  { default: Cliente },
  { default: Sucursal },
  { default: Plan },
  { default: Profesor },
  { default: Horario },
  { default: Asignacion },
  { default: Asistencia },
  { default: Recordatorio },
  { procesarRecordatorios },
] = await Promise.all([
  import("../index.js"),
  import("../config/database.js"),
  import("../models/Usuario.js"),
  import("../models/cliente.js"),
  import("../models/sucursal.js"),
  import("../models/plan.js"),
  import("../models/profesor.js"),
  import("../models/horario.js"),
  import("../models/asignacion.js"),
  import("../models/asistencia.js"),
  import("../models/recordatorio.js"),
  import("../services/recordatorioScheduler.js"),
]);

// Fechas locales: 2026-11-10, 2026-11-17 y 2026-11-24 son martes.
const local = (anio, mes, dia, hora, minuto = 0) =>
  new Date(anio, mes - 1, dia, hora, minuto);

let tokenCliente;
let tokenAdmin;
let asignacionId;

const login = async (email, password) =>
  (await request(app).post("/api/auth/login").send({ email, password })).body
    .token;

const cancelar = (fecha, token = tokenCliente) =>
  request(app)
    .post("/api/clientes/mi-clase/cancelar")
    .set("Authorization", `Bearer ${token}`)
    .send({ fecha });

const panel = () =>
  request(app)
    .get("/api/clientes/mi-dashboard")
    .set("Authorization", `Bearer ${tokenCliente}`);

test.before(async () => {
  mock.timers.enable({ apis: ["Date"], now: local(2026, 11, 9, 10) });
  await sequelize.sync({ force: true });

  await Usuario.bulkCreate([
    {
      nombre: "Dueño",
      email: "dueno@prueba.cl",
      passwordHash: await bcrypt.hash("Dueno12345", 10),
      rol: "admin",
    },
    {
      nombre: "Ana",
      email: "ana@prueba.cl",
      passwordHash: await bcrypt.hash("Ana1234567", 10),
      rol: "cliente",
    },
  ]);

  const sucursal = await Sucursal.create({
    nombre: "Sucursal",
    direccion: "Calle 1",
    comuna: "La Reina",
    ciudad: "Santiago",
  });
  const cliente = await Cliente.create({
    nombres: "Ana",
    nombre: "Ana Soto",
    email: "ana@prueba.cl",
  });
  const plan = await Plan.create({
    nombre: "Plan",
    duracionMeses: 2,
    sesiones: 8,
    precio: 50000,
    modalidad: "Individual",
  });
  const profesor = await Profesor.create({
    nombre: "Profesor",
    especialidad: "Fuerza",
    sucursalId: sucursal.id,
  });
  const horario = await Horario.create({
    profesorId: profesor.id,
    diaSemana: "Martes",
    horaInicio: "18:00",
    horaFin: "19:00",
    modalidad: "Individual",
  });
  const asignacion = await Asignacion.create({
    clienteId: cliente.id,
    planId: plan.id,
    horarioId: horario.id,
    fechaInicio: "2026-11-01",
  });
  asignacionId = asignacion.id;

  tokenCliente = await login("ana@prueba.cl", "Ana1234567");
  tokenAdmin = await login("dueno@prueba.cl", "Dueno12345");
});

test.after(async () => {
  mock.timers.reset();
  await sequelize.close();
});

test("Mi cuenta muestra la próxima clase y hasta cuándo se cancela sin perderla", async () => {
  const res = await panel();

  assert.equal(res.status, 200);
  assert.equal(res.body.proximaClase.fecha, "2026-11-10");
  assert.equal(
    res.body.proximaClase.limiteCancelacion,
    local(2026, 11, 10, 12).toISOString()
  );
  assert.equal(res.body.proximaClase.horasMinimasCancelacion, 6);
  assert.equal(res.body.proximaClase.estadoRegistrado, null);
});

test("El recordatorio explica cómo cancelar y la regla de 6 horas", async () => {
  await procesarRecordatorios({
    ahora: local(2026, 11, 9, 10),
    enviar: async () => {},
  });

  const recordatorio = await Recordatorio.findOne({
    where: { titulo: "Recordatorio de clase - 2026-11-10" },
  });

  assert.match(recordatorio.mensaje, /Mi cuenta/);
  assert.match(recordatorio.mensaje, /WhatsApp/);
  // Clase del martes 10/11 a las 18:00: se cancela sin perderla hasta las 12:00.
  assert.match(recordatorio.mensaje, /hasta el martes 10\/11 a las 12:00/);
  assert.match(recordatorio.mensaje, /al menos 6 horas de anticipación/);
  assert.match(recordatorio.mensaje, /pierdes la clase y se descuenta de tu plan/);
});

test("Cancelar con 6 horas o más deja la clase justificada y anula su recordatorio", async () => {
  const res = await cancelar("2026-11-10");

  assert.equal(res.status, 200);
  assert.equal(res.body.estado, "Justificada");
  assert.equal(res.body.aTiempo, true);

  const asistencia = await Asistencia.findOne({
    where: { asignacionId, fecha: "2026-11-10" },
  });
  assert.equal(asistencia.estado, "Justificada");

  const recordatorio = await Recordatorio.findOne({
    where: { titulo: "Recordatorio de clase - 2026-11-10" },
  });
  assert.equal(recordatorio.estado, "Cancelado");

  assert.equal((await panel()).body.proximaClase.estadoRegistrado, "Justificada");
});

test("Una clase no se cancela dos veces", async () => {
  const res = await cancelar("2026-11-10");

  assert.equal(res.status, 409);
});

test("Solo se cancela la próxima clase, con una fecha válida", async () => {
  assert.equal((await cancelar("2026-11-17")).status, 409);
  assert.equal((await cancelar("10-11-2026")).status, 400);
  assert.equal((await cancelar(undefined)).status, 400);
});

test("Un administrador no usa la cancelación del cliente", async () => {
  assert.equal((await cancelar("2026-11-10", tokenAdmin)).status, 403);
});

test("Cancelar con menos de 6 horas deja la clase ausente: se pierde", async () => {
  mock.timers.setTime(local(2026, 11, 17, 14).getTime());
  // La sesión anterior venció al adelantar el reloj una semana.
  tokenCliente = await login("ana@prueba.cl", "Ana1234567");

  const res = await cancelar("2026-11-17");

  assert.equal(res.status, 200);
  assert.equal(res.body.estado, "Ausente");
  assert.equal(res.body.aTiempo, false);

  const asistencia = await Asistencia.findOne({
    where: { asignacionId, fecha: "2026-11-17" },
  });
  assert.equal(asistencia.estado, "Ausente");
  assert.match(asistencia.observaciones, /se pierde/);

  // La clase perdida descuenta una sesión; la cancelada a tiempo, no.
  const { asignacion } = (await panel()).body;
  assert.equal(asignacion.sesionesUtilizadas, 1);
  assert.equal(asignacion.sesionesRestantes, 7);
});

test("No se envía el recordatorio de una clase ya cancelada", async () => {
  const enviados = [];
  const enviar = async (correo) => {
    enviados.push(correo);
  };

  // Se crea el recordatorio de la clase del 24, que todavía no toca enviar.
  await procesarRecordatorios({ ahora: local(2026, 11, 23, 10), enviar });

  // La clase se cancela antes de que llegue la hora del recordatorio.
  await Asistencia.create({
    asignacionId,
    fecha: "2026-11-24",
    estado: "Justificada",
  });

  const resultado = await procesarRecordatorios({
    ahora: local(2026, 11, 23, 19),
    enviar,
  });

  assert.equal(resultado.enviados, 0);
  assert.equal(
    enviados.some(({ subject }) => subject.endsWith("2026-11-24")),
    false
  );
});
