"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../auth/AuthContext";

type EstadoCliente = "Activo" | "Inactivo";

type Cliente = {
  id: number;
  nombre: string;
  rut: string;
  email: string;
  telefono: string;
  plan: string;
  estado: EstadoCliente;
};

const clientesIniciales: Cliente[] = [
  {
    id: 1,
    nombre: "Cliente Demo",
    rut: "12.345.678-9",
    email: "cliente@focuspowerfit.cl",
    telefono: "+56 9 1234 5678",
    plan: "Personal Training",
    estado: "Activo",
  },
];

export default function ClientesPage() {
  const router = useRouter();

  const {
    usuario,
    cargando,
  } = useAuth();

  const [clientes, setClientes] =
    useState<Cliente[]>(clientesIniciales);

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

  const [busqueda, setBusqueda] =
    useState("");

  const [clienteEditandoId, setClienteEditandoId] =
    useState<number | null>(null);

  const [clienteDetalle, setClienteDetalle] =
    useState<Cliente | null>(null);

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

  const limpiarFormulario = () => {
    setNombre("");
    setRut("");
    setEmail("");
    setTelefono("");
    setPlan("");
    setClienteEditandoId(null);
  };

  const guardarCliente = (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    const correoExiste = clientes.some(
      (cliente) =>
        cliente.email.toLowerCase() ===
          email.toLowerCase() &&
        cliente.id !== clienteEditandoId
    );

    if (correoExiste) {
      alert(
        "Ya existe un cliente con ese correo."
      );
      return;
    }

    const rutExiste = clientes.some(
      (cliente) =>
        cliente.rut.toLowerCase() ===
          rut.toLowerCase() &&
        cliente.id !== clienteEditandoId
    );

    if (rutExiste) {
      alert(
        "Ya existe un cliente con ese RUT."
      );
      return;
    }

    // EDITAR CLIENTE
    if (clienteEditandoId !== null) {
      setClientes(
        (clientesActuales) =>
          clientesActuales.map(
            (cliente) =>
              cliente.id === clienteEditandoId
                ? {
                    ...cliente,
                    nombre,
                    rut,
                    email,
                    telefono,
                    plan,
                  }
                : cliente
          )
      );

      alert(
        "Cliente actualizado correctamente."
      );

      limpiarFormulario();

      return;
    }

    // CREAR NUEVO CLIENTE

    const nuevoId =
      clientes.length > 0
        ? Math.max(
            ...clientes.map(
              (cliente) => cliente.id
            )
          ) + 1
        : 1;

    const nuevoCliente: Cliente = {
      id: nuevoId,
      nombre,
      rut,
      email,
      telefono,
      plan,
      estado: "Activo",
    };

    setClientes(
      (clientesActuales) => [
        ...clientesActuales,
        nuevoCliente,
      ]
    );

    alert(
      "Cliente registrado correctamente."
    );

    limpiarFormulario();
  };

  const editarCliente = (
    cliente: Cliente
  ) => {
    setNombre(cliente.nombre);
    setRut(cliente.rut);
    setEmail(cliente.email);
    setTelefono(cliente.telefono);
    setPlan(cliente.plan);

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

  const cambiarEstado = (
    id: number
  ) => {
    setClientes(
      (clientesActuales) =>
        clientesActuales.map(
          (cliente) => {
            if (
              cliente.id !== id
            ) {
              return cliente;
            }

            return {
              ...cliente,

              estado:
                cliente.estado ===
                "Activo"
                  ? "Inactivo"
                  : "Activo",
            };
          }
        )
    );
  };

  const eliminarCliente = (
    id: number
  ) => {
    const confirmar =
      window.confirm(
        "¿Seguro que deseas eliminar este cliente?"
      );

    if (!confirmar) {
      return;
    }

    setClientes(
      (clientesActuales) =>
        clientesActuales.filter(
          (cliente) =>
            cliente.id !== id
        )
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
  };

  const clientesFiltrados =
    clientes.filter(
      (cliente) => {
        const texto =
          busqueda
            .trim()
            .toLowerCase();

        return (
          cliente.nombre
            .toLowerCase()
            .includes(texto) ||
          cliente.rut
            .toLowerCase()
            .includes(texto) ||
          cliente.email
            .toLowerCase()
            .includes(texto) ||
          cliente.telefono
            .toLowerCase()
            .includes(texto) ||
          cliente.plan
            .toLowerCase()
            .includes(texto)
        );
      }
    );

  if (cargando) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>
          Cargando...
        </p>
      </main>
    );
  }

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

            {clienteEditandoId !== null && (
              <p className="text-yellow-500 text-sm mb-6">
                Estás modificando un cliente existente.
              </p>
            )}

            {clienteEditandoId === null && (
              <p className="text-gray-400 text-sm mb-6">
                Ingresa los datos del cliente.
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
              />

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
                  required
                  className="w-full bg-black border border-zinc-700 rounded-lg p-3 outline-none focus:border-red-600"
                >

                  <option value="">
                    Seleccionar plan
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
                  onClick={cancelarEdicion}
                  className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 py-3 rounded-xl"
                >
                  Cancelar edición
                </button>

              ) : (

                <button
                  type="button"
                  onClick={limpiarFormulario}
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

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                <div>

                  <h2 className="text-2xl font-bold">
                    Clientes registrados
                  </h2>

                  <p className="text-gray-400 mt-1">
                    Total: {clientes.length}
                  </p>

                </div>

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

            {clientesFiltrados.length === 0 ? (

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
                              {cliente.email}
                            </p>

                          </td>

                          <td className="p-4 text-gray-300">
                            {cliente.rut}
                          </td>

                          <td className="p-4 text-gray-300">
                            {cliente.plan}
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

                              {/* VER */}

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

                              {/* EDITAR */}

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

                              {/* ESTADO */}

                              <button
                                onClick={() =>
                                  cambiarEstado(
                                    cliente.id
                                  )
                                }
                                className="border border-red-600 text-red-500 hover:bg-red-600 hover:text-white px-3 py-2 rounded-lg transition"
                              >

                                {cliente.estado ===
                                "Activo"
                                  ? "Desactivar"
                                  : "Activar"}

                              </button>

                              {/* ELIMINAR */}

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

        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">

          <div className="bg-zinc-950 border border-red-600 rounded-2xl max-w-lg w-full p-7">

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

            <div className="space-y-4">

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

      {/* AVISO */}

      <section className="mt-8 bg-zinc-950 border border-zinc-800 rounded-2xl p-6">

        <h2 className="text-xl text-red-500 font-bold mb-2">
          Versión de desarrollo
        </h2>

        <p className="text-gray-400">
          Los clientes todavía se almacenan temporalmente
          en el frontend. Al actualizar la página,
          los cambios realizados se perderán.
          Posteriormente este módulo será conectado
          a la base de datos del sistema.
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
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  type?: string;
  placeholder?: string;
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
        required
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
  valor: string;
}) {
  return (
    <div className="bg-black border border-zinc-800 rounded-xl p-4">

      <p className="text-gray-500 text-sm mb-1">
        {titulo}
      </p>

      <p className="font-semibold">
        {valor}
      </p>

    </div>
  );
}