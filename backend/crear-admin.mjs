
import "dotenv/config";
import bcrypt from "bcryptjs";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import sequelize from "./src/config/database.js";
import Usuario from "./src/models/Usuario.js";

const rl = readline.createInterface({
  input,
  output,
});

try {
  console.log("\n==================================");
  console.log(" FOCUS POWER FIT");
  console.log(" CREAR NUEVO ADMINISTRADOR");
  console.log("==================================\n");

  // Solicitar datos del administrador
  const nombre = (
    await rl.question("Nombre del administrador: ")
  ).trim();

  const email = (
    await rl.question("Correo del administrador: ")
  ).trim().toLowerCase();

  const password = await rl.question(
    "Nueva contraseña (mínimo 12 caracteres): "
  );

  // Validar datos
  if (!nombre || !email || password.length < 12) {
    throw new Error(
      "Debes ingresar nombre, correo y una contraseña de al menos 12 caracteres."
    );
  }

  // Conectar con MySQL
  await sequelize.authenticate();

  console.log("\nConexión con MySQL establecida.");

  // Comprobar que el correo no exista
  const usuarioExistente = await Usuario.findOne({
    where: { email },
  });

  if (usuarioExistente) {
    throw new Error(
      "Ya existe un usuario con ese correo. No se realizaron cambios."
    );
  }

  // Proteger contraseña con bcryptjs
  const passwordHash = await bcrypt.hash(password, 10);

  // Crear administrador
  const nuevoAdmin = await Usuario.create({
    nombre,
    email,
    passwordHash,
    rol: "admin",
    estado: "activo",
  });

  console.log("\n==================================");
  console.log(" ADMINISTRADOR CREADO CORRECTAMENTE");
  console.log("==================================");
  console.log(`ID: ${nuevoAdmin.id}`);
  console.log(`Nombre: ${nuevoAdmin.nombre}`);
  console.log(`Correo: ${nuevoAdmin.email}`);
  console.log(`Rol: ${nuevoAdmin.rol}`);
  console.log(`Estado: ${nuevoAdmin.estado}`);
  console.log("==================================\n");

} catch (error) {
  console.error("\nError:", error.message);
} finally {
  rl.close();
  await sequelize.close();
}
