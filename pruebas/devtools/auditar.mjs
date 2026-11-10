// Auditoría con Chrome DevTools sobre el entorno QA:
//  1. Lighthouse (el panel de DevTools) en móvil y escritorio.
//  2. Protocolo DevTools: errores de consola, peticiones fallidas, métricas de
//     rendimiento, TLS y un archivo HAR de la portada.
//   node devtools/auditar.mjs <carpeta-de-evidencias>
// Usa el Google Chrome instalado y solo las cuentas ficticias de qa/cuentas-qa.json.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import lighthouse from "lighthouse";
import configEscritorio from "lighthouse/core/config/desktop-config.js";
import { chromium, request } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "https://localhost:8443";
const destino = path.resolve(process.argv[2] ?? "resultados/devtools");
const PUERTO = 9333;
const cuentas = JSON.parse(
  fs.readFileSync(new URL("../qa/cuentas-qa.json", import.meta.url), "utf8")
);

fs.mkdirSync(destino, { recursive: true });

// --- Sesiones: un solo inicio de sesión por rol (hay límite de intentos).
const api = await request.newContext({ baseURL: BASE, ignoreHTTPSErrors: true });
const sesion = async ({ email, password }) => {
  const respuesta = await api.post("/api/auth/login", { data: { email, password } });
  if (!respuesta.ok()) throw new Error(`No se pudo iniciar sesión con ${email}`);
  return respuesta.json();
};
const sesiones = {
  admin: await sesion(cuentas.admin),
  cliente: await sesion(cuentas.cliente),
};

// Contexto persistente: Lighthouse abre sus pestañas en el mismo perfil, así
// comparte la sesión guardada en localStorage.
const perfil = fs.mkdtempSync(path.join(os.tmpdir(), "fpf-devtools-"));
const contexto = await chromium.launchPersistentContext(perfil, {
  channel: "chrome",
  headless: true,
  ignoreHTTPSErrors: true,
  viewport: { width: 1366, height: 900 },
  args: [`--remote-debugging-port=${PUERTO}`, "--ignore-certificate-errors"],
});
const pagina = contexto.pages()[0] ?? (await contexto.newPage());

const usarSesion = async (rol) => {
  await pagina.goto(`${BASE}/terminos`);
  await pagina.evaluate(
    ({ datos }) => {
      localStorage.clear();
      if (!datos) return;
      localStorage.setItem("focusPowerFitToken", datos.token);
      localStorage.setItem("focusPowerFitUsuario", JSON.stringify(datos.user));
    },
    { datos: rol ? sesiones[rol] : null }
  );
};

// Tablas y listas del panel pueden mostrar datos personales: se tapan.
const MASCARA = "table, tbody, ul li, [class*='tabla'], [class*='lista'], [class*='cliente']";

// ------------------------------------------------------------ 1. Lighthouse
const auditorias = [
  { ruta: "/", rol: null },
  { ruta: "/login", rol: null },
  { ruta: "/registro", rol: null },
  { ruta: "/terminos", rol: null },
  { ruta: "/mi-cuenta", rol: "cliente" },
];
const resumenLighthouse = [];

for (const { ruta, rol } of auditorias) {
  for (const dispositivo of ["movil", "escritorio"]) {
    await usarSesion(rol);
    const resultado = await lighthouse(
      `${BASE}${ruta}`,
      { port: PUERTO, output: "html", logLevel: "error", disableStorageReset: true },
      dispositivo === "escritorio" ? configEscritorio : undefined
    );
    const nombre = `lighthouse-${ruta === "/" ? "portada" : ruta.slice(1)}-${dispositivo}.html`;
    fs.writeFileSync(path.join(destino, nombre), resultado.report);
    const puntaje = (id) => Math.round((resultado.lhr.categories[id]?.score ?? 0) * 100);
    resumenLighthouse.push({
      ruta,
      dispositivo,
      rendimiento: puntaje("performance"),
      accesibilidad: puntaje("accessibility"),
      buenasPracticas: puntaje("best-practices"),
      seo: puntaje("seo"),
      lcp: resultado.lhr.audits["largest-contentful-paint"]?.displayValue ?? "",
      cls: resultado.lhr.audits["cumulative-layout-shift"]?.displayValue ?? "",
      informe: nombre,
    });
    console.log(`Lighthouse ${ruta} ${dispositivo}: ${JSON.stringify(resumenLighthouse.at(-1))}`);
  }
}
fs.writeFileSync(
  path.join(destino, "lighthouse-resumen.json"),
  `${JSON.stringify(resumenLighthouse, null, 2)}\n`
);

