import test from "node:test";
import assert from "node:assert/strict";

const [
  { default: sequelize },
  { default: Cliente },
  { default: Contrato },
  { default: Sucursal },
  { unirDuplicados },
] = await Promise.all([
  import("../config/database.js"),
  import("../models/cliente.js"),
  import("../models/contrato.js"),
  import("../models/sucursal.js"),
  import("../scripts/unirDuplicados.js"),
]);

const fechas = new Map([
  ["1|persona@prueba.cl", "2024-01-10"],
  ["2|persona@prueba.cl", "2025-03-02"],
  ["1|rutmalo@prueba.cl", "2025-06-01"],
  ["2|rutmalo@prueba.cl", "2024-06-01"],
  ["1|historial@prueba.cl", "2024-01-01"],
  ["2|historial@prueba.cl", "2025-01-01"],
  ["1|familia@prueba.cl", "2024-01-01"],
  ["2|familia@prueba.cl", "2025-01-01"],
  ["1|ruts@prueba.cl", "2024-01-01"],
  ["2|ruts@prueba.cl", "2025-01-01"],
  ["1|empate@prueba.cl", "2025-01-01"],
  ["2|empate@prueba.cl", "2025-01-01"],
]);

const ficha = (id, sucursalId, email, extra = {}) =>
  Cliente.create({
    id,
    sucursalId,
    nombres: "Ana",
    nombre: "Ana Prueba",
    email,
    ...extra,
  });

const RUT_VALIDO = "11.111.111-1";
const OTRO_RUT_VALIDO = "22.222.222-2";

test.before(async () => {
  await sequelize.sync({ force: true });

  // Igual que una base importada: todavía sin correo ni RUT únicos.
  const consultas = sequelize.getQueryInterface();
  await consultas.dropTable("clientes");
  await consultas.createTable(
    "clientes",
    Object.fromEntries(
      Object.entries(Cliente.getAttributes()).map(([nombre, atributo]) => [
        nombre,
        { ...atributo, unique: false, references: undefined },
      ])
    )
  );

  await Sucursal.bulkCreate([
    { id: 1, nombre: "Uno", comuna: "Uno" },
    { id: 2, nombre: "Dos", comuna: "Dos" },
  ]);

  // Misma persona: queda la más reciente, completada con lo que le falta.
  await ficha(1, 1, "persona@prueba.cl", {
    telefono: "911111111",
    rut: "33.333.333-3",
    direccion: "Calle Antigua",
  });
  await ficha(2, 2, "persona@prueba.cl", { direccion: "Calle Nueva" });

  // Un RUT válido y otro inválido: se conserva el válido.
  await ficha(3, 1, "rutmalo@prueba.cl", { rut: "12.345.678-9" });
  await ficha(4, 2, "rutmalo@prueba.cl", { rut: RUT_VALIDO });

  // Casos que no se deben unir.
  await ficha(5, 1, "historial@prueba.cl");
  await ficha(6, 2, "historial@prueba.cl");
  await Contrato.create({
    clienteId: 5,
    nombreArchivo: "c.pdf",
    rutaArchivo: "/uploads/contratos/c.pdf",
  });

  await ficha(7, 1, "familia@prueba.cl");
  await ficha(8, 2, "familia@prueba.cl", { nombre: "Pedro Prueba" });

  await ficha(9, 1, "ruts@prueba.cl", { rut: "44.444.444-4" });
  await ficha(10, 2, "ruts@prueba.cl", { rut: OTRO_RUT_VALIDO });

  await ficha(11, 1, "empate@prueba.cl");
  await ficha(12, 2, "empate@prueba.cl");
});

test.after(async () => {
  await sequelize.close();
});

test("La simulación informa el resultado y no cambia nada", async () => {
  const antes = await Cliente.count();

  const { unidas, revisar } = await unirDuplicados({ fechas });

  assert.deepEqual(
    unidas.map(({ queda, seUne }) => [queda, seUne]).sort((a, b) => a[0] - b[0]),
    [
      [2, 1],
      [3, 4],
    ]
  );
  assert.deepEqual(
    revisar.map(({ ids, motivo }) => [ids.join(","), motivo]).sort(),
    [
      ["11,12", "misma fecha o sin fecha"],
      ["5,6", "tiene historial"],
      ["7,8", "nombre distinto"],
      ["9,10", "RUT distintos"],
    ]
  );
  assert.equal(await Cliente.count(), antes);
});

test("Al aplicar deja una ficha completa y conserva los casos a revisar", async () => {
  await unirDuplicados({ fechas, aplicar: true });

  assert.equal(await Cliente.findByPk(1), null);
  assert.equal(await Cliente.findByPk(4), null);

  const persona = await Cliente.findByPk(2);
  assert.equal(persona.sucursalId, 2);
  assert.equal(persona.telefono, "911111111");
  assert.equal(persona.rut, "33.333.333-3");
  // Lo que ya tenía la ficha que queda no se reemplaza.
  assert.equal(persona.direccion, "Calle Nueva");

  const rutMalo = await Cliente.findByPk(3);
  assert.equal(rutMalo.sucursalId, 1);
  assert.equal(rutMalo.rut, RUT_VALIDO);

  for (const id of [5, 6, 7, 8, 9, 10, 11, 12]) {
    assert.ok(await Cliente.findByPk(id), `falta la ficha ${id}`);
  }
});

test("Se puede ejecutar otra vez sin cambiar lo que ya se unió", async () => {
  const antes = await Cliente.count();

  const { unidas } = await unirDuplicados({ fechas, aplicar: true });

  assert.equal(unidas.length, 0);
  assert.equal(await Cliente.count(), antes);
});
