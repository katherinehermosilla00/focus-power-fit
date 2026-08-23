"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

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

const API_PROFESORES =
  "http://localhost:3001/api/profesores";

const API_SUCURSALES =
  "http://localhost:3001/api/sucursales";

export default function ProfesoresPage() {
  const router = useRouter();

  const {
    usuario,
    cargando,
  } = useAuth();

  const [profesores, setProfesores] =
    useState<Profesor[]>([]);

  const [sucursales, setSucursales] =
    useState<Sucursal[]>([]);

  const [nombre, setNombre] =
    useState("");

  const [rut, setRut] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [telefono, setTelefono] =
    useState("");

  const [especialidad, setEspecialidad] =
    useState("");

  const [sucursalId, setSucursalId] =
    useState("");

  const [busqueda, setBusqueda] =
    useState("");

  const [sucursalFiltro, setSucursalFiltro] =
    useState("todas");

  const [
    profesorEditandoId,
    setProfesorEditandoId,
  ] =
    useState<number | null>(null);

  const [
    profesorDetalle,
    setProfesorDetalle,
  ] =
    useState<Profesor | null>(null);

  const [
    cargandoProfesores,
    setCargandoProfesores,
  ] =
    useState(true);

  /*
   * PROTECCIÓN DE RUTA
   */
  useEffect(() => {
    if (cargando) {
      return;
    }

    if (!usuario) {
      router.replace("/login");
      return;
    }

    if (usuario.rol !== "admin") {
      router.replace("/mi-cuenta");
    }
  }, [
    usuario,
    cargando,
    router,
  ]);

  /*
   * CARGAR PROFESORES + SUCURSALES
   */
  useEffect(() => {
    if (
      cargando ||
      !usuario ||
      usuario.rol !== "admin"
    ) {
      return;
    }

    const cargarDatos = async () => {
      try {
        setCargandoProfesores(true);

        const [
          respuestaProfesores,
          respuestaSucursales,
        ] = await Promise.all([
          axios.get<Profesor[]>(
            API_PROFESORES
          ),

          axios.get<Sucursal[]>(
            API_SUCURSALES
          ),
        ]);

        setProfesores(
          respuestaProfesores.data
        );

        setSucursales(
          respuestaSucursales.data
        );
      } catch (error) {
        console.error(
          "Error al cargar datos:",
          error
        );

        alert(
          "No se pudieron cargar los profesores o las sucursales."
        );
      } finally {
        setCargandoProfesores(false);
      }
    };

    cargarDatos();
  }, [
    cargando,
    usuario,
  ]);

  /*
   * RECARGAR PROFESORES
   */
  const cargarProfesores = async () => {
    try {
      const respuesta =
        await axios.get<Profesor[]>(
          API_PROFESORES
        );

      setProfesores(
        respuesta.data
      );
    } catch (error) {
      console.error(
        "Error al cargar profesores:",
        error
      );
    }
  };

  /*
   * LIMPIAR FORMULARIO
   */
  const limpiarFormulario = () => {
    setNombre("");
    setRut("");
    setEmail("");
    setTelefono("");
    setEspecialidad("");
    setSucursalId("");

    setProfesorEditandoId(null);
  };

  /*
   * REGISTRAR / EDITAR
   */
  const guardarProfesor = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    const correoExiste = profesores.some(
      (profesor) =>
        profesor.email
          .toLowerCase() ===
          email.toLowerCase() &&
        profesor.id !== profesorEditandoId
    );

    if (correoExiste) {
      alert(
        "Ya existe un profesor con ese correo."
      );
      return;
    }

    const rutExiste = profesores.some(
      (profesor) =>
        profesor.rut
          .toLowerCase() ===
          rut.toLowerCase() &&
        profesor.id !== profesorEditandoId
    );

    if (rutExiste) {
      alert(
        "Ya existe un profesor con ese RUT."
      );
      return;
    }

    if (!sucursalId) {
      alert(
        "Debes seleccionar una sucursal."
      );
      return;
    }

    const datosProfesor = {
      nombre:
        nombre.trim(),

      rut:
        rut.trim(),

      email:
        email.trim(),

      telefono:
        telefono.trim() || null,

      especialidad:
        especialidad.trim() || null,

      sucursalId:
        Number(sucursalId),
    };

    try {
      /*
       * EDITAR
       */
      if (
        profesorEditandoId !== null
      ) {
        await axios.put(
          `${API_PROFESORES}/${profesorEditandoId}`,
          datosProfesor
        );

        alert(
          "Profesor actualizado correctamente."
        );

        limpiarFormulario();

        await cargarProfesores();

        return;
      }

      /*
       * CREAR
       */
      await axios.post(
        API_PROFESORES,
        datosProfesor
      );

      alert(
        "Profesor registrado correctamente."
      );

      limpiarFormulario();

      await cargarProfesores();

    } catch (error) {
      console.error(
        "Error al guardar profesor:",
        error
      );

      alert(
        "Ocurrió un error al guardar el profesor."
      );
    }
  };

  /*
   * EDITAR PROFESOR
   */
  const editarProfesor = (
    profesor: Profesor
  ) => {
    setNombre(
      profesor.nombre
    );

    setRut(
      profesor.rut
    );

    setEmail(
      profesor.email
    );

    setTelefono(
      profesor.telefono ?? ""
    );

    setEspecialidad(
      profesor.especialidad ?? ""
    );

    setSucursalId(
      profesor.sucursalId
        ? String(
            profesor.sucursalId
          )
        : ""
    );

    setProfesorEditandoId(
      profesor.id
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const cancelarEdicion = () => {
    limpiarFormulario();
  };

  /*
   * ACTIVAR / DESACTIVAR
   */
  const cambiarEstado = async (
    profesor: Profesor
  ) => {
    const nuevoEstado:
      EstadoProfesor =
        profesor.estado === "Activo"
          ? "Inactivo"
          : "Activo";

    try {
      await axios.put(
        `${API_PROFESORES}/${profesor.id}`,
        {
          estado: nuevoEstado,
        }
      );

      await cargarProfesores();

    } catch (error) {
      console.error(
        "Error al cambiar estado:",
        error
      );

      alert(
        "No se pudo cambiar el estado del profesor."
      );
    }
  };

  /*
   * ELIMINAR
   */
  const eliminarProfesor = async (
    id: number
  ) => {
    const confirmar =
      window.confirm(
        "¿Seguro que deseas eliminar este profesor?"
      );

    if (!confirmar) {
      return;
    }

    try {
      await axios.delete(
        `${API_PROFESORES}/${id}`
      );

      if (
        profesorEditandoId === id
      ) {
        limpiarFormulario();
      }

      if (
        profesorDetalle?.id === id
      ) {
        setProfesorDetalle(null);
      }

      await cargarProfesores();

      alert(
        "Profesor eliminado correctamente."
      );

    } catch (error) {
      console.error(
        "Error al eliminar profesor:",
        error
      );

      alert(
        "No se pudo eliminar el profesor."
      );
    }
  };

  /*
   * FILTRO + BUSCADOR
   */
  const profesoresFiltrados =
    profesores.filter(
      (profesor) => {
        const texto =
          busqueda
            .trim()
            .toLowerCase();

        const coincideSucursal =
          sucursalFiltro ===
            "todas" ||
          profesor.sucursalId ===
            Number(
              sucursalFiltro
            );

        const coincideBusqueda =
          !texto ||

          profesor.nombre
            .toLowerCase()
            .includes(texto) ||

          profesor.rut
            .toLowerCase()
            .includes(texto) ||

          profesor.email
            .toLowerCase()
            .includes(texto) ||

          (profesor.telefono ?? "")
            .toLowerCase()
            .includes(texto) ||

          (profesor.especialidad ?? "")
            .toLowerCase()
            .includes(texto) ||

          (profesor.sucursal?.nombre ?? "")
            .toLowerCase()
            .includes(texto);

        return (
          coincideSucursal &&
          coincideBusqueda
        );
      }
    );

  /*
   * CONTADORES
   */
  const totalPenalolen =
    profesores.filter(
      (profesor) =>
        profesor.sucursalId === 1
    ).length;

  const totalLaReina =
    profesores.filter(
      (profesor) =>
        profesor.sucursalId === 2
    ).length;

  const totalSinSucursal =
    profesores.filter(
      (profesor) =>
        profesor.sucursalId === null
    ).length;

  /*
   * CARGANDO
   */
  if (cargando) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>
          Cargando...
        </p>
      </main>
    );
  }

  /*
   * SIN PERMISOS
   */
  if (
    !usuario ||
    usuario.rol !== "admin"
  ) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>
          Verificando acceso...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-10">

      {/* HEADER */}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">

        <div>

          <p className="text-gray-400">
            Panel administrativo
          </p>

          <h1 className="text-4xl font-black mt-1">

            Gestión de{" "}

            <span className="text-red-600">
              Profesores
            </span>

          </h1>

          <p className="text-gray-400 mt-2">
            Registra, consulta y administra los profesores de Focus Power Fit.
          </p>

        </div>

        <Link
          href="/admin"
          className="bg-zinc-900 border border-zinc-700 hover:border-red-600 px-5 py-3 rounded-xl font-bold transition"
        >
          Volver al panel
        </Link>

      </header>

      {/* RESUMEN */}

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

        <Resumen
          titulo="Total profesores"
          valor={profesores.length}
        />

        <Resumen
          titulo="Peñalolén"
          valor={totalPenalolen}
        />

        <Resumen
          titulo="La Reina"
          valor={totalLaReina}
        />

        <Resumen
          titulo="Sin sucursal"
          valor={totalSinSucursal}
        />

      </section>

      {/* FORMULARIO + LISTADO */}

      <section className="grid lg:grid-cols-3 gap-8">

        {/* FORMULARIO */}

        <div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">

            <h2 className="text-2xl font-bold mb-2">

              {profesorEditandoId !== null
                ? "Editar profesor"
                : "Registrar profesor"}

            </h2>

            {profesorEditandoId !== null ? (

              <p className="text-yellow-500 text-sm mb-6">
                Estás modificando un profesor existente.
              </p>

            ) : (

              <p className="text-gray-400 text-sm mb-6">
                Ingresa los datos del profesor.
              </p>

            )}

            <form
              onSubmit={guardarProfesor}
              className="space-y-5"
            >

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
                placeholder="Ej: Personal Training"
                required={false}
              />

              {/* SUCURSAL */}

              <div>

                <label className="block mb-2 font-semibold">
                  Sucursal
                </label>

                <select
                  value={sucursalId}
                  onChange={(e) =>
                    setSucursalId(
                      e.target.value
                    )
                  }
                  required
                  className="w-full bg-black border border-zinc-700 rounded-lg p-3 outline-none focus:border-red-600"
                >

                  <option value="">
                    Seleccionar sucursal
                  </option>

                  {sucursales.map(
                    (sucursal) => (

                      <option
                        key={sucursal.id}
                        value={sucursal.id}
                      >
                        {sucursal.nombre}
                      </option>

                    )
                  )}

                </select>

              </div>

              <button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 transition py-3 rounded-xl font-bold"
              >

                {profesorEditandoId !== null
                  ? "Guardar cambios"
                  : "Registrar profesor"}

              </button>

              {profesorEditandoId !== null ? (

                <button
                  type="button"
                  onClick={
                    cancelarEdicion
                  }
                  className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 py-3 rounded-xl"
                >
                  Cancelar edición
                </button>

              ) : (

                <button
                  type="button"
                  onClick={
                    limpiarFormulario
                  }
                  className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 py-3 rounded-xl"
                >
                  Limpiar formulario
                </button>

              )}

            </form>

          </div>

        </div>

        {/* LISTADO */}

        <div className="lg:col-span-2">

          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">

            <div className="p-6 border-b border-zinc-800">

              <div className="flex flex-col gap-4">

                <div>

                  <h2 className="text-2xl font-bold">
                    Profesores registrados
                  </h2>

                  <p className="text-gray-400 mt-1">
                    Mostrando:{" "}
                    {profesoresFiltrados.length}
                    {" "}de{" "}
                    {profesores.length}
                  </p>

                </div>

                <div className="grid md:grid-cols-2 gap-3">

                  <select
                    value={
                      sucursalFiltro
                    }
                    onChange={(e) =>
                      setSucursalFiltro(
                        e.target.value
                      )
                    }
                    className="bg-black border border-zinc-700 rounded-lg px-4 py-3 outline-none focus:border-red-600"
                  >

                    <option value="todas">
                      Todas las sucursales
                    </option>

                    {sucursales.map(
                      (sucursal) => (

                        <option
                          key={
                            sucursal.id
                          }
                          value={
                            String(
                              sucursal.id
                            )
                          }
                        >
                          {sucursal.nombre}
                        </option>

                      )
                    )}

                  </select>

                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) =>
                      setBusqueda(
                        e.target.value
                      )
                    }
                    placeholder="Buscar profesor..."
                    className="bg-black border border-zinc-700 rounded-lg px-4 py-3 outline-none focus:border-red-600"
                  />

                </div>

              </div>

            </div>

            {cargandoProfesores ? (

              <div className="p-10 text-center text-gray-400">
                Cargando profesores...
              </div>

            ) : profesoresFiltrados.length === 0 ? (

              <div className="p-10 text-center text-gray-400">
                No se encontraron profesores.
              </div>

            ) : (

              <div className="overflow-x-auto">

                <table className="w-full text-left">

                  <thead className="bg-zinc-900">

                    <tr>

                      <th className="p-4">
                        Nombre
                      </th>

                      <th className="p-4">
                        RUT
                      </th>

                      <th className="p-4">
                        Sucursal
                      </th>

                      <th className="p-4">
                        Especialidad
                      </th>

                      <th className="p-4">
                        Estado
                      </th>

                      <th className="p-4">
                        Acciones
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {profesoresFiltrados.map(
                      (profesor) => (

                        <tr
                          key={profesor.id}
                          className="border-t border-zinc-800 hover:bg-zinc-900/50"
                        >

                          <td className="p-4">

                            <p className="font-semibold">
                              {profesor.nombre}
                            </p>

                            <p className="text-gray-500 text-sm">
                              {profesor.email}
                            </p>

                          </td>

                          <td className="p-4 text-gray-300">
                            {profesor.rut}
                          </td>

                          <td className="p-4">

                            <span className="text-red-400 font-semibold">
                              {profesor
                                .sucursal
                                ?.nombre ||
                                "Sin sucursal"}
                            </span>

                          </td>

                          <td className="p-4 text-gray-300">
                            {profesor.especialidad ||
                              "No informada"}
                          </td>

                          <td className="p-4">

                            <span
                              className={
                                profesor.estado ===
                                "Activo"
                                  ? "text-green-500 font-bold"
                                  : "text-gray-500 font-bold"
                              }
                            >
                              {profesor.estado}
                            </span>

                          </td>

                          <td className="p-4">

                            <div className="flex flex-wrap gap-2">

                              <button
                                onClick={() =>
                                  setProfesorDetalle(
                                    profesor
                                  )
                                }
                                className="border border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white px-3 py-2 rounded-lg transition"
                              >
                                Ver
                              </button>

                              <button
                                onClick={() =>
                                  editarProfesor(
                                    profesor
                                  )
                                }
                                className="border border-yellow-600 text-yellow-400 hover:bg-yellow-600 hover:text-black px-3 py-2 rounded-lg transition"
                              >
                                Editar
                              </button>

                              <button
                                onClick={() =>
                                  cambiarEstado(
                                    profesor
                                  )
                                }
                                className="border border-red-600 text-red-500 hover:bg-red-600 hover:text-white px-3 py-2 rounded-lg transition"
                              >

                                {profesor.estado ===
                                "Activo"
                                  ? "Desactivar"
                                  : "Activar"}

                              </button>

                              <button
                                onClick={() =>
                                  eliminarProfesor(
                                    profesor.id
                                  )
                                }
                                className="border border-zinc-600 text-gray-300 hover:bg-zinc-800 px-3 py-2 rounded-lg transition"
                              >
                                Eliminar
                              </button>

                            </div>

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            )}

          </div>

        </div>

      </section>

      {/* DETALLE PROFESOR */}

      {profesorDetalle && (

        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">

          <div className="bg-zinc-950 border border-red-600 rounded-2xl max-w-lg w-full p-7">

            <div className="flex items-start justify-between gap-4 mb-6">

              <div>

                <p className="text-gray-400">
                  Información del profesor
                </p>

                <h2 className="text-3xl font-black">
                  {profesorDetalle.nombre}
                </h2>

              </div>

              <button
                onClick={() =>
                  setProfesorDetalle(null)
                }
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>

            </div>

            <div className="space-y-4">

              <Detalle
                titulo="RUT"
                valor={
                  profesorDetalle.rut
                }
              />

              <Detalle
                titulo="Correo electrónico"
                valor={
                  profesorDetalle.email
                }
              />

              <Detalle
                titulo="Teléfono"
                valor={
                  profesorDetalle.telefono
                }
              />

              <Detalle
                titulo="Especialidad"
                valor={
                  profesorDetalle.especialidad
                }
              />

              <Detalle
                titulo="Sucursal"
                valor={
                  profesorDetalle
                    .sucursal
                    ?.nombre
                }
              />

              <Detalle
                titulo="Estado"
                valor={
                  profesorDetalle.estado
                }
              />

            </div>

            <div className="grid grid-cols-2 gap-3 mt-7">

              <button
                onClick={() => {
                  editarProfesor(
                    profesorDetalle
                  );

                  setProfesorDetalle(
                    null
                  );
                }}
                className="bg-red-600 hover:bg-red-700 py-3 rounded-xl font-bold"
              >
                Editar profesor
              </button>

              <button
                onClick={() =>
                  setProfesorDetalle(null)
                }
                className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 py-3 rounded-xl"
              >
                Cerrar
              </button>

            </div>

          </div>

        </div>

      )}

      {/* BASE DE DATOS */}

      <section className="mt-8 bg-zinc-950 border border-zinc-800 rounded-2xl p-6">

        <h2 className="text-xl text-red-500 font-bold mb-2">
          Base de datos
        </h2>

        <p className="text-gray-400">
          Los profesores se almacenan en MySQL y
          pueden asociarse a su sucursal correspondiente.
        </p>

      </section>

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
  onChange: (
    value: string
  ) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>

      <label className="block mb-2 font-semibold">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        placeholder={placeholder}
        required={required}
        className="w-full bg-black border border-zinc-700 rounded-lg p-3 outline-none focus:border-red-600"
      />

    </div>
  );
}

function Detalle({
  titulo,
  valor,
}: {
  titulo: string;
  valor:
    | string
    | null
    | undefined;
}) {
  return (
    <div className="bg-black border border-zinc-800 rounded-xl p-4">

      <p className="text-gray-500 text-sm mb-1">
        {titulo}
      </p>

      <p className="font-semibold">
        {valor || "No informado"}
      </p>

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
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5">

      <p className="text-gray-400">
        {titulo}
      </p>

      <p className="text-3xl font-black text-red-500 mt-1">
        {valor}
      </p>

    </div>
  );
}