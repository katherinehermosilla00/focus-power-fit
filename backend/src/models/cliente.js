import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import Sucursal from "./sucursal.js";

const Cliente = sequelize.define(
  "Cliente",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    sucursalId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: Sucursal,
        key: "id",
      },
    },

    numeroCliente: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    nombres: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },

    apellidos: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },

    nombre: {
      type: DataTypes.STRING(270),
      allowNull: false,
    },

    rut: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },

    email: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },

    telefono: {
      type: DataTypes.STRING(30),
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
      type: DataTypes.ENUM(
        "Femenino",
        "Masculino",
        "No informado"
      ),
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

    plan: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    estado: {
      type: DataTypes.ENUM(
        "Activo",
        "Inactivo"
      ),
      allowNull: false,
      defaultValue: "Activo",
    },
  },
  {
    tableName: "clientes",
    timestamps: true,
  }
);

// RELACIÓN CLIENTE ↔ SUCURSAL
Sucursal.hasMany(Cliente, {
  foreignKey: "sucursalId",
  as: "clientes",
});

Cliente.belongsTo(Sucursal, {
  foreignKey: "sucursalId",
  as: "sucursal",
});

export default Cliente; 