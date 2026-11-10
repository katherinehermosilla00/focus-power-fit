import test, { mock } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import bcrypt from "bcryptjs";

const [
  { default: app },
  { default: sequelize },
  { default: Usuario },
  { default: Cliente },
  { transporter },
  { buscarPorCorreo },
] = await Promise.all([
  import("../index.js"),
  import("../config/database.js"),
  import("../models/Usuario.js"),
  import("../models/cliente.js"),
  import("../config/mailer.js"),
  import("../utils/validaciones.js"),
]);

// Cada escenario usa su propia IP para no agotar el límite de otro.
app.set("trust proxy", 1);
let ipSiguiente = 1;
const nuevaIp = () => `198.51.100.${ipSiguiente++}`;

const correos = [];

// RUT con dígito verificador correcto.
const RUT_A = "11.111.111-1";
const RUT_B = "22.222.222-2";
const RUT_C = "33.333.333-3";
const RUT_D = "44.444.444-4";
const RUT_E = "55.555.555-5";

const datos = (email, rut, extra = {}) => ({
  nombre: "Ana María",
  apellidos: "Pérez Soto",
  email,
  password: "Fuerte123",
  rut,
  telefono: "912345678",
  aceptaTerminos: true,
  ...extra,
});

const post = (ruta, cuerpo, ip = nuevaIp()) =>
  request(app)
    .post(ruta)
    .set("X-Forwarded-For", ip)
    .send(cuerpo);

const ultimoCodigoPara = (email) =>
  correos
    .filter((correo) => correo.to === email)
    .at(-1)
    ?.html.match(/\b\d{6}\b/)?.[0];

test.before(async () => {
  await sequelize.sync({ force: true });

  mock.method(transporter, "sendMail", async (correo) => {
    correos.push(correo);
    return {};
  });
});

test.after(async () => {
  mock.restoreAll();
  await sequelize.close();
});

test("Un cliente nuevo completa el registro y entra a su cuenta", async () => {
  const email = "nueva@prueba.cl";

  const registro = await post("/api/auth/register", datos(email, RUT_A));
  assert.equal(registro.status, 202);

  const verificacion = await post("/api/auth/register/verify", {
    email,
    codigo: ultimoCodigoPara(email),
    password: "Fuerte123",
  });

  assert.equal(verificacion.status, 201);
  assert.ok(verificacion.body.token);

  const cliente = await Cliente.findOne({ where: { email } });
  assert.equal(cliente.nombres, "Ana María");
  assert.equal(cliente.apellidos, "Pérez Soto");
  assert.equal(cliente.rut, RUT_A);

  const usuario = await Usuario.findOne({ where: { email } });
  assert.ok(usuario.terminosAceptadosAt);

  const panel = await request(app)
    .get("/api/clientes/mi-dashboard")
    .set("Authorization", `Bearer ${verificacion.body.token}`);
  assert.equal(panel.status, 200);
});

test("Un cliente cargado por el gimnasio puede crear su cuenta sobre su ficha", async () => {
  const email = "existente@prueba.cl";
  const ficha = await Cliente.create({
    nombres: "Ficha",
    nombre: "Ficha Existente",
    email,
    rut: RUT_B,
    telefono: "988888888",
  });

  const registro = await post("/api/auth/register", datos(email, RUT_B));
  assert.equal(registro.status, 202);

  const verificacion = await post("/api/auth/register/verify", {
    email,
    codigo: ultimoCodigoPara(email),
    password: "Fuerte123",
  });
  assert.equal(verificacion.status, 201);

  assert.equal(await Cliente.count({ where: { email } }), 1);

  await ficha.reload();
  assert.equal(ficha.nombre, "Ficha Existente");
  assert.equal(ficha.telefono, "988888888");
});

