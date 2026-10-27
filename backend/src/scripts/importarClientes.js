
import "dotenv/config";
import path from "node:path";
import ExcelJS from "exceljs";

import sequelize from "../config/database.js";
import Cliente from "../models/cliente.js";
import Sucursal from "../models/sucursal.js";

// ==========================================
// CONFIGURACIÓN
// ==========================================

// Por defecto, NO se modifica la base de datos.
// Solo se importará realmente al usar --apply.
const MODO_SIMULACION =
  !process.argv.includes("--apply");

// ==========================================
// FUNCIONES DE NORMALIZACIÓN
// ==========================================

const limpiarTexto = (valor) => {
  if (
    valor === undefined ||
    valor === null ||
    valor === ""
  ) {
    return null;
  }

  return String(valor).trim() || null;
};

const normalizarEncabezado = (valor) => {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
};

const obtenerValor = (fila, nombresPosibles) => {
  const claves = Object.keys(fila);

  for (const nombre of nombresPosibles) {
    const encontrada = claves.find(
      (clave) =>
        normalizarEncabezado(clave) ===
        normalizarEncabezado(nombre)
    );

    if (encontrada) {
      return fila[encontrada];
    }
  }

  return null;
};

const normalizarRut = (valor) => {
  const rutOriginal = limpiarTexto(valor);

  if (!rutOriginal) {
    return null;
  }

  const limpio = rutOriginal
    .replace(/\./g, "")
    .replace(/-/g, "")
    .replace(/\s/g, "")
    .toUpperCase();

  if (limpio.length < 2) {
    return rutOriginal;
  }

  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);

  if (!/^\d+$/.test(cuerpo)) {
    return rutOriginal;
  }

  const cuerpoFormateado =
    Number(cuerpo).toLocaleString("es-CL");

  return `${cuerpoFormateado}-${dv}`;
};

const normalizarEmail = (valor) => {
  const email = limpiarTexto(valor);

  if (!email) {
    return null;
  }

  const normalizado = email.toLowerCase();

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      normalizado
    )
  ) {
    return null;
  }

  return normalizado;
};

const normalizarTelefono = (valor) => {
  const telefono = limpiarTexto(valor);

  if (!telefono) {
    return null;
  }

  return telefono.replace(/\s+/g, " ");
};

const normalizarGenero = (valor) => {
  const genero = limpiarTexto(valor);

  if (!genero) {
    return "No informado";
  }

  const texto = genero
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  if (
    texto === "1" ||
    texto === "f" ||
    texto.includes("femen")
  ) {
    return "Femenino";
  }

  if (
    texto === "2" ||
    texto === "m" ||
    texto.includes("mascul")
  ) {
    return "Masculino";
  }

  return "No informado";
};

const convertirEntero = (valor) => {
  if (
    valor === undefined ||
    valor === null ||
    valor === ""
  ) {
    return null;
  }

  const numero = Number(valor);

  return Number.isFinite(numero)
    ? Math.trunc(numero)
    : null;
};

// ==========================================
// FECHAS
// ==========================================

const construirFechaNacimiento = (
  dia,
  mes,
  anio
) => {
  const d = convertirEntero(dia);
  const m = convertirEntero(mes);
  const a = convertirEntero(anio);

  if (!d || !m || !a) {
    return null;
  }

  if (
    d < 1 ||
    d > 31 ||
    m < 1 ||
    m > 12 ||
    a < 1900
  ) {
    return null;
  }

  const fecha = new Date(
    Date.UTC(a, m - 1, d)
  );

  if (
    fecha.getUTCFullYear() !== a ||
    fecha.getUTCMonth() !== m - 1 ||
    fecha.getUTCDate() !== d
  ) {
    return null;
  }

  return `${a}-${String(m).padStart(
    2,
    "0"
  )}-${String(d).padStart(2, "0")}`;
};

const convertirFechaOrigen = (valor) => {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return null;
  }

  if (valor instanceof Date) {
    if (Number.isNaN(valor.getTime())) {
      return null;
    }

    return valor.toISOString().slice(0, 10);
  }

  // Fechas numéricas de Excel.
  if (typeof valor === "number") {
    const milisegundos =
      Math.round((valor - 25569) * 86400000);

    const fecha = new Date(milisegundos);

    if (Number.isNaN(fecha.getTime())) {
      return null;
    }

    return fecha.toISOString().slice(0, 10);
  }

  const texto = String(valor).trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(texto)) {
    return texto.slice(0, 10);
  }

  const match = texto.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/
  );

  if (match) {
    const [, dia, mes, anio] = match;

    return construirFechaNacimiento(
      dia,
      mes,
      anio
    );
  }

  return null;
};

// ==========================================
// CONVERTIR CELDAS DE EXCELJS
// ==========================================

