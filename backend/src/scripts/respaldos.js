// Respaldos cifrados de la base de datos y de los archivos subidos.
//
// Crear:       npm run respaldo:crear
// Probar:      npm run respaldo:probar
// Restaurar:   npm run respaldo:restaurar -- --respaldo=CARPETA --base=BASE_VACIA --archivos=CARPETA_VACIA
// Cifrar un archivo suelto:    npm run respaldo:cifrar -- --archivo=RUTA
// Descifrar un archivo suelto: npm run respaldo:descifrar -- --archivo=RUTA.cif --destino=RUTA_NUEVA
//
// La prueba restaura en una base temporal, compara y la elimina. Restaurar nunca
// escribe sobre una base o carpeta con datos. Se imprimen solo totales.

import "dotenv/config";
import { spawn } from "node:child_process";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync,
} from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PassThrough, Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { createGunzip, createGzip } from "node:zlib";

const MAGIA = Buffer.from("FPFR1");
const LARGO_SAL = 16;
const LARGO_IV = 12;
const LARGO_TAG = 16;
const LARGO_CABECERA = MAGIA.length + LARGO_SAL + LARGO_IV;

const ARCHIVO_BASE = "base.sql.gz.cif";
const ARCHIVO_SUBIDAS = "archivos.tar.gz.cif";
const ARCHIVO_RESUMEN = "resumen.json";

const NOMBRE_RESPALDO = /^respaldo-(\d{8})-(\d{6})$/;
const NOMBRE_BASE = /^[A-Za-z0-9_]{1,64}$/;

const raizProyecto = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  ".."
);

export const derivarClave = (clave, sal) => scryptSync(clave, sal, 32);

// El respaldo debe quedar fuera del repositorio: el proyecto es público.
export const validarCarpetaRespaldos = (carpeta, raiz = raizProyecto) => {
  if (!carpeta || !path.isAbsolute(carpeta)) {
    throw new Error("RESPALDOS_DIR debe ser una ruta absoluta");
  }

  const relativa = path.relative(raiz, path.resolve(carpeta));

  if (!relativa || (!relativa.startsWith("..") && !path.isAbsolute(relativa))) {
    throw new Error("RESPALDOS_DIR no puede estar dentro del proyecto");
  }

  return path.resolve(carpeta);
};

export const validarClave = (clave) => {
  if (typeof clave !== "string" || clave.length < 32) {
    throw new Error("RESPALDO_CLAVE debe tener al menos 32 caracteres");
  }

  return clave;
};

export const validarNombreBase = (nombre) => {
  if (!NOMBRE_BASE.test(nombre ?? "")) {
    throw new Error("El nombre de la base no es válido");
  }

  return nombre;
};

export const nombreRespaldo = (fecha = new Date()) => {
  const dos = (valor) => String(valor).padStart(2, "0");

  return `respaldo-${fecha.getFullYear()}${dos(fecha.getMonth() + 1)}${dos(
    fecha.getDate()
  )}-${dos(fecha.getHours())}${dos(fecha.getMinutes())}${dos(fecha.getSeconds())}`;
};

const fechaDeNombre = (nombre) => {
  const partes = nombre.match(NOMBRE_RESPALDO);

  if (!partes) return null;

  const [, dia, hora] = partes;

  return new Date(
    Number(dia.slice(0, 4)),
    Number(dia.slice(4, 6)) - 1,
    Number(dia.slice(6, 8)),
    Number(hora.slice(0, 2)),
    Number(hora.slice(2, 4)),
    Number(hora.slice(4, 6))
  );
};

// Vence lo más antiguo que el plazo, conservando siempre los más recientes.
export const seleccionarVencidos = (nombres, ahora, dias, minimo = 7) => {
  const limite = ahora.getTime() - dias * 24 * 60 * 60 * 1000;

  return nombres
    .filter((nombre) => NOMBRE_RESPALDO.test(nombre))
    .sort()
    .reverse()
    .slice(minimo)
    .filter((nombre) => fechaDeNombre(nombre).getTime() < limite);
};

// Comprime y cifra un flujo con AES-256-GCM.
export const cifrarEnArchivo = async (entrada, ruta, clave) => {
  const sal = randomBytes(LARGO_SAL);
  const iv = randomBytes(LARGO_IV);
  const cifrador = createCipheriv("aes-256-gcm", derivarClave(clave, sal), iv);
  const salida = fs.createWriteStream(ruta, { mode: 0o600 });

  salida.write(Buffer.concat([MAGIA, sal, iv]));

  await pipeline(entrada, createGzip(), cifrador, salida);
  await fsp.appendFile(ruta, cifrador.getAuthTag());
};

