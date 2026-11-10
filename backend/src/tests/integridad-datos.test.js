import test from "node:test";
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
  { default: Pago },
  { default: Maquina },
  { default: Contrato },
  { hoyChile, estadoPago },
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
  import("../models/pago.js"),
  import("../models/maquina.js"),
  import("../models/contrato.js"),
  import("../utils/reglas.js"),
]);

let token;
const datos = {};
const admin = (metodo, ruta) =>
  request(app)[metodo](ruta).set("Authorization", `Bearer ${token}`);

test.before(async () => {
  await sequelize.sync({ force: true });

  await Usuario.create({
    nombre: "Dueño",
    email: "dueno@prueba.cl",
    passwordHash: await bcrypt.hash("Dueno12345", 10),
    rol: "admin",
  });

  token = (
    await request(app)
      .post("/api/auth/login")
      .send({ email: "dueno@prueba.cl", password: "Dueno12345" })
  ).body.token;

  datos.sucursal = await Sucursal.create({ nombre: "Sede Uno", comuna: "La Reina" });
  datos.cliente = await Cliente.create({
    nombres: "Ana",
    nombre: "Ana Prueba",
    sucursalId: datos.sucursal.id,
  });
  datos.plan = await Plan.create({ nombre: "Plan 12", precio: 216000, modalidad: "Individual" });
  datos.profesor = await Profesor.create({ nombre: "Profe Uno", sucursalId: datos.sucursal.id });
  datos.horario = await Horario.create({
    profesorId: datos.profesor.id,
    diaSemana: "Martes",
    horaInicio: "18:00",
    horaFin: "19:00",
    modalidad: "Individual",
  });
  datos.asignacion = await Asignacion.create({
    clienteId: datos.cliente.id,
    planId: datos.plan.id,
    horarioId: datos.horario.id,
    fechaInicio: "2026-10-01",
  });
  datos.asistencia = await Asistencia.create({
    asignacionId: datos.asignacion.id,
    fecha: "2026-10-06",
    estado: "Presente",
  });
  datos.maquina = await Maquina.create({
    codigo: "M-1",
    nombre: "Prensa",
    sucursalId: datos.sucursal.id,
  });
});

test.after(async () => {
  await sequelize.close();
});

test("No se borra un profesor, horario, sucursal ni asignación con historial", async () => {
  const intentos = [
    `/api/profesores/${datos.profesor.id}`,
    `/api/horarios/${datos.horario.id}`,
    `/api/sucursales/${datos.sucursal.id}`,
    `/api/asignaciones/${datos.asignacion.id}`,
  ];

  for (const ruta of intentos) {
    const respuesta = await admin("delete", ruta);

    assert.equal(respuesta.status, 409, ruta);
    assert.match(respuesta.body.mensaje, /Desactív|Finalizar/);
  }

  assert.ok(await Profesor.findByPk(datos.profesor.id));
  assert.ok(await Horario.findByPk(datos.horario.id));
  assert.ok(await Maquina.findByPk(datos.maquina.id));
  assert.equal(await Asistencia.count({ where: { asignacionId: datos.asignacion.id } }), 1);
  assert.equal((await Cliente.findByPk(datos.cliente.id)).sucursalId, datos.sucursal.id);
});

test("Lo que no tiene historial sí se puede eliminar", async () => {
  const sucursal = await Sucursal.create({ nombre: "Sede Vacía", comuna: "Ñuñoa" });
  const respuesta = await admin("delete", `/api/sucursales/${sucursal.id}`);

  assert.equal(respuesta.status, 200);
  assert.equal(await Sucursal.findByPk(sucursal.id), null);
});

