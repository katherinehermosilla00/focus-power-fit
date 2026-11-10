import "dotenv/config";
import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const columnasNuevas = {
  sucursalId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: "sucursales",
      key: "id",
    },
    onUpdate: "CASCADE",
    onDelete: "SET NULL",
  },
  numeroCliente: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  nombres: {
    type: DataTypes.STRING(120),
    allowNull: true,
  },
  apellidos: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  telefonoSecundario: {
    type: DataTypes.STRING(30),
    allowNull: true,
  },
  direccion: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  comuna: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  ciudad: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  edad: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  genero: {
    type: DataTypes.ENUM("Femenino", "Masculino", "No informado"),
    allowNull: false,
    defaultValue: "No informado",
  },
  fechaNacimiento: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  fechaCreacionOrigen: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
};

const migrarEsquemaClientes = async () => {
  await sequelize.authenticate();
  let columnas = await sequelize.getQueryInterface().describeTable("clientes");
  const queryInterface = sequelize.getQueryInterface();

  for (const [nombre, definicion] of Object.entries(columnasNuevas)) {
    if (!columnas[nombre]) {
      await queryInterface.addColumn("clientes", nombre, definicion);
    }
  }

  await queryInterface.changeColumn("clientes", "nombre", {
    type: DataTypes.STRING(270),
    allowNull: false,
  });
  await queryInterface.changeColumn("clientes", "rut", {
    type: DataTypes.STRING(20),
    allowNull: true,
  });
  await queryInterface.changeColumn("clientes", "email", {
    type: DataTypes.STRING(150),
    allowNull: true,
  });

  await sequelize.query(
    "UPDATE clientes SET nombres = nombre WHERE nombres IS NULL OR nombres = ''"
  );
  await queryInterface.changeColumn("clientes", "nombres", {
    type: DataTypes.STRING(120),
    allowNull: false,
  });

  columnas = await queryInterface.describeTable("clientes");
  console.log(
    `Migración de clientes finalizada. Columnas disponibles: ${Object.keys(columnas).join(", ")}`
  );
};

try {
  await migrarEsquemaClientes();
} catch (error) {
  console.error("No se pudo migrar la tabla clientes:", error.message);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
