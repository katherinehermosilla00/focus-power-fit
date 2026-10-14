
"use client";

import { FormEvent, useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../auth/AuthContext";

type EstadoProfesor = "Activo" | "Inactivo";

type Sucursal = {
  id: number;
  nombre: string;
  comuna: string | null;
  estado: "Activa" | "Inactiva";
};

type Profesor = {
  id: number;
  sucursalId: number | null;
  nombre: string;
  rut: string;
  email: string;
  telefono: string | null;
  especialidad: string | null;
  estado: EstadoProfesor;
  sucursal?: Sucursal | null;
};

const API_PROFESORES = "http://localhost:3001/api/profesores";
const API_SUCURSALES = "http://localhost:3001/api/sucursales";

const colores = {
  fondo: "var(--background)",
  principal: "var(--color-primary)",
  principalHover: "var(--color-primary-hover)",
  superficie: "var(--color-surface)",
  superficie2: "var(--color-surface-secondary)",
  borde: "var(--color-border)",
  secundario: "var(--color-text-secondary)",
};

const campoClase =
  "w-full rounded-xl border bg-black px-4 py-3 text-sm text-white outline-none transition-colors focus:border-[var(--color-primary)]";

function iniciales(nombre: string) {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join("");
}

function AvatarProfesor({
  nombre,
  grande = false,
}: {
  nombre: string;
  grande?: boolean;
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full border font-bold text-white ${
        grande ? "h-20 w-20 text-2xl" : "h-12 w-12 text-sm"
      }`}
      style={{
        backgroundColor: colores.superficie2,
        borderColor: colores.borde,
      }}
      aria-label={`Avatar de ${nombre}`}
    >
      {iniciales(nombre)}
    </div>
  );
}

export default function ProfesoresPage() {
  const router = useRouter();
  const { usuario, cargando } = useAuth();

  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);

  const [nombre, setNombre] = useState("");
  const [rut, setRut] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [especialidad, setEspecialidad] = useState("");
  const [sucursalId, setSucursalId] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [sucursalFiltro, setSucursalFiltro] = useState("todas");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");

  const [profesorEditandoId, setProfesorEditandoId] =
    useState<number | null>(null);

  const [profesorDetalle, setProfesorDetalle] =
    useState<Profesor | null>(null);

  const [cargandoProfesores, setCargandoProfesores] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorCarga, setErrorCarga] = useState("");

  // PROTECCIÓN DE RUTA
  useEffect(() => {
    if (cargando) return;

    if (!usuario) {
      router.replace("/login");
    } else if (usuario.rol !== "admin") {
      router.replace("/mi-cuenta");
    }
  }, [usuario, cargando, router]);

  // CARGAR DATOS
  useEffect(() => {
    if (cargando || !usuario || usuario.rol !== "admin") return;

    let activo = true;

    const cargarDatos = async () => {
      try {
        setCargandoProfesores(true);
        setErrorCarga("");

        const [respuestaProfesores, respuestaSucursales] =
          await Promise.all([
            axios.get<Profesor[]>(API_PROFESORES),
            axios.get<Sucursal[]>(API_SUCURSALES),
          ]);

        if (!activo) return;

        setProfesores(respuestaProfesores.data);
        setSucursales(respuestaSucursales.data);
      } catch (error) {
        console.error("Error al cargar datos:", error);

        if (activo) {
          setErrorCarga(
            "No se pudieron cargar los profesores o las sucursales."
          );
        }
      } finally {
        if (activo) setCargandoProfesores(false);
      }
    };

    cargarDatos();

    return () => {
      activo = false;
    };
  }, [usuario, cargando]);

  const cargarProfesores = async () => {
    const respuesta = await axios.get<Profesor[]>(API_PROFESORES);
    setProfesores(respuesta.data);
  };

  const limpiarFormulario = () => {
    setNombre("");
    setRut("");
    setEmail("");
    setTelefono("");
    setEspecialidad("");
    setSucursalId("");
    setProfesorEditandoId(null);
  };

  // REGISTRAR Y EDITAR
  const guardarProfesor = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const correoExiste = profesores.some(
      (profesor) =>
        profesor.email.toLowerCase() === email.trim().toLowerCase() &&
        profesor.id !== profesorEditandoId
    );

    if (correoExiste) {
      alert("Ya existe un profesor con ese correo.");
      return;
    }

    const rutExiste = profesores.some(
      (profesor) =>
        profesor.rut.toLowerCase() === rut.trim().toLowerCase() &&
        profesor.id !== profesorEditandoId
    );

    if (rutExiste) {
      alert("Ya existe un profesor con ese RUT.");
      return;
    }

    if (!sucursalId) {
      alert("Debes seleccionar una sucursal.");
      return;
    }

    const datosProfesor = {
      nombre: nombre.trim(),
      rut: rut.trim(),
      email: email.trim(),
      telefono: telefono.trim() || null,
      especialidad: especialidad.trim() || null,
      sucursalId: Number(sucursalId),
    };

    try {
      setGuardando(true);

      if (profesorEditandoId !== null) {
        await axios.put(
          `${API_PROFESORES}/${profesorEditandoId}`,
          datosProfesor
        );
        alert("Profesor actualizado correctamente.");
      } else {
        await axios.post(API_PROFESORES, datosProfesor);
        alert("Profesor registrado correctamente.");
      }

      await cargarProfesores();
      limpiarFormulario();
    } catch (error) {
      console.error("Error al guardar profesor:", error);
      alert("Ocurrió un error al guardar el profesor.");
    } finally {
      setGuardando(false);
    }
  };

  const editarProfesor = (profesor: Profesor) => {
    setNombre(profesor.nombre);
    setRut(profesor.rut);
    setEmail(profesor.email);
    setTelefono(profesor.telefono ?? "");
    setEspecialidad(profesor.especialidad ?? "");
    setSucursalId(
      profesor.sucursalId !== null
        ? String(profesor.sucursalId)
        : ""
    );
    setProfesorEditandoId(profesor.id);
    setProfesorDetalle(null);

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ACTIVAR / DESACTIVAR
  const cambiarEstado = async (profesor: Profesor) => {
    const nuevoEstado: EstadoProfesor =
      profesor.estado === "Activo" ? "Inactivo" : "Activo";

    try {
      await axios.put(`${API_PROFESORES}/${profesor.id}`, {
        estado: nuevoEstado,
      });

      await cargarProfesores();
      setProfesorDetalle(null);
    } catch (error) {
      console.error("Error al cambiar estado:", error);
      alert("No se pudo cambiar el estado del profesor.");
    }
  };

  // ELIMINAR
  const eliminarProfesor = async (id: number) => {
    if (!window.confirm("¿Seguro que deseas eliminar este profesor?")) {
      return;
    }

    try {
      await axios.delete(`${API_PROFESORES}/${id}`);

      if (profesorEditandoId === id) limpiarFormulario();
      if (profesorDetalle?.id === id) setProfesorDetalle(null);

      await cargarProfesores();
      alert("Profesor eliminado correctamente.");
    } catch (error) {
      console.error("Error al eliminar profesor:", error);
      alert("No se pudo eliminar el profesor.");
    }
  };

  // FILTROS
  const profesoresFiltrados = profesores.filter((profesor) => {
    const texto = busqueda.trim().toLowerCase();

    const coincideSucursal =
      sucursalFiltro === "todas" ||
      profesor.sucursalId === Number(sucursalFiltro);

    const coincideEstado =
      estadoFiltro === "todos" ||
      profesor.estado === estadoFiltro;

    const contenido = [
      profesor.nombre,
      profesor.rut,
      profesor.email,
      profesor.telefono ?? "",
      profesor.especialidad ?? "",
      profesor.sucursal?.nombre ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return (
      coincideSucursal &&
      coincideEstado &&
      contenido.includes(texto)
    );
  });

  const activos = profesores.filter(
    (profesor) => profesor.estado === "Activo"
  ).length;

  const inactivos = profesores.filter(
    (profesor) => profesor.estado === "Inactivo"
  ).length;

  const totalSinSucursal = profesores.filter(
    (profesor) => profesor.sucursalId === null
  ).length;

  const nombreSucursal = (profesor: Profesor) =>
    profesor.sucursal?.nombre ||
    sucursales.find((s) => s.id === profesor.sucursalId)?.nombre ||
    "Sin sucursal";

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        Cargando...
      </main>
    );
  }

  if (!usuario || usuario.rol !== "admin") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        Verificando acceso...
      </main>
    );
  }

  return (
    <main
      className="min-h-screen px-4 py-8 text-white sm:px-6 lg:px-10"
      style={{ backgroundColor: colores.fondo }}
    >
      <div className="mx-auto max-w-7xl">
        {/* ENCABEZADO */}
        <header className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <p
              className="mb-2 text-xs font-bold uppercase tracking-[0.25em]"
              style={{ color: colores.principal }}
            >
              Panel administrativo
            </p>

            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              Gestión de{" "}
              <span style={{ color: colores.principal }}>
                Profesores
              </span>
            </h1>

            <p
              className="mt-3 max-w-xl text-sm leading-relaxed"
              style={{ color: colores.secundario }}
            >
              Administra el equipo de profesionales, sus
              especialidades y sucursales.
            </p>
          </div>

          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-xl border px-5 py-3 text-sm font-semibold transition-opacity hover:opacity-80"
            style={{
              backgroundColor: colores.superficie,
              borderColor: colores.borde,
            }}
          >
            ← Volver al panel
          </Link>
        </header>

        {/* RESUMEN */}
        <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Resumen titulo="Total profesores" valor={profesores.length} />
          <Resumen titulo="Activos" valor={activos} />
          <Resumen titulo="Inactivos" valor={inactivos} />
          <Resumen titulo="Sin sucursal" valor={totalSinSucursal} />
        </section>

        {errorCarga && (
          <div
            role="alert"
            className="mb-6 rounded-xl border p-4 text-sm"
            style={{
              borderColor: colores.principal,
              backgroundColor: colores.superficie,
            }}
          >
            {errorCarga}
          </div>
        )}

        {/* FORMULARIO + LISTADO */}
        <section className="grid items-start gap-7 xl:grid-cols-[340px_minmax(0,1fr)]">
          {/* FORMULARIO */}
          <div
            className="rounded-2xl border p-6"
            style={{
              backgroundColor: colores.superficie,
              borderColor: colores.borde,
            }}
          >
            <div className="mb-6">
              <p
                className="mb-2 text-xs font-bold uppercase tracking-wider"
                style={{ color: colores.principal }}
              >
                {profesorEditandoId !== null
                  ? "Edición de registro"
                  : "Nuevo registro"}
              </p>

              <h2 className="text-xl font-bold">
                {profesorEditandoId !== null
                  ? "Editar profesor"
                  : "Registrar profesor"}
              </h2>

              <p
                className="mt-2 text-sm"
                style={{ color: colores.secundario }}
              >
                {profesorEditandoId !== null
                  ? "Actualiza los datos del profesional."
                  : "Completa la información del profesional."}
              </p>
            </div>

            <form onSubmit={guardarProfesor} className="space-y-4">
              <Campo
                label="Nombre completo"
                value={nombre}
                onChange={setNombre}
                placeholder="Ej: Pedro González"
              />

              <Campo
                label="RUT"
                value={rut}
                onChange={setRut}
                placeholder="Ej: 12.345.678-9"
              />

              <Campo
                label="Correo electrónico"
                value={email}
                onChange={setEmail}
                type="email"
                placeholder="correo@ejemplo.cl"
              />

              <Campo
                label="Teléfono"
                value={telefono}
                onChange={setTelefono}
                placeholder="+56 9 1234 5678"
                required={false}
              />

              <Campo
                label="Especialidad"
                value={especialidad}
                onChange={setEspecialidad}
                placeholder="Ej: Entrenamiento funcional"
                required={false}
              />

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Sucursal
                </label>

                <select
                  value={sucursalId}
                  onChange={(e) => setSucursalId(e.target.value)}
                  required
                  className={campoClase}
                  style={{ borderColor: colores.borde }}
                >
                  <option value="">Seleccionar sucursal</option>
                  {sucursales.map((sucursal) => (
                    <option key={sucursal.id} value={sucursal.id}>
                      {sucursal.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* FOTOGRAFÍA FUTURA */}
              <div
                className="rounded-xl border border-dashed p-4"
                style={{
                  borderColor: colores.borde,
                  backgroundColor: colores.superficie2,
                }}
              >
                <p className="text-sm font-semibold">
                  Fotografía del profesor
                </p>
                <p
                  className="mt-1 text-xs leading-relaxed"
                  style={{ color: colores.secundario }}
                >
                  Próximamente podrás agregar una fotografía.
                  Por ahora se mostrará un avatar con iniciales.
                </p>
              </div>

              <button
                type="submit"
                disabled={guardando}
                className="w-full rounded-xl px-5 py-3.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: colores.principal }}
              >
                {guardando
                  ? "Guardando..."
                  : profesorEditandoId !== null
                    ? "Guardar cambios"
                    : "Registrar profesor"}
              </button>

              <button
                type="button"
                onClick={limpiarFormulario}
                className="w-full rounded-xl border px-5 py-3 text-sm font-semibold transition-opacity hover:opacity-80"
                style={{
                  backgroundColor: colores.superficie2,
                  borderColor: colores.borde,
                }}
              >
                {profesorEditandoId !== null
                  ? "Cancelar edición"
                  : "Limpiar formulario"}
              </button>
            </form>
          </div>

          {/* LISTADO */}
          <div
            className="min-w-0 overflow-hidden rounded-2xl border"
            style={{
              backgroundColor: colores.superficie,
              borderColor: colores.borde,
            }}
          >
            <div
              className="border-b p-5 md:p-6"
              style={{ borderColor: colores.borde }}
            >
              <h2 className="text-xl font-bold">
                Profesores registrados
              </h2>

              <p
                className="mt-1 text-sm"
                style={{ color: colores.secundario }}
              >
                Mostrando {profesoresFiltrados.length} de{" "}
                {profesores.length} profesores
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar profesor..."
                  aria-label="Buscar profesor"
                  className={campoClase}
                  style={{ borderColor: colores.borde }}
                />

                <select
                  value={sucursalFiltro}
                  onChange={(e) => setSucursalFiltro(e.target.value)}
                  aria-label="Filtrar por sucursal"
                  className={campoClase}
                  style={{ borderColor: colores.borde }}
                >
                  <option value="todas">Todas las sucursales</option>
                  {sucursales.map((sucursal) => (
                    <option key={sucursal.id} value={sucursal.id}>
                      {sucursal.nombre}
                    </option>
                  ))}
                </select>

                <select
                  value={estadoFiltro}
                  onChange={(e) => setEstadoFiltro(e.target.value)}
                  aria-label="Filtrar por estado"
                  className={campoClase}
                  style={{ borderColor: colores.borde }}
                >
                  <option value="todos">Todos los estados</option>
                  <option value="Activo">Activos</option>
                  <option value="Inactivo">Inactivos</option>
                </select>
              </div>
            </div>

            {cargandoProfesores ? (
              <p className="p-10 text-center text-sm text-gray-400">
                Cargando profesores...
              </p>
            ) : profesoresFiltrados.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-lg font-semibold">
                  No se encontraron profesores
                </p>
                <p
                  className="mt-2 text-sm"
                  style={{ color: colores.secundario }}
                >
                  Prueba con otra búsqueda o revisa los filtros.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 p-4 md:p-6">
                {profesoresFiltrados.map((profesor) => (
                  <article
                    key={profesor.id}
                    className="rounded-xl border p-4 transition-colors md:p-5"
                    style={{
                      backgroundColor: colores.superficie2,
                      borderColor: colores.borde,
                    }}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <AvatarProfesor nombre={profesor.nombre} />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="wrap-break-word text-lg font-bold">
                            {profesor.nombre}
                          </h3>

                          <span
                            className="rounded-full border px-3 py-1 text-xs font-semibold"
                            style={{
                              borderColor: colores.borde,
                              backgroundColor:
                                profesor.estado === "Activo"
                                  ? colores.principal
                                  : colores.superficie,
                              color: "#ffffff",
                            }}
                          >
                            {profesor.estado}
                          </span>
                        </div>

                        <p
                          className="mt-1 break-all text-sm"
                          style={{ color: colores.secundario }}
                        >
                          {profesor.email}
                        </p>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <Dato
                            titulo="Especialidad"
                            valor={profesor.especialidad || "No informada"}
                          />
                          <Dato
                            titulo="Sucursal"
                            valor={nombreSucursal(profesor)}
                          />
                        </div>
                      </div>
                    </div>

                    <div
                      className="mt-5 flex flex-wrap gap-2 border-t pt-4"
                      style={{ borderColor: colores.borde }}
                    >
                      <Accion
                        texto="Ver detalles"
                        onClick={() => setProfesorDetalle(profesor)}
                      />
                      <Accion
                        texto="Editar"
                        onClick={() => editarProfesor(profesor)}
                      />
                      <Accion
                        texto={
                          profesor.estado === "Activo"
                            ? "Desactivar"
                            : "Activar"
                        }
                        onClick={() => cambiarEstado(profesor)}
                      />
                      <Accion
                        texto="Eliminar"
                        onClick={() => eliminarProfesor(profesor.id)}
                        peligro
                      />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* MODAL DE DETALLES */}
      {profesorDetalle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setProfesorDetalle(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-profesor"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border p-6 md:p-8"
            style={{
              backgroundColor: colores.superficie,
              borderColor: colores.borde,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <AvatarProfesor
                  nombre={profesorDetalle.nombre}
                  grande
                />

                <div>
                  <p
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: colores.principal }}
                  >
                    Perfil del profesor
                  </p>

                  <h2
                    id="titulo-profesor"
                    className="mt-1 text-xl font-bold"
                  >
                    {profesorDetalle.nombre}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setProfesorDetalle(null)}
                aria-label="Cerrar detalles"
                className="text-xl text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Dato titulo="RUT" valor={profesorDetalle.rut} />
              <Dato titulo="Correo" valor={profesorDetalle.email} />
              <Dato titulo="Teléfono" valor={profesorDetalle.telefono} />
              <Dato
                titulo="Especialidad"
                valor={profesorDetalle.especialidad}
              />
              <Dato
                titulo="Sucursal"
                valor={nombreSucursal(profesorDetalle)}
              />
              <Dato titulo="Estado" valor={profesorDetalle.estado} />
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => editarProfesor(profesorDetalle)}
                className="rounded-xl px-4 py-3 text-sm font-bold text-white"
                style={{ backgroundColor: colores.principal }}
              >
                Editar profesor
              </button>

              <button
                type="button"
                onClick={() => setProfesorDetalle(null)}
                className="rounded-xl border px-4 py-3 text-sm font-semibold"
                style={{
                  borderColor: colores.borde,
                  backgroundColor: colores.superficie2,
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Campo({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={campoClase}
        style={{ borderColor: colores.borde }}
      />
    </div>
  );
}

function Resumen({
  titulo,
  valor,
}: {
  titulo: string;
  valor: number;
}) {
  return (
    <div
      className="rounded-2xl border p-5"
      style={{
        backgroundColor: colores.superficie,
        borderColor: colores.borde,
      }}
    >
      <p
        className="text-sm"
        style={{ color: colores.secundario }}
      >
        {titulo}
      </p>

      <p
        className="mt-2 text-3xl font-black"
        style={{ color: colores.principal }}
      >
        {valor}
      </p>
    </div>
  );
}

function Dato({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string | null | undefined;
}) {
  return (
    <div>
      <p
        className="mb-1 text-xs uppercase tracking-wider"
        style={{ color: colores.secundario }}
      >
        {titulo}
      </p>

      <p className="wrap-break-word text-sm font-semibold">
        {valor || "No informado"}
      </p>
    </div>
  );
}

function Accion({
  texto,
  onClick,
  peligro = false,
}: {
  texto: string;
  onClick: () => void;
  peligro?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border px-3 py-2 text-xs font-semibold transition-opacity hover:opacity-75"
      style={{
        borderColor: peligro ? colores.principal : colores.borde,
        color: peligro ? "#ffffff" : colores.secundario,
        backgroundColor: peligro
          ? colores.principal
          : colores.superficie,
      }}
    >
      {texto}
    </button>
  );
}
