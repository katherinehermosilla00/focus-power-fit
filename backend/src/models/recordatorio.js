import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import Cliente from "./cliente.js";

const Recordatorio = sequelize.define(
  "Recordatorio",
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

    tipo: {
      type: DataTypes.ENUM(
        "Clase",
        "Vencimiento",
        "Otro"
      ),
      allowNull: false,
    },

    titulo: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    mensaje: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    fechaEnvio: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    estado: {
      type: DataTypes.ENUM(
        "Pendiente",
        "Enviado",
        "Cancelado"
      ),
      allowNull: false,
      defaultValue: "Pendiente",
    },
  },
  {
    tableName: "recordatorios",
    timestamps: true,
  }
);

Cliente.hasMany(Recordatorio, {
  foreignKey: "clienteId",
  as: "recordatorios",
});

Recordatorio.belongsTo(Cliente, {
  foreignKey: "clienteId",
  as: "cliente",
});

export default Recordatorio;