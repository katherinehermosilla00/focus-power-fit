import fs from "node:fs/promises";

const FIRMAS = [
  { tipo: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] },
  { tipo: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  {
    tipo: "image/png",
    bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
];

// Identifica el tipo real a partir de los primeros bytes del archivo,
// porque el tipo declarado por el navegador lo controla quien lo envía.
export const detectarTipoArchivo = async (ruta) => {
  const archivo = await fs.open(ruta, "r");

  try {
    const { buffer, bytesRead } = await archivo.read(Buffer.alloc(8), 0, 8, 0);
    const inicio = buffer.subarray(0, bytesRead);

    return (
      FIRMAS.find(({ bytes }) =>
        bytes.every((byte, indice) => inicio[indice] === byte)
      )?.tipo ?? null
    );
  } finally {
    await archivo.close();
  }
};
