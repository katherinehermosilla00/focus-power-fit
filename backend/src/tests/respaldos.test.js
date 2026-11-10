import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";

const {
  cifrarArchivoSuelto,
  descifrarArchivoSuelto,
  cifrarEnArchivo,
  flujoDescifrado,
  nombreRespaldo,
  seleccionarVencidos,
  validarCarpetaRespaldos,
  validarClave,
  validarNombreBase,
  verificarArchivo,
} = await import("../scripts/respaldos.js");

const CLAVE = "clave-de-prueba-con-mas-de-32-caracteres";

const leerTodo = async (flujo) => {
  const partes = [];

  for await (const parte of flujo) partes.push(parte);

  return Buffer.concat(partes).toString("utf8");
};

let carpeta;

test.before(async () => {
  carpeta = await fs.mkdtemp(path.join(os.tmpdir(), "prueba-respaldos-"));
});

test.after(async () => {
  await fs.rm(carpeta, { recursive: true, force: true });
});

const crearCifrado = async (nombre, contenido) => {
  const ruta = path.join(carpeta, nombre);

  await cifrarEnArchivo(Readable.from([Buffer.from(contenido)]), ruta, CLAVE);

  return ruta;
};

test("El respaldo se cifra y vuelve a su contenido original", async () => {
  const contenido = "INSERT INTO clientes VALUES ('josé@prueba.cl');";
  const ruta = await crearCifrado("original.cif", contenido);

  const crudo = await fs.readFile(ruta);
  assert.ok(!crudo.includes("clientes"));
  assert.ok(!crudo.includes("prueba.cl"));

  await verificarArchivo(ruta, CLAVE);
  assert.equal(await leerTodo(await flujoDescifrado(ruta, CLAVE)), contenido);
});

test("No se acepta una clave incorrecta", async () => {
  const ruta = await crearCifrado("clave.cif", "datos");

  await assert.rejects(
    verificarArchivo(ruta, "otra-clave-de-prueba-con-mas-de-32-caracteres"),
    /clave es incorrecta o el archivo cambió/
  );
});

test("Se detecta un respaldo alterado", async () => {
  const ruta = await crearCifrado("alterado.cif", "datos que no deben cambiar");
  const bytes = await fs.readFile(ruta);

  bytes[bytes.length - 20] ^= 0xff;
  await fs.writeFile(ruta, bytes);

  await assert.rejects(verificarArchivo(ruta, CLAVE), /archivo cambió/);
});

test("Se detecta un archivo incompleto o que no es un respaldo", async () => {
  const corto = path.join(carpeta, "corto.cif");
  await fs.writeFile(corto, "x");
  await assert.rejects(verificarArchivo(corto, CLAVE), /incompleto/);

  const otro = path.join(carpeta, "otro.cif");
  await fs.writeFile(otro, Buffer.alloc(200));
  await assert.rejects(verificarArchivo(otro, CLAVE), /no es un respaldo/);
});

test("Un archivo suelto se cifra, se comprueba y se recupera idéntico", async () => {
  const original = path.join(carpeta, "clientes ficticios.sql");
  const contenido = Buffer.from("INSERT INTO clientes VALUES ('Ñuñoa', 'josé@x.cl');\n".repeat(500));
  await fs.writeFile(original, contenido);

  const cifrados = path.join(carpeta, "cifrados");
  const cifrado = await cifrarArchivoSuelto(original, cifrados, CLAVE);

  assert.equal(path.basename(cifrado), "clientes ficticios.sql.cif");
  assert.ok(!(await fs.readFile(cifrado)).includes("clientes"));
  // El original no se toca.
  assert.deepEqual(await fs.readFile(original), contenido);

  await assert.rejects(
    cifrarArchivoSuelto(original, cifrados, CLAVE),
    /no se sobrescribe/
  );

  const recuperado = path.join(carpeta, "recuperado.sql");
  await descifrarArchivoSuelto(cifrado, recuperado, CLAVE);
  assert.deepEqual(await fs.readFile(recuperado), contenido);

  await assert.rejects(
    descifrarArchivoSuelto(cifrado, recuperado, CLAVE),
    /destino ya existe/
  );
  await assert.rejects(
    descifrarArchivoSuelto(
      cifrado,
      path.join(carpeta, "otra.sql"),
      "otra-clave-de-prueba-con-mas-de-32-caracteres"
    ),
    /clave es incorrecta/
  );
});

test("Los respaldos deben quedar fuera del proyecto", () => {
  const raiz = path.resolve(os.tmpdir(), "proyecto");

  assert.throws(() => validarCarpetaRespaldos(raiz, raiz), /dentro del proyecto/);
  assert.throws(
    () => validarCarpetaRespaldos(path.join(raiz, "backend", "respaldos"), raiz),
    /dentro del proyecto/
  );
  assert.throws(() => validarCarpetaRespaldos("relativa", raiz), /absoluta/);
  assert.throws(() => validarCarpetaRespaldos("", raiz), /absoluta/);

  const afuera = path.resolve(os.tmpdir(), "respaldos");
  assert.equal(validarCarpetaRespaldos(afuera, raiz), afuera);
});

test("Se exige una clave larga y un nombre de base seguro", () => {
  assert.throws(() => validarClave("corta"), /32 caracteres/);
  assert.throws(() => validarClave(undefined), /32 caracteres/);
  assert.equal(validarClave(CLAVE), CLAVE);

  for (const nombre of ["a`; DROP DATABASE x", "", undefined, "con espacio"]) {
    assert.throws(() => validarNombreBase(nombre), /no es válido/);
  }

  assert.equal(validarNombreBase("focus_copia"), "focus_copia");
});

test("Solo vencen respaldos antiguos y siempre se conservan los recientes", () => {
  const ahora = new Date(2026, 10, 30, 12);
  const nombres = [
    nombreRespaldo(new Date(2026, 0, 1)),
    nombreRespaldo(new Date(2026, 0, 2)),
    nombreRespaldo(new Date(2026, 10, 1)),
    "respaldo-20260103-000000.parcial",
    "documento-importante.sql",
    "otra-carpeta",
  ];

  // Con un mínimo de 1: vencen los dos de enero, y nada que no sea un respaldo.
  assert.deepEqual(seleccionarVencidos(nombres, ahora, 10, 1).sort(), [
    nombres[0],
    nombres[1],
  ]);

  // Aunque estén vencidos, se conservan los 7 más recientes.
  assert.deepEqual(seleccionarVencidos(nombres, ahora, 10), []);
});
