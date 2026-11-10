// Reglas de datos compartidas por crear y editar: un dato válido al crear debe
// seguir siéndolo al editar.
//
// Cada validador recibe el registro completo y, al editar, los campos que se
// cambian. Al crear se revisa todo; al editar solo lo que cambia y las reglas
// que lo involucran. Así, un dato antiguo que hoy no cumple no impide, por
// ejemplo, desactivar un plan.

export const errorDatos = (status, mensaje) =>
  Object.assign(new Error(mensaje), { status, expuesto: true });

const exigir = (condicion, mensaje) => {
  if (!condicion) throw errorDatos(400, mensaje);
};

export const responderError = (res, error, contexto, mensaje, status = 400) => {
  if (error?.expuesto) {
    return res.status(error.status).json({ ok: false, mensaje: error.message });
  }

  if (error?.name === "SequelizeUniqueConstraintError") {
    return res
      .status(409)
      .json({ ok: false, mensaje: "Ya existe un registro con esos datos" });
  }

  console.error(`${contexto}:`, error?.message);

  return res.status(status).json({ ok: false, mensaje });
};

// Solo los campos permitidos; los demás se ignoran.
export const soloCampos = (datos, campos) =>
  Object.fromEntries(
    campos
      .filter((campo) => datos?.[campo] !== undefined)
      .map((campo) => [campo, datos[campo]])
  );

// Fecha de hoy en Chile, en formato AAAA-MM-DD, sin importar la zona del servidor.
export const hoyChile = (fecha = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(fecha);

export const esFecha = (valor) => {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false;
  }

  const fecha = new Date(`${valor}T00:00:00Z`);

  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().startsWith(valor);
};

const horaCompleta = (valor) =>
  typeof valor === "string" && /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(valor)
    ? valor.length === 5
      ? `${valor}:00`
      : valor
    : null;

const vacio = (valor) => valor === null || valor === undefined || valor === "";

// Herramientas para validar el registro completo o solo lo que cambia.
const preparar = (datos, cambios) => {
  const revisa = (...campos) =>
    !cambios || campos.some((campo) => Object.hasOwn(cambios, campo));

  return {
    revisa,
    // Normaliza el campo si se revisa; si no, deja el valor guardado.
    campo: (nombre, normalizar) =>
      revisa(nombre) ? normalizar(datos[nombre]) : datos[nombre],
    // Regla entre varios campos: aplica si cambia cualquiera de ellos.
    exigirSi: (campos, condicion, mensaje) => {
      if (revisa(...campos)) exigir(condicion(), mensaje);
    },
  };
};

const texto = (campo, maximo) => (valor) => {
  exigir(
    typeof valor === "string" && valor.trim() && valor.trim().length <= maximo,
    `${campo} es obligatorio y admite hasta ${maximo} caracteres`
  );

  return valor.trim();
};

const textoOpcional = (campo, maximo) => (valor) => {
  if (vacio(valor)) return null;

  exigir(
    typeof valor === "string" && valor.trim().length <= maximo,
    `${campo} admite hasta ${maximo} caracteres`
  );

  return valor.trim() || null;
};

const enteroPositivo = (campo, obligatorio = false) => (valor) => {
  if (vacio(valor) && !obligatorio) return null;

  const numero = Number(valor);

  exigir(
    Number.isInteger(numero) && numero >= 1,
    `${campo} debe ser un número entero mayor que cero`
  );

  return numero;
};

const opcion = (opciones, campo, predeterminado) => (valor) => {
  const elegido = valor ?? predeterminado;

  exigir(opciones.includes(elegido), `${campo} no es válido`);

  return elegido;
};

const fecha = (campo, obligatoria = true) => (valor) => {
  if (vacio(valor) && !obligatoria) return null;

  exigir(esFecha(valor), `${campo} debe tener el formato AAAA-MM-DD`);

  return valor;
};

