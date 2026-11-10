import fs from "node:fs";
import path from "node:path";
import {
  ForeignKeyConstraintError,
  Op,
  UniqueConstraintError,
} from "sequelize";

import sequelize from "../config/database.js";
import Asignacion from "../models/asignacion.js";
import Asistencia from "../models/asistencia.js";
import Pago from "../models/pago.js";
import Profesor from "../models/profesor.js";
import Plan from "../models/plan.js";
import Horario from "../models/horario.js";
import Contrato from "../models/contrato.js";
import Cliente from "../models/cliente.js";
import Sucursal from "../models/sucursal.js";
import Usuario from "../models/Usuario.js";
import Recordatorio from "../models/recordatorio.js";
import { registrarEvento } from "../utils/auditoria.js";
import {
  HORAS_MINIMAS_CANCELACION,
  PREFIJO_CLASE,
  proximaClase,
} from "../utils/clases.js";
import { estadoContrato } from "../utils/reglas.js";
import {
  buscarPorCorreo,
  emailValido,
  normalizarEmail,
  normalizarRut,
} from "../utils/validaciones.js";

const CAMPOS_EDITABLES = [
  "sucursalId",
  "numeroCliente",
  "nombres",
  "apellidos",
  "nombre",
  "rut",
  "email",
  "telefono",
  "telefonoSecundario",
  "direccion",
  "comuna",
  "ciudad",
  "edad",
  "genero",
  "fechaNacimiento",
  "fechaCreacionOrigen",
  "plan",
  "estado",
];

const errorDatos = (status, mensaje) =>
  Object.assign(new Error(mensaje), { status, expuesto: true });

// Normaliza correo y RUT, y exige que no pertenezcan a otra ficha o cuenta.
// Un dato que no cambia no se vuelve a validar, para poder editar otros campos
// de fichas importadas con RUT antiguos.
const validarIdentidad = async (datos, clienteActual = null) => {
  const resultado = {};
  const excluirActual = clienteActual
    ? { id: { [Op.ne]: clienteActual.id } }
    : {};

  if (datos.rut !== undefined) {
    if (!datos.rut) {
      resultado.rut = null;
    } else if (datos.rut === clienteActual?.rut) {
      resultado.rut = datos.rut;
    } else {
      resultado.rut = normalizarRut(datos.rut);

      if (!resultado.rut) {
        throw errorDatos(400, "El RUT no es válido");
      }

      const duplicado = await Cliente.findOne({
        where: { rut: resultado.rut, ...excluirActual },
        attributes: ["id"],
      });

      if (duplicado) {
        throw errorDatos(409, "Ya existe un cliente con ese RUT");
      }
    }
  }

  if (datos.email !== undefined) {
    if (!datos.email) {
      resultado.email = null;
    } else {
      resultado.email = normalizarEmail(datos.email);

      // Un correo que no cambia no se vuelve a validar, para poder editar otros
      // campos de fichas importadas con correos antiguos.
      if (resultado.email !== clienteActual?.email) {
        if (!emailValido(resultado.email)) {
          throw errorDatos(400, "El correo no es válido");
        }

        const [duplicado, cuenta] = await Promise.all([
          Cliente.findOne({
            where: { email: resultado.email, ...excluirActual },
            attributes: ["id"],
          }),
          Usuario.findOne({
            where: { email: resultado.email },
            attributes: ["id"],
          }),
        ]);

        if (duplicado || cuenta) {
          throw errorDatos(409, "Ya existe un cliente o cuenta con ese correo");
        }
      }
    }
  }

  return resultado;
};

const responderErrorConocido = (error, res) => {
  if (error.expuesto) {
    res.status(error.status).json({ ok: false, mensaje: error.message });
    return true;
  }

  if (error instanceof UniqueConstraintError) {
    res.status(409).json({
      ok: false,
      mensaje: "Ya existe un cliente con ese correo o RUT",
    });
    return true;
  }

  return false;
};

// Suma meses sin desbordar al mes siguiente (31 de enero + 1 mes = 28 de febrero).
const sumarMeses = (fecha, meses) => {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const ultimoDia = new Date(Date.UTC(anio, mes - 1 + meses + 1, 0)).getUTCDate();

  return new Date(
    Date.UTC(anio, mes - 1 + meses, Math.min(dia, ultimoDia))
  )
    .toISOString()
    .slice(0, 10);
};

const includeSucursal = [
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
];

