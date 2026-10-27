
import {
  Op,
  UniqueConstraintError,
  ValidationError,
} from "sequelize";

import Maquina from "../models/maquina.js";
import Sucursal from "../models/sucursal.js";

// ==========================================
// CONFIGURACIÓN
// ==========================================

const ESTADOS = [
  "Operativa",
  "En mantención",
  "Fuera de servicio",
];

const CAMPOS = [
  "codigo",
  "nombre",
  "marca",
  "modelo",
  "sucursalId",
  "estado",
  "fechaUltimaMantencion",
  "fechaProximaMantencion",
  "observaciones",
];

// ==========================================
// VALIDAR ID
// ==========================================

const esIdValido = (valor) => {
  const numero = Number(valor);

  return (
    valor !== null &&
    valor !== undefined &&
    valor !== "" &&
    Number.isSafeInteger(numero) &&
    numero > 0
  );
};

// ==========================================
// VALIDAR FECHAS
// ==========================================

const esFechaValida = (valor) => {
  if (valor === null || valor === "") {
    return true;
  }

  if (typeof valor !== "string") {
    return false;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false;
  }

  const fecha = new Date(`${valor}T00:00:00Z`);

  return (
    !Number.isNaN(fecha.getTime()) &&
    fecha.toISOString().slice(0, 10) === valor
  );
};

// ==========================================
// PREPARAR DATOS
// ==========================================

const prepararDatos = (body) => {
  const datos = {};

  for (const campo of CAMPOS) {
    if (
      Object.prototype.hasOwnProperty.call(
        body,
        campo
      )
    ) {
      datos[campo] = body[campo];
    }
  }

  for (const campo of [
    "codigo",
    "nombre",
    "marca",
    "modelo",
    "observaciones",
  ]) {
    if (typeof datos[campo] === "string") {
      datos[campo] = datos[campo].trim();
    }
  }

  for (const campo of [
    "marca",
    "modelo",
    "observaciones",
    "fechaUltimaMantencion",
    "fechaProximaMantencion",
  ]) {
    if (datos[campo] === "") {
      datos[campo] = null;
    }
  }

  return datos;
};

// ==========================================
// VALIDAR DATOS DE LA MÁQUINA
// ==========================================

const validarDatos = async (datos, actual = null) => {
  const codigo =
    datos.codigo !== undefined
      ? datos.codigo
      : actual?.codigo;

  const nombre =
    datos.nombre !== undefined
      ? datos.nombre
      : actual?.nombre;

  const sucursalId =
    datos.sucursalId !== undefined
      ? datos.sucursalId
      : actual?.sucursalId;

  const estado =
    datos.estado !== undefined
      ? datos.estado
      : actual?.estado ?? "Operativa";

  // Código obligatorio

  if (
    typeof codigo !== "string" ||
    !codigo.trim()
  ) {
    return "El código de la máquina es obligatorio.";
  }

  if (codigo.length > 50) {
    return "El código no puede superar los 50 caracteres.";
  }

  // Nombre obligatorio

  if (
    typeof nombre !== "string" ||
    !nombre.trim()
  ) {
    return "El nombre de la máquina es obligatorio.";
  }

  if (nombre.length > 150) {
    return "El nombre no puede superar los 150 caracteres.";
  }

  // Marca y modelo

  for (const [campo, maximo] of [
    ["marca", 100],
    ["modelo", 100],
  ]) {
    if (
      datos[campo] !== undefined &&
      datos[campo] !== null &&
      (
        typeof datos[campo] !== "string" ||
        datos[campo].length > maximo
      )
    ) {
      return `El campo ${campo} debe tener como máximo ${maximo} caracteres.`;
    }
  }

  // Observaciones

  if (
    datos.observaciones !== undefined &&
    datos.observaciones !== null &&
    typeof datos.observaciones !== "string"
  ) {
    return "Las observaciones deben ser texto.";
  }

  // Sucursal

  if (!esIdValido(sucursalId)) {
    return "Debes seleccionar una sucursal válida.";
  }

  // Estado

  if (!ESTADOS.includes(estado)) {
    return "El estado de la máquina no es válido.";
  }

  // Validar formato de fechas

  for (const campo of [
    "fechaUltimaMantencion",
    "fechaProximaMantencion",
  ]) {
    if (
      datos[campo] !== undefined &&
      !esFechaValida(datos[campo])
    ) {
      return `La fecha ${campo} debe tener formato AAAA-MM-DD.`;
    }
  }

  // ==========================================
  // VALIDAR ORDEN DE MANTENCIONES
  // ==========================================

  const ultimaMantencion =
    datos.fechaUltimaMantencion !== undefined
      ? datos.fechaUltimaMantencion
      : actual?.fechaUltimaMantencion;

  const proximaMantencion =
    datos.fechaProximaMantencion !== undefined
      ? datos.fechaProximaMantencion
      : actual?.fechaProximaMantencion;

  if (
    ultimaMantencion &&
    proximaMantencion &&
    proximaMantencion < ultimaMantencion
  ) {
    return (
      "La próxima mantención no puede ser " +
      "anterior a la última mantención."
    );
  }

  // Verificar que la sucursal exista

  const sucursal = await Sucursal.findByPk(
    Number(sucursalId)
  );

  if (!sucursal) {
    return "La sucursal seleccionada no existe.";
  }

  // Verificar código duplicado

  const existente = await Maquina.findOne({
    where: {
      codigo,
      ...(actual
        ? {
            id: {
              [Op.ne]: actual.id,
            },
          }
        : {}),
    },
  });

  if (existente) {
    return "Ya existe una máquina con ese código.";
  }

  return null;
};

