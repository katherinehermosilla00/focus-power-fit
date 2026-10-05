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
      type: DataTypes.STRING(120),
      allowNull: false,
    },

    direccion: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },

    comuna: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    ciudad: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    horarioAtencion: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },

    telefono: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },

    estado: {
      type: DataTypes.ENUM("Activo", "Inactivo"),
      allowNull: false,
      defaultValue: "Activo",
    },
  },
  {
    tableName: "sucursales",
    timestamps: true,
  }
);

export default Sucursal;
