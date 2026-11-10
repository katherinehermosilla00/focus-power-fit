import { createHmac } from "node:crypto";

// Huella de la contraseña vigente que viaja dentro del JWT. Al cambiar la
// contraseña la huella deja de coincidir y las sesiones anteriores se invalidan.
export const huellaPassword = (passwordHash) =>
  createHmac("sha256", process.env.JWT_SECRET)
    .update(passwordHash)
    .digest("hex")
    .slice(0, 32);
