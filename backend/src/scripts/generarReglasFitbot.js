// Copia las reglas de FitBot desde el flujo de n8n a la API: npm run fitbot:reglas
//
// En un hosting sin n8n (por ejemplo, un cPanel compartido), la API responde
// con estas mismas reglas. Así hay una sola fuente: el flujo de n8n.
// Ejecútalo cada vez que cambies las reglas en n8n y exportes el flujo.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const carpeta = path.dirname(fileURLToPath(import.meta.url));

export const RUTA_FLUJO = path.resolve(carpeta, "../../../n8n/fitbot-workflow.json");
export const RUTA_REGLAS = path.resolve(carpeta, "../fitbot/reglasN8n.js");

// Nodos de n8n que se copian y nombre de la función que los contiene.
const NODOS = [
  { nombre: "Code in JavaScript", funcion: "nodoReglas", parametros: "$input, $getWorkflowStaticData" },
  { nombre: "Filtro de seguridad", funcion: "nodoFiltro", parametros: "$input" },
];

export const generarReglas = (textoFlujo) => {
  const [flujo] = JSON.parse(textoFlujo);

  const funciones = NODOS.map(({ nombre, funcion, parametros }) => {
    const nodo = flujo.nodes.find((n) => n.name === nombre);

    if (!nodo?.parameters?.jsCode) {
      throw new Error(`El flujo no tiene el nodo «${nombre}»`);
    }

    return (
      `// Nodo de n8n «${nombre}».\n` +
      `export function ${funcion}(${parametros}) {\n` +
      `${nodo.parameters.jsCode.trim()}\n` +
      `}\n`
    );
  });

  return (
    "// ARCHIVO GENERADO desde n8n/fitbot-workflow.json. No lo edites a mano:\n" +
    "// cambia las reglas en n8n, exporta el flujo y ejecuta npm run fitbot:reglas.\n" +
    "/* eslint-disable */\n\n" +
    funciones.join("\n")
  );
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const contenido = generarReglas(fs.readFileSync(RUTA_FLUJO, "utf8"));
  fs.mkdirSync(path.dirname(RUTA_REGLAS), { recursive: true });
  fs.writeFileSync(RUTA_REGLAS, contenido);
  console.log(`Reglas de FitBot copiadas en ${path.relative(process.cwd(), RUTA_REGLAS)}`);
}
