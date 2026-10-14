"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth/AuthContext";

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
  const verificador =
    resultado === 11 ? "0" : resultado === 10 ? "K" : String(resultado);
  return rut.endsWith(verificador);
};

export default function RegistroPage() {
  const router = useRouter();
  const { register, verifyRegistration } = useAuth();

  const [form, setForm] = useState({
    nombre: "",
    apellidos: "",
    email: "",
    password: "",
    confirmPassword: "",
    rut: "",
    telefono: "",
  });
  const [codigo, setCodigo] = useState("");
  const [etapa, setEtapa] = useState<"datos" | "verificar">("datos");
  const [mensaje, setMensaje] = useState("");

  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const valorNormalizado =
      name === "rut"
        ? formatearRut(value)
        : name === "telefono"
          ? value.replace(/\D/g, "").slice(0, 9)
          : value;

    setForm((prev) => ({
      ...prev,
      [name]: valorNormalizado,
    }));
  };

  const handleRegistro = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (
      !form.nombre.trim() ||
      !form.apellidos.trim() ||
      !form.email.trim() ||
      !form.password ||
      !form.rut ||
      !form.telefono
    ) {
      setError("Completa todos los campos obligatorios.");
      return;
    }

    if (Array.from(`${form.nombre.trim()} ${form.apellidos.trim()}`).length > 120) {
      setError("Nombre y apellidos no pueden superar 120 caracteres en total.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) {
      setError("Ingresa un correo con formato válido.");
      return;
    }

    if (form.password.length < 8 || !/[A-Z]/.test(form.password) || !/\d/.test(form.password)) {
      setError("La contraseña debe tener 8 caracteres, una mayúscula y un número.");
      return;
    }

    if (form.password.length > 128) {
      setError("La contraseña no puede superar 128 caracteres.");
      return;
    }

    if (!rutEsValido(form.rut)) {
      setError("Ingresa un RUT válido; se verifica con el algoritmo Módulo 11.");
      return;
    }

    if (!/^\d{9}$/.test(form.telefono)) {
      setError("El celular debe contener exactamente 9 dígitos.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setCargando(true);
    try {
      const resultado = await register({
        nombre: form.nombre,
        apellidos: form.apellidos,
        email: form.email,
        password: form.password,
        rut: form.rut,
        telefono: form.telefono,
      });

      if (!resultado.ok) {
        setError(resultado.mensaje || "No se pudo iniciar el registro.");
        return;
      }

      setMensaje(resultado.mensaje || "Revisa tu correo para ingresar el código.");
      setEtapa("verificar");
    } finally {
      setCargando(false);
    }
  };

  const handleVerificacion = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!/^\d{6}$/.test(codigo)) {
      setError("Ingresa el código de 6 dígitos que enviamos a tu correo.");
      return;
    }

    setCargando(true);
    try {
      const resultado = await verifyRegistration(form.email, codigo);
      if (!resultado.ok) {
        setError(resultado.mensaje || "No se pudo verificar el correo.");
        return;
      }

      router.replace("/mi-cuenta");
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="bg-black text-white min-h-screen px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-red-500 hover:underline">
            ← Volver al inicio
          </Link>
        </div>

        <div className="bg-gray-900 border border-red-500 rounded-2xl p-8 shadow-lg">
          <h1 className="text-4xl font-bold text-red-500 mb-6 text-center">
            Registro
          </h1>

          {etapa === "datos" ? (
            <form onSubmit={handleRegistro} className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="nombre" className="block text-sm mb-2">Nombre</label>
                <input id="nombre" type="text" name="nombre" value={form.nombre} onChange={handleChange} maxLength={120} autoComplete="given-name" required className="w-full rounded-lg border border-gray-700 bg-black px-4 py-3 text-white" placeholder="Ej.: María José" />
              </div>

              <div>
                <label htmlFor="apellidos" className="block text-sm mb-2">Apellidos</label>
                <input id="apellidos" type="text" name="apellidos" value={form.apellidos} onChange={handleChange} maxLength={120} autoComplete="family-name" required className="w-full rounded-lg border border-gray-700 bg-black px-4 py-3 text-white" placeholder="Ej.: González Pérez" />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="email" className="block text-sm mb-2">Correo electrónico</label>
                <input id="email" type="email" name="email" value={form.email} onChange={handleChange} maxLength={150} autoComplete="email" required className="w-full rounded-lg border border-gray-700 bg-black px-4 py-3 text-white" placeholder="correo@ejemplo.cl" />
              </div>

              <div>
                <label htmlFor="rut" className="block text-sm mb-2">RUT</label>
                <input id="rut" type="text" name="rut" value={form.rut} onChange={handleChange} maxLength={12} inputMode="text" autoComplete="off" required className="w-full rounded-lg border border-gray-700 bg-black px-4 py-3 text-white" placeholder="12.345.678-5" />
              </div>

              <div>
                <label htmlFor="telefono" className="block text-sm mb-2">Celular</label>
                <div className="flex rounded-lg border border-gray-700 bg-black focus-within:border-red-500">
                  <span className="flex items-center border-r border-gray-700 px-3 text-gray-400">+56</span>
                  <input id="telefono" type="tel" name="telefono" value={form.telefono} onChange={handleChange} maxLength={9} inputMode="numeric" autoComplete="tel-national" required className="w-full min-w-0 bg-transparent px-4 py-3 text-white outline-none" placeholder="9 1234 5678" />
                </div>
                <p className="mt-1 text-xs text-gray-400">Ingresa exactamente 9 dígitos, incluido el 9 inicial; el prefijo +56 se muestra automáticamente.</p>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm mb-2">Contraseña</label>
                <input id="password" type="password" name="password" value={form.password} onChange={handleChange} maxLength={128} autoComplete="new-password" required className="w-full rounded-lg border border-gray-700 bg-black px-4 py-3 text-white" placeholder="Crea una contraseña" />
                <p className="mt-1 text-xs text-gray-400">Mínimo 8 caracteres, una mayúscula y un número.</p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm mb-2">Confirmar contraseña</label>
                <input id="confirmPassword" type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} maxLength={128} autoComplete="new-password" required className="w-full rounded-lg border border-gray-700 bg-black px-4 py-3 text-white" placeholder="Repite la contraseña" />
              </div>

              {error && <div role="alert" className="md:col-span-2 text-red-400 text-sm font-medium">{error}</div>}

              <div className="md:col-span-2">
                <button type="submit" disabled={cargando} className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-3 rounded-lg transition disabled:opacity-60">
                  {cargando ? "Enviando código..." : "Continuar"}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerificacion} className="space-y-6">
              <p className="text-sm text-gray-300">{mensaje} <span className="font-semibold text-white">{form.email}</span></p>
              <div>
                <label htmlFor="codigo" className="block text-sm mb-2">Código de verificación</label>
                <input id="codigo" type="text" value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))} maxLength={6} inputMode="numeric" autoComplete="one-time-code" required className="w-full rounded-lg border border-gray-700 bg-black px-4 py-3 text-white tracking-widest" placeholder="000000" />
              </div>

              {error && <div role="alert" className="text-red-400 text-sm font-medium">{error}</div>}

              <button type="submit" disabled={cargando} className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-3 rounded-lg transition disabled:opacity-60">
                {cargando ? "Verificando..." : "Verificar correo y crear cuenta"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}