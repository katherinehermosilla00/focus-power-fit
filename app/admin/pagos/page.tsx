"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useAuth } from "../../auth/AuthContext";
import AdminSectionHeader from "../components/AdminSectionHeader";

type Cliente = {
  id: number;
  nombre: string;
  rut: string;
};

type Plan = {
  id: number;
  nombre: string;
};

type Asignacion = {
  clienteId: number;
  planId: number;
  estado: "Activa" | "Finalizada" | "Congelada";
  plan: Plan | null;
};

type Pago = {
  id: number;
  clienteId: number;
  planId: number;
  monto: string;
  fechaPago: string;
  fechaVencimiento: string;
  metodoPago: "Efectivo" | "Transferencia" | "Tarjeta" | "Otro";
  estado: "Vigente" | "Vencido" | "Anulado";
  observaciones?: string | null;
  cliente?: Cliente;
  plan?: Plan;
};

const API_URL = "http://localhost:3001/api";

export default function PagosPage() {
  const router = useRouter();
  const { usuario, cargando, token } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [busquedaRutCliente, setBusquedaRutCliente] = useState("");
  const [planId, setPlanId] = useState("");
  const [monto, setMonto] = useState("");
  const [fechaPago, setFechaPago] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [metodoPago, setMetodoPago] = useState<Pago["metodoPago"]>("Efectivo");
  const [observaciones, setObservaciones] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(true);

  const config = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
    [token]
  );

  useEffect(() => {
    if (cargando) return;

    if (!usuario) {
      router.replace("/login");
    } else if (usuario.rol !== "admin") {
      router.replace("/mi-cuenta");
    }
  }, [cargando, usuario, router]);

  useEffect(() => {
    if (cargando || !usuario || usuario.rol !== "admin" || !token) return;

    const cargarDatos = async () => {
      try {
        setCargandoDatos(true);
        const [clientesRespuesta, asignacionesRespuesta, pagosRespuesta] =
          await Promise.all([
            axios.get<Cliente[]>(`${API_URL}/clientes`, config),
            axios.get<Asignacion[]>(`${API_URL}/asignaciones`, config),
            axios.get<Pago[]>(`${API_URL}/pagos`, config),
          ]);

        setClientes(clientesRespuesta.data);
        setAsignaciones(asignacionesRespuesta.data);
        setPagos(pagosRespuesta.data);
      } catch (error) {
        console.error("Error al cargar información de pagos:", error);
        alert("No se pudo cargar la información de pagos.");
      } finally {
        setCargandoDatos(false);
      }
    };

    cargarDatos();
  }, [cargando, config, usuario, token]);

  const cargarPagos = async () => {
    const respuesta = await axios.get<Pago[]>(`${API_URL}/pagos`, config);
    setPagos(respuesta.data);
  };

  const limpiarFormulario = () => {
    setClienteId("");
    setBusquedaRutCliente("");
    setPlanId("");
    setMonto("");
    setFechaPago(new Date().toISOString().slice(0, 10));
    setFechaVencimiento("");
    setMetodoPago("Efectivo");
    setObservaciones("");
  };

  const registrarPago = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setGuardando(true);
      await axios.post(
        `${API_URL}/pagos`,
        {
          clienteId: Number(clienteId),
          planId: Number(planId),
          monto: Number(monto),
          fechaPago,
          fechaVencimiento,
          metodoPago,
          observaciones: observaciones || null,
        },
        config
      );

      await cargarPagos();
      limpiarFormulario();
      alert("Pago externo registrado correctamente.");
    } catch (error) {
      console.error("Error al registrar pago:", error);
      alert("No se pudo registrar el pago.");
    } finally {
      setGuardando(false);
    }
  };

  const eliminarPago = async (id: number) => {
    if (!window.confirm("¿Seguro que deseas eliminar este pago?")) return;

    try {
      await axios.delete(`${API_URL}/pagos/${id}`, config);
      await cargarPagos();
    } catch (error) {
      console.error("Error al eliminar pago:", error);
      alert("No se pudo eliminar el pago.");
    }
  };

  const pagosFiltrados = pagos.filter((pago) => {
    const texto = busqueda.trim().toLowerCase();
    return (
      pago.cliente?.nombre.toLowerCase().includes(texto) ||
      pago.cliente?.rut.toLowerCase().includes(texto) ||
      pago.plan?.nombre.toLowerCase().includes(texto) ||
      pago.metodoPago.toLowerCase().includes(texto)
    );
  });

  const rutBuscado = busquedaRutCliente
    .trim()
    .replace(/[.\-\s]/g, "")
    .toLowerCase();
  const clientesFiltrados = clientes.filter((cliente) =>
    cliente.rut
      .replace(/[.\-\s]/g, "")
      .toLowerCase()
      .includes(rutBuscado)
  );
  const clienteSeleccionado = clientes.find(
    (cliente) => String(cliente.id) === clienteId
  );
  const opcionesCliente = clienteSeleccionado &&
    !clientesFiltrados.some((cliente) => cliente.id === clienteSeleccionado.id)
    ? [clienteSeleccionado, ...clientesFiltrados]
    : clientesFiltrados;
  const planesAsociados = asignaciones
    .flatMap((asignacion) => {
      if (
        String(asignacion.clienteId) !== clienteId ||
        asignacion.estado !== "Activa" ||
        !asignacion.plan
      ) {
        return [];
      }

      return [asignacion.plan];
    })
    .filter(
      (plan, indice, planesUnicos) =>
        planesUnicos.findIndex((otroPlan) => otroPlan.id === plan.id) === indice
    );

  if (cargando || !usuario || usuario.rol !== "admin") {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Verificando acceso...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white p-6 md:p-10">
      <AdminSectionHeader
        titulo="Registro de"
        destacado="Pagos"
        descripcion="Registra pagos realizados presencialmente o fuera de la plataforma."
      />

      <section className="grid lg:grid-cols-3 gap-8">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 sm:p-8">
          <h2 className="text-2xl font-bold mb-2">Registrar pago externo</h2>
          <p className="text-gray-400 text-sm mb-6">
            Ingresa los datos administrativos del pago realizado.
          </p>

          <form onSubmit={registrarPago} className="space-y-5">
            <div>
              <label htmlFor="busqueda-rut-cliente" className="block mb-2 font-semibold">
                Buscar cliente por RUT
              </label>
              <input
                id="busqueda-rut-cliente"
                type="search"
                value={busquedaRutCliente}
                onChange={(e) => setBusquedaRutCliente(e.target.value)}
                placeholder="Ej: 12.345.678-9"
                className="w-full bg-black border border-zinc-700 rounded-lg p-3 outline-none focus:border-red-600"
              />
            </div>

            <CampoSelect
              label="Cliente"
              value={clienteId}
              onChange={(value) => {
                setClienteId(value);
                setPlanId("");
              }}
              placeholder="Seleccionar cliente"
              required
            >
              {opcionesCliente.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nombre} - {cliente.rut}
                </option>
              ))}
              {clientesFiltrados.length === 0 && (
                <option value="" disabled>
                  No se encontraron clientes con ese RUT
                </option>
              )}
            </CampoSelect>

            <CampoSelect
              label="Plan pagado"
              value={planId}
              onChange={setPlanId}
              placeholder={
                clienteId
                  ? planesAsociados.length > 0
                    ? "Seleccionar plan asociado"
                    : "Cliente sin plan activo asociado"
                  : "Selecciona primero un cliente"
              }
              required
            >
              {planesAsociados.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.nombre}
                </option>
              ))}
            </CampoSelect>

            <Campo
              label="Monto"
              type="number"
              min="1"
              step="1"
              value={monto}
              onChange={setMonto}
              placeholder="Ej: 35000"
              required
            />

            <Campo
              label="Fecha del pago"
              type="date"
              value={fechaPago}
              onChange={setFechaPago}
              required
            />

            <Campo
              label="Fecha de vencimiento"
              type="date"
              value={fechaVencimiento}
              onChange={setFechaVencimiento}
              required
            />

            <CampoSelect
              label="Método de pago"
              value={metodoPago}
              onChange={(value) => setMetodoPago(value as Pago["metodoPago"])}
              placeholder="Seleccionar método"
              required
            >
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Tarjeta">Tarjeta</option>
              <option value="Otro">Otro</option>
            </CampoSelect>

            <div>
              <label className="block mb-2 font-semibold">Observaciones</label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={3}
                placeholder="Ej: Pago recibido en recepción"
                className="w-full bg-black border border-zinc-700 rounded-lg p-3 outline-none focus:border-red-600"
              />
            </div>

            <button
              type="submit"
              disabled={guardando}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 transition py-3 rounded-xl font-bold"
            >
              {guardando ? "Registrando..." : "Registrar pago"}
            </button>

            <button
              type="button"
              onClick={limpiarFormulario}
              className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 py-3 rounded-xl"
            >
              Limpiar formulario
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-950">
          <div className="p-6 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Pagos registrados</h2>
              <p className="text-gray-400 mt-1">Total: {pagos.length}</p>
            </div>
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar pago..."
              className="bg-black border border-zinc-700 rounded-lg px-4 py-3 outline-none focus:border-red-600"
            />
          </div>

          {cargandoDatos ? (
            <div className="p-10 text-center text-gray-400">Cargando pagos...</div>
          ) : pagosFiltrados.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              No se encontraron pagos.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-zinc-900">
                  <tr>
                    <th className="p-4">Cliente</th>
                    <th className="p-4">Plan</th>
                    <th className="p-4">Monto</th>
                    <th className="p-4">Pago / vencimiento</th>
                    <th className="p-4">Método</th>
                    <th className="p-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pagosFiltrados.map((pago) => (
                    <tr key={pago.id} className="border-t border-zinc-800 hover:bg-zinc-900/50">
                      <td className="p-4">
                        <p className="font-semibold">{pago.cliente?.nombre ?? "-"}</p>
                        <p className="text-gray-500 text-sm">{pago.cliente?.rut ?? "-"}</p>
                      </td>
                      <td className="p-4 text-gray-300">{pago.plan?.nombre ?? "-"}</td>
                      <td className="p-4 text-gray-300">${Number(pago.monto).toLocaleString("es-CL")}</td>
                      <td className="p-4 text-gray-300">
                        <p>{pago.fechaPago}</p>
                        <p className="text-gray-500 text-sm">Vence: {pago.fechaVencimiento}</p>
                      </td>
                      <td className="p-4 text-gray-300">{pago.metodoPago}</td>
                      <td className="p-4">
                        <button
                          onClick={() => eliminarPago(pago.id)}
                          className="border border-red-600 text-red-400 hover:bg-red-600 hover:text-white px-3 py-2 rounded-lg transition"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function Campo({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  min,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  min?: string;
  step?: string;
}) {
  return (
    <div>
      <label className="block mb-2 font-semibold">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        min={min}
        step={step}
        className="w-full bg-black border border-zinc-700 rounded-lg p-3 outline-none focus:border-red-600"
      />
    </div>
  );
}

function CampoSelect({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block mb-2 font-semibold">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full bg-black border border-zinc-700 rounded-lg p-3 outline-none focus:border-red-600"
      >
        <option value="">{placeholder}</option>
        {children}
      </select>
    </div>
  );
}
