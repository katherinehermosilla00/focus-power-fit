import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Sucursal = sequelize.define(
  "Sucursal",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },

    direccion: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    comuna: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    telefono: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },

    estado: {
      type: DataTypes.ENUM(
        "Activa",
        "Inactiva"
      ),
      allowNull: false,
      defaultValue: "Activa",
    },
  },
  {
    tableName: "sucursales",
    timestamps: true,
  }
);

export default Sucursal;