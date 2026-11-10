// Genera la colección de Postman de la API de Focus Power Fit.
//   node postman/generar-coleccion.mjs
// Crea focus-power-fit.postman_collection.json y entorno-qa.postman_environment.json.
// Ambos archivos se pueden importar en la app Postman o ejecutar con Newman
// (npm run postman). Las pruebas usan solo datos ficticios del entorno QA.
import fs from "node:fs";

const cuentas = JSON.parse(
  fs.readFileSync(new URL("../qa/cuentas-qa.json", import.meta.url), "utf8")
);

const TOKENS = {
  admin: "{{tokenAdmin}}",
  cliente: "{{tokenCliente}}",
  invalido: "token.invalido.qa",
};

// Cada caso: carpeta, id, nombre, método, ruta, quién llama, cuerpo y pruebas.
const casos = [
  // ---------------------------------------------------------------- Salud
  {
    carpeta: "01 Salud y acceso público",
    id: "API-01",
    nombre: "El servidor y la base de datos responden",
    metodo: "GET",
    ruta: "/health",
    pruebas: [
      `pm.test("Responde 200", () => pm.response.to.have.status(200));`,
      `pm.test("La base de datos está conectada", () => pm.expect(pm.response.json().database).to.eql("conectada"));`,
    ],
  },
  {
    carpeta: "01 Salud y acceso público",
    id: "API-02",
    nombre: "Las sucursales públicas se listan sin sesión",
    metodo: "GET",
    ruta: "/api/sucursales",
    pruebas: [
      `pm.test("Responde 200", () => pm.response.to.have.status(200));`,
      `const datos = pm.response.json();`,
      `const lista = Array.isArray(datos) ? datos : datos.sucursales;`,
      `pm.test("Entrega una lista de sucursales", () => pm.expect(lista).to.be.an("array").that.is.not.empty);`,
      `pm.collectionVariables.set("sucursalId", lista[0].id);`,
    ],
  },
  // --------------------------------------------------------- Autenticación
  {
    carpeta: "02 Autenticación",
    id: "API-03",
    nombre: "Inicio de sesión del administrador con datos correctos",
    metodo: "POST",
    ruta: "/api/auth/login",
    cuerpo: { email: "{{adminEmail}}", password: "{{adminPassword}}" },
    pruebas: [
      `pm.test("Responde 200", () => pm.response.to.have.status(200));`,
      `const datos = pm.response.json();`,
      `pm.test("Entrega un token JWT", () => pm.expect(datos.token).to.match(/^[\\w-]+\\.[\\w-]+\\.[\\w-]+$/));`,
      `pm.test("El rol es admin", () => pm.expect(datos.user.rol).to.eql("admin"));`,
      `pm.test("No entrega el hash de la contraseña", () => pm.expect(JSON.stringify(datos)).to.not.include("passwordHash"));`,
      `pm.collectionVariables.set("tokenAdmin", datos.token);`,
    ],
  },
  {
    carpeta: "02 Autenticación",
    id: "API-04",
    nombre: "Inicio de sesión con contraseña incorrecta",
    metodo: "POST",
    ruta: "/api/auth/login",
    cuerpo: { email: "{{adminEmail}}", password: "ClaveIncorrecta-123" },
    pruebas: [
      `pm.test("Responde 401", () => pm.response.to.have.status(401));`,
      `pm.test("No entrega token", () => pm.expect(pm.response.json().token).to.be.undefined);`,
    ],
  },
  {
    carpeta: "02 Autenticación",
    id: "API-05",
    nombre: "Inicio de sesión sin datos",
    metodo: "POST",
    ruta: "/api/auth/login",
    cuerpo: {},
    pruebas: [`pm.test("Responde 400", () => pm.response.to.have.status(400));`],
  },
  {
    carpeta: "02 Autenticación",
    id: "API-06",
    nombre: "Inicio de sesión del cliente QA",
    metodo: "POST",
    ruta: "/api/auth/login",
    cuerpo: { email: "{{clienteEmail}}", password: "{{clientePassword}}" },
    pruebas: [
      `pm.test("Responde 200", () => pm.response.to.have.status(200));`,
      `const datos = pm.response.json();`,
      `pm.test("El rol es cliente", () => pm.expect(datos.user.rol).to.eql("cliente"));`,
      `pm.collectionVariables.set("tokenCliente", datos.token);`,
    ],
  },
  {
    carpeta: "02 Autenticación",
    id: "API-07",
    nombre: "Ruta protegida sin token",
    metodo: "GET",
    ruta: "/api/clientes",
    pruebas: [`pm.test("Responde 401", () => pm.response.to.have.status(401));`],
  },
  {
    carpeta: "02 Autenticación",
    id: "API-08",
    nombre: "Ruta protegida con token falso",
    metodo: "GET",
    ruta: "/api/clientes",
    quien: "invalido",
    pruebas: [`pm.test("Responde 401", () => pm.response.to.have.status(401));`],
  },
  // ------------------------------------------------------ Control de acceso
  {
    carpeta: "03 Control de acceso por rol",
    id: "API-09",
    nombre: "Un cliente no puede listar los clientes",
    metodo: "GET",
    ruta: "/api/clientes",
    quien: "cliente",
    pruebas: [`pm.test("Responde 403", () => pm.response.to.have.status(403));`],
  },
  {
    carpeta: "03 Control de acceso por rol",
    id: "API-10",
    nombre: "Un cliente no puede crear planes",
    metodo: "POST",
    ruta: "/api/planes",
    quien: "cliente",
    cuerpo: { nombre: "Plan no autorizado", duracionMeses: 1, sesiones: 4, precio: 1 },
    pruebas: [`pm.test("Responde 403", () => pm.response.to.have.status(403));`],
  },
  // ----------------------------------------------------------------- Planes
  {
    carpeta: "04 Planes",
    id: "API-11",
    nombre: "Crear un plan válido",
    metodo: "POST",
    ruta: "/api/planes",
    quien: "admin",
    cuerpo: {
      nombre: "Plan Postman {{sufijo}}",
      descripcion: "Plan ficticio de prueba",
      duracionMeses: 1,
      sesiones: 8,
      precio: 25000,
      modalidad: "Individual",
    },
    pruebas: [
      `pm.test("Responde 201", () => pm.response.to.have.status(201));`,
      `const plan = pm.response.json();`,
      `pm.test("Queda activo", () => pm.expect(plan.estado).to.eql("Activo"));`,
      `pm.collectionVariables.set("planId", plan.id);`,
    ],
  },
  {
    carpeta: "04 Planes",
    id: "API-12",
    nombre: "Rechaza un plan con precio negativo",
    metodo: "POST",
    ruta: "/api/planes",
    quien: "admin",
    cuerpo: { nombre: "Plan inválido", duracionMeses: 1, sesiones: 4, precio: -100 },
    pruebas: [
      `pm.test("Responde 400", () => pm.response.to.have.status(400));`,
      `pm.test("Explica el error", () => pm.expect(pm.response.json().mensaje).to.match(/negativo/i));`,
    ],
  },
  {
    carpeta: "04 Planes",
    id: "API-13",
    nombre: "Editar el precio del plan",
    metodo: "PUT",
    ruta: "/api/planes/{{planId}}",
    quien: "admin",
    cuerpo: { precio: 27000 },
    pruebas: [`pm.test("Responde 200", () => pm.response.to.have.status(200));`],
  },
  // ---------------------------------------------------- Profesores y horarios
  {
    carpeta: "05 Profesores y horarios",
    id: "API-14",
    nombre: "Crear un profesor",
    metodo: "POST",
    ruta: "/api/profesores",
    quien: "admin",
    cuerpo: {
      nombre: "Profesor Postman {{sufijo}}",
      especialidad: "Pruebas de API",
      sucursalId: "{{sucursalId}}",
    },
    pruebas: [
      `pm.test("Responde 201", () => pm.response.to.have.status(201));`,
      `pm.collectionVariables.set("profesorId", pm.response.json().profesor.id);`,
    ],
  },
  {
    carpeta: "05 Profesores y horarios",
    id: "API-15",
    nombre: "Crear un horario",
    metodo: "POST",
    ruta: "/api/horarios",
    quien: "admin",
    cuerpo: {
      profesorId: "{{profesorId}}",
      diaSemana: "Sábado",
      horaInicio: "07:00",
      horaFin: "08:00",
      modalidad: "Individual",
    },
    pruebas: [
      `pm.test("Responde 201", () => pm.response.to.have.status(201));`,
      `pm.collectionVariables.set("horarioId", pm.response.json().id);`,
    ],
  },
  {
    carpeta: "05 Profesores y horarios",
    id: "API-16",
    nombre: "Rechaza un horario que termina antes de empezar",
    metodo: "POST",
    ruta: "/api/horarios",
    quien: "admin",
    cuerpo: {
      profesorId: "{{profesorId}}",
      diaSemana: "Sábado",
      horaInicio: "10:00",
      horaFin: "09:00",
      modalidad: "Individual",
    },
    pruebas: [`pm.test("Responde 400", () => pm.response.to.have.status(400));`],
  },
  // --------------------------------------------------------------- Clientes
  {
    carpeta: "06 Clientes",
    id: "API-17",
    nombre: "Crear un cliente ficticio",
    metodo: "POST",
    ruta: "/api/clientes",
    quien: "admin",
    cuerpo: {
      nombre: "Cliente Postman {{sufijo}}",
      email: "postman.{{sufijo}}@focuspowerfit.test",
      sucursalId: "{{sucursalId}}",
    },
    pruebas: [
      `pm.test("Responde 201", () => pm.response.to.have.status(201));`,
      `pm.collectionVariables.set("clienteId", pm.response.json().cliente.id);`,
    ],
  },
  {
    carpeta: "06 Clientes",
    id: "API-18",
    nombre: "Rechaza un cliente con un correo ya registrado",
    metodo: "POST",
    ruta: "/api/clientes",
    quien: "admin",
    cuerpo: {
      nombre: "Cliente Duplicado",
      email: "postman.{{sufijo}}@focuspowerfit.test",
      sucursalId: "{{sucursalId}}",
    },
    pruebas: [`pm.test("Responde 409", () => pm.response.to.have.status(409));`],
  },
  {
    carpeta: "06 Clientes",
    id: "API-19",
    nombre: "Rechaza un cliente sin sucursal",
    metodo: "POST",
    ruta: "/api/clientes",
    quien: "admin",
    cuerpo: { nombre: "Cliente sin sucursal" },
    pruebas: [`pm.test("Responde 400", () => pm.response.to.have.status(400));`],
  },
  // ------------------------------------------------------------ Asignaciones
  {
    carpeta: "07 Asignaciones y asistencia",
    id: "API-20",
    nombre: "Asignar plan y horario al cliente",
    metodo: "POST",
    ruta: "/api/asignaciones",
    quien: "admin",
    cuerpo: {
      clienteId: "{{clienteId}}",
      planId: "{{planId}}",
      horarioId: "{{horarioId}}",
      fechaInicio: "{{hoy}}",
    },
    pruebas: [
      `pm.test("Responde 201", () => pm.response.to.have.status(201));`,
      `pm.collectionVariables.set("asignacionId", pm.response.json().id);`,
    ],
  },
  {
    carpeta: "07 Asignaciones y asistencia",
    id: "API-21",
    nombre: "Rechaza una segunda asignación activa del mismo cliente",
    metodo: "POST",
    ruta: "/api/asignaciones",
    quien: "admin",
    cuerpo: {
      clienteId: "{{clienteId}}",
      planId: "{{planId}}",
      horarioId: "{{horarioId}}",
      fechaInicio: "{{hoy}}",
    },
    pruebas: [`pm.test("Responde 409", () => pm.response.to.have.status(409));`],
  },
  {
    carpeta: "07 Asignaciones y asistencia",
    id: "API-22",
    nombre: "Registrar asistencia de hoy",
    metodo: "POST",
    ruta: "/api/asistencias",
    quien: "admin",
    cuerpo: { asignacionId: "{{asignacionId}}", fecha: "{{hoy}}", estado: "Presente" },
    pruebas: [`pm.test("Responde 201", () => pm.response.to.have.status(201));`],
  },
  {
    carpeta: "07 Asignaciones y asistencia",
    id: "API-23",
    nombre: "Rechaza asistencia en una fecha futura",
    metodo: "POST",
    ruta: "/api/asistencias",
    quien: "admin",
    cuerpo: { asignacionId: "{{asignacionId}}", fecha: "2099-01-01", estado: "Presente" },
    pruebas: [`pm.test("Responde 400", () => pm.response.to.have.status(400));`],
  },
  {
    carpeta: "07 Asignaciones y asistencia",
    id: "API-24",
    nombre: "Rechaza asistencia duplicada el mismo día",
    metodo: "POST",
    ruta: "/api/asistencias",
    quien: "admin",
    cuerpo: { asignacionId: "{{asignacionId}}", fecha: "{{hoy}}", estado: "Presente" },
    pruebas: [`pm.test("Responde 409", () => pm.response.to.have.status(409));`],
  },
  // ------------------------------------------------------------------ Pagos
  {
    carpeta: "08 Pagos",
    id: "API-25",
    nombre: "Registrar un pago",
    metodo: "POST",
    ruta: "/api/pagos",
    quien: "admin",
    cuerpo: {
      clienteId: "{{clienteId}}",
      planId: "{{planId}}",
      monto: 27000,
      fechaPago: "{{hoy}}",
      fechaVencimiento: "2099-12-31",
      metodoPago: "Transferencia",
    },
    pruebas: [
      `pm.test("Responde 201", () => pm.response.to.have.status(201));`,
      `pm.test("Queda vigente", () => pm.expect(pm.response.json().pago.estado).to.eql("Vigente"));`,
    ],
  },
  {
    carpeta: "08 Pagos",
    id: "API-26",
    nombre: "Rechaza un pago con monto cero",
    metodo: "POST",
    ruta: "/api/pagos",
    quien: "admin",
    cuerpo: {
      clienteId: "{{clienteId}}",
      planId: "{{planId}}",
      monto: 0,
      fechaPago: "{{hoy}}",
      fechaVencimiento: "2099-12-31",
      metodoPago: "Efectivo",
    },
    pruebas: [`pm.test("Responde 400", () => pm.response.to.have.status(400));`],
  },
  // ------------------------------------------------------------- Mi cuenta
  {
    carpeta: "09 Mi cuenta y cancelación de clases",
    id: "API-27",
    nombre: "El cliente ve su plan y su próxima clase",
    metodo: "GET",
    ruta: "/api/clientes/mi-dashboard",
    quien: "cliente",
    pruebas: [
      `pm.test("Responde 200", () => pm.response.to.have.status(200));`,
      `const datos = pm.response.json();`,
      `pm.test("Trae el plan", () => pm.expect(datos.plan).to.be.an("object"));`,
      `pm.test("Trae la próxima clase con su límite de cancelación", () => {`,
      `  pm.expect(datos.proximaClase.fecha).to.match(/^\\d{4}-\\d{2}-\\d{2}$/);`,
      `  pm.expect(datos.proximaClase.horasMinimasCancelacion).to.eql(6);`,
      `});`,
      `pm.collectionVariables.set("fechaProximaClase", datos.proximaClase.fecha);`,
    ],
  },
  {
    carpeta: "09 Mi cuenta y cancelación de clases",
    id: "API-28",
    nombre: "Rechaza cancelar con una fecha mal escrita",
    metodo: "POST",
    ruta: "/api/clientes/mi-clase/cancelar",
    quien: "cliente",
    cuerpo: { fecha: "10-11-2026" },
    pruebas: [`pm.test("Responde 400", () => pm.response.to.have.status(400));`],
  },
  {
    carpeta: "09 Mi cuenta y cancelación de clases",
    id: "API-29",
    nombre: "Cancelar la próxima clase con más de 6 horas",
    metodo: "POST",
    ruta: "/api/clientes/mi-clase/cancelar",
    quien: "cliente",
    cuerpo: { fecha: "{{fechaProximaClase}}" },
    pruebas: [
      `pm.test("Responde 200", () => pm.response.to.have.status(200));`,
      `pm.test("Queda justificada: no pierde la clase", () => pm.expect(pm.response.json().estado).to.eql("Justificada"));`,
    ],
  },
  {
    carpeta: "09 Mi cuenta y cancelación de clases",
    id: "API-30",
    nombre: "No permite cancelar la misma clase dos veces",
    metodo: "POST",
    ruta: "/api/clientes/mi-clase/cancelar",
    quien: "cliente",
    cuerpo: { fecha: "{{fechaProximaClase}}" },
    pruebas: [`pm.test("Responde 409", () => pm.response.to.have.status(409));`],
  },
  // ------------------------------------------------------------------ FitBot
  {
    carpeta: "10 FitBot",
    id: "API-31",
    nombre: "FitBot responde una pregunta frecuente",
    metodo: "POST",
    ruta: "/api/fitbot/chat",
    cuerpo: { chatInput: "¿Qué horarios tienen?", sessionId: "{{$guid}}" },
    pruebas: [
      `pm.test("Responde 200", () => pm.response.to.have.status(200));`,
      `pm.test("Responde con los horarios", () => pm.expect(pm.response.json().output).to.match(/HORARIOS/));`,
    ],
  },
  {
    carpeta: "10 FitBot",
    id: "API-32",
    nombre: "FitBot rechaza un identificador de sesión inválido",
    metodo: "POST",
    ruta: "/api/fitbot/chat",
    cuerpo: { chatInput: "Hola", sessionId: "no-es-un-uuid" },
    pruebas: [`pm.test("Responde 400", () => pm.response.to.have.status(400));`],
  },
  {
    carpeta: "10 FitBot",
    id: "API-33",
    nombre: "FitBot rechaza mensajes de más de 500 caracteres",
    metodo: "POST",
    ruta: "/api/fitbot/chat",
    cuerpo: { chatInput: "{{mensajeLargo}}", sessionId: "{{$guid}}" },
    previa: [`pm.collectionVariables.set("mensajeLargo", "a".repeat(501));`],
    pruebas: [`pm.test("Responde 400", () => pm.response.to.have.status(400));`],
  },
  // --------------------------------------------------------------- Seguridad
  {
    carpeta: "11 Seguridad",
    id: "API-34",
    nombre: "Cabeceras de seguridad en las respuestas",
    metodo: "GET",
    ruta: "/api/sucursales",
    pruebas: [
      `pm.test("HSTS activo (HTTPS obligatorio)", () => pm.response.to.have.header("Strict-Transport-Security"));`,
      `pm.test("X-Content-Type-Options: nosniff", () => pm.expect(pm.response.headers.get("X-Content-Type-Options")).to.eql("nosniff"));`,
      `pm.test("Tiene política de contenido (CSP)", () => pm.response.to.have.header("Content-Security-Policy"));`,
      `pm.test("No revela la tecnología del servidor", () => {`,
      `  pm.expect(pm.response.headers.has("X-Powered-By")).to.be.false;`,
      `  pm.expect(pm.response.headers.has("Server")).to.be.false;`,
      `});`,
    ],
  },
  {
    carpeta: "11 Seguridad",
    id: "API-35",
    nombre: "No permite abrir contratos por su ruta directa",
    metodo: "GET",
    ruta: "/uploads/contratos/contrato.pdf",
    // Detrás de Caddy, /uploads ni siquiera llega al backend (404); el backend
    // directo responde 403. Lo importante es que el archivo no se entregue.
    pruebas: [
      `pm.test("Responde 403 o 404", () => pm.expect([403, 404]).to.include(pm.response.code));`,
      `pm.test("No entrega un PDF", () => pm.expect(pm.response.headers.get("Content-Type") || "").to.not.include("pdf"));`,
    ],
  },
  {
    carpeta: "11 Seguridad",
    id: "API-36",
    nombre: "Inyección SQL en el inicio de sesión",
    metodo: "POST",
    ruta: "/api/auth/login",
    cuerpo: { email: "' OR '1'='1' -- ", password: "' OR '1'='1" },
    pruebas: [
      `pm.test("No inicia sesión", () => pm.expect([400, 401]).to.include(pm.response.code));`,
      `pm.test("No entrega token", () => pm.expect(pm.response.json().token).to.be.undefined);`,
    ],
  },
  {
    carpeta: "11 Seguridad",
    id: "API-37",
    nombre: "Un cliente no puede ver el panel de otro rol ni datos ajenos",
    metodo: "GET",
    ruta: "/api/pagos",
    quien: "cliente",
    pruebas: [`pm.test("Responde 403", () => pm.response.to.have.status(403));`],
  },
  // Va al final: después de este caso el inicio de sesión queda bloqueado
  // 15 minutos para esta IP (se reinicia el backend del entorno QA).
  {
    carpeta: "11 Seguridad",
    id: "API-38",
    nombre: "Bloquea el inicio de sesión tras demasiados intentos",
    metodo: "POST",
    ruta: "/api/auth/login",
    cuerpo: { email: "{{adminEmail}}", password: "ClaveIncorrecta-123" },
    previa: [
      `// 10 intentos fallidos seguidos antes de esta petición.`,
      `for (let i = 0; i < 10; i++) {`,
      `  pm.sendRequest({`,
      `    url: pm.variables.replaceIn("{{baseUrl}}/api/auth/login"),`,
      `    method: "POST",`,
      `    header: { "Content-Type": "application/json" },`,
      `    body: { mode: "raw", raw: JSON.stringify({ email: pm.variables.get("adminEmail"), password: "ClaveIncorrecta-123" }) },`,
      `  }, () => {});`,
      `}`,
    ],
    pruebas: [
      `pm.test("Responde 429 (demasiadas solicitudes)", () => pm.response.to.have.status(429));`,
      `pm.test("Explica que debe esperar", () => pm.expect(pm.response.json().mensaje).to.match(/15 minutos/));`,
    ],
  },
];