const convertirCelda = (celda) => {
  const valor = celda.value;

  if (
    valor === null ||
    valor === undefined
  ) {
    return null;
  }

  if (valor instanceof Date) {
    return valor;
  }

  if (
    typeof valor === "string" ||
    typeof valor === "number" ||
    typeof valor === "boolean"
  ) {
    return valor;
  }

  if (typeof valor === "object") {
    if (valor.result !== undefined) {
      return valor.result;
    }

    if (valor.text !== undefined) {
      return valor.text;
    }

    if (Array.isArray(valor.richText)) {
      return valor.richText
        .map((parte) => parte.text)
        .join("");
    }

    if (valor.hyperlink) {
      return valor.text ?? valor.hyperlink;
    }
  }

  return celda.text || null;
};

// ==========================================
// LEER EXCEL CON EXCELJS
// ==========================================

const leerFilasExcel = async (rutaArchivo) => {
  const workbook = new ExcelJS.Workbook();

  await workbook.xlsx.readFile(rutaArchivo);

  const hoja = workbook.worksheets[0];

  if (!hoja) {
    throw new Error(
      "El archivo Excel no contiene hojas"
    );
  }

  const filaEncabezados = hoja.getRow(1);

  const encabezados = [];

  for (
    let columna = 1;
    columna <= hoja.columnCount;
    columna++
  ) {
    encabezados.push(
      String(
        convertirCelda(
          filaEncabezados.getCell(columna)
        ) ?? ""
      ).trim()
    );
  }

  const filas = [];

  hoja.eachRow((fila, numeroFila) => {
    if (numeroFila === 1) {
      return;
    }

    const registro = {};
    let tieneDatos = false;

    encabezados.forEach(
      (encabezado, indice) => {
        if (!encabezado) {
          return;
        }

        const valor = convertirCelda(
          fila.getCell(indice + 1)
        );

        registro[encabezado] = valor;

        if (
          valor !== null &&
          valor !== undefined &&
          valor !== ""
        ) {
          tieneDatos = true;
        }
      }
    );

    if (tieneDatos) {
      filas.push({
        numeroFila,
        datos: registro,
      });
    }
  });

  return filas;
};

// ==========================================
// IMPORTAR CLIENTES POR SUCURSAL
// ==========================================