test("Editar un pago aplica las mismas reglas que al crearlo", async () => {
  const creado = await admin("post", "/api/pagos").send({
    clienteId: datos.cliente.id,
    planId: datos.plan.id,
    monto: 216000,
    fechaPago: "2026-11-01",
    fechaVencimiento: "2026-12-01",
    metodoPago: "Transferencia",
  });
  assert.equal(creado.status, 201);
  const id = creado.body.pago.id;

  for (const cambio of [
    { monto: -100 },
    { fechaVencimiento: "2020-01-01" },
    { metodoPago: "Bitcoin" },
    { fechaPago: "no-es-fecha" },
  ]) {
    const respuesta = await admin("put", `/api/pagos/${id}`).send(cambio);

    assert.equal(respuesta.status, 400, JSON.stringify(cambio));
  }

  const cliente = await admin("put", `/api/pagos/${id}`).send({ clienteId: 999999 });
  assert.equal(cliente.status, 404);

  const valido = await admin("put", `/api/pagos/${id}`).send({ monto: 200000 });
  assert.equal(valido.status, 200);
  assert.equal(Number((await Pago.findByPk(id)).monto), 200000);
});

test("Un pago vencido se informa como Vencido aunque se guardó Vigente", async () => {
  const pago = await Pago.create({
    clienteId: datos.cliente.id,
    planId: datos.plan.id,
    monto: 1000,
    fechaPago: "2025-01-01",
    fechaVencimiento: "2025-02-01",
    metodoPago: "Efectivo",
    estado: "Vigente",
  });

  const lista = (await admin("get", "/api/pagos")).body;

  assert.equal(lista.find(({ id }) => id === pago.id).estado, "Vencido");
  assert.equal(estadoPago({ estado: "Anulado", fechaVencimiento: "2020-01-01" }), "Anulado");
  assert.equal(estadoPago({ estado: "Vigente", fechaVencimiento: "2999-01-01" }), "Vigente");
});

test("Planes: no se aceptan precios negativos al crear ni al editar", async () => {
  const crear = await admin("post", "/api/planes").send({ nombre: "Plan Malo", precio: -1 });
  assert.equal(crear.status, 400);

  const editar = await admin("put", `/api/planes/${datos.plan.id}`).send({ precio: -1 });
  assert.equal(editar.status, 400);

  const desactivar = await admin("put", `/api/planes/${datos.plan.id}`).send({ estado: "Inactivo" });
  assert.equal(desactivar.status, 200);
  await admin("put", `/api/planes/${datos.plan.id}`).send({ estado: "Activo" });
});

test("Horarios: horas coherentes, cupos válidos y sin clases superpuestas", async () => {
  const soloFin = await admin("put", `/api/horarios/${datos.horario.id}`).send({ horaFin: "05:00" });
  assert.equal(soloFin.status, 400);

  const sinCupos = await admin("post", "/api/horarios").send({
    profesorId: datos.profesor.id,
    diaSemana: "Lunes",
    horaInicio: "10:00",
    horaFin: "11:00",
    modalidad: "Compartido",
    cupos: 0,
  });
  assert.equal(sinCupos.status, 400);

  const superpuesto = await admin("post", "/api/horarios").send({
    profesorId: datos.profesor.id,
    diaSemana: "Martes",
    horaInicio: "18:30",
    horaFin: "19:30",
    modalidad: "Individual",
  });
  assert.equal(superpuesto.status, 409);

  const contiguo = await admin("post", "/api/horarios").send({
    profesorId: datos.profesor.id,
    diaSemana: "Martes",
    horaInicio: "19:00",
    horaFin: "20:00",
    modalidad: "Individual",
  });
  assert.equal(contiguo.status, 201);
});

test("Asistencia: no se duplica ni se registra en fechas futuras", async () => {
  const repetida = await admin("post", "/api/asistencias").send({
    asignacionId: datos.asignacion.id,
    fecha: "2026-10-06",
    estado: "Presente",
  });
  assert.equal(repetida.status, 409);

  const futura = await admin("post", "/api/asistencias").send({
    asignacionId: datos.asignacion.id,
    fecha: "2999-01-01",
    estado: "Presente",
  });
  assert.equal(futura.status, 400);

  const hoy = await admin("post", "/api/asistencias").send({
    asignacionId: datos.asignacion.id,
    fecha: hoyChile(),
    estado: "Presente",
  });
  assert.equal(hoy.status, 201);
});