export const ESTADOS_PAGO = ["Vigente", "Vencido", "Anulado"];
export const METODOS_PAGO = ["Efectivo", "Transferencia", "Tarjeta", "Otro"];
export const DIAS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
const MODALIDADES = ["Individual", "Compartido"];
const ACTIVO = ["Activo", "Inactivo"];

export const validarPago = (datos, cambios) => {
  const { campo, exigirSi } = preparar(datos, cambios);

  const resultado = {
    monto: campo("monto", (valor) => {
      const monto = Number(valor);
      exigir(Number.isFinite(monto) && monto > 0, "El monto debe ser mayor que cero");
      return monto;
    }),
    fechaPago: campo("fechaPago", fecha("La fecha de pago")),
    fechaVencimiento: campo("fechaVencimiento", fecha("La fecha de vencimiento")),
    metodoPago: campo("metodoPago", opcion(METODOS_PAGO, "El método de pago")),
    estado: campo("estado", opcion(ESTADOS_PAGO, "El estado", "Vigente")),
    observaciones: campo("observaciones", textoOpcional("Las observaciones", 2000)),
  };

  exigirSi(
    ["fechaPago", "fechaVencimiento"],
    () => resultado.fechaVencimiento >= resultado.fechaPago,
    "La fecha de vencimiento no puede ser anterior a la fecha de pago"
  );

  return resultado;
};

// El estado que elige el administrador se respeta. Solo uno que sigue "Vigente"
// pasa a "Vencido" por fecha, aunque nadie lo edite.
export const estadoPago = (pago, hoy = hoyChile()) =>
  pago.estado === "Vigente" && pago.fechaVencimiento < hoy
    ? "Vencido"
    : pago.estado;

export const estadoContrato = (contrato, hoy = hoyChile()) =>
  contrato.estado === "Vigente" &&
  contrato.fechaTermino &&
  contrato.fechaTermino < hoy
    ? "Vencido"
    : contrato.estado;

export const validarContrato = (datos, cambios) => {
  const { campo, exigirSi } = preparar(datos, cambios);

  const resultado = {
    fechaInicio: campo("fechaInicio", fecha("La fecha de inicio", false)),
    fechaTermino: campo("fechaTermino", fecha("La fecha de término", false)),
    estado: campo(
      "estado",
      opcion(["Vigente", "Vencido", "Finalizado"], "El estado", "Vigente")
    ),
    observaciones: campo("observaciones", textoOpcional("Las observaciones", 2000)),
  };

  exigirSi(
    ["fechaInicio", "fechaTermino"],
    () =>
      !resultado.fechaInicio ||
      !resultado.fechaTermino ||
      resultado.fechaTermino >= resultado.fechaInicio,
    "La fecha de término no puede ser anterior a la fecha de inicio"
  );

  return resultado;
};

export const validarPlan = (datos, cambios) => {
  const { campo } = preparar(datos, cambios);

  return {
    nombre: campo("nombre", texto("El nombre", 120)),
    descripcion: campo("descripcion", textoOpcional("La descripción", 2000)),
    duracionMeses: campo("duracionMeses", enteroPositivo("La duración")),
    sesiones: campo("sesiones", enteroPositivo("Las sesiones")),
    precio: campo("precio", (valor) => {
      if (vacio(valor)) return null;
      const precio = Number(valor);
      exigir(Number.isFinite(precio) && precio >= 0, "El precio no puede ser negativo");
      return precio;
    }),
    modalidad: campo("modalidad", (valor) =>
      vacio(valor) ? null : opcion(MODALIDADES, "La modalidad")(valor)
    ),
    estado: campo("estado", opcion(ACTIVO, "El estado", "Activo")),
  };
};

