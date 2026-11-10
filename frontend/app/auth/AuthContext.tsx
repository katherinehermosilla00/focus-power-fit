
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import axios from "axios";

type Rol = "admin" | "cliente";

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
  aceptaTerminos: boolean;
};

type AuthContextType = {
  usuario: Usuario | null;
  token: string | null;
  cargando: boolean;
  login: (email: string, password: string) => Promise<ResultadoLogin>;
  register: (datos: DatosRegistro) => Promise<ResultadoLogin>;
  verifyRegistration: (
    email: string,
    codigo: string,
    password: string
  ) => Promise<ResultadoLogin>;
  logout: () => void;
  sesionExpirada: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Momento en que vence el token, según su campo exp. Solo sirve para cerrar la
// sesión a tiempo: la validez real la decide el servidor.
function venceEn(token: string): number | null {
  try {
    const carga = token.split(".")[1];
    const json = atob(carga.replace(/-/g, "+").replace(/_/g, "/"));
    const exp = Number(JSON.parse(json).exp);

    return Number.isFinite(exp) ? exp * 1000 : null;
  } catch {
    return null;
  }
}

const EVENTO_SESION_RECHAZADA = "focus:sesion-rechazada";

// Para pantallas que no usan la instancia global de axios: avisa que el
// servidor rechazó el token, y el proveedor cierra la sesión.
export function avisarSesionRechazada() {
  window.dispatchEvent(new Event(EVENTO_SESION_RECHAZADA));
}

// fetch con el mismo comportamiento que axios ante un token rechazado.
export async function fetchConSesion(
  url: RequestInfo | URL,
  opciones?: RequestInit
): Promise<Response> {
  const respuesta = await fetch(url, opciones);

  if (respuesta.status === 401) avisarSesionRechazada();

  return respuesta;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [sesionExpirada, setSesionExpirada] = useState(false);

  const cerrarSesion = useCallback((expirada: boolean) => {
    localStorage.removeItem("focusPowerFitToken");
    localStorage.removeItem("focusPowerFitUsuario");

    setToken(null);
    setUsuario(null);
    setSesionExpirada(expirada);
  }, []);

  useEffect(() => {
    let cancelado = false;

    try {
      const tokenGuardado = localStorage.getItem("focusPowerFitToken");
      const usuarioGuardado = localStorage.getItem("focusPowerFitUsuario");
      const vencimiento = tokenGuardado ? venceEn(tokenGuardado) : null;
      const vencido = vencimiento !== null && vencimiento <= Date.now();

      const usuarioRecuperado =
        tokenGuardado && usuarioGuardado && !vencido
          ? (JSON.parse(usuarioGuardado) as Usuario)
          : null;

      queueMicrotask(() => {
        if (cancelado) return;

        if (tokenGuardado && usuarioRecuperado) {
          setToken(tokenGuardado);
          setUsuario(usuarioRecuperado);
        } else if (vencido) {
          cerrarSesion(true);
        }

        setCargando(false);
      });
    } catch (error) {
      console.error("Error al cargar la sesión:", error);

      localStorage.removeItem("focusPowerFitToken");
      localStorage.removeItem("focusPowerFitUsuario");

      queueMicrotask(() => {
        if (!cancelado) {
          setCargando(false);
        }
      });
    }

    return () => {
      cancelado = true;
    };
  }, [cerrarSesion]);

  // Cierra la sesión cuando vence, aunque la página siga abierta.
  useEffect(() => {
    if (!token) return;

    const vencimiento = venceEn(token);

    if (vencimiento === null) return;

    const espera = Math.min(
      Math.max(vencimiento - Date.now(), 0),
      2_147_483_647
    );
    const temporizador = window.setTimeout(() => cerrarSesion(true), espera);

    return () => window.clearTimeout(temporizador);
  }, [token, cerrarSesion]);

  // Si el servidor rechaza el token, por ejemplo tras cambiar la contraseña,
  // también se cierra la sesión. Se registra una sola vez al iniciar, antes de
  // que las páginas pidan datos: React ejecuta primero los efectos de las páginas.
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (respuesta) => respuesta,
      (error) => {
        if (
          axios.isAxiosError(error) &&
          error.response?.status === 401 &&
          error.config?.headers?.Authorization
        ) {
          cerrarSesion(true);
        }

        return Promise.reject(error);
      }
    );

    const alRechazar = () => cerrarSesion(true);
    window.addEventListener(EVENTO_SESION_RECHAZADA, alRechazar);

    return () => {
      axios.interceptors.response.eject(interceptor);
      window.removeEventListener(EVENTO_SESION_RECHAZADA, alRechazar);
    };
  }, [cerrarSesion]);

  const login = async (
    email: string,
    password: string
  ): Promise<ResultadoLogin> => {
    try {
      const respuesta = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/auth/login`, {
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
      setSesionExpirada(false);

      return { ok: true };
    } catch (error) {
      console.error("Error al iniciar sesión:", error);

      return {
        ok: false,
        mensaje: "No se pudo conectar con el servidor. Intenta nuevamente.",
      };
    }
  };

  const register = async (
    datos: DatosRegistro
  ): Promise<ResultadoLogin> => {
    try {
      const respuesta = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/auth/register`, {
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
    codigo: string,
    password: string
  ): Promise<ResultadoLogin> => {
    try {
      const respuesta = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/auth/register/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, codigo, password }),
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

  const logout = () => cerrarSesion(false);

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
        sesionExpirada,
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
