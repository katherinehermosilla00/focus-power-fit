// Une fichas de una misma persona importadas en dos sucursales.
//
// Simular (no cambia nada):  npm run unir:duplicados
// Aplicar:                   npm run unir:duplicados -- --aplicar --base=NOMBRE_DE_LA_BASE
//
// Solo une una pareja si tiene el mismo correo y nombre, los RUT no se
// contradicen y ninguna ficha tiene pagos, asignaciones, contratos o
// recordatorios. Queda la ficha con la fecha de creación más reciente de los
// Excel, completada con los datos que le falten. Todo lo demás se informa para
// revisarlo a mano. Por privacidad imprime solo ID. Respalda antes la base.

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Op } from "sequelize";
import ExcelJS from "exceljs";

import sequelize from "../config/database.js";
import Asignacion from "../models/asignacion.js";
import Cliente from "../models/cliente.js";
import Contrato from "../models/contrato.js";
import Pago from "../models/pago.js";
import Recordatorio from "../models/recordatorio.js";
import { normalizarEmail, normalizarRut } from "../utils/validaciones.js";

const CAMPOS_A_COMPLETAR = [
  "numeroCliente",
  "nombres",
  "apellidos",
  "rut",
  "telefono",
  "telefonoSecundario",
  "direccion",
  "comuna",
  "ciudad",
  "edad",
  "genero",
  "fechaNacimiento",
  "fechaCreacionOrigen",
  "plan",
];

const EXCEL_POR_SUCURSAL = {
  1: "clientes_penalolen.xlsx",
  2: "clientes_la_reina.xlsx",
};

const texto = (valor) =>
  String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const estaVacio = (campo, valor) =>
  valor === null ||
  valor === undefined ||
  String(valor).trim() === "" ||
  (campo === "genero" && valor === "No informado");

const claveFecha = (sucursalId, email) =>
  `${sucursalId}|${normalizarEmail(email)}`;

const buscarGrupos = async (campo) => {
  const filas = await Cliente.findAll({
    attributes: [campo],
    where: { [campo]: { [Op.ne]: null } },
    group: [campo],
    having: sequelize.literal("COUNT(*) > 1"),
    raw: true,
  });

  const grupos = [];

  for (const fila of filas) {
    const fichas = await Cliente.findAll({
      attributes: ["id"],
      where: { [campo]: fila[campo] },
      order: [["id", "ASC"]],
      raw: true,
    });

    grupos.push(fichas.map(({ id }) => id));
  }

  return grupos;
};

const motivoParaRevisar = (a, b) => {
  if (!a.email || !b.email || texto(a.email) !== texto(b.email)) {
    return "correo distinto o faltante";
  }

  if (texto(a.nombre) !== texto(b.nombre)) return "nombre distinto";

  if (a.rut && b.rut && texto(a.rut) !== texto(b.rut)) {
    const validos = [a.rut, b.rut].filter((rut) => normalizarRut(rut));

    if (validos.length !== 1) return "RUT distintos";
  }

  return null;
};

const tieneHistorial = async (ids, transaction) => {
  for (const Modelo of [Pago, Asignacion, Contrato, Recordatorio]) {
    const total = await Modelo.count({
      where: { clienteId: ids },
      transaction,
    });

    if (total > 0) return true;
  }

  return false;
};

// Datos que la ficha que queda recibe de la otra. Con dos RUT distintos, uno de
// ellos inválido, se conserva el válido.
const datosACompletar = (queda, seUne) => {
  const cambios = {};

  for (const campo of CAMPOS_A_COMPLETAR) {
    if (estaVacio(campo, queda[campo]) && !estaVacio(campo, seUne[campo])) {
      cambios[campo] = seUne[campo];
    }
  }

  if (
    queda.rut &&
    seUne.rut &&
    !normalizarRut(queda.rut) &&
    normalizarRut(seUne.rut)
  ) {
    cambios.rut = seUne.rut;
  }

  return cambios;
};