const abrirDescifrado = async (ruta, clave) => {
  const { size } = await fsp.stat(ruta);

  if (size < LARGO_CABECERA + LARGO_TAG) {
    throw new Error("El archivo de respaldo está incompleto");
  }

  const archivo = await fsp.open(ruta, "r");

  try {
    const cabecera = Buffer.alloc(LARGO_CABECERA);
    const tag = Buffer.alloc(LARGO_TAG);

    await archivo.read(cabecera, 0, LARGO_CABECERA, 0);
    await archivo.read(tag, 0, LARGO_TAG, size - LARGO_TAG);

    if (!cabecera.subarray(0, MAGIA.length).equals(MAGIA)) {
      throw new Error("El archivo no es un respaldo válido");
    }

    const sal = cabecera.subarray(MAGIA.length, MAGIA.length + LARGO_SAL);
    const iv = cabecera.subarray(MAGIA.length + LARGO_SAL);
    const descifrador = createDecipheriv(
      "aes-256-gcm",
      derivarClave(clave, sal),
      iv
    );

    descifrador.setAuthTag(tag);

    return {
      descifrador,
      inicio: LARGO_CABECERA,
      fin: size - LARGO_TAG - 1,
    };
  } finally {
    await archivo.close();
  }
};

// Comprueba la clave y que el archivo no haya cambiado, antes de usarlo.
export const verificarArchivo = async (ruta, clave) => {
  const { descifrador, inicio, fin } = await abrirDescifrado(ruta, clave);
  const descartar = new Writable({
    write(_parte, _codificacion, listo) {
      listo();
    },
  });

  try {
    await pipeline(
      fs.createReadStream(ruta, { start: inicio, end: fin }),
      descifrador,
      descartar
    );
  } catch {
    throw new Error(
      "No se pudo descifrar el respaldo: la clave es incorrecta o el archivo cambió"
    );
  }
};

// Usar solo después de verificarArchivo.
export const flujoDescifrado = async (ruta, clave) => {
  const { descifrador, inicio, fin } = await abrirDescifrado(ruta, clave);
  const salida = new PassThrough();

  pipeline(
    fs.createReadStream(ruta, { start: inicio, end: fin }),
    descifrador,
    createGunzip(),
    salida
  ).catch((error) => salida.destroy(error));

  return salida;
};

const huella = async (flujo) => {
  const hash = createHash("sha256");

  for await (const parte of flujo) hash.update(parte);

  return hash.digest("hex");
};

// Cifra un archivo suelto y comprueba que se pueda recuperar idéntico. El
// original no se toca: borrarlo es una decisión aparte.
export const cifrarArchivoSuelto = async (origen, carpetaDestino, clave) => {
  const nombre = `${path.basename(origen)}.cif`;
  const destino = path.join(carpetaDestino, nombre);

  if (fs.existsSync(destino)) {
    throw new Error(`Ya existe ${nombre}; no se sobrescribe`);
  }

  await fsp.mkdir(carpetaDestino, { recursive: true, mode: 0o700 });

  const temporal = `${destino}.parcial`;

  try {
    await cifrarEnArchivo(fs.createReadStream(origen), temporal, clave);
    await verificarArchivo(temporal, clave);

    const [original, recuperado] = await Promise.all([
      huella(fs.createReadStream(origen)),
      huella(await flujoDescifrado(temporal, clave)),
    ]);

    if (original !== recuperado) {
      throw new Error("El archivo descifrado no coincide con el original");
    }

    await fsp.rename(temporal, destino);
  } catch (error) {
    await fsp.rm(temporal, { force: true });
    throw error;
  }

  return destino;
};

export const descifrarArchivoSuelto = async (origen, destino, clave) => {
  if (fs.existsSync(destino)) {
    throw new Error("El destino ya existe; elige otro nombre");
  }

  await verificarArchivo(origen, clave);
  await pipeline(
    await flujoDescifrado(origen, clave),
    fs.createWriteStream(destino, { mode: 0o600, flags: "wx" })
  );

  return destino;
};

