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

type EstadoCliente = "Activo" | "Inactivo";

type Sucursal = {
  id: number;
  nombre: string;
  comuna: string | null;
  estado: "Activa" | "Inactiva";
};

type Cliente = {
  id: number;

  sucursalId: number | null;

  numeroCliente: string | null;

  nombres: string | null;
  apellidos: string | null;
  nombre: string;

  rut: string | null;
  email: string | null;

  telefono: string | null;
  telefonoSecundario: string | null;

  direccion: string | null;
  comuna: string | null;
  ciudad: string | null;

  edad: number | null;
  genero: string | null;

  fechaNacimiento: string | null;
  fechaCreacionOrigen: string | null;

  plan: string | null;

  estado: EstadoCliente;

  sucursal?: Sucursal | null;
};

const API_CLIENTES =
  "http://localhost:3001/api/clientes";

const API_SUCURSALES =
  "http://localhost:3001/api/sucursales";

export default function ClientesPage() {
  const router = useRouter();

  const {
    usuario,
    cargando,
  } = useAuth();

  /*
   * DATOS PRINCIPALES
   */

  const [clientes, setClientes] =
    useState<Cliente[]>([]);

  const [sucursales, setSucursales] =
    useState<Sucursal[]>([]);

  /*
   * FORMULARIO
   */

  const [nombre, setNombre] =
    useState("");

  const [rut, setRut] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [telefono, setTelefono] =
    useState("");

  const [plan, setPlan] =
    useState("");

  const [sucursalId, setSucursalId] =
    useState("");

  /*
   * BUSCADOR Y FILTROS
   */

  const [busqueda, setBusqueda] =
    useState("");

  const [sucursalFiltro, setSucursalFiltro] =
    useState("todas");

  /*
   * EDICIÓN Y DETALLE
   */

  const [
    clienteEditandoId,
    setClienteEditandoId,
  ] =
    useState<number | null>(null);

  const [
    clienteDetalle,
    setClienteDetalle,
  ] =
    useState<Cliente | null>(null);

  const [
    cargandoClientes,
    setCargandoClientes,
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
   * CARGAR DATOS
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
        setCargandoClientes(true);

        const [
          respuestaClientes,
          respuestaSucursales,
        ] = await Promise.all([
          axios.get<Cliente[]>(
            API_CLIENTES
          ),

          axios.get<Sucursal[]>(
            API_SUCURSALES
          ),
        ]);

        setClientes(
          respuestaClientes.data
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
          "No se pudieron cargar los clientes o las sucursales."
        );
      } finally {
        setCargandoClientes(false);
      }
    };

    cargarDatos();
  }, [
    cargando,
    usuario,
  ]);

  /*
   * RECARGAR CLIENTES
   */

  const cargarClientes = async () => {
    try {
      const respuesta =
        await axios.get<Cliente[]>(
          API_CLIENTES
        );

      setClientes(
        respuesta.data
      );
    } catch (error) {
      console.error(
        "Error al cargar clientes:",
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
    setPlan("");
    setSucursalId("");

    setClienteEditandoId(null);
  };

  /*
   * REGISTRAR / EDITAR
   */

  const guardarCliente = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!nombre.trim()) {
      alert(
        "Debes ingresar el nombre del cliente."
      );

      return;
    }

    if (!sucursalId) {
      alert(
        "Debes seleccionar una sucursal."
      );

      return;
    }

    /*
     * Ya no validamos RUT/email como únicos
     * globalmente porque existen clientes que
     * aparecen en más de una sucursal.
     */

    const datosCliente = {
      nombre: nombre.trim(),

      /*
       * El modelo nuevo también utiliza
       * nombres. Por ahora usamos el nombre
       * completo para mantener compatibilidad.
       */
      nombres: nombre.trim(),

      rut:
        rut.trim() || null,

      email:
        email.trim() || null,

      telefono:
        telefono.trim() || null,

      plan:
        plan || null,

      sucursalId:
        Number(sucursalId),
    };

    try {
      /*
       * EDITAR
       */

      if (
        clienteEditandoId !== null
      ) {
        await axios.put(
          `${API_CLIENTES}/${clienteEditandoId}`,
          datosCliente
        );

        alert(
          "Cliente actualizado correctamente."
        );

        limpiarFormulario();

        await cargarClientes();

        return;
      }

      /*
       * CREAR
       */

      await axios.post(
        API_CLIENTES,
        datosCliente
      );

      alert(
        "Cliente registrado correctamente."
      );

      limpiarFormulario();

      await cargarClientes();

    } catch (error) {
      console.error(
        "Error al guardar cliente:",
        error
      );

      alert(
        "Ocurrió un error al guardar el cliente."
      );
    }
  };

  /*
   * EDITAR CLIENTE
   */

  const editarCliente = (
    cliente: Cliente
  ) => {
    setNombre(
      cliente.nombre ?? ""
    );

    setRut(
      cliente.rut ?? ""
    );

    setEmail(
      cliente.email ?? ""
    );

    setTelefono(
      cliente.telefono ?? ""
    );

    setPlan(
      cliente.plan ?? ""
    );

    setSucursalId(
      cliente.sucursalId
        ? String(
            cliente.sucursalId
          )
        : ""
    );

    setClienteEditandoId(
      cliente.id
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
    cliente: Cliente
  ) => {
    const nuevoEstado:
      EstadoCliente =
        cliente.estado === "Activo"
          ? "Inactivo"
          : "Activo";

    try {
      await axios.put(
        `${API_CLIENTES}/${cliente.id}`,
        {
          estado: nuevoEstado,
        }
      );

      await cargarClientes();

    } catch (error) {
      console.error(
        "Error al cambiar estado:",
        error
      );

      alert(
        "No se pudo cambiar el estado del cliente."
      );
    }
  };

  /*
   * ELIMINAR
   */

  const eliminarCliente = async (
    id: number
  ) => {
    const confirmar =
      window.confirm(
        "¿Seguro que deseas eliminar este cliente?"
      );

    if (!confirmar) {
      return;
    }

    try {
      await axios.delete(
        `${API_CLIENTES}/${id}`
      );

      if (
        clienteEditandoId === id
      ) {
        limpiarFormulario();
      }

      if (
        clienteDetalle?.id === id
      ) {
        setClienteDetalle(null);
      }

      await cargarClientes();

      alert(
        "Cliente eliminado correctamente."
      );

    } catch (error) {
      console.error(
        "Error al eliminar cliente:",
        error
      );

      alert(
        "No se pudo eliminar el cliente."
      );
    }
  };

  /*
   * BUSCADOR + FILTRO SUCURSAL
   */

  const clientesFiltrados =
    clientes.filter(
      (cliente) => {
        const texto =
          busqueda
            .trim()
            .toLowerCase();

        const coincideSucursal =
          sucursalFiltro ===
            "todas" ||
          cliente.sucursalId ===
            Number(
              sucursalFiltro
            );

        const coincideBusqueda =
          !texto ||

          (cliente.nombre ?? "")
            .toLowerCase()
            .includes(texto) ||

          (cliente.rut ?? "")
            .toLowerCase()
            .includes(texto) ||

          (cliente.email ?? "")
            .toLowerCase()
            .includes(texto) ||

          (cliente.telefono ?? "")
            .toLowerCase()
            .includes(texto) ||

          (cliente.plan ?? "")
            .toLowerCase()
            .includes(texto) ||

          (cliente.numeroCliente ?? "")
            .toLowerCase()
            .includes(texto) ||

          (cliente.sucursal?.nombre ?? "")
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
    clientes.filter(
      (cliente) =>
        cliente.sucursalId === 1
    ).length;

  const totalLaReina =
    clientes.filter(
      (cliente) =>
        cliente.sucursalId === 2
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
              Clientes
            </span>

          </h1>

          <p className="text-gray-400 mt-2">
            Registra, consulta y administra los clientes de Focus Power Fit.
          </p>

        </div>

        <Link
          href="/admin"
          className="bg-zinc-900 border border-zinc-700 hover:border-red-600 px-5 py-3 rounded-xl font-bold transition"
        >
          Volver al panel
        </Link>

      </header>

      {/* RESUMEN SUCURSALES */}

      <section className="grid sm:grid-cols-3 gap-4 mb-8">

        <Resumen
          titulo="Total clientes"
          valor={clientes.length}
        />

        <Resumen
          titulo="Peñalolén"
          valor={totalPenalolen}
        />

        <Resumen
          titulo="La Reina"
          valor={totalLaReina}
        />

      </section>

      {/* FORMULARIO + LISTADO */}

      <section className="grid lg:grid-cols-3 gap-8">

        {/* FORMULARIO */}

        <div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">

            <h2 className="text-2xl font-bold mb-2">

              {clienteEditandoId !== null
                ? "Editar cliente"
                : "Registrar cliente"}

            </h2>

            {clienteEditandoId !== null ? (

              <p className="text-yellow-500 text-sm mb-6">
                Estás modificando un cliente existente.
              </p>

            ) : (

              <p className="text-gray-400 text-sm mb-6">
                Ingresa los datos principales del cliente.
              </p>

            )}

            <form
              onSubmit={guardarCliente}
              className="space-y-5"
            >

              <Campo
                label="Nombre completo"
                value={nombre}
                onChange={setNombre}
                placeholder="Ej: Juan Pérez"
              />

              <Campo
                label="RUT"
                value={rut}
                onChange={setRut}
                placeholder="Ej: 12.345.678-9"
                required={false}
              />

              <Campo
                label="Correo electrónico"
                value={email}
                onChange={setEmail}
                type="email"
                placeholder="correo@ejemplo.cl"
                required={false}
              />

              <Campo
                label="Teléfono"
                value={telefono}
                onChange={setTelefono}
                placeholder="+56 9 1234 5678"
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

              {/* PLAN */}

              <div>

                <label className="block mb-2 font-semibold">
                  Plan
                </label>

                <select
                  value={plan}
                  onChange={(e) =>
                    setPlan(
                      e.target.value
                    )
                  }
                  className="w-full bg-black border border-zinc-700 rounded-lg p-3 outline-none focus:border-red-600"
                >

                  <option value="">
                    Sin plan asignado
                  </option>

                  <option value="Personal Training">
                    Personal Training
                  </option>

                  <option value="Plan Mensual">
                    Plan Mensual
                  </option>

                  <option value="Plan Trimestral">
                    Plan Trimestral
                  </option>

                  <option value="Plan Semestral">
                    Plan Semestral
                  </option>

                </select>

              </div>

              <button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 transition py-3 rounded-xl font-bold"
              >

                {clienteEditandoId !== null
                  ? "Guardar cambios"
                  : "Registrar cliente"}

              </button>

              {clienteEditandoId !== null ? (

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
                    Clientes registrados
                  </h2>

                  <p className="text-gray-400 mt-1">
                    Mostrando:{" "}
                    {clientesFiltrados.length}
                    {" "}de{" "}
                    {clientes.length}
                  </p>

                </div>

                <div className="grid md:grid-cols-2 gap-3">

                  {/* FILTRO SUCURSAL */}

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

                  {/* BUSCADOR */}

                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) =>
                      setBusqueda(
                        e.target.value
                      )
                    }
                    placeholder="Buscar cliente..."
                    className="bg-black border border-zinc-700 rounded-lg px-4 py-3 outline-none focus:border-red-600"
                  />

                </div>

              </div>

            </div>

            {cargandoClientes ? (

              <div className="p-10 text-center text-gray-400">
                Cargando clientes...
              </div>

            ) : clientesFiltrados.length === 0 ? (

              <div className="p-10 text-center text-gray-400">
                No se encontraron clientes.
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
                        Plan
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

                    {clientesFiltrados.map(
                      (cliente) => (

                        <tr
                          key={cliente.id}
                          className="border-t border-zinc-800 hover:bg-zinc-900/50"
                        >

                          <td className="p-4">

                            <p className="font-semibold">
                              {cliente.nombre}
                            </p>

                            <p className="text-gray-500 text-sm">
                              {cliente.email ||
                                "Sin correo"}
                            </p>

                          </td>

                          <td className="p-4 text-gray-300">
                            {cliente.rut ||
                              "Sin RUT"}
                          </td>

                          <td className="p-4">

                            <span className="text-red-400 font-semibold">
                              {cliente
                                .sucursal
                                ?.nombre ||
                                "Sin sucursal"}
                            </span>

                          </td>

                          <td className="p-4 text-gray-300">
                            {cliente.plan ||
                              "Sin plan"}
                          </td>

                          <td className="p-4">

                            <span
                              className={
                                cliente.estado ===
                                "Activo"
                                  ? "text-green-500 font-bold"
                                  : "text-gray-500 font-bold"
                              }
                            >
                              {cliente.estado}
                            </span>

                          </td>

                          <td className="p-4">

                            <div className="flex flex-wrap gap-2">

                              <button
                                onClick={() =>
                                  setClienteDetalle(
                                    cliente
                                  )
                                }
                                className="border border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white px-3 py-2 rounded-lg transition"
                              >
                                Ver
                              </button>

                              <button
                                onClick={() =>
                                  editarCliente(
                                    cliente
                                  )
                                }
                                className="border border-yellow-600 text-yellow-400 hover:bg-yellow-600 hover:text-black px-3 py-2 rounded-lg transition"
                              >
                                Editar
                              </button>

                              <button
                                onClick={() =>
                                  cambiarEstado(
                                    cliente
                                  )
                                }
                                className="border border-red-600 text-red-500 hover:bg-red-600 hover:text-white px-3 py-2 rounded-lg transition"
                              >

                                {cliente.estado ===
                                "Activo"
                                  ? "Desactivar"
                                  : "Activar"}

                              </button>

                              <button
                                onClick={() =>
                                  eliminarCliente(
                                    cliente.id
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

      {/* DETALLE CLIENTE */}

      {clienteDetalle && (

        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">

          <div className="bg-zinc-950 border border-red-600 rounded-2xl max-w-2xl w-full p-7 my-8">

            <div className="flex items-start justify-between gap-4 mb-6">

              <div>

                <p className="text-gray-400">
                  Información del cliente
                </p>

                <h2 className="text-3xl font-black">
                  {clienteDetalle.nombre}
                </h2>

              </div>

              <button
                onClick={() =>
                  setClienteDetalle(null)
                }
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>

            </div>

            <div className="grid md:grid-cols-2 gap-4">

              <Detalle
                titulo="N° cliente"
                valor={
                  clienteDetalle.numeroCliente
                }
              />

              <Detalle
                titulo="Sucursal"
                valor={
                  clienteDetalle
                    .sucursal
                    ?.nombre
                }
              />

              <Detalle
                titulo="RUT"
                valor={
                  clienteDetalle.rut
                }
              />

              <Detalle
                titulo="Correo electrónico"
                valor={
                  clienteDetalle.email
                }
              />

              <Detalle
                titulo="Teléfono"
                valor={
                  clienteDetalle.telefono
                }
              />

              <Detalle
                titulo="Teléfono secundario"
                valor={
                  clienteDetalle
                    .telefonoSecundario
                }
              />

              <Detalle
                titulo="Dirección"
                valor={
                  clienteDetalle.direccion
                }
              />

              <Detalle
                titulo="Comuna"
                valor={
                  clienteDetalle.comuna
                }
              />

              <Detalle
                titulo="Ciudad"
                valor={
                  clienteDetalle.ciudad
                }
              />

              <Detalle
                titulo="Edad"
                valor={
                  clienteDetalle.edad !==
                  null
                    ? String(
                        clienteDetalle.edad
                      )
                    : null
                }
              />

              <Detalle
                titulo="Género"
                valor={
                  clienteDetalle.genero
                }
              />

              <Detalle
                titulo="Fecha nacimiento"
                valor={
                  clienteDetalle
                    .fechaNacimiento
                }
              />

              <Detalle
                titulo="Plan"
                valor={
                  clienteDetalle.plan
                }
              />

              <Detalle
                titulo="Estado"
                valor={
                  clienteDetalle.estado
                }
              />

            </div>

            <div className="grid grid-cols-2 gap-3 mt-7">

              <button
                onClick={() => {
                  editarCliente(
                    clienteDetalle
                  );

                  setClienteDetalle(
                    null
                  );
                }}
                className="bg-red-600 hover:bg-red-700 py-3 rounded-xl font-bold"
              >
                Editar cliente
              </button>

              <button
                onClick={() =>
                  setClienteDetalle(null)
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
          Los clientes de Peñalolén y La Reina
          se almacenan en MySQL y están
          relacionados con su sucursal
          correspondiente.
        </p>

      </section>

    </main>
  );
}

/*
 * CAMPO
 */

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

/*
 * DETALLE
 */

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

/*
 * TARJETA RESUMEN
 */

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