export const obtenerClientes = async (req, res) => {
  try {
    const clientes = await Cliente.findAll({
      include: includeSucursal,
      order: [["id", "DESC"]],
    });

    res.json(clientes);
  } catch (error) {
    console.error(
      "Error al obtener clientes:",
      error.message
    );

    res.status(500).json({
      ok: false,
      mensaje: "Error al obtener clientes",
    });
  }
};

export const crearCliente = async (req, res) => {
  try {
    const {
      sucursalId,
      numeroCliente,
      nombres,
      apellidos,
      nombre,
      rut,
      email,
      telefono,
      telefonoSecundario,
      direccion,
      comuna,
      ciudad,
      edad,
      genero,
      fechaNacimiento,
      fechaCreacionOrigen,
      plan,
      estado,
    } = req.body;

    /*
     * VALIDACIONES PRINCIPALES
     */

    const nombreFinal =
      nombre?.trim() ||
      [nombres, apellidos]
        .filter(Boolean)
        .join(" ")
        .trim();

    const nombresFinal =
      nombres?.trim() ||
      nombreFinal;

    if (!nombreFinal) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "El nombre del cliente es obligatorio",
      });
    }

    if (!sucursalId) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "La sucursal es obligatoria",
      });
    }

    const sucursal =
      await Sucursal.findByPk(sucursalId);

    if (!sucursal) {
      return res.status(404).json({
        ok: false,
        mensaje:
          "Sucursal no encontrada",
      });
    }

    const identidad = await validarIdentidad({
      rut: rut ?? null,
      email: email ?? null,
    });

    /*
     * CREAR CLIENTE
     */

    const cliente = await Cliente.create({
      sucursalId,

      numeroCliente:
        numeroCliente || null,

      nombres:
        nombresFinal,

      apellidos:
        apellidos || null,

      nombre:
        nombreFinal,

      rut:
        identidad.rut,

      email:
        identidad.email,

      telefono:
        telefono || null,

      telefonoSecundario:
        telefonoSecundario || null,

      direccion:
        direccion || null,

      comuna:
        comuna || null,

      ciudad:
        ciudad || null,

      edad:
        edad || null,

      genero:
        genero || "No informado",

      fechaNacimiento:
        fechaNacimiento || null,

      fechaCreacionOrigen:
        fechaCreacionOrigen || null,

      plan:
        plan || null,

      estado:
        estado || "Activo",
    });

    const clienteCreado =
      await Cliente.findByPk(
        cliente.id,
        {
          include:
            includeSucursal,
        }
      );

    res.status(201).json({
      ok: true,
      mensaje:
        "Cliente creado correctamente",
      cliente:
        clienteCreado,
    });
  } catch (error) {
    if (responderErrorConocido(error, res)) return;

    console.error(
      "Error al crear cliente:",
      error.message
    );

    res.status(400).json({
      ok: false,
      mensaje:
        "No se pudo crear el cliente",
    });
  }
};

