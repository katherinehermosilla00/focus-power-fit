// Fechas de las clases semanales, compartidas por los recordatorios y por la
// cancelación que hace el cliente desde Mi cuenta. Las horas son las locales
// del servidor (America/Santiago).

export const DIAS_SEMANA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export const PREFIJO_CLASE = "Recordatorio de clase - ";

// Regla del gimnasio: una clase se cancela con al menos 6 horas de
// anticipación; si no, el cliente la pierde.
export const HORAS_MINIMAS_CANCELACION = 6;
const ANTICIPACION_CANCELACION_MS = HORAS_MINIMAS_CANCELACION * 60 * 60 * 1000;

export const WHATSAPP_GIMNASIO = "+56 9 8298 5606";

export const obtenerFechaLocal = (fecha) =>
  [
    fecha.getFullYear(),
    String(fecha.getMonth() + 1).padStart(2, "0"),
    String(fecha.getDate()).padStart(2, "0"),
  ].join("-");

// Hasta este momento el cliente cancela sin perder la clase.
export const limiteDeCancelacion = (inicioClase) =>
  new Date(inicioClase.getTime() - ANTICIPACION_CANCELACION_MS);

// Por ejemplo «martes 10/11 a las 10:00».
export const mostrarDiaHora = (fecha) => {
  const dos = (numero) => String(numero).padStart(2, "0");
  return `${DIAS_SEMANA[fecha.getDay()].toLowerCase()} ${dos(fecha.getDate())}/${dos(
    fecha.getMonth() + 1
  )} a las ${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`;
};

export const crearFechaClase = (fecha, hora) => {
  const [horas, minutos] = hora.split(":").map(Number);
  return new Date(
    fecha.getFullYear(),
    fecha.getMonth(),
    fecha.getDate(),
    horas,
    minutos,
    0,
    0
  );
};

// Próxima clase de una asignación dentro de los siete días siguientes, o null
// si no hay. La asignación debe traer su horario.
export function proximaClase(asignacion, ahora = new Date()) {
  const horario = asignacion?.horario;
  if (!horario?.diaSemana || !horario.horaInicio) return null;

  const fechaInicio = String(asignacion.fechaInicio).slice(0, 10);
  const fechaTermino = asignacion.fechaTermino
    ? String(asignacion.fechaTermino).slice(0, 10)
    : null;

  for (let desplazamiento = 0; desplazamiento <= 7; desplazamiento += 1) {
    const dia = new Date(ahora);
    dia.setHours(0, 0, 0, 0);
    dia.setDate(dia.getDate() + desplazamiento);

    if (DIAS_SEMANA[dia.getDay()] !== horario.diaSemana) continue;

    const fecha = obtenerFechaLocal(dia);
    if (fecha < fechaInicio || (fechaTermino && fecha > fechaTermino)) continue;

    const inicio = crearFechaClase(dia, horario.horaInicio);
    if (inicio <= ahora) continue;

    const limiteCancelacion = limiteDeCancelacion(inicio);

    return {
      fecha,
      inicio,
      limiteCancelacion,
      aTiempo: ahora <= limiteCancelacion,
    };
  }

  return null;
}
