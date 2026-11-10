// Validaciones compartidas por autenticación y gestión de clientes.

// Solo caracteres ASCII: un correo con tildes se entrega a otro dominio, pero
// MySQL lo considera igual al original (ver buscarPorCorreo).
export const EMAIL_REGEX =
  /^[\x21-\x3f\x41-\x7e]+@[\x21-\x3f\x41-\x7e]+\.[\x21-\x3f\x41-\x7e]{2,}$/;

// Devuelve el RUT con formato 12.345.678-5, o null si no es válido.
export const normalizarRut = (valor) => {
  if (typeof valor !== "string") return null;

  const rut = valor.replace(/[.\-\s]/g, "").toUpperCase();

  if (!/^\d{7,8}[0-9K]$/.test(rut)) {
    return null;
  }

  const cuerpo = rut.slice(0, -1);
  const digitoIngresado = rut.slice(-1);

  let suma = 0;
  let factor = 2;

  for (let indice = cuerpo.length - 1; indice >= 0; indice -= 1) {
    suma += Number(cuerpo[indice]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }

  const resultado = 11 - (suma % 11);

  const digitoCalculado =
    resultado === 11
      ? "0"
      : resultado === 10
        ? "K"
        : String(resultado);

  if (digitoIngresado !== digitoCalculado) {
    return null;
  }

  return `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${digitoCalculado}`;
};

export const normalizarEmail = (valor) =>
  typeof valor === "string" ? valor.trim().toLowerCase() : "";

export const emailValido = (email) =>
  email.length > 0 && email.length <= 150 && EMAIL_REGEX.test(email);

// MySQL ignora tildes y mayúsculas al comparar: "jose@x.cl" encuentra también
// "josé@x.cl". Para identificar a una persona, el correo debe ser exactamente
// el mismo, sin importar mayúsculas. El resultado debe incluir el campo email.
export const buscarPorCorreo = async (Modelo, email, opciones = {}) => {
  const buscado = normalizarEmail(email);
  const filas = await Modelo.findAll({ ...opciones, where: { email: buscado } });

  return filas.find((fila) => normalizarEmail(fila.email) === buscado) ?? null;
};

// Devuelve el mensaje de error, o null si la contraseña cumple la política.
export const validarPassword = (password) => {
  if (
    typeof password !== "string" ||
    password.length < 8 ||
    !/[A-Z]/.test(password) ||
    !/\d/.test(password)
  ) {
    return "La contraseña requiere 8 caracteres, una mayúscula y un número";
  }

  if (password.length > 128) {
    return "La contraseña no puede superar los 128 caracteres";
  }

  return null;
};
