// Registro de eventos de seguridad en formato JSON, una línea por evento,
// para que la plataforma de despliegue pueda conservarlos y filtrarlos.
// Nunca se registran contraseñas, códigos ni tokens.

export const ocultarEmail = (email) => {
  if (typeof email !== "string" || !email.includes("@")) return "desconocido";

  const [usuario, dominio] = email.split("@");

  return `${usuario.slice(0, 2)}***@${dominio}`;
};

export const registrarEvento = (evento, datos = {}) => {
  console.log(
    JSON.stringify({
      fecha: new Date().toISOString(),
      evento,
      ...datos,
    })
  );
};
