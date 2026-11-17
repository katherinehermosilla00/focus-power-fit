import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Usuario = sequelize.define(
  "Usuario",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    nombre: {
      type: DataTypes.STRING(120),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },

    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },

    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "password_hash",
    },

    rol: {
      type: DataTypes.ENUM("admin", "cliente"),
      allowNull: false,
      defaultValue: "cliente",
    },

    estado: {
      type: DataTypes.ENUM("activo", "inactivo"),
      allowNull: false,
      defaultValue: "activo",
    },

    // Fecha en que aceptó los términos y el tratamiento de sus datos.
    terminosAceptadosAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "usuarios",
    timestamps: true,
  }
);

export default Usuario;