export const validarHorario = (datos, cambios) => {
  const { campo, exigirSi, revisa } = preparar(datos, cambios);

  const resultado = {
    profesorId: campo("profesorId", enteroPositivo("El profesor", true)),
    diaSemana: campo("diaSemana", opcion(DIAS, "El día")),
    horaInicio: campo("horaInicio", (valor) => {
      const hora = horaCompleta(valor);
      exigir(hora, "Las horas deben tener el formato HH:MM");
      return hora;
    }),
    horaFin: campo("horaFin", (valor) => {
      const hora = horaCompleta(valor);
      exigir(hora, "Las horas deben tener el formato HH:MM");
      return hora;
    }),
    modalidad: campo("modalidad", opcion(MODALIDADES, "La modalidad", "Individual")),
    estado: campo("estado", opcion(ACTIVO, "El estado", "Activo")),
  };

  exigirSi(
    ["horaInicio", "horaFin"],
    () => String(resultado.horaInicio) < String(resultado.horaFin),
    "La hora de inicio debe ser anterior a la hora de término"
  );

  resultado.cupos =
    resultado.modalidad === "Individual"
      ? 1
      : revisa("cupos", "modalidad")
        ? enteroPositivo("Los cupos", true)(datos.cupos)
        : datos.cupos;

  return resultado;
};

export const validarAsistencia = (datos, cambios, hoy = hoyChile()) => {
  const { campo } = preparar(datos, cambios);

  return {
    asignacionId: campo("asignacionId", enteroPositivo("La asignación", true)),
    fecha: campo("fecha", (valor) => {
      exigir(esFecha(valor), "La fecha debe tener el formato AAAA-MM-DD");
      exigir(valor <= hoy, "No se puede registrar asistencia en una fecha futura");
      return valor;
    }),
    estado: campo(
      "estado",
      opcion(["Presente", "Ausente", "Justificada"], "El estado", "Presente")
    ),
    observaciones: campo("observaciones", textoOpcional("Las observaciones", 2000)),
  };
};

export const validarAsignacionFechas = (datos, cambios) => {
  const { campo, exigirSi } = preparar(datos, cambios);

  const resultado = {
    fechaInicio: campo("fechaInicio", fecha("La fecha de inicio")),
    fechaTermino: campo("fechaTermino", fecha("La fecha de término", false)),
    estado: campo(
      "estado",
      opcion(["Activa", "Finalizada", "Congelada"], "El estado", "Activa")
    ),
    observaciones: campo("observaciones", textoOpcional("Las observaciones", 2000)),
  };

  exigirSi(
    ["fechaInicio", "fechaTermino"],
    () => !resultado.fechaTermino || resultado.fechaTermino >= resultado.fechaInicio,
    "La fecha de término no puede ser anterior a la fecha de inicio"
  );

  return resultado;
};

export const validarRecordatorio = (datos, cambios) => {
  const { campo } = preparar(datos, cambios);

  return {
    clienteId: campo("clienteId", enteroPositivo("El cliente", true)),
    tipo: campo("tipo", opcion(["Clase", "Vencimiento", "Otro"], "El tipo")),
    titulo: campo("titulo", texto("El título", 255)),
    mensaje: campo("mensaje", texto("El mensaje", 5000)),
    fechaEnvio: campo("fechaEnvio", (valor) => {
      const fechaEnvio = new Date(valor);
      exigir(
        !vacio(valor) && !Number.isNaN(fechaEnvio.getTime()),
        "La fecha de envío no es válida"
      );
      return fechaEnvio;
    }),
    estado: campo(
      "estado",
      opcion(["Pendiente", "Enviado", "Cancelado"], "El estado", "Pendiente")
    ),
  };
};

export const validarSucursal = (datos, cambios) => {
  const { campo } = preparar(datos, cambios);

  return {
    nombre: campo("nombre", texto("El nombre", 100)),
    direccion: campo("direccion", textoOpcional("La dirección", 255)),
    comuna: campo("comuna", texto("La comuna", 100)),
    ciudad: campo("ciudad", textoOpcional("La ciudad", 100)),
    horarioAtencion: campo(
      "horarioAtencion",
      textoOpcional("El horario de atención", 200)
    ),
    telefono: campo("telefono", textoOpcional("El teléfono", 30)),
    estado: campo("estado", opcion(["Activa", "Inactiva"], "El estado", "Activa")),
  };
};