const contarArchivos = async (carpeta) => {
  if (!fs.existsSync(carpeta)) return 0;

  const elementos = await fsp.readdir(carpeta, {
    recursive: true,
    withFileTypes: true,
  });

  return elementos.filter((elemento) => elemento.isFile()).length;
};

const rutaPrograma = (nombre) => {
  const archivo = process.platform === "win32" ? `${nombre}.exe` : nombre;

  return process.env.MYSQL_BIN_DIR
    ? path.join(process.env.MYSQL_BIN_DIR, archivo)
    : archivo;
};

const conexionMysql = () => ({
  argumentos: [
    "--no-defaults",
    `--host=${process.env.DB_HOST || "localhost"}`,
    `--port=${Number(process.env.DB_PORT) || 3306}`,
    `--user=${process.env.DB_USER}`,
    "--default-character-set=utf8mb4",
  ],
  // La contraseña nunca va en los argumentos: serían visibles en el sistema.
  entorno: { ...process.env, MYSQL_PWD: process.env.DB_PASSWORD ?? "" },
});

const lanzar = (programa, argumentos, entorno, entradaConectada = false) => {
  const hijo = spawn(programa, argumentos, {
    env: entorno,
    stdio: [entradaConectada ? "pipe" : "ignore", "pipe", "pipe"],
  });

  let errores = "";

  hijo.stderr.on("data", (parte) => {
    errores = `${errores}${parte}`.slice(-2000);
  });

  const termino = new Promise((resolver, rechazar) => {
    hijo.on("error", (error) => {
      rechazar(
        new Error(
          error.code === "ENOENT"
            ? `No se encontró ${path.basename(programa)}; revisa MYSQL_BIN_DIR`
            : error.message
        )
      );
    });

    hijo.on("close", (codigo) => {
      if (codigo === 0) resolver();
      else
        rechazar(
          new Error(
            `${path.basename(programa)} terminó con código ${codigo}: ${errores.trim()}`
          )
        );
    });
  });

  // Evita un rechazo sin atender si otro paso falla antes de esperar el proceso.
  termino.catch(() => {});

  return { hijo, termino };
};

const respaldarBase = async (ruta, clave) => {
  const { argumentos, entorno } = conexionMysql();
  const { hijo, termino } = lanzar(
    rutaPrograma("mysqldump"),
    [
      ...argumentos,
      "--single-transaction",
      "--routines",
      "--triggers",
      "--no-tablespaces",
      "--set-gtid-purged=OFF",
      validarNombreBase(process.env.DB_NAME),
    ],
    entorno
  );

  await Promise.all([cifrarEnArchivo(hijo.stdout, ruta, clave), termino]);
};

const respaldarSubidas = async (ruta, clave, carpetaSubidas) => {
  await fsp.mkdir(carpetaSubidas, { recursive: true });

  const { hijo, termino } = lanzar(
    "tar",
    ["-cf", "-", "-C", carpetaSubidas, "."],
    process.env
  );

  await Promise.all([cifrarEnArchivo(hijo.stdout, ruta, clave), termino]);
};

const contarTablas = async (sequelize, base) => {
  const tablas = await sequelize.query(
    "SELECT table_name AS nombre FROM information_schema.tables WHERE table_schema = :base AND table_type = 'BASE TABLE' ORDER BY table_name",
    { replacements: { base }, type: "SELECT" }
  );

  const totales = {};

  for (const { nombre } of tablas) {
    const [{ total }] = await sequelize.query(
      `SELECT COUNT(*) AS total FROM \`${validarNombreBase(base)}\`.\`${nombre}\``,
      { type: "SELECT" }
    );

    totales[nombre] = Number(total);
  }

  return totales;
};

const baseEstaVacia = async (sequelize, base) => {
  const [{ total }] = await sequelize.query(
    "SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema = :base",
    { replacements: { base }, type: "SELECT" }
  );

  return Number(total) === 0;
};

const restaurarBase = async (ruta, clave, base) => {
  const { argumentos, entorno } = conexionMysql();
  const { hijo, termino } = lanzar(
    rutaPrograma("mysql"),
    [...argumentos, validarNombreBase(base)],
    entorno,
    true
  );

  await Promise.all([
    pipeline(await flujoDescifrado(ruta, clave), hijo.stdin),
    termino,
  ]);
};

