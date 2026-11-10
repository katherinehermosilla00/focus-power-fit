// Configuración de Playwright para el entorno QA (ver README.md).
//   npm run playwright
// Usa el Google Chrome instalado. Las capturas de evidencia las toma cada
// prueba (con las tablas de datos personales tapadas), no Playwright de forma
// automática.
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./playwright",
  testMatch: "*.spec.mjs",
  // En serie: las pruebas comparten el entorno QA y hay límite de intentos de
  // inicio de sesión.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  globalSetup: "./playwright/preparar-sesiones.mjs",
  outputDir: "./resultados/playwright/artefactos",
  reporter: [
    ["list"],
    ["html", { outputFolder: "./resultados/playwright/informe", open: "never" }],
    ["json", { outputFile: "./resultados/playwright/resultado.json" }],
    ["junit", { outputFile: "./resultados/playwright/resultado-junit.xml" }],
  ],
  use: {
    baseURL: process.env.BASE_URL ?? "https://localhost:8443",
    ignoreHTTPSErrors: true,
    locale: "es-CL",
    timezoneId: "America/Santiago",
    screenshot: "off",
    video: "off",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "escritorio",
      testIgnore: "movil.spec.mjs",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
    {
      name: "movil",
      testMatch: "movil.spec.mjs",
      use: { ...devices["Pixel 7"], channel: "chrome" },
    },
  ],
});
