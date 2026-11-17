
import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import Sucursal from "./sucursal.js";

const Maquina = sequelize.define(
  "Maquina",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    codigo: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },

    nombre: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },

    marca: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    modelo: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    sucursalId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Sucursal,
        key: "id",
      },
    },

    estado: {
      type: DataTypes.ENUM(
        "Operativa",
        "En mantención",
        "Fuera de servicio"
      ),
      allowNull: false,
      defaultValue: "Operativa",
    },

    fechaUltimaMantencion: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },

    fechaProximaMantencion: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },

    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "maquinas",
    timestamps: true,
  }
);

// Relación: una sucursal puede tener muchas máquinas.
Sucursal.hasMany(Maquina, {
  foreignKey: "sucursalId",
  as: "maquinas",
});

// Relación: cada máquina pertenece a una sucursal.
Maquina.belongsTo(Sucursal, {
  foreignKey: "sucursalId",
  as: "sucursal",
});

export default Maquina;