test("Un horario no recibe más alumnos que sus cupos", async () => {
  const otro = await Cliente.create({ nombres: "Beto", nombre: "Beto Prueba", sucursalId: datos.sucursal.id });

  // El horario individual ya tiene a Ana.
  const lleno = await admin("post", "/api/asignaciones").send({
    clienteId: otro.id,
    planId: datos.plan.id,
    horarioId: datos.horario.id,
    fechaInicio: "2026-11-01",
  });
  assert.equal(lleno.status, 409);
  assert.match(lleno.body.mensaje, /cupos/);

  const compartido = await Horario.create({
    profesorId: datos.profesor.id,
    diaSemana: "Sábado",
    horaInicio: "10:00",
    horaFin: "11:00",
    modalidad: "Compartido",
    cupos: 2,
  });
  const terceros = [];

  for (const nombre of ["Uno", "Dos", "Tres"]) {
    const cliente = await Cliente.create({ nombres: nombre, nombre, sucursalId: datos.sucursal.id });
    terceros.push(
      (
        await admin("post", "/api/asignaciones").send({
          clienteId: cliente.id,
          planId: datos.plan.id,
          horarioId: compartido.id,
          fechaInicio: "2026-11-01",
        })
      ).status
    );
  }
  assert.deepEqual(terceros, [201, 201, 409]);

  // No se puede bajar a 1 cupo con 2 alumnos activos.
  const bajar = await admin("put", `/api/horarios/${compartido.id}`).send({ cupos: 1 });
  assert.equal(bajar.status, 409);
});

test("Un dato antiguo inválido no impide desactivar, pero sí se valida al cambiarlo", async () => {
  const antiguo = await Plan.create({ nombre: "Plan Antiguo", precio: -1, sesiones: 0 });

  const desactivar = await admin("put", `/api/planes/${antiguo.id}`).send({ estado: "Inactivo" });
  assert.equal(desactivar.status, 200);
  assert.equal((await Plan.findByPk(antiguo.id)).estado, "Inactivo");

  const precio = await admin("put", `/api/planes/${antiguo.id}`).send({ precio: -5 });
  assert.equal(precio.status, 400);
});

test("El contrato vence por fecha y valida sus fechas", async () => {
  const contrato = await Contrato.create({
    clienteId: datos.cliente.id,
    nombreArchivo: "c.pdf",
    rutaArchivo: "/uploads/contratos/c.pdf",
    fechaInicio: "2025-01-01",
    fechaTermino: "2025-12-31",
    estado: "Vigente",
  });

  const lista = (await admin("get", "/api/contratos")).body;
  assert.equal(lista.find(({ id }) => id === contrato.id).estado, "Vencido");

  const invertido = await admin("put", `/api/contratos/${contrato.id}`).send({ fechaInicio: "2026-06-01" });
  assert.equal(invertido.status, 400);

  const finalizado = await admin("put", `/api/contratos/${contrato.id}`).send({ estado: "Finalizado" });
  assert.equal(finalizado.status, 200);
  assert.equal(finalizado.body.contrato.estado, "Finalizado");
});

test("Las fechas de una asignación se validan y el término se puede quitar", async () => {
  const id = datos.asignacion.id;

  const invertida = await admin("put", `/api/asignaciones/${id}`).send({ fechaTermino: "2026-01-01" });
  assert.equal(invertida.status, 400);

  await admin("put", `/api/asignaciones/${id}`).send({ fechaTermino: "2026-12-31" });
  const quitar = await admin("put", `/api/asignaciones/${id}`).send({ fechaTermino: null });
  assert.equal(quitar.status, 200);
  assert.equal((await Asignacion.findByPk(id)).fechaTermino, null);
});

