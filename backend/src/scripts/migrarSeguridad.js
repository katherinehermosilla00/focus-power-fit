// Prepara una base de datos existente para las medidas de seguridad.
// Se puede ejecutar más de una vez: npm run migrar:seguridad
//
// 1. Agrega usuarios.terminosAceptadosAt.
// 2. Convierte correos y RUT vacíos en NULL, quita espacios sobrantes y pasa los
//    correos a minúsculas.
// 3. Crea índices únicos para correo y RUT de clientes.
// 4. Quita el rol "profesor" de usuarios, que ya no tiene acceso al sistema.
// 5. Crea un índice único para no registrar dos veces la misma asistencia.
//
// Si hay duplicados no crea el índice, y si hay cuentas de profesor no cambia el
// rol: informa los ID para corregirlos. Por privacidad no imprime correos ni RUT.
// Respalda antes la base.

import "dotenv/config";
import path from "node:path";
import { DataTypes, QueryTypes } from "sequelize";
import { fileURLToPath } from "node:url";

const INDICES = [
  { campo: "email", nombre: "clientes_email_unico" },
  { campo: "rut", nombre: "clientes_rut_unico" },
];

export const migrarSeguridad = async (sequelize, informar = console.log) => {
  const consultas = sequelize.getQueryInterface();

  const columnas = await consultas.describeTable("usuarios");

  if (!columnas.terminosAceptadosAt) {
    await consultas.addColumn("usuarios", "terminosAceptadosAt", {
      type: DataTypes.DATE,
      allowNull: true,
    });
    informar("Columna usuarios.terminosAceptadosAt agregada.");
  }

  await sequelize.query(
    "UPDATE clientes SET email = NULL WHERE TRIM(email) = ''"
  );
  await sequelize.query(
    "UPDATE clientes SET rut = NULL WHERE TRIM(rut) = ''"
  );
  await sequelize.query(
    "UPDATE clientes SET email = LOWER(TRIM(email)) WHERE email IS NOT NULL"
  );
  await sequelize.query(
    "UPDATE clientes SET rut = TRIM(rut) WHERE rut IS NOT NULL"
  );

  const indices = await consultas.showIndex("clientes");
  const duplicados = {};

  for (const { campo, nombre } of INDICES) {
    if (indices.some((indice) => indice.name === nombre)) continue;

    // La base compara los valores: en MySQL, "K" y "k" o "jose" y "josé" son
    // iguales para el índice único, aunque en JavaScript sean distintos.
    const valores = await sequelize.query(
      `SELECT ${campo} AS valor FROM clientes WHERE ${campo} IS NOT NULL GROUP BY ${campo} HAVING COUNT(*) > 1`,
      { type: QueryTypes.SELECT }
    );

    const repetidos = [];

    for (const { valor } of valores) {
      const filas = await sequelize.query(
        `SELECT id FROM clientes WHERE ${campo} = :valor ORDER BY id`,
        { replacements: { valor }, type: QueryTypes.SELECT }
      );

      repetidos.push(filas.map(({ id }) => id));
    }

    if (repetidos.length) {
      duplicados[campo] = repetidos;
      informar(
        `No se creó el índice de ${campo}. Fichas duplicadas (ID): ${repetidos
          .map((ids) => ids.join(", "))
          .join(" | ")}`
      );
      continue;
    }

    await consultas.addIndex("clientes", [campo], {
      name: nombre,
      unique: true,
    });
    informar(`Índice único ${nombre} creado.`);
  }

  let cuentasProfesor = [];

  if (columnas.rol?.type?.includes("profesor")) {
    const filas = await sequelize.query(
      "SELECT id FROM usuarios WHERE rol = 'profesor' ORDER BY id",
      { type: QueryTypes.SELECT }
    );

    cuentasProfesor = filas.map(({ id }) => id);

    if (cuentasProfesor.length) {
      informar(
        `No se quitó el rol profesor. Cuentas con ese rol (ID): ${cuentasProfesor.join(", ")}`
      );
    } else {
      await sequelize.query(
        "ALTER TABLE usuarios MODIFY rol ENUM('admin','cliente') NOT NULL DEFAULT 'cliente'"
      );
      informar("Rol profesor quitado de usuarios.");
    }
  }

  // 5. Una misma clase no se registra dos veces el mismo día.
  let asistenciasRepetidas = [];
  const tablas = (await consultas.showAllTables()).map((tabla) =>
    typeof tabla === "string" ? tabla : tabla.tableName
  );

  if (tablas.includes("asistencias")) {
    const nombre = "asistencias_asignacion_fecha_unico";
    const existentes = await consultas.showIndex("asistencias");

    if (!existentes.some((indice) => indice.name === nombre)) {
      const grupos = await sequelize.query(
        "SELECT asignacionId, fecha FROM asistencias GROUP BY asignacionId, fecha HAVING COUNT(*) > 1",
        { type: QueryTypes.SELECT }
      );

      for (const { asignacionId, fecha } of grupos) {
        const filas = await sequelize.query(
          "SELECT id FROM asistencias WHERE asignacionId = :asignacionId AND fecha = :fecha ORDER BY id",
          { replacements: { asignacionId, fecha }, type: QueryTypes.SELECT }
        );

        asistenciasRepetidas.push(filas.map(({ id }) => id));
      }

      if (asistenciasRepetidas.length) {
        informar(
          `No se creó el índice de asistencias. Asistencias repetidas (ID): ${asistenciasRepetidas
            .map((ids) => ids.join(", "))
            .join(" | ")}`
        );
      } else {
        await consultas.addIndex("asistencias", ["asignacionId", "fecha"], {
          name: nombre,
          unique: true,
        });
        informar(`Índice único ${nombre} creado.`);
      }
    }
  }

  return { duplicados, cuentasProfesor, asistenciasRepetidas };
};

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { default: sequelize } = await import("../config/database.js");

  console.log(`Base de datos: ${process.env.DB_NAME}`);

  try {
    const { duplicados, cuentasProfesor, asistenciasRepetidas } =
      await migrarSeguridad(sequelize);

    if (
      Object.keys(duplicados).length ||
      cuentasProfesor.length ||
      asistenciasRepetidas.length
    ) {
      console.log(
        "Migración incompleta: corrige lo informado y ejecútala otra vez."
      );
      process.exitCode = 1;
    } else {
      console.log("Migración completa.");
    }
  } catch (error) {
    console.error("Error en la migración:", error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}
