// Vista de celular (Pixel 7): las páginas no se salen de la pantalla.
import { test, expect } from "@playwright/test";
import { evidencia, sesion } from "./ayuda.mjs";

const sinDesborde = async (page) => {
  const { ancho, contenido } = await page.evaluate(() => ({
    ancho: window.innerWidth,
    contenido: document.documentElement.scrollWidth,
  }));
  expect(contenido, "la página no debe tener desplazamiento horizontal").toBeLessThanOrEqual(ancho);
};

const publicas = [
  ["E2E-15.01", "/", "portada"],
  ["E2E-15.02", "/login", "login"],
  ["E2E-15.03", "/registro", "registro"],
  ["E2E-15.04", "/recuperar", "recuperar"],
  ["E2E-15.05", "/terminos", "terminos"],
];

for (const [id, ruta, nombre] of publicas) {
  test(`${id} ${nombre} se ve bien en celular`, async ({ page }, testInfo) => {
    await page.goto(ruta);
    await page.waitForLoadState("networkidle");
    await sinDesborde(page);
    await evidencia(page, testInfo, `${id}-${nombre}`, { completa: false });
  });
}

test.describe("Cliente en celular", () => {
  test.use({ storageState: sesion("cliente") });

  test("E2E-15.06 Mi cuenta se ve bien en celular", async ({ page }, testInfo) => {
    await page.goto("/mi-cuenta");
    await expect(page.getByText("Plan QA Pruebas").first()).toBeVisible();
    await sinDesborde(page);
    await evidencia(page, testInfo, "E2E-15.06-mi-cuenta", { completa: false });
  });
});

test.describe("Administrador en celular", () => {
  test.use({ storageState: sesion("admin") });

  for (const [id, ruta] of [
    ["E2E-15.07", "/admin"],
    ["E2E-15.08", "/admin/clientes"],
    ["E2E-15.09", "/admin/asignaciones"],
  ]) {
    test(`${id} ${ruta} se ve bien en celular`, async ({ page }, testInfo) => {
      await page.goto(ruta);
      await page.waitForLoadState("networkidle");
      await sinDesborde(page);
      await evidencia(page, testInfo, `${id}-${ruta.replaceAll("/", "-").slice(1)}`, {
        tapar: true,
        completa: false,
      });
    });
  }
});
