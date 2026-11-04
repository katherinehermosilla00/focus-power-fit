"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth/AuthContext";
import "./registro.css";

const formatearRut = (valor: string) => {
  const limpio = valor.toUpperCase().replace(/[^0-9K]/g, "").slice(0, 9);
  if (limpio.length < 2) return limpio;
  const cuerpo = limpio.slice(0, -1);
  const verificador = limpio.slice(-1);
  return `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${verificador}`;
};

const rutEsValido = (valor: string) => {
  const rut = valor.replace(/[.\-\s]/g, "").toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(rut)) return false;
  const cuerpo = rut.slice(0, -1);
  let suma = 0;
  let factor = 2;
  for (let indice = cuerpo.length - 1; indice >= 0; indice -= 1) {
    suma += Number(cuerpo[indice]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resultado = 11 - (suma % 11);
  const verificador = resultado === 11 ? "0" : resultado === 10 ? "K" : String(resultado);
  return rut.endsWith(verificador);
};

export default function RegistroPage() {
  const router = useRouter();
  const { register, verifyRegistration } = useAuth();
  const [form, setForm] = useState({
    nombre: "", apellidos: "", email: "", password: "", confirmPassword: "", rut: "", telefono: "",
  });
  const [codigo, setCodigo] = useState("");
  const [etapa, setEtapa] = useState<"datos" | "verificar">("datos");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const valorNormalizado = name === "rut" ? formatearRut(value) : name === "telefono" ? value.replace(/\D/g, "").slice(0, 9) : value;
    setForm((prev) => ({ ...prev, [name]: valorNormalizado }));
  };

  const handleRegistro = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!form.nombre.trim() || !form.apellidos.trim() || !form.email.trim() || !form.password || !form.rut || !form.telefono) {
      setError("Completa todos los campos obligatorios."); return;
    }
    if (Array.from(`${form.nombre.trim()} ${form.apellidos.trim()}`).length > 120) {
      setError("Nombre y apellidos no pueden superar 120 caracteres en total."); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) {
      setError("Ingresa un correo con formato válido."); return;
    }
    if (form.password.length < 8 || !/[A-Z]/.test(form.password) || !/\d/.test(form.password)) {
      setError("La contraseña debe tener 8 caracteres, una mayúscula y un número."); return;
    }
    if (form.password.length > 128) {
      setError("La contraseña no puede superar 128 caracteres."); return;
    }
    if (!rutEsValido(form.rut)) {
      setError("Ingresa un RUT válido; se verifica con el algoritmo Módulo 11."); return;
    }
    if (!/^\d{9}$/.test(form.telefono)) {
      setError("El celular debe contener exactamente 9 dígitos."); return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden."); return;
    }
    setCargando(true);
    try {
      const resultado = await register({
        nombre: form.nombre, apellidos: form.apellidos, email: form.email,
        password: form.password, rut: form.rut, telefono: form.telefono,
      });
      if (!resultado.ok) {
        setError(resultado.mensaje || "No se pudo iniciar el registro."); return;
      }
      setMensaje(resultado.mensaje || "Revisa tu correo para ingresar el código.");
      setEtapa("verificar");
    } catch {
      setError("Ocurrió un problema al iniciar el registro. Inténtalo nuevamente.");
    } finally {
      setCargando(false);
    }
  };

  const handleVerificacion = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(codigo)) {
      setError("Ingresa el código de 6 dígitos que enviamos a tu correo."); return;
    }
    setCargando(true);
    try {
      const resultado = await verifyRegistration(form.email, codigo);
      if (!resultado.ok) {
        setError(resultado.mensaje || "No se pudo verificar el correo."); return;
      }
      router.replace("/mi-cuenta");
    } catch {
      setError("Ocurrió un problema al verificar el correo. Inténtalo nuevamente.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="registro-pagina">
      <div className="registro-fondo" aria-hidden="true">
        <div className="registro-fondo-grid" />
        <div className="registro-orbe registro-orbe-uno" />
        <div className="registro-orbe registro-orbe-dos" />
        <div className="registro-haz registro-haz-uno" />
        <div className="registro-haz registro-haz-dos" />
      </div>
      <div className="registro-contenedor">
        <section className="registro-tarjeta" aria-labelledby="registro-titulo">
          <header className="registro-encabezado">
            <Link href="/" className="registro-marca">FOCUS <span>POWER FIT</span></Link>
            <Link href="/" className="registro-volver">Volver al inicio</Link>
          </header>
          <div className="registro-tarjeta-cabecera">
            <p className="registro-eyebrow">REGISTRO DE CLIENTES</p>
            <h1 id="registro-titulo">{etapa === "datos" ? <>Crea tu <span>cuenta</span></> : <>Verifica tu <span>correo</span></>}</h1>
            <p className="registro-introduccion">
              {etapa === "datos" ? "Completa tus datos para comenzar." : "Ingresa el código de seguridad que enviamos a tu correo."}
            </p>
            <div className="registro-pasos" aria-label={`Paso ${etapa === "datos" ? 1 : 2} de 2`}>
              <span className="registro-paso activo"><b>01</b> Tus datos</span>
              <span className="registro-paso-linea" />
              <span className={`registro-paso ${etapa === "verificar" ? "activo" : ""}`}><b>02</b> Verificación</span>
            </div>
          </div>

          {etapa === "datos" ? (
            <form onSubmit={handleRegistro} className="registro-formulario">
              <div className="registro-campo">
                <label htmlFor="nombre">Nombre</label>
                <input id="nombre" type="text" name="nombre" value={form.nombre} onChange={handleChange} maxLength={120} autoComplete="given-name" required placeholder="Ej.: María José" />
              </div>
              <div className="registro-campo">
                <label htmlFor="apellidos">Apellidos</label>
                <input id="apellidos" type="text" name="apellidos" value={form.apellidos} onChange={handleChange} maxLength={120} autoComplete="family-name" required placeholder="Ej.: González Pérez" />
              </div>
              <div className="registro-campo">
                <label htmlFor="email">Correo electrónico</label>
                <input id="email" type="email" name="email" value={form.email} onChange={handleChange} maxLength={150} autoComplete="email" required placeholder="correo@ejemplo.cl" />
              </div>
              <div className="registro-campo">
                <label htmlFor="rut">RUT</label>
                <input id="rut" type="text" name="rut" value={form.rut} onChange={handleChange} maxLength={12} inputMode="text" autoComplete="off" required placeholder="12.345.678-5" />
              </div>
              <div className="registro-campo">
                <label htmlFor="telefono">Celular</label>
                <div className="registro-telefono">
                  <span>+56</span>
                  <input id="telefono" type="tel" name="telefono" value={form.telefono} onChange={handleChange} maxLength={9} inputMode="numeric" autoComplete="tel-national" required placeholder="912345678" />
                </div>
                <small>9 dígitos, incluido el 9 inicial.</small>
              </div>
              <div className="registro-campo">
                <label htmlFor="password">Contraseña</label>
                <div className="registro-password">
                  <input id="password" type={mostrarPassword ? "text" : "password"} name="password" value={form.password} onChange={handleChange} maxLength={128} autoComplete="new-password" required placeholder="Crea una contraseña" />
                  <button type="button" onClick={() => setMostrarPassword((v) => !v)} aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{mostrarPassword ? "Ocultar" : "Mostrar"}</button>
                </div>
                <small>Mínimo 8 caracteres, una mayúscula y un número.</small>
              </div>
              <div className="registro-campo">
                <label htmlFor="confirmPassword">Confirmar contraseña</label>
                <div className="registro-password">
                  <input id="confirmPassword" type={mostrarConfirmacion ? "text" : "password"} name="confirmPassword" value={form.confirmPassword} onChange={handleChange} maxLength={128} autoComplete="new-password" required placeholder="Repite la contraseña" />
                  <button type="button" onClick={() => setMostrarConfirmacion((v) => !v)} aria-label={mostrarConfirmacion ? "Ocultar confirmación" : "Mostrar confirmación"}>{mostrarConfirmacion ? "Ocultar" : "Mostrar"}</button>
                </div>
              </div>
              {error && <div role="alert" className="registro-error registro-ancho">{error}</div>}
              <button type="submit" disabled={cargando} className="registro-enviar registro-ancho">
                {cargando ? "Enviando código..." : "Continuar al siguiente paso →"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerificacion} className="registro-verificacion">
              <p className="registro-correo-mensaje">{mensaje} <strong>{form.email}</strong></p>
              <div className="registro-campo">
                <label htmlFor="codigo">Código de verificación</label>
                <input id="codigo" className="registro-codigo" type="text" value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))} maxLength={6} inputMode="numeric" autoComplete="one-time-code" required placeholder="000000" />
              </div>
              {error && <div role="alert" className="registro-error">{error}</div>}
              <button type="submit" disabled={cargando} className="registro-enviar">
                {cargando ? "Verificando..." : "Verificar correo y crear cuenta →"}
              </button>
            </form>
          )}
          <p className="registro-pie">¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link></p>
        </section>
        <p className="registro-footer">© {new Date().getFullYear()} Focus Power Fit</p>
      </div>
    </main>
  );
}