// ==========================================
// MANEJO DE ERRORES
// ==========================================

const responderError = (res, error, accion) => {
  if (error instanceof UniqueConstraintError) {
    return res.status(409).json({
      ok: false,
      mensaje: "Ya existe una máquina con ese código.",
    });
  }

  if (error instanceof ValidationError) {
    return res.status(400).json({
      ok: false,
      mensaje: "Los datos de la máquina no son válidos.",
    });
  }

  console.error(
    `Error al ${accion} máquina:`,
    error
  );

  return res.status(500).json({
    ok: false,
    mensaje: `No fue posible ${accion} la máquina.`,
  });
};

// ==========================================
// OBTENER TODAS LAS MÁQUINAS
// GET /api/maquinas
// ==========================================

export const obtenerMaquinas = async (req, res) => {
  try {
    const where = {};

    // Filtrar por sucursal

    if (req.query.sucursalId !== undefined) {
      if (!esIdValido(req.query.sucursalId)) {
        return res.status(400).json({
          ok: false,
          mensaje: "El filtro de sucursal no es válido.",
        });
      }

      where.sucursalId = Number(
        req.query.sucursalId
      );
    }

    // Filtrar por estado

    if (req.query.estado !== undefined) {
      if (
        typeof req.query.estado !== "string" ||
        !ESTADOS.includes(req.query.estado)
      ) {
        return res.status(400).json({
          ok: false,
          mensaje: "El filtro de estado no es válido.",
        });
      }

      where.estado = req.query.estado;
    }

    // Buscar por código, nombre, marca o modelo

    if (req.query.buscar !== undefined) {
      if (
        typeof req.query.buscar !== "string" ||
        req.query.buscar.length > 100
      ) {
        return res.status(400).json({
          ok: false,
          mensaje: "El texto de búsqueda no es válido.",
        });
      }

      const buscar = req.query.buscar.trim();

      if (buscar) {
        where[Op.or] = [
          {
            codigo: {
              [Op.like]: `%${buscar}%`,
            },
          },
          {
            nombre: {
              [Op.like]: `%${buscar}%`,
            },
          },
          {
            marca: {
              [Op.like]: `%${buscar}%`,
            },
          },
          {
            modelo: {
              [Op.like]: `%${buscar}%`,
            },
          },
        ];
      }
    }

    const maquinas = await Maquina.findAll({
      where,
      include: [
        {
          model: Sucursal,
          as: "sucursal",
          attributes: [
            "id",
            "nombre",
            "comuna",
            "estado",
          ],
        },
      ],
      order: [
        ["nombre", "ASC"],
        ["id", "ASC"],
      ],
    });

    return res.json({
      ok: true,
      total: maquinas.length,
      maquinas,
    });
  } catch (error) {
    return responderError(
      res,
      error,
      "obtener"
    );
  }
};

