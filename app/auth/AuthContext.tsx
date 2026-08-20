"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

type Rol = "admin" | "cliente";

type Usuario = {
  nombre: string;
  email: string;
  rol: Rol;
};

type AuthContextType = {
  usuario: Usuario | null;
  cargando: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const usuariosDemo = [
  {
    nombre: "Dueño Focus Power Fit",
    email: "admin@focuspowerfit.cl",
    password: "Admin123",
    rol: "admin" as Rol,
  },
  {
    nombre: "Cliente Demo",
    email: "cliente@focuspowerfit.cl",
    password: "Cliente123",
    rol: "cliente" as Rol,
  },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
  const cargarUsuario = () => {
    try {
      const usuarioGuardado = localStorage.getItem(
        "focusPowerFitUsuario"
      );

      if (usuarioGuardado) {
        setUsuario(JSON.parse(usuarioGuardado));
      }
    } catch (error) {
      console.error("Error al cargar la sesión:", error);
      localStorage.removeItem("focusPowerFitUsuario");
    } finally {
      setCargando(false);
    }
  };

  const timeout = setTimeout(cargarUsuario, 0);

  return () => clearTimeout(timeout);
    }, []);

  const login = (email: string, password: string) => {
    const encontrado = usuariosDemo.find(
      (u) => u.email === email && u.password === password
    );

    if (!encontrado) {
      return false;
    }

    const usuarioSeguro: Usuario = {
      nombre: encontrado.nombre,
      email: encontrado.email,
      rol: encontrado.rol,
    };

    localStorage.setItem(
      "focusPowerFitUsuario",
      JSON.stringify(usuarioSeguro)
    );

    setUsuario(usuarioSeguro);

    return true;
  };

  const logout = () => {
    localStorage.removeItem("focusPowerFitUsuario");
    setUsuario(null);
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        cargando,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe utilizarse dentro de AuthProvider");
  }

  return context;
}