// Utilidades compartidas por las pruebas de Playwright.
import fs from "node:fs";
import path from "node:path";

export const cuentas = JSON.parse(
  fs.readFileSync(new URL("../qa/cuentas-qa.json", import.meta.url), "utf8")
);

export const sesion = (rol) => path.resolve(`resultados/playwright/sesiones/${rol}.json`);

// Elementos del panel que pueden mostrar datos personales de clientes reales.
const DATOS_PERSONALES = "table, tbody, select, [class*='tabla'], [class*='lista'], [class*='tarjeta-cliente']";

// Guarda una captura como evidencia: se adjunta al informe de Playwright y, si
// se indica EVIDENCIAS_DIR, se copia a esa carpeta con el ID de la prueba.
export async function evidencia(page, testInfo, nombre, { tapar = false, completa = true } = {}) {
  const imagen = await page.screenshot({
    fullPage: completa,
    mask: tapar ? [page.locator(DATOS_PERSONALES)] : [],
  });
  await testInfo.attach(nombre, { body: imagen, contentType: "image/png" });

  const carpeta = process.env.EVIDENCIAS_DIR;
  if (carpeta) {
    fs.mkdirSync(carpeta, { recursive: true });
    fs.writeFileSync(path.join(carpeta, `${testInfo.project.name}-${nombre}.png`), imagen);
  }
}

// Junta los errores de consola y excepciones de la página.
export function vigilarConsola(page) {
  const errores = [];
  page.on("console", (mensaje) => {
    if (mensaje.type() === "error") errores.push(mensaje.text());
  });
  page.on("pageerror", (error) => errores.push(error.message));
  return errores;
}