export const unirDuplicados = async ({ fechas, aplicar = false }) => {
  const grupos = new Map();

  for (const grupo of [
    ...(await buscarGrupos("email")),
    ...(await buscarGrupos("rut")),
  ]) {
    grupos.set(grupo.join("-"), grupo);
  }

  const parejas = [];
  const revisar = [];

  for (const ids of grupos.values()) {
    if (ids.length !== 2) {
      revisar.push({ ids, motivo: "más de dos fichas" });
      continue;
    }

    const [a, b] = await Promise.all(ids.map((id) => Cliente.findByPk(id)));

    const motivo =
      motivoParaRevisar(a, b) ??
      ((await tieneHistorial(ids)) ? "tiene historial" : null);

    if (motivo) {
      revisar.push({ ids, motivo });
      continue;
    }

    const fechaA = fechas.get(claveFecha(a.sucursalId, a.email));
    const fechaB = fechas.get(claveFecha(b.sucursalId, b.email));

    if (!fechaA || !fechaB || fechaA === fechaB) {
      revisar.push({ ids, motivo: "misma fecha o sin fecha" });
      continue;
    }

    parejas.push(fechaA > fechaB ? { queda: a, seUne: b } : { queda: b, seUne: a });
  }

  if (aplicar) {
    await sequelize.transaction(async (transaction) => {
      for (const { queda, seUne } of parejas) {
        // Se vuelve a comprobar dentro de la transacción: si apareció historial,
        // se revierte todo en vez de borrarlo.
        if (await tieneHistorial([queda.id, seUne.id], transaction)) {
          throw new Error(`La pareja ${queda.id}, ${seUne.id} tiene historial`);
        }

        const cambios = datosACompletar(queda, seUne);

        await seUne.destroy({ transaction });
        await queda.update(cambios, { transaction });
      }
    });
  }

  return {
    unidas: parejas.map(({ queda, seUne }) => ({
      queda: queda.id,
      seUne: seUne.id,
      sucursalId: queda.sucursalId,
    })),
    revisar,
  };
};

// Fecha de creación de cada ficha según los Excel, en formato año-mes-día.
const leerFechasExcel = async (carpeta) => {
  const fechas = new Map();

  for (const [sucursalId, archivo] of Object.entries(EXCEL_POR_SUCURSAL)) {
    const ruta = path.join(carpeta, archivo);

    if (!fs.existsSync(ruta)) {
      throw new Error(`No se encontró ${archivo}`);
    }

    const libro = new ExcelJS.Workbook();
    await libro.xlsx.readFile(ruta);

    const hoja = libro.worksheets[0];
    const columnas = {};

    hoja.getRow(1).eachCell((celda, columna) => {
      const titulo = texto(celda.text);

      if (titulo === "email") columnas.email = columna;
      if (titulo.startsWith("fecha de creacion")) columnas.fecha = columna;
    });

    if (!columnas.email || !columnas.fecha) {
      throw new Error(`Faltan columnas en ${archivo}`);
    }

    hoja.eachRow((fila, numero) => {
      if (numero === 1) return;

      const email = fila.getCell(columnas.email).text;
      const fecha = String(fila.getCell(columnas.fecha).text).match(
        /^(\d{2})\/(\d{2})\/(\d{4})$/
      );

      if (email && fecha) {
        fechas.set(
          claveFecha(sucursalId, email),
          `${fecha[3]}-${fecha[2]}-${fecha[1]}`
        );
      }
    });
  }

  return fechas;
};

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const aplicar = process.argv.includes("--aplicar");
  const base = process.argv
    .find((argumento) => argumento.startsWith("--base="))
    ?.slice("--base=".length);

  console.log(`Base de datos: ${process.env.DB_NAME}`);
  console.log(aplicar ? "Modo: APLICAR" : "Modo: simulación, no cambia nada");

  if (aplicar && base !== process.env.DB_NAME) {
    console.error(
      "Detenido: indica la base a cambiar con --base=NOMBRE; debe ser la misma de DB_NAME."
    );
    process.exitCode = 1;
    await sequelize.close();
  } else {
    try {
      const { unidas, revisar } = await unirDuplicados({
        fechas: await leerFechasExcel(
          path.join(process.cwd(), "data", "importaciones")
        ),
        aplicar,
      });

      console.log(
        `${aplicar ? "Parejas unidas" : "Parejas que se unirían"}: ${unidas.length}`
      );

      for (const sucursalId of Object.keys(EXCEL_POR_SUCURSAL)) {
        const total = unidas.filter(
          (pareja) => String(pareja.sucursalId) === sucursalId
        ).length;

        console.log(`  Quedan en sucursal ${sucursalId}: ${total}`);
      }

      console.log(`Para revisar a mano: ${revisar.length}`);

      for (const { ids, motivo } of revisar) {
        console.log(`  ${ids.join(", ")}: ${motivo}`);
      }
    } catch (error) {
      console.error("No se unió ninguna ficha:", error.message);
      process.exitCode = 1;
    } finally {
      await sequelize.close();
    }
  }
}
