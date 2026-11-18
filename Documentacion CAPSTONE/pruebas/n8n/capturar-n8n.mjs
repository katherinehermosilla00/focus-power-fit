// Evidencia visual de FitBot en el editor de n8n del entorno QA:
// el flujo publicado y la lista de ejecuciones de la prueba de 52 conversaciones.
//   node n8n/capturar-n8n.mjs <carpeta-de-evidencias>
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const N8N = process.env.N8N_URL ?? "http://localhost:5680";
const FLUJO = "bvKR30I8TghqakFM";
const destino = process.argv[2] ?? "resultados/n8n";
const cuentas = JSON.parse(
  fs.readFileSync(new URL("../qa/cuentas-qa.json", import.meta.url), "utf8")
);

fs.mkdirSync(destino, { recursive: true });

// Usa el Google Chrome instalado en el computador.
const navegador = await chromium.launch({ channel: "chrome" });
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 900 } });
const capturar = (nombre) =>
  pagina.screenshot({ path: path.join(destino, nombre), fullPage: false });

// n8n mantiene conexiones abiertas: se espera a elementos concretos, no a
// que la red quede en silencio.
await pagina.goto(`${N8N}/`, { waitUntil: "load" });
await pagina.waitForURL(/\/(setup|signin|home|workflows)/, { timeout: 30000 });

// Primera vez: n8n pide crear la cuenta dueña del editor (solo en el entorno QA).
if (pagina.url().includes("/setup")) {
  await pagina.getByLabel(/email/i).fill(cuentas.admin.email);
  await pagina.getByLabel(/first name/i).fill("Administrador");
  await pagina.getByLabel(/last name/i).fill("QA");
  await pagina.getByLabel(/password/i).fill(cuentas.admin.password);
  await pagina.getByRole("button", { name: /next|continue|siguiente/i }).click();
  await pagina.waitForURL((url) => !url.pathname.includes("/setup"), { timeout: 30000 });
}

if (pagina.url().includes("/signin")) {
  await pagina.getByLabel(/email/i).fill(cuentas.admin.email);
  await pagina.getByLabel(/password/i).fill(cuentas.admin.password);
  await pagina.getByRole("button", { name: /sign in/i }).click();
  await pagina.waitForURL((url) => !url.pathname.includes("/signin"), { timeout: 30000 });
}

// La encuesta de bienvenida de n8n tapa el editor: se envía vacía.
// El aviso de licencia se cierra con «Skip»: no se envía ningún dato a n8n.
const cerrarEncuesta = async () => {
  for (const nombre of [/get started/i, /^skip$/i]) {
    const boton = pagina.getByRole("button", { name: nombre });
    if (await boton.isVisible().catch(() => false)) {
      await boton.click();
      await boton.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
      await pagina.waitForTimeout(800);
    }
  }
};

await pagina.goto(`${N8N}/workflow/${FLUJO}`, { waitUntil: "load" });
await pagina.locator(".vue-flow__node, [data-test-id='canvas-node']").first()
  .waitFor({ timeout: 30000 });
await pagina.waitForTimeout(1500);
await cerrarEncuesta();
// Atajo de n8n: «1» ajusta el zoom para ver el flujo completo.
await pagina.locator(".vue-flow__pane, [data-test-id='canvas']").first().click({ position: { x: 5, y: 5 } }).catch(() => {});
await pagina.keyboard.press("1");
await pagina.waitForTimeout(1500);
await capturar("n8n-flujo-fitbot.png");

await pagina.goto(`${N8N}/workflow/${FLUJO}/executions`, { waitUntil: "load" });
await pagina.waitForTimeout(4000);
await cerrarEncuesta();
await pagina.waitForTimeout(1000);
await capturar("n8n-ejecuciones-fitbot.png");

console.log(`Capturas guardadas en ${destino}`);
await navegador.close();
