import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AuthProvider, leerToken, useAuth } from "../app/auth/AuthContext";

// Token con el formato de un JWT y vencimiento en una hora.
// Solo se lee su fecha de vencimiento; la firma no se revisa en el navegador.
function tokenDePrueba() {
  const carga = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `encabezado.${carga}.firma`;
}

const USUARIO = JSON.stringify({
  id: 1,
  nombre: "Admin de Prueba",
  email: "admin@example.com",
  rol: "admin",
});

function EstadoSesion() {
  const { usuario, cargando } = useAuth();
  if (cargando) return <p>cargando</p>;
  return <p>{usuario ? `sesión de ${usuario.nombre}` : "sin sesión"}</p>;
}

const mostrar = () =>
  render(
    <AuthProvider>
      <EstadoSesion />
    </AuthProvider>
  );

afterEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe("Sesión por pestaña", () => {
  it("una pestaña nueva no reutiliza la sesión compartida y la borra", async () => {
    localStorage.setItem("focusPowerFitToken", tokenDePrueba());
    localStorage.setItem("focusPowerFitUsuario", USUARIO);

    mostrar();

    expect(await screen.findByText("sin sesión")).toBeInTheDocument();
    expect(localStorage.getItem("focusPowerFitToken")).toBeNull();
    expect(leerToken()).toBeNull();
  });

  it("la pestaña donde se inició sesión la mantiene al recargar", async () => {
    sessionStorage.setItem("focusPowerFitToken", tokenDePrueba());
    sessionStorage.setItem("focusPowerFitUsuario", USUARIO);

    mostrar();

    expect(await screen.findByText("sesión de Admin de Prueba")).toBeInTheDocument();
    expect(leerToken()).not.toBeNull();
  });
});