export const actualizarCliente = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const cliente =
      await Cliente.findByPk(id);

    if (!cliente) {
      return res.status(404).json({
        ok: false,
        mensaje:
          "Cliente no encontrado",
      });
    }

    /*
     * VALIDAR SUCURSAL SI VIENE
     */

    if (
      req.body.sucursalId !== undefined &&
      req.body.sucursalId !== null
    ) {
      const sucursal =
        await Sucursal.findByPk(
          req.body.sucursalId
        );

      if (!sucursal) {
        return res.status(404).json({
          ok: false,
          mensaje:
            "Sucursal no encontrada",
        });
      }
    }

    /*
     * MANTENER NOMBRE Y NOMBRES
     * SIN ROMPER COMPATIBILIDAD
     */

    const datosActualizar = Object.fromEntries(
      CAMPOS_EDITABLES.filter(
        (campo) => req.body?.[campo] !== undefined
      ).map((campo) => [campo, req.body[campo]])
    );

    if (
      req.body.nombre !== undefined
    ) {
      const nombreLimpio =
        req.body.nombre?.trim();

      if (!nombreLimpio) {
        return res.status(400).json({
          ok: false,
          mensaje:
            "El nombre no puede quedar vacío",
        });
      }

      datosActualizar.nombre =
        nombreLimpio;

      /*
       * Si no mandan "nombres",
       * usamos el nombre completo
       * para cumplir el modelo actual.
       */
      if (
        req.body.nombres ===
        undefined
      ) {
        datosActualizar.nombres =
          nombreLimpio;
      }
    }

    if (
      req.body.nombres !== undefined &&
      req.body.nombres !== null
    ) {
      datosActualizar.nombres =
        String(
          req.body.nombres
        ).trim();
    }

    /*
     * CAMPOS OPCIONALES
     */

    const camposOpcionales = [
      "numeroCliente",
      "apellidos",
      "rut",
      "email",
      "telefono",
      "telefonoSecundario",
      "direccion",
      "comuna",
      "ciudad",
      "fechaNacimiento",
      "fechaCreacionOrigen",
      "plan",
    ];

    for (
      const campo
      of camposOpcionales
    ) {
      if (
        datosActualizar[campo] ===
        ""
      ) {
        datosActualizar[campo] =
          null;
      }
    }

    if (
      datosActualizar.edad ===
      ""
    ) {
      datosActualizar.edad =
        null;
    }

    Object.assign(
      datosActualizar,
      await validarIdentidad(
        datosActualizar,
        cliente
      )
    );

    // La cuenta se vincula por correo: si cambia en la ficha,
    // debe cambiar también en la cuenta del cliente.
    const emailCambia =
      datosActualizar.email !== undefined &&
      datosActualizar.email !== cliente.email;

    const cuenta =
      emailCambia && cliente.email
        ? await buscarPorCorreo(Usuario, cliente.email)
        : null;

    if (cuenta && !datosActualizar.email) {
      return res.status(400).json({
        ok: false,
        mensaje:
          "Este cliente tiene una cuenta activa y su correo no puede quedar vacío",
      });
    }

    await sequelize.transaction(async (transaction) => {
      await cliente.update(datosActualizar, {
        transaction,
      });

      if (cuenta) {
        await cuenta.update(
          { email: datosActualizar.email },
          { transaction }
        );
      }
    });

    const clienteActualizado =
      await Cliente.findByPk(
        id,
        {
          include:
            includeSucursal,
        }
      );

    res.json({
      ok: true,
      mensaje:
        "Cliente actualizado correctamente",
      cliente:
        clienteActualizado,
    });
  } catch (error) {
    if (responderErrorConocido(error, res)) return;

    console.error(
      "Error al actualizar cliente:",
      error.message
    );

    res.status(400).json({
      ok: false,
      mensaje:
        "No se pudo actualizar el cliente",
    });
  }
};

export const eliminarCliente = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const cliente =
      await Cliente.findByPk(id);

    if (!cliente) {
      return res.status(404).json({
        ok: false,
        mensaje:
          "Cliente no encontrado",
      });
    }

    // En MySQL estas relaciones se borran en cascada: sin este control,
    // una sola confirmación eliminaría pagos e historial de asistencia.
    const [pagos, asignaciones] = await Promise.all([
      Pago.count({ where: { clienteId: cliente.id } }),
      Asignacion.count({ where: { clienteId: cliente.id } }),
    ]);

    if (pagos > 0 || asignaciones > 0) {
      return res.status(409).json({
        ok: false,
        mensaje:
          "El cliente tiene pagos o asignaciones registrados. Desactívalo o elimina primero esos registros.",
      });
    }

    const contratos = await Contrato.findAll({
      where: { clienteId: cliente.id },
      attributes: ["rutaArchivo"],
    });

    // Se eliminan juntas la ficha y su cuenta, para no dejar
    // datos personales ni un acceso activo sin cliente asociado.
    await sequelize.transaction(async (transaction) => {
      await Contrato.destroy({
        where: { clienteId: cliente.id },
        transaction,
      });

      if (cliente.email) {
        const cuenta = await buscarPorCorreo(Usuario, cliente.email, {
          transaction,
        });

        if (cuenta?.rol === "cliente") {
          await cuenta.destroy({ transaction });
        }
      }

      await cliente.destroy({ transaction });
    });

    // Los archivos se borran solo después de confirmar la transacción.
    for (const { rutaArchivo } of contratos) {
      fs.rm(
        path.resolve(
          process.cwd(),
          "uploads",
          "contratos",
          path.basename(rutaArchivo)
        ),
        { force: true },
        (errorArchivo) => {
          if (errorArchivo) {
            console.error(
              "No se pudo borrar un contrato:",
              errorArchivo.message
            );
          }
        }
      );
    }

    registrarEvento("cliente_eliminado", {
      clienteId: cliente.id,
      administradorId: req.usuario.id,
    });

    res.json({
      ok: true,
      mensaje:
        "Cliente eliminado correctamente",
    });
  } catch (error) {
    if (error instanceof ForeignKeyConstraintError) {
      return res.status(409).json({
        ok: false,
        mensaje:
          "El cliente tiene registros asociados. Desactívalo o elimina primero esos registros.",
      });
    }

    console.error(
      "Error al eliminar cliente:",
      error.message
    );

    res.status(500).json({
      ok: false,
      mensaje:
        "No se pudo eliminar el cliente",
    });
  }
};