test("No se registra asistencia fuera del plan ni con el plan congelado", async () => {
  const antes = await admin("post", "/api/asistencias").send({
    asignacionId: datos.asignacion.id,
    fecha: "2026-09-01",
    estado: "Presente",
  });
  assert.equal(antes.status, 400);
  assert.match(antes.body.mensaje, /período/);

  await Asignacion.update({ estado: "Congelada" }, { where: { id: datos.asignacion.id } });

  const congelada = await admin("post", "/api/asistencias").send({
    asignacionId: datos.asignacion.id,
    fecha: "2026-10-13",
    estado: "Presente",
  });
  assert.equal(congelada.status, 409);
  assert.match(congelada.body.mensaje, /Congelada/);

  // Corregir el estado de un registro antiguo sigue permitido.
  const corregir = await admin("put", `/api/asistencias/${datos.asistencia.id}`).send({ estado: "Justificada" });
  assert.equal(corregir.status, 200);

  await Asignacion.update({ estado: "Activa" }, { where: { id: datos.asignacion.id } });
});

test("Al crear una sucursal se guardan la ciudad y el horario de atención", async () => {
  const respuesta = await admin("post", "/api/sucursales").send({
    nombre: "Sede Nueva",
    comuna: "Providencia",
    ciudad: "Santiago",
    horarioAtencion: "Lunes a viernes, 07:00 a 21:00",
  });

  assert.equal(respuesta.status, 201);
  assert.equal(respuesta.body.sucursal.ciudad, "Santiago");
  assert.equal(respuesta.body.sucursal.horarioAtencion, "Lunes a viernes, 07:00 a 21:00");

  const sinNombre = await admin("put", `/api/sucursales/${respuesta.body.sucursal.id}`).send({ nombre: " " });
  assert.equal(sinNombre.status, 400);
});

test("Se respeta el estado que elige el administrador en contratos y pagos", async () => {
  const contrato = await Contrato.create({
    clienteId: datos.cliente.id,
    nombreArchivo: "v.pdf",
    rutaArchivo: "/uploads/contratos/v.pdf",
    fechaInicio: "2026-01-01",
    fechaTermino: "2999-12-31",
    estado: "Vigente",
  });

  const vencer = await admin("put", `/api/contratos/${contrato.id}`).send({ estado: "Vencido" });
  assert.equal(vencer.status, 200);
  assert.equal(vencer.body.contrato.estado, "Vencido");

  const lista = (await admin("get", "/api/contratos")).body;
  assert.equal(lista.find(({ id }) => id === contrato.id).estado, "Vencido");

  assert.equal(estadoPago({ estado: "Vencido", fechaVencimiento: "2999-01-01" }), "Vencido");
});

test("Un plan congelado conserva su cupo y se puede reactivar", async () => {
  const horario = await Horario.create({
    profesorId: datos.profesor.id,
    diaSemana: "Domingo",
    horaInicio: "09:00",
    horaFin: "10:00",
    modalidad: "Compartido",
    cupos: 1,
  });
  const [primero, segundo] = await Promise.all(
    ["Cupo Uno", "Cupo Dos"].map((nombre) =>
      Cliente.create({ nombres: nombre, nombre, sucursalId: datos.sucursal.id })
    )
  );
  const asignar = (clienteId) =>
    admin("post", "/api/asignaciones").send({
      clienteId,
      planId: datos.plan.id,
      horarioId: horario.id,
      fechaInicio: "2026-11-01",
    });

  const creada = await asignar(primero.id);
  assert.equal(creada.status, 201);

  const congelar = await admin("put", `/api/asignaciones/${creada.body.id}`).send({ estado: "Congelada" });
  assert.equal(congelar.status, 200);

  // El cupo sigue ocupado por la asignación congelada.
  const otra = await asignar(segundo.id);
  assert.equal(otra.status, 409);
  assert.match(otra.body.mensaje, /cupos/);

  // El cliente congelado tampoco recibe un segundo plan.
  const segundoPlan = await admin("post", "/api/asignaciones").send({
    clienteId: primero.id,
    planId: datos.plan.id,
    horarioId: horario.id,
    fechaInicio: "2026-12-01",
  });
  assert.equal(segundoPlan.status, 409);
  assert.match(segundoPlan.body.mensaje, /congelada/);

  // Un estado vacío se rechaza en vez de reactivar.
  const vacio = await admin("put", `/api/asignaciones/${creada.body.id}`).send({ estado: "" });
  assert.equal(vacio.status, 400);
  assert.equal((await Asignacion.findByPk(creada.body.id)).estado, "Congelada");

  // No se puede desactivar el horario mientras tenga alumnos activos o congelados.
  const desactivar = await admin("put", `/api/horarios/${horario.id}`).send({ estado: "Inactivo" });
  assert.equal(desactivar.status, 409);
  assert.match(desactivar.body.mensaje, /Finaliza/);

  const reactivar = await admin("put", `/api/asignaciones/${creada.body.id}`).send({ estado: "Activa" });
  assert.equal(reactivar.status, 200);

  const finalizar = await admin("put", `/api/asignaciones/${creada.body.id}`).send({ estado: "Finalizada" });
  assert.equal(finalizar.status, 200);

  const ahora = await admin("put", `/api/horarios/${horario.id}`).send({ estado: "Inactivo" });
  assert.equal(ahora.status, 200);
});