const importarArchivo = async (
  rutaArchivo,
  sucursalId,
  nombreSucursal
) => {
  console.log("");
  console.log(
    `=== Procesando ${nombreSucursal} ===`
  );

  const filas = await leerFilasExcel(
    rutaArchivo
  );

  console.log(
    `Registros encontrados: ${filas.length}`
  );

  let creados = 0;
  let actualizados = 0;
  let omitidos = 0;
  let errores = 0;
  let preparados = 0;

  for (const item of filas) {
    const fila = item.datos;
    const numeroFila = item.numeroFila;

    try {
      const nombres = limpiarTexto(
        obtenerValor(fila, [
          "Nombres",
          "Nombre",
        ])
      );

      const apellidos = limpiarTexto(
        obtenerValor(fila, [
          "Apellidos",
          "Apellido",
        ])
      );

      const numeroCliente = limpiarTexto(
        obtenerValor(fila, [
          "Número de cliente",
          "Numero de cliente",
          "N° cliente",
          "Nro cliente",
        ])
      );

      const email = normalizarEmail(
        obtenerValor(fila, [
          "Email",
          "Correo",
          "Correo electrónico",
        ])
      );

      const rut = normalizarRut(
        obtenerValor(fila, [
          "RUT",
          "Rut",
        ])
      );

      const telefono = normalizarTelefono(
        obtenerValor(fila, [
          "Teléfono",
          "Telefono",
          "Teléfono principal",
        ])
      );

      const telefonoSecundario =
        normalizarTelefono(
          obtenerValor(fila, [
            "Teléfono secundario",
            "Telefono secundario",
            "Teléfono 2",
            "Telefono 2",
            "Teléfono secundario del cliente",
          ])
        );

      const direccion = limpiarTexto(
        obtenerValor(fila, [
          "Dirección",
          "Direccion",
        ])
      );

      const comuna = limpiarTexto(
        obtenerValor(fila, ["Comuna"])
      );

      const ciudad = limpiarTexto(
        obtenerValor(fila, ["Ciudad"])
      );

      const edad = convertirEntero(
        obtenerValor(fila, ["Edad"])
      );

      const genero = normalizarGenero(
        obtenerValor(fila, [
          "Género",
          "Genero",
          "Sexo",
          "Género. 1 = Femenino, 2 = Masculino",
        ])
      );

      const diaNacimiento = obtenerValor(
        fila,
        [
          "Día nacimiento",
          "Dia nacimiento",
          "Día de nacimiento",
          "Día del nacimiento",
        ]
      );

      const mesNacimiento = obtenerValor(
        fila,
        [
          "Mes nacimiento",
          "Mes de nacimiento",
          "Mes del nacimiento",
        ]
      );

      const anioNacimiento = obtenerValor(
        fila,
        [
          "Año nacimiento",
          "Ano nacimiento",
          "Año de nacimiento",
          "Año de nacimiento.",
        ]
      );

      const fechaNacimiento =
        construirFechaNacimiento(
          diaNacimiento,
          mesNacimiento,
          anioNacimiento
        );

      const fechaCreacionOrigen =
        convertirFechaOrigen(
          obtenerValor(fila, [
            "Fecha creación",
            "Fecha creacion",
            "Fecha de creación",
            "Fecha de creacion",
            "Fecha de creación.",
          ])
        );

      const nombre = [
        nombres,
        apellidos,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      if (
        !nombre &&
        !rut &&
        !email &&
        !numeroCliente
      ) {
        omitidos++;

        console.log(
          `Fila ${numeroFila} omitida: sin datos identificables`
        );

        continue;
      }

      const nombreFinal =
        nombre ||
        `Cliente sin nombre ${
          numeroCliente || numeroFila
        }`;

      const datosCliente = {
        sucursalId,
        numeroCliente,
        nombres: nombres || nombreFinal,
        apellidos,
        nombre: nombreFinal,
        rut,
        email,
        telefono,
        telefonoSecundario,
        direccion,
        comuna,
        ciudad,
        edad,
        genero,
        fechaNacimiento,
        fechaCreacionOrigen,
        estado: "Activo",
      };

      // ====================================
      // MODO SIMULACIÓN
      // ====================================
      // Solo validar y preparar los datos.
      // NO consultar ni modificar MySQL.
      if (MODO_SIMULACION) {
        preparados++;
        continue;
      }

      // ====================================
      // IMPORTACIÓN REAL
      // ====================================

      let existente = null;

      if (numeroCliente) {
        existente = await Cliente.findOne({
          where: {
            sucursalId,
            numeroCliente,
          },
        });
      }

      if (!existente && rut) {
        existente = await Cliente.findOne({
          where: {
            sucursalId,
            rut,
          },
        });
      }

      if (!existente && email) {
        existente = await Cliente.findOne({
          where: {
            sucursalId,
            email,
          },
        });
      }

      if (existente) {
        await existente.update(datosCliente);
        actualizados++;
      } else {
        await Cliente.create(datosCliente);
        creados++;
      }
    } catch (error) {
      errores++;

      console.error(
        `Error fila ${numeroFila}:`,
        error.message
      );
    }
  }

  console.log(
    `Finalizado ${nombreSucursal}`
  );

  const resultado = {
    registros: filas.length,
    preparados,
    creados,
    actualizados,
    omitidos,
    errores,
    simulacion: MODO_SIMULACION,
  };

  console.log(resultado);

  return resultado;
};

// ==========================================
// EJECUTAR IMPORTACIÓN
// ==========================================

const ejecutarImportacion = async () => {
  let conexionAbierta = false;

  try {
    console.log(
      MODO_SIMULACION
        ? "MODO SIMULACIÓN: no se modificará MySQL"
        : "MODO REAL: se crearán o actualizarán clientes"
    );

    // Solo conectar a MySQL en modo real.
    if (!MODO_SIMULACION) {
      await sequelize.authenticate();
      conexionAbierta = true;

      console.log(
        "MySQL conectado correctamente"
      );

      const penalolen =
        await Sucursal.findByPk(1);

      const laReina =
        await Sucursal.findByPk(2);

      if (!penalolen) {
        throw new Error(
          "No existe Peñalolén con id 1"
        );
      }

      if (!laReina) {
        throw new Error(
          "No existe La Reina con id 2"
        );
      }
    }

    const carpeta = path.join(
      process.cwd(),
      "data",
      "importaciones"
    );

    const rutaPenalolen = path.join(
      carpeta,
      "clientes_penalolen.xlsx"
    );

    const rutaLaReina = path.join(
      carpeta,
      "clientes_la_reina.xlsx"
    );

    const resultadoPenalolen =
      await importarArchivo(
        rutaPenalolen,
        1,
        "Peñalolén"
      );

    const resultadoLaReina =
      await importarArchivo(
        rutaLaReina,
        2,
        "La Reina"
      );

    console.log("");
    console.log(
      "=== IMPORTACIÓN TERMINADA ==="
    );

    console.log({
      penalolen: resultadoPenalolen,
      laReina: resultadoLaReina,
    });
  } catch (error) {
    console.error(
      "ERROR GENERAL DE IMPORTACIÓN:",
      error.message
    );

    process.exitCode = 1;
  } finally {
    if (conexionAbierta) {
      await sequelize.close();
    }
  }
};

ejecutarImportacion();
