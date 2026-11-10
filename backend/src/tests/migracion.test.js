import test from "node:test";
import assert from "node:assert/strict";
import { QueryTypes } from "sequelize";

const [{ default: sequelize }, { migrarSeguridad }] = await Promise.all([
  import("../config/database.js"),
  import("../scripts/migrarSeguridad.js"),
]);

const contar = async (condicion) => {
  const [{ total }] = await sequelize.query(
    `SELECT COUNT(*) AS total FROM clientes WHERE ${condicion}`,
    { type: QueryTypes.SELECT }
  );

  return Number(total);
};

test.before(async () => {
  // Estructura de una base creada antes de esta migración.
  await sequelize.query(
    "CREATE TABLE usuarios (id INTEGER PRIMARY KEY, email VARCHAR(150))"
  );
  await sequelize.query(
    "CREATE TABLE clientes (id INTEGER PRIMARY KEY, email VARCHAR(150), rut VARCHAR(20))"
  );
  await sequelize.query(`
    INSERT INTO clientes (id, email, rut) VALUES
      (1, 'Repetido@Prueba.cl', '11.111.111-1'),
      (2, 'repetido@prueba.cl', '22.222.222-2'),
      (3, '', ''),
      (4, '', '')
  `);
});

test.after(async () => {
  await sequelize.close();
});

test("Informa duplicados sin borrar datos y crea lo que puede", async () => {
  const mensajes = [];

  const { duplicados } = await migrarSeguridad(sequelize, (mensaje) =>
    mensajes.push(mensaje)
  );

  assert.deepEqual(duplicados, { email: [[1, 2]] });
  assert.equal(await contar("1 = 1"), 4);

  // Los campos vacíos pasan a NULL y no cuentan como duplicados.
  assert.equal(await contar("email IS NULL AND rut IS NULL"), 2);

  const columnas = await sequelize
    .getQueryInterface()
    .describeTable("usuarios");
  assert.ok(columnas.terminosAceptadosAt);

  const indices = await sequelize.getQueryInterface().showIndex("clientes");
  assert.ok(indices.some(({ name }) => name === "clientes_rut_unico"));
  assert.ok(!indices.some(({ name }) => name === "clientes_email_unico"));

  // Por privacidad informa identificadores, no correos.
  assert.ok(!mensajes.join(" ").includes("@"));
});

test("Al corregir los duplicados se completa y puede repetirse", async () => {
  await sequelize.query(
    "UPDATE clientes SET email = 'corregido@prueba.cl' WHERE id = 2"
  );

  const primera = await migrarSeguridad(sequelize, () => {});
  assert.deepEqual(primera.duplicados, {});

  const indices = await sequelize.getQueryInterface().showIndex("clientes");
  assert.ok(indices.some(({ name }) => name === "clientes_email_unico"));

  const repetida = await migrarSeguridad(sequelize, () => {});
  assert.deepEqual(repetida.duplicados, {});
});

test("Un espacio sobrante no esconde un RUT repetido", async () => {
  await sequelize.query("DROP TABLE clientes");
  await sequelize.query(
    "CREATE TABLE clientes (id INTEGER PRIMARY KEY, email VARCHAR(150), rut VARCHAR(20))"
  );
  await sequelize.query(`
    INSERT INTO clientes (id, email, rut) VALUES
      (1, 'uno@prueba.cl', '11.111.111-1'),
      (2, 'dos@prueba.cl', '11.111.111-1 ')
  `);

  const { duplicados } = await migrarSeguridad(sequelize, () => {});

  assert.deepEqual(duplicados, { rut: [[1, 2]] });
});
