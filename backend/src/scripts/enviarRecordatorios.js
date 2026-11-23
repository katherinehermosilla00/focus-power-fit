// Programa y envía los recordatorios pendientes una vez y termina:
// npm run recordatorios:enviar
//
// En un hosting compartido se ejecuta con una tarea programada (Cron Jobs del
// cPanel) cada 10 minutos, junto con RECORDATORIOS_CON_CRON=true en la API.

import "dotenv/config";
import sequelize from "../config/database.js";
import { procesarRecordatorios } from "../services/recordatorioScheduler.js";

process.env.TZ ||= "America/Santiago";

try {
  if (!process.env.EMAIL_HOST) {
    throw new Error("Falta configurar EMAIL_HOST");
  }

  await sequelize.authenticate();
  const { programados, enviados } = await procesarRecordatorios();
  console.log(`[RECORDATORIOS] Programados: ${programados}; enviados: ${enviados}`);
} catch (error) {
  console.error("Error al procesar los recordatorios:", error.message);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