export const obtenerMiDashboard = async (req, res) => {
  try {
    const cliente = await buscarPorCorreo(Cliente, req.usuario.email, {
      attributes: ["id", "nombre", "email", "rut", "telefono", "estado"],
    });

    if (!cliente) {
      return res.status(404).json({
        ok: false,
        mensaje: "Cliente no encontrado",
      });
    }

    const clienteId = cliente.id;

    // Un plan congelado sigue siendo el plan del cliente: se muestra con su
    // estado. Si por datos antiguos hay uno activo y otro congelado, manda el activo.
    const asignaciones = await Asignacion.findAll({
      where: {
        clienteId,
        estado: { [Op.in]: ["Activa", "Congelada"] },
      },
      include: [
        {
          model: Plan,
          as: "plan",
          attributes: [
            "id",
            "nombre",
            "descripcion",
            "duracionMeses",
            "modalidad",
            "precio",
            "sesiones",
          ],
        },
        {
          model: Horario,
          as: "horario",
          attributes: [
            "id",
            "diaSemana",
            "horaInicio",
            "horaFin",
            "modalidad",
            "estado",
          ],
          include: [
            {
              model: Profesor,
              as: "profesor",
              attributes: ["id", "nombre", "especialidad", "email", "telefono"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });
    const asignacion =
      asignaciones.find(({ estado }) => estado === "Activa") ??
      asignaciones[0] ??
      null;

    const contrato = await Contrato.findOne({
      where: {
        clienteId,
      },
      order: [["createdAt", "DESC"]],
    });

    const asistencias = asignacion
      ? await Asistencia.findAll({
          where: { asignacionId: asignacion.id },
          attributes: ["id", "fecha", "estado", "observaciones"],
          order: [["fecha", "DESC"], ["id", "DESC"]],
        })
      : [];

    // Descuentan una sesión del plan la clase asistida y la clase perdida
    // (Ausente: no asistió o canceló con menos de 6 horas). La justificada,
    // cancelada a tiempo, no descuenta.
    const sesionesUtilizadas = asistencias.filter(
      ({ estado }) => estado === "Presente" || estado === "Ausente"
    ).length;
    const sesionesTotales = asignacion?.plan?.sesiones ?? null;

    // Solo un plan activo con horario activo tiene clases que se puedan cancelar.
    const siguiente =
      asignacion?.estado === "Activa" && asignacion.horario?.estado === "Activo"
        ? proximaClase(asignacion)
        : null;
    const registroSiguiente = siguiente
      ? asistencias.find(({ fecha }) => String(fecha).slice(0, 10) === siguiente.fecha)
      : null;

    return res.status(200).json({
      ok: true,
      cliente,
      plan: asignacion?.plan ?? null,
      profesor: asignacion?.horario?.profesor ?? null,
      horario: asignacion?.horario ?? null,
      asignacion: asignacion
        ? {
            id: asignacion.id,
            fechaInicio: asignacion.fechaInicio,
            fechaTermino: asignacion.fechaTermino,
            fechaTerminoVigencia:
              asignacion.fechaTermino ??
              (asignacion.plan?.duracionMeses
                ? sumarMeses(
                    asignacion.fechaInicio,
                    asignacion.plan.duracionMeses
                  )
                : null),
            estado: asignacion.estado,
            sesionesTotales,
            sesionesUtilizadas,
            sesionesRestantes:
              sesionesTotales === null
                ? null
                : Math.max(sesionesTotales - sesionesUtilizadas, 0),
          }
        : null,
      asistencias: asistencias.slice(0, 10),
      proximaClase: siguiente
        ? {
            fecha: siguiente.fecha,
            inicio: siguiente.inicio.toISOString(),
            limiteCancelacion: siguiente.limiteCancelacion.toISOString(),
            horasMinimasCancelacion: HORAS_MINIMAS_CANCELACION,
            estadoRegistrado: registroSiguiente?.estado ?? null,
          }
        : null,
      contrato: contrato
        ? {
            id: contrato.id,
            nombreArchivo: contrato.nombreArchivo,
            fechaInicio: contrato.fechaInicio,
            fechaTermino: contrato.fechaTermino,
            estado: estadoContrato(contrato),
            observaciones: contrato.observaciones,
          }
        : null,
    });
  } catch (error) {
    console.error("Error al obtener dashboard del cliente:", error.message);

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo cargar la información del cliente",
    });
  }
};

// El cliente cancela su próxima clase. Con al menos 6 horas de anticipación
// queda Justificada; con menos, queda Ausente y la clase se pierde.
export const cancelarMiClase = async (req, res) => {
  const fecha =
    typeof req.body?.fecha === "string" ? req.body.fecha.trim() : "";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return res.status(400).json({
      ok: false,
      mensaje: "Indica la fecha de la clase que quieres cancelar.",
    });
  }

  try {
    // buscarPorCorreo compara el correo exacto, así que debe traerlo.
    const cliente = await buscarPorCorreo(Cliente, req.usuario.email, {
      attributes: ["id", "email"],
    });

    if (!cliente) {
      return res.status(404).json({
        ok: false,
        mensaje: "Cliente no encontrado",
      });
    }

    const asignacion = await Asignacion.findOne({
      where: { clienteId: cliente.id, estado: "Activa" },
      include: [
        {
          model: Horario,
          as: "horario",
          where: { estado: "Activo" },
          attributes: ["id", "diaSemana", "horaInicio"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const clase = asignacion ? proximaClase(asignacion) : null;

    if (!clase) {
      return res.status(409).json({
        ok: false,
        mensaje: "No tienes una próxima clase para cancelar.",
      });
    }

    if (clase.fecha !== fecha) {
      return res.status(409).json({
        ok: false,
        mensaje: "Solo puedes cancelar tu próxima clase.",
      });
    }

    // Se revisa aquí y no solo con el índice único de la base: una base que no
    // pasó por la migración de seguridad no tiene ese índice.
    const yaRegistrada = await Asistencia.findOne({
      where: { asignacionId: asignacion.id, fecha },
      attributes: ["id"],
    });

    if (yaRegistrada) {
      return res.status(409).json({
        ok: false,
        mensaje: "Esta clase ya fue cancelada o registrada.",
      });
    }

    const estado = clase.aTiempo ? "Justificada" : "Ausente";

    await Asistencia.create({
      asignacionId: asignacion.id,
      fecha,
      estado,
      observaciones: clase.aTiempo
        ? `Cancelada por el cliente con al menos ${HORAS_MINIMAS_CANCELACION} horas de anticipación.`
        : `Cancelada por el cliente con menos de ${HORAS_MINIMAS_CANCELACION} horas de anticipación: la clase se pierde.`,
    });

    await Recordatorio.update(
      { estado: "Cancelado" },
      {
        where: {
          clienteId: cliente.id,
          tipo: "Clase",
          titulo: `${PREFIJO_CLASE}${fecha}`,
          estado: "Pendiente",
        },
      }
    );

    registrarEvento("clase_cancelada", {
      usuarioId: req.usuario.id,
      clienteId: cliente.id,
      fecha,
      aTiempo: clase.aTiempo,
    });

    return res.status(200).json({
      ok: true,
      estado,
      aTiempo: clase.aTiempo,
      mensaje: clase.aTiempo
        ? "Tu clase fue cancelada. Avisaste a tiempo, así que no la pierdes."
        : `Tu clase fue cancelada con menos de ${HORAS_MINIMAS_CANCELACION} horas de anticipación, así que se pierde.`,
    });
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      return res.status(409).json({
        ok: false,
        mensaje: "Esta clase ya fue cancelada o registrada.",
      });
    }

    console.error("Error al cancelar la clase:", error.message);

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo cancelar la clase",
    });
  }
};

export const obtenerMiContrato = async (req, res) => {
  try {
    const cliente = await buscarPorCorreo(Cliente, req.usuario.email, {
      attributes: ["id", "email"],
    });

    if (!cliente) {
      return res.status(404).json({
        ok: false,
        mensaje: "No existe un cliente asociado a esta cuenta",
      });
    }

    const contrato = await Contrato.findOne({
      where: { clienteId: cliente.id },
      order: [["createdAt", "DESC"]],
    });

    if (!contrato) {
      return res.status(404).json({
        ok: false,
        mensaje: "El cliente no tiene contrato asociado",
      });
    }

    return res.status(200).json({
      ok: true,
      contrato: {
        id: contrato.id,
        nombreArchivo: contrato.nombreArchivo,
        fechaInicio: contrato.fechaInicio,
        fechaTermino: contrato.fechaTermino,
        estado: estadoContrato(contrato),
        observaciones: contrato.observaciones,
        url: `/api/contratos/${contrato.id}/archivo`,
      },
    });
  } catch (error) {
    console.error("Error al obtener contrato del cliente:", error.message);

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo obtener el contrato del cliente",
    });
  }
};
