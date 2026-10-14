import "dotenv/config";
import bcrypt from "bcryptjs";
import Usuario from "./src/models/Usuario.js";

const email = "admin@focuspowerfit.cl";
const password = "Admin123";

const existente = await Usuario.findOne({ where: { email } });

if (existente) {
  console.log("El correo ya existe. No se modificó.");
} else {
  const passwordHash = await bcrypt.hash(password, 12);

  await Usuario.create({
    nombre: "Administrador",
    email,
    passwordHash,
    rol: "admin",
    estado: "activo"
  });

  console.log("Administrador creado correctamente");
}

await Usuario.sequelize.close();
