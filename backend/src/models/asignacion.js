import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

import Cliente from "./cliente.js";
import Plan from "./plan.js";
import Horario from "./horario.js";

const Asignacion = sequelize.define(
  "Asignacion",
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

    horarioId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Horario,
        key: "id",
      },
    },

    fechaInicio: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    fechaTermino: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },

    estado: {
      type: DataTypes.ENUM(
        "Activa",
        "Finalizada",
        "Congelada"
      ),
      allowNull: false,
      defaultValue: "Activa",
    },

    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "asignaciones",
    timestamps: true,
  }
);

/*
 * RELACIONES
 */

Cliente.hasMany(Asignacion, {
  foreignKey: "clienteId",
  as: "asignaciones",
});

Asignacion.belongsTo(Cliente, {
  foreignKey: "clienteId",
  as: "cliente",
});

Plan.hasMany(Asignacion, {
  foreignKey: "planId",
  as: "asignaciones",
});

Asignacion.belongsTo(Plan, {
  foreignKey: "planId",
  as: "plan",
});

Horario.hasMany(Asignacion, {
  foreignKey: "horarioId",
  as: "asignaciones",
});

Asignacion.belongsTo(Horario, {
  foreignKey: "horarioId",
  as: "horario",
});

export default Asignacion;