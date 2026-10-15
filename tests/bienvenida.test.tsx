import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BienvenidaPage from "../app/bienvenida/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("../app/auth/AuthContext", () => ({
  useAuth: () => ({
    usuario: {
      id: 1,
      nombre: "Cliente de Prueba",
      email: "cliente@example.com",
      rol: "cliente",
    },
    cargando: false,
  }),
}));

describe("Pagina de bienvenida", () => {
  it("muestra el nombre del cliente autenticado", () => {
    render(<BienvenidaPage />);

    expect(
      screen.getByText("Hola, Cliente de Prueba")
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "Mi cuenta" })
    ).toHaveAttribute("href", "/mi-cuenta");
  });
});
