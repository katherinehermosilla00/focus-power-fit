import "dotenv/config";
import path from "path";
import XLSX from "xlsx";

import sequelize from "../config/database.js";
import Cliente from "../models/cliente.js";
import Sucursal from "../models/sucursal.js";

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

const obtenerValor = (fila, nombresPosibles) => {
  const claves = Object.keys(fila);

  for (const nombre of nombresPosibles) {
    const encontrada = claves.find(
      (clave) =>
        clave.trim().toLowerCase() ===
        nombre.trim().toLowerCase()
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
    .replace(/[\u0300-\u036f]/g, "");

  if (
    texto === "f" ||
    texto.includes("femen")
  ) {
    return "Femenino";
  }

  if (
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
  if (!valor) {
    return null;
  }

  if (valor instanceof Date) {
    return valor.toISOString().slice(0, 10);
  }

  if (typeof valor === "number") {
    const fecha =
      XLSX.SSF.parse_date_code(valor);

    if (!fecha) {
      return null;
    }

    return `${fecha.y}-${String(
      fecha.m
    ).padStart(2, "0")}-${String(
      fecha.d
    ).padStart(2, "0")}`;
  }

  const texto = String(valor).trim();

  if (
    /^\d{4}-\d{2}-\d{2}/.test(texto)
  ) {
    return texto.slice(0, 10);
  }

  const match = texto.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/
  );

  if (match) {
    const [, dia, mes, anio] = match;

    return `${anio}-${mes.padStart(
      2,
      "0"
    )}-${dia.padStart(2, "0")}`;
  }

  return null;
};

const importarArchivo = async (
  rutaArchivo,
  sucursalId,
  nombreSucursal
) => {
  console.log("");
  console.log(
    `=== Importando ${nombreSucursal} ===`
  );

  const workbook = XLSX.readFile(
    rutaArchivo,
    {
      cellDates: true,
    }
  );

  const primeraHoja =
    workbook.SheetNames[0];

  const hoja =
    workbook.Sheets[primeraHoja];

  const filas =
    XLSX.utils.sheet_to_json(hoja, {
      defval: null,
      raw: false,
    });

  console.log(
    `Registros encontrados: ${filas.length}`
  );

  let creados = 0;
  let actualizados = 0;
  let omitidos = 0;
  let errores = 0;

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i];

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
        ])
      );

      const diaNacimiento =
        obtenerValor(fila, [
          "Día nacimiento",
          "Dia nacimiento",
          "Día de nacimiento",
        ]);

      const mesNacimiento =
        obtenerValor(fila, [
          "Mes nacimiento",
          "Mes de nacimiento",
        ]);

      const anioNacimiento =
        obtenerValor(fila, [
          "Año nacimiento",
          "Ano nacimiento",
          "Año de nacimiento",
        ]);

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
          `Fila ${i + 2} omitida: sin datos identificables`
        );

        continue;
      }

      const nombreFinal =
        nombre ||
        `Cliente sin nombre ${
          numeroCliente || i + 2
        }`;

      const datosCliente = {
        sucursalId,
        numeroCliente,
        nombres:
          nombres || nombreFinal,
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

      let existente = null;

      if (numeroCliente) {
        existente =
          await Cliente.findOne({
            where: {
              sucursalId,
              numeroCliente,
            },
          });
      }

      if (!existente && rut) {
        existente =
          await Cliente.findOne({
            where: {
              sucursalId,
              rut,
            },
          });
      }

      if (!existente && email) {
        existente =
          await Cliente.findOne({
            where: {
              sucursalId,
              email,
            },
          });
      }

      if (existente) {
        await existente.update(
          datosCliente
        );

        actualizados++;
      } else {
        await Cliente.create(
          datosCliente
        );

        creados++;
      }
    } catch (error) {
      errores++;

      console.error(
        `Error fila ${i + 2}:`,
        error.message
      );
    }
  }

  console.log(
    `Finalizado ${nombreSucursal}`
  );

  console.log({
    creados,
    actualizados,
    omitidos,
    errores,
  });

  return {
    creados,
    actualizados,
    omitidos,
    errores,
  };
};

const ejecutarImportacion = async () => {
  try {
    await sequelize.authenticate();

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
  } finally {
    await sequelize.close();
  }
};

ejecutarImportacion();