const encabezados = (caso) => {
  const lista = [];
  if (caso.cuerpo) lista.push({ key: "Content-Type", value: "application/json" });
  if (caso.quien) lista.push({ key: "Authorization", value: `Bearer ${TOKENS[caso.quien]}` });
  return lista;
};

const comunes = [
  `pm.test("Responde en menos de 3 segundos", () => pm.expect(pm.response.responseTime).to.be.below(3000));`,
];

const peticion = (caso) => ({
  name: `${caso.id} ${caso.nombre}`,
  event: [
    ...(caso.previa
      ? [{ listen: "prerequest", script: { type: "text/javascript", exec: caso.previa } }]
      : []),
    {
      listen: "test",
      script: { type: "text/javascript", exec: [...caso.pruebas, ...comunes] },
    },
  ],
  request: {
    method: caso.metodo,
    header: encabezados(caso),
    ...(caso.cuerpo
      ? { body: { mode: "raw", raw: JSON.stringify(caso.cuerpo, null, 2) } }
      : {}),
    url: `{{baseUrl}}${caso.ruta}`,
  },
});

const carpetas = [...new Set(casos.map((caso) => caso.carpeta))].map((nombre) => ({
  name: nombre,
  item: casos.filter((caso) => caso.carpeta === nombre).map(peticion),
}));

