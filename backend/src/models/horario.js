import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import Profesor from "./profesor.js";

const Horario = sequelize.define(
  "Horario",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    profesorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Profesor,
        key: "id",
      },
    },

    diaSemana: {
      type: DataTypes.ENUM(
        "Lunes",
        "Martes",
        "Miércoles",
        "Jueves",
        "Viernes",
        "Sábado",
        "Domingo"
      ),
      allowNull: false,
    },

    horaInicio: {
      type: DataTypes.TIME,
      allowNull: false,
    },

    horaFin: {
      type: DataTypes.TIME,
      allowNull: false,
    },

    modalidad: {
      type: DataTypes.ENUM(
        "Individual",
        "Compartido"
      ),
      allowNull: false,
      defaultValue: "Individual",
    },

    cupos: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
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
    tableName: "horarios",
    timestamps: true,
  }
);

// Relaciones
Profesor.hasMany(Horario, {
  foreignKey: "profesorId",
  as: "horarios",
});

Horario.belongsTo(Profesor, {
  foreignKey: "profesorId",
  as: "profesor",
});

export default Horario;