const restaurarSubidas = async (ruta, clave, destino) => {
  await fsp.mkdir(destino, { recursive: true });

  const { hijo, termino } = lanzar(
    "tar",
    ["-xf", "-", "-C", destino],
    process.env,
    true
  );

  await Promise.all([
    pipeline(await flujoDescifrado(ruta, clave), hijo.stdin),
    termino,
  ]);
};

const carpetaSubidasActual = () =>
  process.env.RESPALDO_UPLOADS_DIR
    ? path.resolve(process.env.RESPALDO_UPLOADS_DIR)
    : path.join(process.cwd(), "uploads");

const leerResumen = async (carpeta) =>
  JSON.parse(await fsp.readFile(path.join(carpeta, ARCHIVO_RESUMEN), "utf8"));

const crearRespaldo = async (sequelize) => {
  const carpetaRaiz = validarCarpetaRespaldos(process.env.RESPALDOS_DIR);
  const clave = validarClave(process.env.RESPALDO_CLAVE);
  const nombre = nombreRespaldo();
  const final = path.join(carpetaRaiz, nombre);
  const temporal = `${final}.parcial`;
  const carpetaSubidas = carpetaSubidasActual();

  await fsp.mkdir(temporal, { recursive: true, mode: 0o700 });

  try {
    const tablas = await contarTablas(sequelize, process.env.DB_NAME);

    await respaldarBase(path.join(temporal, ARCHIVO_BASE), clave);
    await respaldarSubidas(
      path.join(temporal, ARCHIVO_SUBIDAS),
      clave,
      carpetaSubidas
    );

    await fsp.writeFile(
      path.join(temporal, ARCHIVO_RESUMEN),
      JSON.stringify(
        {
          fecha: new Date().toISOString(),
          base: process.env.DB_NAME,
          tablas,
          archivos: await contarArchivos(carpetaSubidas),
        },
        null,
        2
      ),
      { mode: 0o600 }
    );

    // Solo un respaldo completo recibe su nombre definitivo.
    await fsp.rename(temporal, final);
  } catch (error) {
    await fsp.rm(temporal, { recursive: true, force: true });
    throw error;
  }

  const dias = Number(process.env.RESPALDO_DIAS) || 30;
  const existentes = await fsp.readdir(carpetaRaiz);
  const vencidos = seleccionarVencidos(existentes, new Date(), dias);

  for (const vencido of vencidos) {
    await fsp.rm(path.join(carpetaRaiz, vencido), { recursive: true });
  }

  return { nombre, vencidos: vencidos.length };
};

const ultimoRespaldo = async (carpetaRaiz) => {
  const nombres = (await fsp.readdir(carpetaRaiz))
    .filter((nombre) => NOMBRE_RESPALDO.test(nombre))
    .sort();

  if (!nombres.length) throw new Error("No hay respaldos para probar");

  return path.join(carpetaRaiz, nombres.at(-1));
};

const verificarRespaldo = async (carpeta, clave) => {
  await verificarArchivo(path.join(carpeta, ARCHIVO_BASE), clave);
  await verificarArchivo(path.join(carpeta, ARCHIVO_SUBIDAS), clave);

  return leerResumen(carpeta);
};

// Restaura en una base y carpeta temporales, compara y las elimina.
const probarRestauracion = async (sequelize, carpeta) => {
  const clave = validarClave(process.env.RESPALDO_CLAVE);
  const inicio = Date.now();
  const resumen = await verificarRespaldo(carpeta, clave);
  const base = `prueba_restauracion_${Date.now()}`;
  const destino = await fsp.mkdtemp(path.join(os.tmpdir(), "prueba-restauracion-"));

  try {
    await sequelize.query(
      `CREATE DATABASE \`${base}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );

    await restaurarBase(path.join(carpeta, ARCHIVO_BASE), clave, base);
    await restaurarSubidas(path.join(carpeta, ARCHIVO_SUBIDAS), clave, destino);

    const restauradas = await contarTablas(sequelize, base);
    const diferencias = [
      ...new Set([...Object.keys(resumen.tablas), ...Object.keys(restauradas)]),
    ].filter((tabla) => resumen.tablas[tabla] !== restauradas[tabla]);
    const archivos = await contarArchivos(destino);

    if (diferencias.length) {
      throw new Error(`Las tablas no coinciden: ${diferencias.join(", ")}`);
    }

    if (archivos !== resumen.archivos) {
      throw new Error(
        `Los archivos no coinciden: ${archivos} de ${resumen.archivos}`
      );
    }

    return {
      tablas: Object.keys(restauradas).length,
      filas: Object.values(restauradas).reduce((suma, total) => suma + total, 0),
      archivos,
      segundos: Math.round((Date.now() - inicio) / 1000),
    };
  } finally {
    await sequelize.query(`DROP DATABASE IF EXISTS \`${base}\``);
    await fsp.rm(destino, { recursive: true, force: true });
  }
};

