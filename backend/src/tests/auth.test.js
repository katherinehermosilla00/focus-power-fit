import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import app from '../index.js';
import sequelize from '../config/database.js';
import Usuario from '../models/Usuario.js';

const adminData = {
  nombre: 'Admin Test',
  email: 'admin@focuspowerfit.cl',
  password: 'Admin123',
  rol: 'admin',
};

test.before(async () => {
  await sequelize.sync({ force: true });
  await Usuario.create(adminData);
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
