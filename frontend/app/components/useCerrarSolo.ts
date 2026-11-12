"use client";

import { useEffect } from "react";

// Tiempo que se muestra un mensaje de éxito antes de cerrarse solo.
export const DURACION_MENSAJE = 5000;

/**
 * Cierra un mensaje de éxito después de unos segundos.
 * Recibe el texto y su setter de useState; al vencer el plazo lo deja vacío.
 * Si el mensaje cambia antes, el plazo vuelve a empezar.
 */
export function useCerrarSolo(
  mensaje: string,
  setMensaje: (valor: string) => void,
  duracion: number = DURACION_MENSAJE
) {
  useEffect(() => {
    if (!mensaje) return;

    const temporizador = window.setTimeout(() => setMensaje(""), duracion);
    return () => window.clearTimeout(temporizador);
  }, [mensaje, setMensaje, duracion]);
}