// ------------------------------------------ 2. Protocolo DevTools por página
const paginas = [
  { ruta: "/", rol: null },
  { ruta: "/login", rol: null },
  { ruta: "/registro", rol: null },
  { ruta: "/recuperar", rol: null },
  { ruta: "/terminos", rol: null },
  { ruta: "/mi-cuenta", rol: "cliente" },
  { ruta: "/admin", rol: "admin" },
];
const resumenDevtools = [];

for (const { ruta, rol } of paginas) {
  await usarSesion(rol);
  const errores = [];
  const fallidas = [];
  const alConsola = (mensaje) => {
    if (mensaje.type() === "error") errores.push(mensaje.text().slice(0, 300));
  };
  const alError = (error) => errores.push(`Excepción: ${error.message.slice(0, 300)}`);
  const alFallar = (peticion) =>
    fallidas.push(`${peticion.method()} ${peticion.url()} (${peticion.failure()?.errorText})`);
  const alResponder = (respuesta) => {
    if (respuesta.status() >= 400) fallidas.push(`${respuesta.status()} ${respuesta.url()}`);
  };
  pagina.on("console", alConsola);
  pagina.on("pageerror", alError);
  pagina.on("requestfailed", alFallar);
  pagina.on("response", alResponder);

  const cdp = await contexto.newCDPSession(pagina);
  await cdp.send("Performance.enable");
  const principal = await pagina.goto(`${BASE}${ruta}`, { waitUntil: "load" });
  await pagina.waitForTimeout(2500);

  const { metrics } = await cdp.send("Performance.getMetrics");
  const metrica = (nombre) => metrics.find((m) => m.name === nombre)?.value ?? null;
  const tiempos = await pagina.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const lcp = performance.getEntriesByType("largest-contentful-paint").at(-1);
    return {
      ttfbMs: Math.round(nav.responseStart),
      domListoMs: Math.round(nav.domContentLoadedEventEnd),
      cargaMs: Math.round(nav.loadEventEnd),
      lcpMs: lcp ? Math.round(lcp.startTime) : null,
      recursos: performance.getEntriesByType("resource").length,
    };
  });
  const tls = await principal.securityDetails();
  const nombreCaptura = `devtools-${ruta === "/" ? "portada" : ruta.slice(1)}.png`;
  await pagina.screenshot({
    path: path.join(destino, nombreCaptura),
    mask: rol === "admin" ? [pagina.locator(MASCARA)] : [],
  });

  resumenDevtools.push({
    ruta,
    sesion: rol ?? "sin sesión",
    estadoHttp: principal.status(),
    tls: tls ? `${tls.protocol} (${tls.issuer})` : "sin TLS",
    erroresConsola: errores,
    peticionesFallidas: fallidas,
    ...tiempos,
    nodosDom: metrica("Nodes"),
    memoriaJsMb: Math.round((metrica("JSHeapUsedSize") ?? 0) / 1048576),
    captura: nombreCaptura,
  });
  console.log(`DevTools ${ruta}: ${errores.length} errores, ${fallidas.length} fallidas`);

  pagina.off("console", alConsola);
  pagina.off("pageerror", alError);
  pagina.off("requestfailed", alFallar);
  pagina.off("response", alResponder);
  await cdp.detach();
}
fs.writeFileSync(
  path.join(destino, "devtools-consola-red-rendimiento.json"),
  `${JSON.stringify(resumenDevtools, null, 2)}\n`
);
await contexto.close();

// -------------------------------------------- 3. HAR de la portada (pestaña Red)
const navegador = await chromium.launch({ channel: "chrome" });
const contextoHar = await navegador.newContext({
  ignoreHTTPSErrors: true,
  recordHar: { path: path.join(destino, "devtools-red-portada.har"), content: "omit" },
});
const paginaHar = await contextoHar.newPage();
await paginaHar.goto(`${BASE}/`, { waitUntil: "load" });
await paginaHar.waitForTimeout(2000);
await contextoHar.close();
await navegador.close();
await api.dispose();
fs.rmSync(perfil, { recursive: true, force: true });

console.log(`Evidencias en ${destino}`);
