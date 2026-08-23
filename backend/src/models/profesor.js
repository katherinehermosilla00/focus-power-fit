import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import Sucursal from "./sucursal.js";

const Profesor = sequelize.define(
  "Profesor",
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

    nombre: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },

    rut: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },

    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },

    telefono: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },

    especialidad: {
      type: DataTypes.STRING(120),
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
    tableName: "profesores",
    timestamps: true,
  }
);

Sucursal.hasMany(Profesor, {
  foreignKey: "sucursalId",
  as: "profesores",
});

Profesor.belongsTo(Sucursal, {
  foreignKey: "sucursalId",
  as: "sucursal",
});

export default Profesor;