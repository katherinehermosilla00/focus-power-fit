// Archivo de inicio de la API en el hosting con cPanel («Setup Node.js App»).
//
// cPanel abre la aplicación con Phusion Passenger, que carga este archivo con
// require(). Por eso es CommonJS (.cjs) y abre la API con import().
// En el computador se sigue usando npm start o npm run dev.

import("./src/index.js")
  .then(({ iniciarServidor }) => iniciarServidor())
  .catch((error) => {
    console.error("No se pudo cargar la API:", error.message);
    process.exitCode = 1;
  });