test("El registro responde igual para correos y RUT ya registrados", async () => {
  await Cliente.create({
    nombres: "Otra",
    nombre: "Otra Persona",
    email: "otra@prueba.cl",
    rut: RUT_C,
  });

  const libre = await post(
    "/api/auth/register",
    datos("libre@prueba.cl", RUT_D)
  );
  const rutAjeno = await post(
    "/api/auth/register",
    datos("atacante@prueba.cl", RUT_C)
  );
  const cuentaExistente = await post(
    "/api/auth/register",
    datos("nueva@prueba.cl", RUT_E)
  );

  assert.equal(rutAjeno.status, libre.status);
  assert.deepEqual(rutAjeno.body, libre.body);
  assert.equal(cuentaExistente.status, libre.status);
  assert.deepEqual(cuentaExistente.body, libre.body);

  // El correo no delata a quién pertenece el RUT: es igual al de un RUT libre.
  const asunto = (email) =>
    correos.filter((correo) => correo.to === email).at(-1).subject;

  assert.equal(asunto("atacante@prueba.cl"), asunto("libre@prueba.cl"));

  // Con un RUT ajeno no se crea la cuenta y queda solo el aviso del mesón.
  const verificacion = await post("/api/auth/register/verify", {
    email: "atacante@prueba.cl",
    codigo: ultimoCodigoPara("atacante@prueba.cl"),
    password: "Fuerte123",
  });

  assert.equal(verificacion.status, 409);
  assert.match(verificacion.body.mensaje, /mesón/);
  assert.equal(
    await Usuario.count({ where: { email: "atacante@prueba.cl" } }),
    0
  );
});

test("Un correo con tilde no sirve para entrar, recuperar ni registrarse", async () => {
  const email = "víctima@dominió.cl";

  for (const [ruta, cuerpo] of [
    ["/api/auth/password/forgot", { email }],
    ["/api/auth/register", datos(email, "")],
    ["/api/auth/login", { email, password: "Fuerte123" }],
  ]) {
    const respuesta = await post(ruta, cuerpo);

    assert.equal(respuesta.status, 400, ruta);
  }

  assert.equal(correos.filter((correo) => correo.to === email).length, 0);
});

test("La búsqueda por correo descarta lo que MySQL considera igual", async () => {
  // MySQL devolvería la ficha con tilde; SQLite no, por eso se simula su respuesta.
  const filas = [
    { id: 1, email: "josé@prueba.cl" },
    { id: 2, email: "Jose@Prueba.cl" },
  ];
  const Modelo = { findAll: async () => filas };

  assert.equal((await buscarPorCorreo(Modelo, "jose@prueba.cl")).id, 2);
  assert.equal(await buscarPorCorreo({ findAll: async () => [filas[0]] }, "jose@prueba.cl"), null);
});

test("El registro exige aceptar los términos", async () => {
  const res = await post(
    "/api/auth/register",
    datos("sin-terminos@prueba.cl", RUT_E, { aceptaTerminos: false })
  );

  assert.equal(res.status, 400);
  assert.match(res.body.mensaje, /términos/);
});

test("Un cliente nuevo se registra sin RUT y no se mezcla con fichas sin RUT", async () => {
  const email = "sinrut.nueva@prueba.cl";
  const ajena = await Cliente.create({
    nombres: "Ajena",
    nombre: "Ficha Ajena",
    email: "ajena.sinrut@prueba.cl",
  });

  const registro = await post("/api/auth/register", datos(email, ""));
  assert.equal(registro.status, 202);

  const verificacion = await post("/api/auth/register/verify", {
    email,
    codigo: ultimoCodigoPara(email),
    password: "Fuerte123",
  });
  assert.equal(verificacion.status, 201);

  const cliente = await Cliente.findOne({ where: { email } });
  assert.notEqual(cliente.id, ajena.id);
  assert.equal(cliente.rut, null);

  await ajena.reload();
  assert.equal(ajena.nombre, "Ficha Ajena");
});

test("El RUT también se puede omitir por completo en la solicitud", async () => {
  const email = "sinrut.campo@prueba.cl";
  const { rut, ...sinRut } = datos(email, "");
  assert.equal(rut, "");

  const registro = await post("/api/auth/register", sinRut);
  assert.equal(registro.status, 202);
  assert.ok(ultimoCodigoPara(email));
});

test("Una ficha con RUT activa su cuenta sin escribirlo y lo conserva", async () => {
  const email = "conrut.ficha@prueba.cl";
  const rutFicha = "13.131.313-6";
  const ficha = await Cliente.create({
    nombres: "ConRut",
    nombre: "Ficha Con Rut",
    email,
    rut: rutFicha,
  });

  const registro = await post("/api/auth/register", datos(email, ""));
  assert.equal(registro.status, 202);

  const verificacion = await post("/api/auth/register/verify", {
    email,
    codigo: ultimoCodigoPara(email),
    password: "Fuerte123",
  });
  assert.equal(verificacion.status, 201);

  assert.equal(await Cliente.count({ where: { email } }), 1);
  await ficha.reload();
  assert.equal(ficha.rut, rutFicha);
});