// Recuperación real: nunca escribe sobre datos existentes. Para volver a operar,
// se revisa lo restaurado y se cambia DB_NAME de forma controlada.
const restaurar = async (sequelize, { carpeta, base, archivos }) => {
  const clave = validarClave(process.env.RESPALDO_CLAVE);

  validarNombreBase(base);

  if (!carpeta) throw new Error("Indica --respaldo=CARPETA");
  if (!archivos) throw new Error("Indica --archivos=CARPETA_VACIA");

  if (!(await baseEstaVacia(sequelize, base))) {
    throw new Error(`La base ${base} tiene tablas; usa una base vacía`);
  }

  if (fs.existsSync(archivos) && (await fsp.readdir(archivos)).length) {
    throw new Error("La carpeta de archivos debe estar vacía");
  }

  const resumen = await verificarRespaldo(carpeta, clave);

  await sequelize.query(
    `CREATE DATABASE IF NOT EXISTS \`${base}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );

  await restaurarBase(path.join(carpeta, ARCHIVO_BASE), clave, base);
  await restaurarSubidas(path.join(carpeta, ARCHIVO_SUBIDAS), clave, archivos);

  return { tablas: await contarTablas(sequelize, base), resumen };
};

const argumento = (nombre) =>
  process.argv
    .find((valor) => valor.startsWith(`--${nombre}=`))
    ?.slice(nombre.length + 3);

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { default: sequelize } = await import("../config/database.js");
  const accion = process.argv[2];

  if (!["cifrar", "descifrar"].includes(accion)) {
    console.log(`Base de datos: ${process.env.DB_NAME}`);
  }

  try {
    if (accion === "cifrar") {
      const origen = argumento("archivo");

      if (!origen || !fs.existsSync(origen)) {
        throw new Error("Indica un --archivo=RUTA que exista");
      }

      const destino = await cifrarArchivoSuelto(
        path.resolve(origen),
        path.join(
          validarCarpetaRespaldos(process.env.RESPALDOS_DIR),
          "archivos-cifrados"
        ),
        validarClave(process.env.RESPALDO_CLAVE)
      );

      console.log(`Cifrado y comprobado: ${path.basename(destino)}`);
      console.log("El original sigue en su lugar.");
    } else if (accion === "descifrar") {
      const origen = argumento("archivo");
      const destino = argumento("destino");

      if (!origen || !destino) {
        throw new Error("Indica --archivo=RUTA.cif y --destino=RUTA_NUEVA");
      }

      await descifrarArchivoSuelto(
        path.resolve(origen),
        path.resolve(destino),
        validarClave(process.env.RESPALDO_CLAVE)
      );

      console.log(`Descifrado en: ${path.resolve(destino)}`);
    } else if (accion === "crear") {
      const { nombre, vencidos } = await crearRespaldo(sequelize);

      console.log(`Respaldo creado: ${nombre}`);
      console.log(`Respaldos vencidos eliminados: ${vencidos}`);
    } else if (accion === "probar") {
      const carpetaRaiz = validarCarpetaRespaldos(process.env.RESPALDOS_DIR);
      const carpeta = argumento("respaldo") ?? (await ultimoRespaldo(carpetaRaiz));
      const resultado = await probarRestauracion(sequelize, carpeta);

      console.log(`Respaldo probado: ${path.basename(carpeta)}`);
      console.log(
        `Restauración correcta: ${resultado.tablas} tablas, ${resultado.filas} filas, ${resultado.archivos} archivos, ${resultado.segundos} s`
      );
    } else if (accion === "restaurar") {
      const { tablas } = await restaurar(sequelize, {
        carpeta: argumento("respaldo"),
        base: argumento("base"),
        archivos: argumento("archivos"),
      });

      console.log(
        `Restaurado en ${argumento("base")}: ${Object.keys(tablas).length} tablas`
      );
    } else {
      throw new Error("Usa crear, probar, restaurar, cifrar o descifrar");
    }
  } catch (error) {
    console.error(`Error en el respaldo: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}
