import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const [
  { default: sequelize },
  { default: Cliente },
  { default: Plan },
  { default: Profesor },
  { default: Horario },
  { default: Asignacion },
  { default: Recordatorio },
  { default: Sucursal },
  { procesarRecordatorios },
] = await Promise.all([
  import("../config/database.js"),
  import("../models/cliente.js"),
  import("../models/plan.js"),
  import("../models/profesor.js"),
  import("../models/horario.js"),
  import("../models/asignacion.js"),
  import("../models/recordatorio.js"),
  import("../models/sucursal.js"),
  import("../services/recordatorioScheduler.js"),
]);

test.before(async () => {
  await sequelize.sync({ force: true });

  const sucursal = await Sucursal.create({
    nombre: "Sucursal",
    direccion: "Calle 1",
    comuna: "La Reina",
    ciudad: "Santiago",
  });
  const cliente = await Cliente.create({
    nombres: "Ana",
    nombre: "Ana <b>Soto</b>",
    email: "ana@prueba.cl",
  });
  const plan = await Plan.create({
    nombre: "Plan",
    duracionMeses: 1,
    sesiones: 8,
    precio: 50000,
    modalidad: "Individual",
  });
  const profesor = await Profesor.create({
    nombre: "Profesor",
    especialidad: "Fuerza",
    sucursalId: sucursal.id,
  });
  // 2026-11-10 es martes.
  const horario = await Horario.create({
    profesorId: profesor.id,
    diaSemana: "Martes",
    horaInicio: "18:00",
    horaFin: "19:00",
    modalidad: "Individual",
  });
  await Asignacion.create({
    clienteId: cliente.id,
    planId: plan.id,
    horarioId: horario.id,
    fechaInicio: "2026-11-01",
  });
});

test.after(async () => {
  await sequelize.close();
});

test("El servidor inicia los recordatorios automáticos", () => {
  const codigo = fs.readFileSync(
    path.join(process.cwd(), "src", "index.js"),
    "utf8"
  );

  assert.match(codigo, /^\s+iniciarRecordatorioScheduler\(\);/m);
});

test("No envía antes de las 24 horas previas a la clase", async () => {
  const enviados = [];

  const resultado = await procesarRecordatorios({
    ahora: new Date(2026, 10, 9, 17, 0),
    enviar: async (correo) => enviados.push(correo),
  });

  assert.equal(resultado.programados, 1);
  assert.equal(enviados.length, 0);
});

test("Envía el recordatorio 24 horas antes y registra el resultado", async () => {
  const enviados = [];

  const resultado = await procesarRecordatorios({
    ahora: new Date(2026, 10, 9, 18, 0),
    enviar: async (correo) => enviados.push(correo),
  });

  assert.equal(resultado.enviados, 1);
  assert.equal(enviados[0].to, "ana@prueba.cl");
  assert.match(enviados[0].subject, /2026-11-10/);
  assert.match(enviados[0].html, /18:00/);
  assert.ok(!enviados[0].html.includes("<b>"));

  const registro = await Recordatorio.findOne();
  assert.equal(registro.estado, "Enviado");
});

test("No repite un recordatorio ya enviado", async () => {
  const enviados = [];

  await procesarRecordatorios({
    ahora: new Date(2026, 10, 9, 18, 1),
    enviar: async (correo) => enviados.push(correo),
  });

  assert.equal(enviados.length, 0);
});

test("Si el correo falla, queda pendiente para reintentar", async () => {
  await Recordatorio.update({ estado: "Pendiente" }, { where: {} });

  await procesarRecordatorios({
    ahora: new Date(2026, 10, 9, 18, 2),
    enviar: async () => {
      throw new Error("SMTP no disponible");
    },
  });

  const registro = await Recordatorio.findOne();
  assert.equal(registro.estado, "Pendiente");
});

test("Con el plan congelado no se envía; si se reactiva antes de la clase, sí", async () => {
  const enviados = [];
  const enviar = async (correo) => enviados.push(correo);

  await Recordatorio.update({ estado: "Pendiente" }, { where: {} });
  await Asignacion.update({ estado: "Congelada" }, { where: {} });

  await procesarRecordatorios({ ahora: new Date(2026, 10, 9, 18, 3), enviar });

  assert.equal(enviados.length, 0);
  assert.equal((await Recordatorio.findOne()).estado, "Pendiente");

  // Se reactiva antes de la clase del martes 10 a las 18:00.
  await Asignacion.update({ estado: "Activa" }, { where: {} });
  await procesarRecordatorios({ ahora: new Date(2026, 10, 10, 9, 0), enviar });

  assert.equal(enviados.length, 1);
  assert.equal((await Recordatorio.findOne()).estado, "Enviado");
});

test("Si la clase pasa con el plan congelado, el recordatorio se cancela", async () => {
  const enviados = [];

  await Recordatorio.update({ estado: "Pendiente" }, { where: {} });
  await Asignacion.update({ estado: "Congelada" }, { where: {} });

  await procesarRecordatorios({
    ahora: new Date(2026, 10, 10, 18, 1),
    enviar: async (correo) => enviados.push(correo),
  });

  assert.equal(enviados.length, 0);
  assert.equal((await Recordatorio.findOne()).estado, "Cancelado");
});

test("Si el servidor estuvo apagado y la clase ya pasó, no envía el aviso tarde", async () => {
  const enviados = [];
  const enviar = async (correo) => enviados.push(correo);

  await Asignacion.update({ estado: "Activa" }, { where: {} });

  // Lunes 16 a las 10:00 se programa el aviso de la clase del martes 17.
  await procesarRecordatorios({ ahora: new Date(2026, 10, 16, 10, 0), enviar });

  // El servidor vuelve a funcionar el miércoles 18, después de la clase.
  await procesarRecordatorios({ ahora: new Date(2026, 10, 18, 9, 0), enviar });

  const aviso = await Recordatorio.findOne({
    where: { titulo: "Recordatorio de clase - 2026-11-17" },
  });

  assert.equal(enviados.length, 0);
  assert.equal(aviso.estado, "Cancelado");
});

test("Si cambia la hora del horario, solo se envía el aviso con la hora nueva", async () => {
  const enviados = [];
  const enviar = async (correo) => enviados.push(correo);

  // El aviso de la clase del martes 24 a las 18:00 ya está programado.
  await Horario.update({ horaInicio: "20:00", horaFin: "21:00" }, { where: {} });

  await procesarRecordatorios({ ahora: new Date(2026, 10, 23, 20, 0), enviar });

  assert.equal(enviados.length, 1);
  assert.match(enviados[0].html, /a las 20:00/);
  assert.doesNotMatch(enviados[0].html, /a las 18:00/);

  // Cuando pasa la hora antigua, el aviso con las 18:00 queda cancelado.
  await procesarRecordatorios({ ahora: new Date(2026, 10, 24, 18, 1), enviar });

  const avisos = await Recordatorio.findAll({
    where: { titulo: "Recordatorio de clase - 2026-11-24" },
    order: [["fechaEnvio", "ASC"]],
  });

  assert.equal(enviados.length, 1);
  assert.deepEqual(
    avisos.map(({ estado }) => estado),
    ["Cancelado", "Enviado"]
  );
});