test("Si se escribe un RUT, debe ser válido y coincidir con la ficha", async () => {
  const email = "rutescrito@prueba.cl";
  await Cliente.create({
    nombres: "Escrito",
    nombre: "Rut Escrito",
    email,
    rut: "14.141.414-3",
  });

  const invalido = await post(
    "/api/auth/register",
    datos(email, "12.345.678-9")
  );
  assert.equal(invalido.status, 400);

  const distinto = await post("/api/auth/register", datos(email, "99.999.999-9"));
  assert.equal(distinto.status, 202);

  const verificacion = await post("/api/auth/register/verify", {
    email,
    codigo: ultimoCodigoPara(email),
    password: "Fuerte123",
  });
  assert.equal(verificacion.status, 409);
  assert.equal(await Usuario.count({ where: { email } }), 0);
});

test("Una ficha importada solo con correo activa su cuenta sin duplicarse", async () => {
  const email = "solocorreo@prueba.cl";
  const ficha = await Cliente.create({
    nombres: "Importada",
    nombre: "Ficha Importada",
    email,
  });

  assert.equal(await Usuario.count({ where: { email } }), 0);

  const registro = await post("/api/auth/register", datos(email, "99.999.999-9"));
  assert.equal(registro.status, 202);

  const verificacion = await post("/api/auth/register/verify", {
    email,
    codigo: ultimoCodigoPara(email),
    password: "Fuerte123",
  });
  assert.equal(verificacion.status, 201);

  assert.equal(await Cliente.count({ where: { email } }), 1);
  await ficha.reload();
  assert.equal(ficha.nombre, "Ficha Importada");
  assert.equal(ficha.rut, "99.999.999-9");

  const usuario = await Usuario.findOne({ where: { email } });
  assert.ok(usuario.terminosAceptadosAt);
});

test("Una ficha sin cuenta que pide recuperar recibe cómo activarla", async () => {
  const email = "sinactivar@prueba.cl";
  await Cliente.create({ nombres: "Sin", nombre: "Sin Activar", email });

  const ficha = await post("/api/auth/password/forgot", { email });
  const desconocido = await post("/api/auth/password/forgot", {
    email: "desconocido@prueba.cl",
  });

  // La respuesta no revela quién es cliente.
  assert.equal(ficha.status, desconocido.status);
  assert.deepEqual(ficha.body, desconocido.body);

  const recibidos = correos.filter((correo) => correo.to === email);
  assert.equal(recibidos.length, 1);
  assert.match(recibidos[0].subject, /Activa tu cuenta/);
  assert.equal(ultimoCodigoPara(email), undefined);
  assert.equal(
    correos.filter((correo) => correo.to === "desconocido@prueba.cl").length,
    0
  );
});

test("La verificación exige la misma contraseña del registro", async () => {
  const email = "contrasena@prueba.cl";

  await post("/api/auth/register", datos(email, "6.666.666-2"));

  const res = await post("/api/auth/register/verify", {
    email,
    codigo: ultimoCodigoPara(email),
    password: "OtraClave123",
  });

  assert.equal(res.status, 400);
  assert.equal(await Usuario.count({ where: { email } }), 0);
});

test("El código de registro se invalida al superar 5 intentos", async () => {
  const email = "intentos@prueba.cl";

  await post("/api/auth/register", datos(email, "7.777.777-6"));
  const codigo = ultimoCodigoPara(email);
  const incorrecto = codigo === "000000" ? "000001" : "000000";
  const ip = nuevaIp();

  for (let intento = 1; intento <= 4; intento += 1) {
    const res = await post(
      "/api/auth/register/verify",
      { email, codigo: incorrecto, password: "Fuerte123" },
      ip
    );
    assert.equal(res.status, 400);
  }

  const quinto = await post(
    "/api/auth/register/verify",
    { email, codigo: incorrecto, password: "Fuerte123" },
    ip
  );
  assert.equal(quinto.status, 429);

  const conCodigoCorrecto = await post(
    "/api/auth/register/verify",
    { email, codigo, password: "Fuerte123" },
    ip
  );
  assert.equal(conCodigoCorrecto.status, 400);
});

