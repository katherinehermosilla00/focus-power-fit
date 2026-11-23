// Prepara los dos archivos para subir al hosting con cPanel (V2Networks):
//
//   sitio.zip  → se descomprime en public_html (sitio web estático)
//   api.zip    → se descomprime en la carpeta de la app Node.js (API)
//
// Uso, desde la raíz del proyecto y en la rama focuspowerfit:
//   node deploy/cpanel/empaquetar.mjs [dominio] [carpeta de salida]
//
// Por defecto: focuspowerfit.cl y Documentos\FocusPowerFit-despliegue.
// Los .zip quedan fuera del proyecto y no llevan .env, node_modules,
// archivos subidos ni datos de clientes.

import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dominio = process.argv[2] || "focuspowerfit.cl";
const salida = path.resolve(
  process.argv[3] || path.join(os.homedir(), "Documents", "FocusPowerFit-despliegue")
);
const apiUrl = `https://api.${dominio}`;
const esWindows = process.platform === "win32";

if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(dominio)) {
  throw new Error(`Dominio no válido: ${dominio}`);
}

if (salida.startsWith(raiz + path.sep) || salida === raiz) {
  throw new Error("La carpeta de salida debe quedar fuera del proyecto");
}

// El tar de Windows 10+ (bsdtar) crea .zip con rutas «/», que el cPanel
// descomprime bien. Se usa el del sistema y no el de Git Bash, que no crea .zip.
const tar = esWindows
  ? path.join(process.env.SystemRoot || "C:\\Windows", "System32", "tar.exe")
  : "bsdtar";

const comprimir = (carpeta, entradas, destino) => {
  fs.rmSync(destino, { force: true });
  execFileSync(tar, ["-a", "-c", "-f", destino, "-C", carpeta, ...entradas], {
    stdio: "inherit",
  });
};

fs.mkdirSync(salida, { recursive: true });

// ==========================================
// 1. SITIO WEB ESTÁTICO
// ==========================================
console.log(`\n1. Generando el sitio para https://${dominio} (API en ${apiUrl})...\n`);

const frontend = path.join(raiz, "frontend");
// Carpeta definida en frontend/next.config.ts (distDir) para SALIDA=estatica.
const out = path.join(frontend, "sitio-cpanel");
fs.rmSync(out, { recursive: true, force: true });

execSync("npm run build", {
  stdio: "inherit",
  cwd: frontend,
  env: {
    ...process.env,
    SALIDA: "estatica",
    NEXT_PUBLIC_API_URL: apiUrl,
    NEXT_PUBLIC_MODO_DEMO: "false",
  },
});

const plantilla = fs.readFileSync(path.join(raiz, "deploy", "cpanel", "sitio.htaccess"), "utf8");
fs.writeFileSync(path.join(out, ".htaccess"), plantilla.replaceAll("{{API_URL}}", apiUrl));

comprimir(out, fs.readdirSync(out), path.join(salida, "sitio.zip"));

// ==========================================
// 2. API
// ==========================================
console.log("\n2. Empaquetando la API...\n");

const backend = path.join(raiz, "backend");
const temporal = fs.mkdtempSync(path.join(os.tmpdir(), "fpf-api-"));

try {
  for (const archivo of ["package.json", "package-lock.json", "servidor.cjs", "crear-admin.mjs", ".env.example"]) {
    fs.copyFileSync(path.join(backend, archivo), path.join(temporal, archivo));
  }

  // Código sin pruebas automáticas.
  fs.cpSync(path.join(backend, "src"), path.join(temporal, "src"), {
    recursive: true,
    filter: (origen) => path.basename(origen) !== "tests",
  });

  comprimir(temporal, fs.readdirSync(temporal), path.join(salida, "api.zip"));
} finally {
  fs.rmSync(temporal, { recursive: true, force: true });
}

console.log(`\nListo. Archivos en ${salida}:`);
console.log("  sitio.zip → public_html");
console.log("  api.zip   → carpeta de la app Node.js (ver deploy/cpanel/README.md)\n");
