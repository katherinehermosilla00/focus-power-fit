// Inicia sesión una sola vez por rol y guarda la sesión del navegador
// (localStorage) para que las pruebas la reutilicen. Así no se gasta el límite
// de 10 intentos de inicio de sesión cada 15 minutos.
import fs from "node:fs";
import path from "node:path";
import { request } from "@playwright/test";

const cuentas = JSON.parse(
  fs.readFileSync(new URL("../qa/cuentas-qa.json", import.meta.url), "utf8")
);

export const SESIONES = path.resolve("resultados/playwright/sesiones");

export default async function prepararSesiones(config) {
  // SIN_SESIONES=1: para pruebas públicas contra un sitio donde no existen las
  // cuentas QA (por ejemplo, el sitio local). Así no se intenta iniciar sesión.
  if (process.env.SIN_SESIONES === "1") return;

  const baseURL = config.projects[0].use.baseURL;
  const api = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
  fs.mkdirSync(SESIONES, { recursive: true });

  for (const rol of ["admin", "cliente"]) {
    const { email, password } = cuentas[rol];
    const respuesta = await api.post("/api/auth/login", { data: { email, password } });
    if (!respuesta.ok()) {
      throw new Error(`No se pudo iniciar sesión como ${rol}: ${respuesta.status()}`);
    }
    const { token, user } = await respuesta.json();
    const estado = {
      cookies: [],
      origins: [
        {
          origin: new URL(baseURL).origin,
          localStorage: [
            { name: "focusPowerFitToken", value: token },
            { name: "focusPowerFitUsuario", value: JSON.stringify(user) },
          ],
        },
      ],
    };
    fs.writeFileSync(path.join(SESIONES, `${rol}.json`), JSON.stringify(estado));
  }

  await api.dispose();
}
