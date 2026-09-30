import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcryptjs';

process.env.NODE_ENV = 'test';

const [{ default: app }, { default: sequelize }, { default: Usuario }, { default: Cliente }] =
  await Promise.all([
    import('../index.js'),
    import('../config/database.js'),
    import('../models/Usuario.js'),
    import('../models/Cliente.js'),
  ]);

const adminData = {
  nombre: 'Admin Test',
  email: 'admin@focuspowerfit.cl',
  password: 'Admin123',
  rol: 'admin',
};

test.before(async () => {
  await sequelize.sync({ force: true });
  const { password, ...usuarioData } = adminData;

  await Usuario.create({
    ...usuarioData,
    passwordHash: await bcrypt.hash(password, 10),
  });

  await Usuario.create({
    id: 50,
    nombre: 'Cliente Test',
    email: 'cliente@focuspowerfit.cl',
    passwordHash: await bcrypt.hash('Cliente123', 10),
    rol: 'cliente',
  });

  await Cliente.create({
    id: 75,
    nombre: 'Nombre desde Clientes',
    email: 'cliente@focuspowerfit.cl',
    rut: '12345678-9',
    telefono: '912345678',
    estado: 'Activo',
  });
});

test.after(async () => {
  await sequelize.close();
});

test('POST /api/auth/login devuelve JWT válido', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@focuspowerfit.cl', password: 'Admin123' });

  assert.equal(res.status, 200);
  assert.ok(res.body.token);
  assert.equal(res.body.user.email, 'admin@focuspowerfit.cl');
  assert.equal(res.body.user.rol, 'admin');
});

test('POST /api/auth/login distingue email no registrado', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'inexistente@focuspowerfit.cl', password: 'Admin123' });

  assert.equal(res.status, 401);
  assert.equal(res.body.codigo, 'EMAIL_NO_REGISTRADO');
  assert.equal(res.body.mensaje, 'Email no registrado.');
});

test('POST /api/auth/login informa contraseña incorrecta', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: adminData.email, password: 'incorrecta' });

  assert.equal(res.status, 401);
  assert.equal(res.body.codigo, 'CREDENCIALES_INVALIDAS');
  assert.equal(res.body.mensaje, 'Correo o contraseña incorrectos.');
});

test('GET /api/clientes/mi-dashboard busca al cliente por correo', async () => {
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'cliente@focuspowerfit.cl', password: 'Cliente123' });

  const res = await request(app)
    .get('/api/clientes/mi-dashboard')
    .set('Authorization', `Bearer ${loginRes.body.token}`);

  assert.equal(loginRes.status, 200);
  assert.equal(res.status, 200);
  assert.equal(res.body.cliente.id, 75);
  assert.equal(res.body.cliente.nombre, 'Nombre desde Clientes');
  assert.equal(res.body.cliente.rut, '12345678-9');
});

test('POST /api/auth/register rechaza un RUT inválido por Módulo 11', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      nombre: 'Ana María',
      apellidos: 'Pérez Soto',
      email: 'ana.nueva@focuspowerfit.cl',
      password: 'Fuerte123',
      rut: '12.345.678-9',
      telefono: '912345678',
    });

  assert.equal(res.status, 400);
  assert.match(res.body.mensaje, /RUT no es válido/);
});

test('POST /api/auth/register rechaza contraseña débil y celular incompleto', async () => {
  const datosRegistro = {
    nombre: 'Ana María',
    apellidos: 'Pérez Soto',
    email: 'ana.nueva@focuspowerfit.cl',
    password: 'corta1',
    rut: '12.345.678-5',
    telefono: '912345678',
  };

  const passwordRes = await request(app)
    .post('/api/auth/register')
    .send(datosRegistro);
  assert.equal(passwordRes.status, 400);
  assert.match(passwordRes.body.mensaje, /contraseña requiere 8 caracteres/);

  const telefonoRes = await request(app)
    .post('/api/auth/register')
    .send({ ...datosRegistro, password: 'Fuerte123', telefono: '91234567' });
  assert.equal(telefonoRes.status, 400);
  assert.match(telefonoRes.body.mensaje, /exactamente 9 dígitos/);
});

test('GET /api/clientes exige token y rol admin', async () => {
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@focuspowerfit.cl', password: 'Admin123' });

  const res = await request(app)
    .get('/api/clientes')
    .set('Authorization', `Bearer ${loginRes.body.token}`);

  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
});
