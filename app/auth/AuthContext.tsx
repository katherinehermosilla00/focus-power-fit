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

type ResultadoLogin = {
  ok: boolean;
  mensaje?: string;
};

type DatosRegistro = {
  nombre: string;
  apellidos: string;
  email: string;
  password: string;
  rut: string;
  telefono: string;
};

type AuthContextType = {
  usuario: Usuario | null;
  token: string | null;
  cargando: boolean;
  login: (email: string, password: string) => Promise<ResultadoLogin>;
  register: (datos: DatosRegistro) => Promise<ResultadoLogin>;
  verifyRegistration: (email: string, codigo: string) => Promise<ResultadoLogin>;
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

  const login = async (
    email: string,
    password: string
  ): Promise<ResultadoLogin> => {
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
        return {
          ok: false,
          mensaje: data.mensaje || "No se pudo iniciar sesión.",
        };
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

      return { ok: true };
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      return {
        ok: false,
        mensaje: "No se pudo conectar con el servidor. Intenta nuevamente.",
      };
    }
  };

  const register = async (datos: DatosRegistro): Promise<ResultadoLogin> => {
    try {
      const respuesta = await fetch("http://localhost:3001/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(datos),
      });

      const data = await respuesta.json();

      if (!respuesta.ok) {
        return {
          ok: false,
          mensaje: data.mensaje || "No se pudo iniciar el registro.",
        };
      }

      return {
        ok: true,
        mensaje: data.mensaje || "Revisa tu correo para ingresar el código.",
      };
    } catch (error) {
      console.error("Error al iniciar registro:", error);
      return {
        ok: false,
        mensaje: "No se pudo conectar con el servidor. Intenta nuevamente.",
      };
    }
  };

  const verifyRegistration = async (
    email: string,
    codigo: string
  ): Promise<ResultadoLogin> => {
    try {
      const respuesta = await fetch(
        "http://localhost:3001/api/auth/register/verify",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, codigo }),
        }
      );

      const data = await respuesta.json();

      if (!respuesta.ok) {
        return {
          ok: false,
          mensaje: data.mensaje || "No se pudo verificar el correo.",
        };
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

      return { ok: true };
    } catch (error) {
      console.error("Error al verificar correo:", error);
      return {
        ok: false,
        mensaje: "No se pudo conectar con el servidor. Intenta nuevamente.",
      };
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
      value={{
        usuario,
        token,
        cargando,
        login,
        register,
        verifyRegistration,
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