test("El último pago del cliente ignora los pagos anulados", async () => {
  const cliente = await Cliente.create({ nombres: "Pago", nombre: "Pago Prueba", sucursalId: datos.sucursal.id });
  const pagar = (fechaPago, fechaVencimiento, estado) =>
    Pago.create({
      clienteId: cliente.id,
      planId: datos.plan.id,
      monto: 1000,
      fechaPago,
      fechaVencimiento,
      metodoPago: "Efectivo",
      estado,
    });

  await pagar("2026-10-01", "2999-01-01", "Vigente");
  await pagar("2026-11-01", "2999-02-01", "Anulado");

  const ultimo = await admin("get", `/api/pagos/cliente/${cliente.id}/ultimo`);
  assert.equal(ultimo.status, 200);
  assert.equal(ultimo.body.ultimoPago, "2026-10-01");
  assert.equal(ultimo.body.estadoPlan, "Vigente");

  const soloAnulado = await Cliente.create({ nombres: "Anulado", nombre: "Solo Anulado", sucursalId: datos.sucursal.id });
  await Pago.create({
    clienteId: soloAnulado.id,
    planId: datos.plan.id,
    monto: 1000,
    fechaPago: "2026-11-01",
    fechaVencimiento: "2999-01-01",
    metodoPago: "Efectivo",
    estado: "Anulado",
  });
  const sinValidos = await admin("get", `/api/pagos/cliente/${soloAnulado.id}/ultimo`);
  assert.equal(sinValidos.status, 404);
});

test("Reactivar una asignación congelada no deja dos planes activos", async () => {
  const cliente = await Cliente.create({ nombres: "Doble", nombre: "Doble Prueba", sucursalId: datos.sucursal.id });
  const horario = await Horario.create({
    profesorId: datos.profesor.id,
    diaSemana: "Domingo",
    horaInicio: "12:00",
    horaFin: "13:00",
    modalidad: "Compartido",
    cupos: 5,
  });
  // Datos anteriores a la regla: una congelada y otra activa del mismo cliente.
  const congelada = await Asignacion.create({
    clienteId: cliente.id,
    planId: datos.plan.id,
    horarioId: horario.id,
    fechaInicio: "2026-09-01",
    estado: "Congelada",
  });
  await Asignacion.create({
    clienteId: cliente.id,
    planId: datos.plan.id,
    horarioId: horario.id,
    fechaInicio: "2026-10-01",
  });

  const reactivar = await admin("put", `/api/asignaciones/${congelada.id}`).send({ estado: "Activa" });
  assert.equal(reactivar.status, 409);
  assert.equal((await Asignacion.findByPk(congelada.id)).estado, "Congelada");
});