// ==========================================
// OBTENER MÁQUINA POR ID
// GET /api/maquinas/:id
// ==========================================

export const obtenerMaquinaPorId = async (
  req,
  res
) => {
  try {
    if (!esIdValido(req.params.id)) {
      return res.status(400).json({
        ok: false,
        mensaje: "El ID de la máquina no es válido.",
      });
    }

    const maquina = await Maquina.findByPk(
      req.params.id,
      {
        include: [
          {
            model: Sucursal,
            as: "sucursal",
            attributes: [
              "id",
              "nombre",
              "comuna",
              "estado",
            ],
          },
        ],
      }
    );

    if (!maquina) {
      return res.status(404).json({
        ok: false,
        mensaje: "Máquina no encontrada.",
      });
    }

    return res.json({
      ok: true,
      maquina,
    });
  } catch (error) {
    return responderError(
      res,
      error,
      "obtener"
    );
  }
};

// ==========================================
// CREAR MÁQUINA
// POST /api/maquinas
// ==========================================

export const crearMaquina = async (req, res) => {
  try {
    const datos = prepararDatos(req.body ?? {});

    const errorValidacion = await validarDatos(
      datos
    );

    if (errorValidacion) {
      return res.status(400).json({
        ok: false,
        mensaje: errorValidacion,
      });
    }

    const maquina = await Maquina.create(datos);

    return res.status(201).json({
      ok: true,
      mensaje: "Máquina registrada correctamente.",
      maquina,
    });
  } catch (error) {
    return responderError(
      res,
      error,
      "registrar"
    );
  }
};

// ==========================================
// ACTUALIZAR MÁQUINA
// PUT /api/maquinas/:id
// ==========================================

export const actualizarMaquina = async (
  req,
  res
) => {
  try {
    if (!esIdValido(req.params.id)) {
      return res.status(400).json({
        ok: false,
        mensaje: "El ID de la máquina no es válido.",
      });
    }

    const maquina = await Maquina.findByPk(
      req.params.id
    );

    if (!maquina) {
      return res.status(404).json({
        ok: false,
        mensaje: "Máquina no encontrada.",
      });
    }

    const datos = prepararDatos(req.body ?? {});

    if (Object.keys(datos).length === 0) {
      return res.status(400).json({
        ok: false,
        mensaje: "No se enviaron campos para actualizar.",
      });
    }

    const errorValidacion = await validarDatos(
      datos,
      maquina
    );

    if (errorValidacion) {
      return res.status(400).json({
        ok: false,
        mensaje: errorValidacion,
      });
    }

    await maquina.update(datos);

    return res.json({
      ok: true,
      mensaje: "Máquina actualizada correctamente.",
      maquina,
    });
  } catch (error) {
    return responderError(
      res,
      error,
      "actualizar"
    );
  }
};

// ==========================================
// ELIMINAR MÁQUINA
// DELETE /api/maquinas/:id
// ==========================================

export const eliminarMaquina = async (
  req,
  res
) => {
  try {
    if (!esIdValido(req.params.id)) {
      return res.status(400).json({
        ok: false,
        mensaje: "El ID de la máquina no es válido.",
      });
    }

    const maquina = await Maquina.findByPk(
      req.params.id
    );

    if (!maquina) {
      return res.status(404).json({
        ok: false,
        mensaje: "Máquina no encontrada.",
      });
    }

    await maquina.destroy();

    return res.json({
      ok: true,
      mensaje: "Máquina eliminada correctamente.",
    });
  } catch (error) {
    return responderError(
      res,
      error,
      "eliminar"
    );
  }
};
