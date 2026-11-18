// Panel de administración. Las capturas tapan tablas y listas: el entorno QA
// usa una copia de la base real.
import { test, expect } from "@playwright/test";
import { cuentas, evidencia, sesion, vigilarConsola } from "./ayuda.mjs";

test("E2E-07 El administrador inicia sesión y llega al panel", async ({ page }, testInfo) => {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(cuentas.admin.email);
  await page.getByLabel("Contraseña").fill(cuentas.admin.password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/admin/);
  await expect(page.getByRole("heading", { name: "Resumen General" })).toBeVisible();
  await evidencia(page, testInfo, "E2E-07-login-admin", { tapar: true, completa: false });
});

test.describe("Con sesión de administrador", () => {
  test.use({ storageState: sesion("admin") });

  test("E2E-08 El panel muestra los indicadores", async ({ page }, testInfo) => {
    const errores = vigilarConsola(page);
    await page.goto("/admin");
    await expect(page.getByText("Clientes Totales")).toBeVisible();
    await evidencia(page, testInfo, "E2E-08-panel", { tapar: true });
    expect(errores).toEqual([]);
  });

  const modulos = [
    ["clientes", /Clientes/],
    ["planes", /Planes/],
    ["profesores", /Profesores/],
    ["horarios", /Horarios/],
    ["asignaciones", /Asignaciones/],
    ["asistencia", /Asistencia/],
    ["pagos", /Pagos/],
    ["contratos", /Contratos/],
    ["recordatorios", /Recordatorios/],
    ["sucursales", /Sucursales/],
    ["maquinas", /Máquinas|Maquinas/],
    ["imagenes", /Imágenes|Imagenes/],
  ];

  for (const [indice, [ruta, titulo]] of modulos.entries()) {
    const id = `E2E-09.${String(indice + 1).padStart(2, "0")}`;
    test(`${id} El módulo ${ruta} carga sin errores`, async ({ page }, testInfo) => {
      const errores = vigilarConsola(page);
      await page.goto(`/admin/${ruta}`);
      await expect(page.getByRole("heading", { level: 1, name: titulo })).toBeVisible();
      await page.waitForLoadState("networkidle");
      await evidencia(page, testInfo, `${id}-${ruta}`, { tapar: true, completa: false });
      expect(errores).toEqual([]);
    });
  }

  test("E2E-10 Crear un plan desde el formulario", async ({ page }, testInfo) => {
    const nombre = `Plan Playwright ${Date.now().toString(36)}`;
    await page.goto("/admin/planes");
    await page.locator("#plan-nombre").fill(nombre);
    await page.locator("#plan-descripcion").fill("Plan ficticio creado por Playwright");
    await page.locator("#plan-duracion").fill("1");
    await page.locator("#plan-sesiones").fill("8");
    await page.locator("#plan-precio").fill("30000");
    await page.locator("#plan-modalidad").selectOption("Individual");
    await page.locator("form button[type='submit']").first().click();
    await expect(page.getByRole("status")).toBeVisible();
    await expect(page.getByText(nombre).first()).toBeVisible();
    await evidencia(page, testInfo, "E2E-10-crear-plan", { completa: false });
  });
});
