import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Imagen = sequelize.define(
  "Imagen",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    categoria: {
      type: DataTypes.ENUM(
        "profesor",
        "sucursal",
        "maquina",
        "sitio"
      ),
      allowNull: false,
    },

    referenciaId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    nombreArchivo: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    rutaArchivo: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },

    nombreOriginal: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    mostrarPublicamente: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    orden: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "imagenes",
    timestamps: true,
  }
);

export default Imagen;