const coleccion = {
  info: {
    name: "Focus Power Fit - API (QA)",
    description:
      "Pruebas funcionales y de seguridad de la API. Usar solo contra el entorno QA con datos ficticios.",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  event: [
    {
      listen: "prerequest",
      script: {
        type: "text/javascript",
        exec: [
          `// Sufijo único por ejecución y fecha de hoy (hora de Chile).`,
          `if (!pm.collectionVariables.get("sufijo")) {`,
          `  pm.collectionVariables.set("sufijo", Date.now().toString(36));`,
          `}`,
          `const ahora = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Santiago" }));`,
          `const dos = (n) => String(n).padStart(2, "0");`,
          `pm.collectionVariables.set("hoy", ahora.getFullYear() + "-" + dos(ahora.getMonth() + 1) + "-" + dos(ahora.getDate()));`,
        ],
      },
    },
  ],
  variable: [{ key: "sufijo", value: "" }],
  item: carpetas,
};

const entorno = {
  name: "Focus Power Fit - QA local",
  values: [
    { key: "baseUrl", value: "https://localhost:8443", enabled: true },
    { key: "adminEmail", value: cuentas.admin.email, enabled: true },
    { key: "adminPassword", value: cuentas.admin.password, enabled: true },
    { key: "clienteEmail", value: cuentas.cliente.email, enabled: true },
    { key: "clientePassword", value: cuentas.cliente.password, enabled: true },
  ],
};

const carpeta = new URL("./", import.meta.url);
fs.writeFileSync(
  new URL("focus-power-fit.postman_collection.json", carpeta),
  `${JSON.stringify(coleccion, null, 2)}\n`
);
fs.writeFileSync(
  new URL("entorno-qa.postman_environment.json", carpeta),
  `${JSON.stringify(entorno, null, 2)}\n`
);
console.log(`Colección generada: ${casos.length} casos en ${carpetas.length} carpetas.`);
