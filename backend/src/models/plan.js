import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Plan = sequelize.define(
  "Plan",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    nombre: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: true,
    },

    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    duracionMeses: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    sesiones: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    precio: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },

    modalidad: {
      type: DataTypes.ENUM(
        "Individual",
        "Compartido"
      ),
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
    tableName: "planes",
    timestamps: true,
  }
);

export default Plan;