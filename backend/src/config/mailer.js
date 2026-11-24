import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const ENTIDADES = {
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
  "&amp;": "&",
};

// Versión en texto del correo. Los filtros de spam penalizan los mensajes que
// solo traen HTML.
export const htmlATexto = (html) =>
  html
    .replace(/\s+/g, " ")
    .replace(/<br\s*\/?>|<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&(?:lt|gt|quot|#39|nbsp|amp);/g, (entidad) => ENTIDADES[entidad])
    .split("\n")
    .map((linea) => linea.trim())
    .filter(Boolean)
    .join("\n\n");

// Cabeceras de los correos automáticos: evitan que respuestas automáticas
// («estoy fuera de la oficina») vuelvan a la casilla del sistema (RFC 3834).
const CABECERAS = {
  "Auto-Submitted": "auto-generated",
  "X-Auto-Response-Suppress": "All",
  "Content-Language": "es-CL",
};

export const enviarCorreo = async ({ to, subject, html }) => {
  return transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    text: htmlATexto(html),
    html,
    headers: CABECERAS,
    xMailer: "Focus Power Fit",
    // El contenido nunca debe leer archivos ni direcciones externas.
    disableFileAccess: true,
    disableUrlAccess: true,
  });
};