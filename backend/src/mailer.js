import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  secure: process.env.MAIL_SECURE === "true",

  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
});

export const enviarCorreo = async ({
  para,
  asunto,
  texto,
}) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: para,
      subject: asunto,
      text: texto,
    });

    console.log(
      "Correo enviado correctamente:",
      info.messageId
    );

    return info;
  } catch (error) {
    console.error(
      "Error al enviar correo:",
      error.message
    );

    throw error;
  }
};

export const verificarCorreo = async () => {
  try {
    await transporter.verify();

    console.log(
      "Servidor de correo conectado correctamente"
    );

    return true;
  } catch (error) {
    console.error(
      "Error al conectar con servidor de correo:",
      error.message
    );

    return false;
  }
};