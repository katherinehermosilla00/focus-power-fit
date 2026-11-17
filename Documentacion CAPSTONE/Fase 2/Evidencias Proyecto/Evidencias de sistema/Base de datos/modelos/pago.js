import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

import Cliente from "./cliente.js";
import Plan from "./plan.js";

const Pago = sequelize.define(
  "Pago",
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

    planId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Plan,
        key: "id",
      },
    },

    monto: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    fechaPago: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    fechaVencimiento: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    metodoPago: {
      type: DataTypes.ENUM(
        "Efectivo",
        "Transferencia",
        "Tarjeta",
        "Otro"
      ),
      allowNull: false,
    },

    estado: {
      type: DataTypes.ENUM(
        "Vigente",
        "Vencido",
        "Anulado"
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
    tableName: "pagos",
    timestamps: true,
  }
);

Cliente.hasMany(Pago, {
  foreignKey: "clienteId",
  as: "pagos",
});

Pago.belongsTo(Cliente, {
  foreignKey: "clienteId",
  as: "cliente",
});

Plan.hasMany(Pago, {
  foreignKey: "planId",
  as: "pagos",
});

Pago.belongsTo(Plan, {
  foreignKey: "planId",
  as: "plan",
});

export default Pago;