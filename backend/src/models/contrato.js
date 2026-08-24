import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import Cliente from "./cliente.js";

const Contrato = sequelize.define(
  "Contrato",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    clienteId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Cliente,
        key: "id",
      },
    },

    nombreArchivo: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    rutaArchivo: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },

    fechaInicio: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },

    fechaTermino: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },

    estado: {
      type: DataTypes.ENUM(
        "Vigente",
        "Vencido",
        "Finalizado"
      ),
      allowNull: false,
      defaultValue: "Vigente",
    },

    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "contratos",
    timestamps: true,
  }
);

Cliente.hasMany(Contrato, {
  foreignKey: "clienteId",
  as: "contratos",
});

Contrato.belongsTo(Cliente, {
  foreignKey: "clienteId",
  as: "cliente",
});

export default Contrato;