"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

type Rol = "admin" | "cliente" | "profesor";

type Usuario = {
  id?: number;
  nombre: string;
  email: string;
  rol: Rol;
};

type AuthContextType = {
  usuario: Usuario | null;
  token: string | null;
  cargando: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (
    nombre: string,
    email: string,
    password: string,
    rut?: string,
    telefono?: string
  ) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    try {
      const tokenGuardado = localStorage.getItem("focusPowerFitToken");
      const usuarioGuardado = localStorage.getItem("focusPowerFitUsuario");

      if (tokenGuardado && usuarioGuardado) {
        setToken(tokenGuardado);
        setUsuario(JSON.parse(usuarioGuardado));
      }
    } catch (error) {
      console.error("Error al cargar la sesión:", error);
      localStorage.removeItem("focusPowerFitToken");
      localStorage.removeItem("focusPowerFitUsuario");
    } finally {
      setCargando(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const respuesta = await fetch("http://localhost:3001/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await respuesta.json();

      if (!respuesta.ok) {
        return false;
      }

      const usuarioLogueado: Usuario = {
        id: data.user.id,
        nombre: data.user.nombre,
        email: data.user.email,
        rol: data.user.rol,
      };

      localStorage.setItem("focusPowerFitToken", data.token);
      localStorage.setItem(
        "focusPowerFitUsuario",
        JSON.stringify(usuarioLogueado)
      );

      setToken(data.token);
      setUsuario(usuarioLogueado);

      return true;
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      return false;
    }
  };

  const register = async (
    nombre: string,
    email: string,
    password: string,
    rut?: string,
    telefono?: string
  ): Promise<boolean> => {
    try {
      const respuesta = await fetch("http://localhost:3001/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre,
          email,
          password,
          rut,
          telefono,
        }),
      });

      const data = await respuesta.json();

      if (!respuesta.ok) {
        return false;
      }

      const usuarioRegistrado: Usuario = {
        id: data.user.id,
        nombre: data.user.nombre,
        email: data.user.email,
        rol: data.user.rol,
      };

      localStorage.setItem("focusPowerFitToken", data.token);
      localStorage.setItem(
        "focusPowerFitUsuario",
        JSON.stringify(usuarioRegistrado)
      );

      setToken(data.token);
      setUsuario(usuarioRegistrado);

      return true;
    } catch (error) {
      console.error("Error al registrar usuario:", error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("focusPowerFitToken");
    localStorage.removeItem("focusPowerFitUsuario");

    setToken(null);
    setUsuario(null);
  };

  return (
    <AuthContext.Provider
      value={{ usuario, token, cargando, login, register, logout }}
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