test("Un registro vencido deja de bloquear al usuario", async () => {
  const email = "vencido@prueba.cl";

  await post("/api/auth/register", datos(email, "8.888.888-K"));
  assert.equal(correos.filter((c) => c.to === email).length, 1);

  mock.timers.enable({
    apis: ["Date"],
    now: Date.now() + 11 * 60 * 1000,
  });

  try {
    const res = await post("/api/auth/register", datos(email, "8.888.888-K"));

    assert.equal(res.status, 202);
    assert.equal(correos.filter((c) => c.to === email).length, 2);
  } finally {
    mock.timers.reset();
  }
});

test("No se envía más de un correo por minuto a la misma dirección", async () => {
  const email = "bandeja@prueba.cl";

  await post("/api/auth/register", datos(email, "9.999.999-3"));
  await post("/api/auth/register", datos(email, "9.999.999-3"));

  assert.equal(correos.filter((c) => c.to === email).length, 1);
});

test("El registro limita las solicitudes por IP", async () => {
  const ip = nuevaIp();

  for (let intento = 1; intento <= 10; intento += 1) {
    const res = await post("/api/auth/register", {}, ip);
    assert.equal(res.status, 400);
  }

  const bloqueado = await post("/api/auth/register", {}, ip);
  assert.equal(bloqueado.status, 429);
});

test("La recuperación responde igual exista o no la cuenta", async () => {
  await Usuario.create({
    nombre: "Con Cuenta",
    email: "concuenta@prueba.cl",
    passwordHash: await bcrypt.hash("Anterior123", 10),
    rol: "cliente",
  });

  const existe = await post("/api/auth/password/forgot", {
    email: "concuenta@prueba.cl",
  });
  const noExiste = await post("/api/auth/password/forgot", {
    email: "nadie@prueba.cl",
  });

  assert.equal(existe.status, 202);
  assert.equal(noExiste.status, existe.status);
  assert.deepEqual(noExiste.body, existe.body);
  assert.equal(correos.filter((c) => c.to === "nadie@prueba.cl").length, 0);
});

test("Recuperar la contraseña la reemplaza e invalida las sesiones anteriores", async () => {
  const email = "recupera@prueba.cl";

  await Usuario.create({
    nombre: "Recupera",
    email,
    passwordHash: await bcrypt.hash("Anterior123", 10),
    rol: "admin",
  });

  const login = await post("/api/auth/login", {
    email,
    password: "Anterior123",
  });
  const tokenAnterior = login.body.token;

  await post("/api/auth/password/forgot", { email });

  const reset = await post("/api/auth/password/reset", {
    email,
    codigo: ultimoCodigoPara(email),
    password: "Nueva12345",
  });
  assert.equal(reset.status, 200);

  const sesionAnterior = await request(app)
    .get("/api/clientes")
    .set("Authorization", `Bearer ${tokenAnterior}`);
  assert.equal(sesionAnterior.status, 401);

  const conClaveAntigua = await post("/api/auth/login", {
    email,
    password: "Anterior123",
  });
  assert.equal(conClaveAntigua.status, 401);

  const conClaveNueva = await post("/api/auth/login", {
    email,
    password: "Nueva12345",
  });
  assert.equal(conClaveNueva.status, 200);

  // El código es de un solo uso.
  const reutilizado = await post("/api/auth/password/reset", {
    email,
    codigo: ultimoCodigoPara(email),
    password: "Otra123456",
  });
  assert.equal(reutilizado.status, 400);
});

test("La recuperación rechaza contraseñas débiles y códigos incorrectos", async () => {
  const email = "concuenta@prueba.cl";
  const codigo = ultimoCodigoPara(email);

  const debil = await post("/api/auth/password/reset", {
    email,
    codigo,
    password: "corta",
  });
  assert.equal(debil.status, 400);

  const incorrecto = await post("/api/auth/password/reset", {
    email,
    codigo: codigo === "000000" ? "000001" : "000000",
    password: "Nueva12345",
  });
  assert.equal(incorrecto.status, 400);
});
