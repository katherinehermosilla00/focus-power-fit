import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";

const [
  { default: app },
  { default: sequelize },
  { default: Usuario },
  { default: Cliente },
  { default: Contrato },
  { default: Sucursal },
  { default: Plan },
  { default: Profesor },
  { default: Horario },
  { default: Asignacion },
  { default: Asistencia },
  { default: Pago },
] = await Promise.all([
  import("../index.js"),
  import("../config/database.js"),
  import("../models/Usuario.js"),
  import("../models/cliente.js"),
  import("../models/contrato.js"),
  import("../models/sucursal.js"),
  import("../models/plan.js"),
  import("../models/profesor.js"),
  import("../models/horario.js"),
  import("../models/asignacion.js"),
  import("../models/asistencia.js"),
  import("../models/pago.js"),
]);

let tokenAdmin;
let sucursalId;

const conAdmin = (peticion) =>
  peticion.set("Authorization", `Bearer ${tokenAdmin}`);

const carpetaContratos = path.join(process.cwd(), "uploads", "contratos");
const PDF = Buffer.from("%PDF-1.4\nprueba\n");

test.before(async () => {
  await sequelize.sync({ force: true });

  await Usuario.create({
    nombre: "Dueño",
    email: "dueno@prueba.cl",
    passwordHash: await bcrypt.hash("Dueno12345", 10),
    rol: "admin",
  });

  const login = await request(app)
    .post("/api/auth/login")
    .send({ email: "dueno@prueba.cl", password: "Dueno12345" });
  tokenAdmin = login.body.token;

  const sucursal = await Sucursal.create({
    nombre: "Sucursal Prueba",
    direccion: "Calle 1",
    comuna: "La Reina",
    ciudad: "Santiago",
  });
  sucursalId = sucursal.id;
});

test.after(async () => {
  await sequelize.close();
});

test("No se pueden crear dos fichas con el mismo correo o RUT", async () => {
  const base = { nombre: "Primera Ficha", sucursalId };

  const primera = await conAdmin(request(app).post("/api/clientes")).send({
    ...base,
    email: "Duplicado@Prueba.cl",
    rut: "11111111-1",
  });
  assert.equal(primera.status, 201);
  assert.equal(primera.body.cliente.email, "duplicado@prueba.cl");
  assert.equal(primera.body.cliente.rut, "11.111.111-1");

  const mismoCorreo = await conAdmin(request(app).post("/api/clientes")).send({
    ...base,
    email: "duplicado@prueba.cl",
  });
  assert.equal(mismoCorreo.status, 409);

  const mismoRut = await conAdmin(request(app).post("/api/clientes")).send({
    ...base,
    rut: "11.111.111-1",
  });
  assert.equal(mismoRut.status, 409);
});

test("La base de datos también impide correos duplicados", async () => {
  await Cliente.create({
    nombres: "Uno",
    nombre: "Uno",
    email: "unico@prueba.cl",
  });

  await assert.rejects(
    Cliente.create({
      nombres: "Dos",
      nombre: "Dos",
      email: "unico@prueba.cl",
    })
  );
});

test("Las fichas sin correo ni RUT siguen permitidas", async () => {
  for (const nombre of ["Sin Datos Uno", "Sin Datos Dos"]) {
    const res = await conAdmin(request(app).post("/api/clientes")).send({
      nombre,
      sucursalId,
      email: "",
      rut: "",
    });
    assert.equal(res.status, 201);
  }
});

