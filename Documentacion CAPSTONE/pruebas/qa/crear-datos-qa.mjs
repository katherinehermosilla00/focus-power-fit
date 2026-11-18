// Crea las cuentas y datos ficticios que usan las pruebas de QA.
// Se ejecuta DENTRO del contenedor backend del entorno QA (ver pruebas/README.md):
//   docker compose -p fpf-qa cp ../pruebas/qa/. backend:/app/backend/qa
//   docker compose -p fpf-qa exec -T backend node qa/crear-datos-qa.mjs
// Nunca se ejecuta contra la base real: se niega si NODE_ENV no es production
// dentro de Docker o si la base no se llama focus_power_fit del contenedor mysql.
import fs from "node:fs";
import bcrypt from "bcryptjs";
import { Op } from "sequelize";

if (process.env.DB_HOST !== "mysql") {
  console.error("Este script solo corre dentro del entorno QA de Docker.");
  process.exit(1);
}

const cuentas = JSON.parse(
  fs.readFileSync(new URL("./cuentas-qa.json", import.meta.url), "utf8")
);

const { default: sequelize } = await import("../src/config/database.js");
const { default: Usuario } = await import("../src/models/Usuario.js");
const { default: Cliente } = await import("../src/models/cliente.js");
const { default: Sucursal } = await import("../src/models/sucursal.js");
const { default: Plan } = await import("../src/models/plan.js");
const { default: Profesor } = await import("../src/models/profesor.js");
const { default: Horario } = await import("../src/models/horario.js");
const { default: Asignacion } = await import("../src/models/asignacion.js");
const { default: Asistencia } = await import("../src/models/asistencia.js");
const { DIAS_SEMANA, obtenerFechaLocal } = await import("../src/utils/clases.js");

const crearUsuario = async ({ nombre, email, password }, rol) => {
  const [usuario, creado] = await Usuario.findOrCreate({
    where: { email },
    defaults: {
      nombre,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      rol,
      estado: "activo",
    },
  });
  console.log(`${creado ? "Creado" : "Ya existía"}: usuario ${rol} ${email}`);
  return usuario;
};

await crearUsuario(cuentas.admin, "admin");
await crearUsuario(cuentas.cliente, "cliente");

const sucursal = await Sucursal.findOne({ order: [["id", "ASC"]] });

const [ficha] = await Cliente.findOrCreate({
  where: { email: cuentas.cliente.email },
  defaults: {
    nombres: "Cliente QA",
    apellidos: "Pruebas",
    nombre: cuentas.cliente.nombre,
    email: cuentas.cliente.email,
    sucursalId: sucursal?.id ?? null,
  },
});

const [plan] = await Plan.findOrCreate({
  where: { nombre: "Plan QA Pruebas" },
  defaults: {
    nombre: "Plan QA Pruebas",
    descripcion: "Plan ficticio para pruebas de QA.",
    duracionMeses: 1,
    sesiones: 8,
    precio: 1000,
    modalidad: "Individual",
  },
});

const [profesor] = await Profesor.findOrCreate({
  where: { nombre: "Profesor QA Pruebas" },
  defaults: {
    nombre: "Profesor QA Pruebas",
    especialidad: "Pruebas",
    sucursalId: sucursal?.id ?? null,
  },
});

// La clase es mañana a las 20:00, así siempre se puede cancelar a tiempo.
const manana = new Date();
manana.setDate(manana.getDate() + 1);

const [horario] = await Horario.findOrCreate({
  where: { profesorId: profesor.id, horaInicio: "20:00" },
  defaults: {
    profesorId: profesor.id,
    diaSemana: DIAS_SEMANA[manana.getDay()],
    horaInicio: "20:00",
    horaFin: "21:00",
    modalidad: "Individual",
  },
});

const [asignacion, asignada] = await Asignacion.findOrCreate({
  where: { clienteId: ficha.id, estado: "Activa" },
  defaults: {
    clienteId: ficha.id,
    planId: plan.id,
    horarioId: horario.id,
    fechaInicio: obtenerFechaLocal(new Date()),
  },
});

console.log(
  `${asignada ? "Creada" : "Ya existía"}: asignación QA, clase el ${horario.diaSemana} a las 20:00`
);

// Para repetir las pruebas: se borran las cancelaciones de clases que aún no
// ocurren, solo del cliente QA.
const hoy = obtenerFechaLocal(new Date());
const borradas = await Asistencia.destroy({
  where: { asignacionId: asignacion.id, fecha: { [Op.gte]: hoy } },
});
console.log(`Cancelaciones QA reiniciadas: ${borradas}`);

await sequelize.close();
