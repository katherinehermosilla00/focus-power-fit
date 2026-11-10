import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import Asignacion from "./asignacion.js";

const Asistencia = sequelize.define(
  "Asistencia",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    asignacionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Asignacion,
        key: "id",
      },
    },

    fecha: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    estado: {
      type: DataTypes.ENUM(
        "Presente",
        "Ausente",
        "Justificada"
      ),
      allowNull: false,
      defaultValue: "Presente",
    },

    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "asistencias",
    timestamps: true,
    // Una misma clase no se registra dos veces el mismo día.
    indexes: [
      {
        name: "asistencias_asignacion_fecha_unico",
        unique: true,
        fields: ["asignacionId", "fecha"],
      },
    ],
  }
);

Asignacion.hasMany(Asistencia, {
  foreignKey: "asignacionId",
  as: "asistencias",
});

Asistencia.belongsTo(Asignacion, {
  foreignKey: "asignacionId",
  as: "asignacion",
});

export default Asistencia;