test("Se rechaza un RUT inválido al crear una ficha", async () => {
  const res = await conAdmin(request(app).post("/api/clientes")).send({
    nombre: "RUT Malo",
    sucursalId,
    rut: "12.345.678-9",
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.error, undefined);
});

test("Se puede editar una ficha importada sin corregir su correo con tilde", async () => {
  const email = "josé.antiguo@prueba.cl";
  const ficha = await Cliente.create({
    nombres: "Tilde",
    nombre: "Correo Tilde",
    email,
  });

  const igual = await conAdmin(
    request(app).put(`/api/clientes/${ficha.id}`)
  ).send({ telefono: "911111112", email });

  assert.equal(igual.status, 200);

  const nuevo = await conAdmin(
    request(app).put(`/api/clientes/${ficha.id}`)
  ).send({ email: "maría.nueva@prueba.cl" });

  assert.equal(nuevo.status, 400);
});

test("Se puede editar una ficha importada sin corregir su RUT antiguo", async () => {
  const ficha = await Cliente.create({
    nombres: "Antigua",
    nombre: "Antigua",
    rut: "RUT-ANTIGUO",
  });

  const res = await conAdmin(
    request(app).put(`/api/clientes/${ficha.id}`)
  ).send({ telefono: "911111111", rut: "RUT-ANTIGUO" });

  assert.equal(res.status, 200);
  assert.equal(res.body.cliente.telefono, "911111111");
});

test("Editar el correo de la ficha actualiza también la cuenta", async () => {
  const ficha = await Cliente.create({
    nombres: "Cambio",
    nombre: "Cambio Correo",
    email: "antes@prueba.cl",
  });
  const cuenta = await Usuario.create({
    nombre: "Cambio Correo",
    email: "antes@prueba.cl",
    passwordHash: "x",
    rol: "cliente",
  });

  const res = await conAdmin(
    request(app).put(`/api/clientes/${ficha.id}`)
  ).send({ email: "despues@prueba.cl" });
  assert.equal(res.status, 200);

  await cuenta.reload();
  assert.equal(cuenta.email, "despues@prueba.cl");

  const vacio = await conAdmin(
    request(app).put(`/api/clientes/${ficha.id}`)
  ).send({ email: "" });
  assert.equal(vacio.status, 400);
});

test("Editar una ficha ignora campos no permitidos", async () => {
  const ficha = await Cliente.create({
    nombres: "Protegida",
    nombre: "Protegida",
  });

  const res = await conAdmin(
    request(app).put(`/api/clientes/${ficha.id}`)
  ).send({ id: 99999, createdAt: "2000-01-01", telefono: "922222222" });

  assert.equal(res.status, 200);
  assert.equal(res.body.cliente.id, ficha.id);
  assert.notEqual(
    new Date(res.body.cliente.createdAt).getFullYear(),
    2000
  );
});

test("Eliminar un cliente elimina su cuenta, sus contratos y sus archivos", async () => {
  const email = "eliminar@prueba.cl";
  const ficha = await Cliente.create({
    nombres: "Eliminar",
    nombre: "Eliminar",
    email,
  });
  await Usuario.create({
    nombre: "Eliminar",
    email,
    passwordHash: "x",
    rol: "cliente",
  });

  const carga = await conAdmin(request(app).post("/api/contratos"))
    .field("clienteId", String(ficha.id))
    .attach("archivo", PDF, {
      filename: "contrato.pdf",
      contentType: "application/pdf",
    });
  assert.equal(carga.status, 201);

  const archivo = path.join(
    carpetaContratos,
    path.basename(carga.body.contrato.rutaArchivo)
  );
  assert.ok(fs.existsSync(archivo));

  const res = await conAdmin(request(app).delete(`/api/clientes/${ficha.id}`));
  assert.equal(res.status, 200);

  assert.equal(await Usuario.count({ where: { email } }), 0);
  assert.equal(await Contrato.count({ where: { clienteId: ficha.id } }), 0);

  // El borrado del archivo ocurre justo después de responder.
  await new Promise((resolver) => setTimeout(resolver, 100));
  assert.equal(fs.existsSync(archivo), false);
});

test("No se elimina un cliente con pagos o asignaciones", async () => {
  const email = "conpagos@prueba.cl";
  const ficha = await Cliente.create({
    nombres: "Con Pagos",
    nombre: "Con Pagos",
    email,
  });
  await Usuario.create({
    nombre: "Con Pagos",
    email,
    passwordHash: "x",
    rol: "cliente",
  });
  const plan = await Plan.create({
    nombre: "Plan Pagos",
    duracionMeses: 1,
    sesiones: 4,
    precio: 10000,
    modalidad: "Individual",
  });
  const pago = await Pago.create({
    clienteId: ficha.id,
    planId: plan.id,
    monto: 10000,
    fechaPago: "2026-11-01",
    fechaVencimiento: "2026-12-01",
    metodoPago: "Efectivo",
  });

  const conPago = await conAdmin(
    request(app).delete(`/api/clientes/${ficha.id}`)
  );
  assert.equal(conPago.status, 409);
  assert.match(conPago.body.mensaje, /Desactívalo/);
  assert.ok(await Cliente.findByPk(ficha.id));
  assert.equal(await Usuario.count({ where: { email } }), 1);
  assert.ok(await Pago.findByPk(pago.id));

  await pago.destroy();

  const sinPago = await conAdmin(
    request(app).delete(`/api/clientes/${ficha.id}`)
  );
  assert.equal(sinPago.status, 200);
});

test("Un contrato se guarda con nombre y extensión decididos por el servidor", async () => {
  const ficha = await Cliente.create({
    nombres: "Carga",
    nombre: "Carga",
    email: "carga@prueba.cl",
  });

  const res = await conAdmin(request(app).post("/api/contratos"))
    .field("clienteId", String(ficha.id))
    .attach("archivo", PDF, {
      filename: "../../malicioso.html",
      contentType: "application/pdf",
    });
  assert.equal(res.status, 201);

  const nombre = path.basename(res.body.contrato.rutaArchivo);
  assert.match(nombre, /^contrato-[0-9a-f-]{36}\.pdf$/);

  fs.rmSync(path.join(carpetaContratos, nombre), { force: true });
});

test("Se rechaza un archivo cuyo contenido no coincide con su tipo", async () => {
  const ficha = await Cliente.create({
    nombres: "Falso",
    nombre: "Falso",
    email: "falso@prueba.cl",
  });
  const antes = fs.readdirSync(carpetaContratos).length;

  const res = await conAdmin(request(app).post("/api/contratos"))
    .field("clienteId", String(ficha.id))
    .attach("archivo", Buffer.from("<script>alert(1)</script>"), {
      filename: "contrato.pdf",
      contentType: "application/pdf",
    });

  assert.equal(res.status, 400);
  assert.equal(fs.readdirSync(carpetaContratos).length, antes);
});

test("Se rechaza un tipo de archivo no permitido sin revelar detalles", async () => {
  const ficha = await Cliente.create({
    nombres: "Tipo",
    nombre: "Tipo",
    email: "tipo@prueba.cl",
  });

  const res = await conAdmin(request(app).post("/api/contratos"))
    .field("clienteId", String(ficha.id))
    .attach("archivo", Buffer.from("MZ"), {
      filename: "virus.exe",
      contentType: "application/x-msdownload",
    });

  assert.equal(res.status, 400);
  assert.match(res.body.mensaje, /PDF, JPG o PNG/);
});

test("Un JSON inválido recibe un error limpio, sin detalles internos", async () => {
  const res = await request(app)
    .post("/api/auth/login")
    .set("Content-Type", "application/json")
    .send("{ no es json");

  assert.equal(res.status, 400);
  assert.equal(res.body.ok, false);
  assert.ok(!JSON.stringify(res.body).includes("at "));
});

test("Una ruta inexistente responde 404 en JSON", async () => {
  const res = await request(app).get("/api/no-existe");

  assert.equal(res.status, 404);
  assert.equal(res.body.ok, false);
});

test("Un cliente no puede crear ni modificar horarios", async () => {
  const email = "sinpermiso@prueba.cl";

  await Usuario.create({
    nombre: "Sin Permiso",
    email,
    passwordHash: await bcrypt.hash("Permiso1234", 10),
    rol: "cliente",
  });

  const login = await request(app)
    .post("/api/auth/login")
    .send({ email, password: "Permiso1234" });
  const autorizacion = `Bearer ${login.body.token}`;

  const crear = await request(app)
    .post("/api/horarios")
    .set("Authorization", autorizacion)
    .send({ diaSemana: "Lunes" });
  assert.equal(crear.status, 403);

  const modificar = await request(app)
    .put("/api/horarios/1")
    .set("Authorization", autorizacion)
    .send({ diaSemana: "Martes" });
  assert.equal(modificar.status, 403);
});

test("El panel del cliente entrega vigencia, sesiones y asistencias reales", async () => {
  const email = "panel@prueba.cl";

  await Usuario.create({
    nombre: "Panel",
    email,
    passwordHash: await bcrypt.hash("Panel12345", 10),
    rol: "cliente",
  });

  const ficha = await Cliente.create({
    nombres: "Panel",
    nombre: "Panel",
    email,
  });
  const plan = await Plan.create({
    nombre: "Plan 12",
    duracionMeses: 2,
    sesiones: 12,
    precio: 100000,
    modalidad: "Individual",
  });
  const profesor = await Profesor.create({
    nombre: "Profesor Prueba",
    especialidad: "Fuerza",
    sucursalId,
  });
  const horario = await Horario.create({
    profesorId: profesor.id,
    diaSemana: "Lunes",
    horaInicio: "18:00",
    horaFin: "19:00",
    modalidad: "Individual",
  });
  const asignacion = await Asignacion.create({
    clienteId: ficha.id,
    planId: plan.id,
    horarioId: horario.id,
    fechaInicio: "2026-01-31",
  });
  await Asistencia.bulkCreate([
    { asignacionId: asignacion.id, fecha: "2026-02-02", estado: "Presente" },
    { asignacionId: asignacion.id, fecha: "2026-02-09", estado: "Presente" },
    { asignacionId: asignacion.id, fecha: "2026-02-16", estado: "Ausente" },
  ]);

  const login = await request(app)
    .post("/api/auth/login")
    .send({ email, password: "Panel12345" });

  const res = await request(app)
    .get("/api/clientes/mi-dashboard")
    .set("Authorization", `Bearer ${login.body.token}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.asignacion.fechaInicio, "2026-01-31");
  assert.equal(res.body.asignacion.fechaTerminoVigencia, "2026-03-31");
  assert.equal(res.body.asignacion.sesionesTotales, 12);
  assert.equal(res.body.asignacion.sesionesUtilizadas, 3);
  assert.equal(res.body.asignacion.sesionesRestantes, 9);
  assert.equal(res.body.asistencias.length, 3);
  assert.equal(res.body.asistencias[0].fecha, "2026-02-16");

  // Con el plan congelado, el cliente lo sigue viendo, marcado como congelado.
  await asignacion.update({ estado: "Congelada" });

  const congelado = await request(app)
    .get("/api/clientes/mi-dashboard")
    .set("Authorization", `Bearer ${login.body.token}`);

  assert.equal(congelado.body.plan.nombre, "Plan 12");
  assert.equal(congelado.body.asignacion.estado, "Congelada");
  assert.equal(congelado.body.asignacion.sesionesRestantes, 9);
});
