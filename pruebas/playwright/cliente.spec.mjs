// Mi cuenta del cliente QA (datos ficticios): plan, próxima clase y cancelación.
import { test, expect } from "@playwright/test";
import { evidencia, sesion, vigilarConsola } from "./ayuda.mjs";

test.use({ storageState: sesion("cliente") });

test("E2E-11 Mi cuenta muestra plan, horario y próxima clase", async ({ page }, testInfo) => {
  const errores = vigilarConsola(page);
  await page.goto("/mi-cuenta");
  await expect(page.getByText("Plan QA Pruebas").first()).toBeVisible();
  await expect(page.getByText("Próxima clase:")).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancelar clase" })).toBeVisible();
  await expect(page.getByText(/Puedes cancelarla sin perderla hasta el/)).toBeVisible();
  await evidencia(page, testInfo, "E2E-11-mi-cuenta");
  expect(errores).toEqual([]);
});

test("E2E-12 Cancelar la clase con más de 6 horas no la pierde", async ({ page }, testInfo) => {
  await page.goto("/mi-cuenta");
  page.once("dialog", (dialogo) => {
    expect(dialogo.message()).toMatch(/Avisas a tiempo/);
    dialogo.accept();
  });
  await page.getByRole("button", { name: "Cancelar clase" }).click();
  await expect(page.getByRole("status").filter({ hasText: /no la pierdes/ })).toBeVisible();
  await expect(page.getByText("Cancelaste esta clase a tiempo: no la pierdes.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancelar clase" })).toHaveCount(0);
  await page.getByText("Próxima clase:").scrollIntoViewIfNeeded();
  await evidencia(page, testInfo, "E2E-12-cancelar-clase", { completa: false });
});

test("E2E-13 Un cliente no puede entrar al panel de administración", async ({ page }, testInfo) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/mi-cuenta/);
  await evidencia(page, testInfo, "E2E-13-cliente-sin-admin", { completa: false });
});

test("E2E-14 Cerrar sesión borra la sesión del navegador", async ({ page }, testInfo) => {
  await page.goto("/mi-cuenta");
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/login/);
  const token = await page.evaluate(() => localStorage.getItem("focusPowerFitToken"));
  expect(token).toBeNull();
  await evidencia(page, testInfo, "E2E-14-cerrar-sesion", { completa: false });
});
