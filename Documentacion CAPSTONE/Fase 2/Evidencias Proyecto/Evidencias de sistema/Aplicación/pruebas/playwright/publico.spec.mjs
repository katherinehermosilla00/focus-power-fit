// Páginas públicas, FitBot y protección de rutas (sin sesión).
import { test, expect } from "@playwright/test";
import { cuentas, evidencia, vigilarConsola } from "./ayuda.mjs";

test("E2E-01 La portada carga completa y sin errores de consola", async ({ page }, testInfo) => {
  const errores = vigilarConsola(page);
  await page.goto("/");
  await expect(page).toHaveTitle(/Focus Power Fit/i);
  await expect(page.getByRole("link", { name: /iniciar sesión|ingresar/i }).first()).toBeVisible();
  await evidencia(page, testInfo, "E2E-01-portada");
  expect(errores).toEqual([]);
});

test("E2E-02 FitBot responde desde el sitio", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir FitBot" }).click();
  const chat = page.getByLabel("Chat de FitBot");
  await expect(chat).toBeVisible();
  await page.getByLabel("Mensaje para FitBot").fill("¿Qué horarios tienen?");
  await page.getByRole("button", { name: "Enviar mensaje" }).click();
  await expect(chat.getByText(/HORARIOS DE ATENCIÓN/)).toBeVisible({ timeout: 20_000 });
  await evidencia(page, testInfo, "E2E-02-fitbot", { completa: false });
});

test("E2E-03 Inicio de sesión con contraseña incorrecta muestra un error", async ({ page }, testInfo) => {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(cuentas.admin.email);
  await page.getByLabel("Contraseña").fill("ClaveIncorrecta-123");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
  await evidencia(page, testInfo, "E2E-03-login-incorrecto", { completa: false });
});

test("E2E-04 Recuperar contraseña no revela si el correo existe", async ({ page }, testInfo) => {
  await page.goto("/recuperar");
  await page.getByLabel(/correo/i).first().fill("no.existe@focuspowerfit.test");
  await page.getByRole("button", { name: /enviar|código|recuperar/i }).first().click();
  await expect(page.getByText(/Si existe una cuenta activa con ese correo/)).toBeVisible();
  await evidencia(page, testInfo, "E2E-04-recuperar", { completa: false });
});

test("E2E-05 Los términos informan la regla de cancelación", async ({ page }, testInfo) => {
  await page.goto("/terminos");
  await expect(page.getByText(/6 horas/).first()).toBeVisible();
  await evidencia(page, testInfo, "E2E-05-terminos");
});

test("E2E-06 El panel de administración exige iniciar sesión", async ({ page }, testInfo) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
  await evidencia(page, testInfo, "E2E-06-admin-sin-sesion", { completa: false });
});
