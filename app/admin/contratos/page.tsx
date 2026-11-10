"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../auth/AuthContext";
import AdminSectionHeader from "../components/AdminSectionHeader";

const API_URL = `${(
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
).replace(/\/+$/, "")}/api`;
const TAMANO_MAXIMO = 10 * 1024 * 1024;
const TIPOS_PERMITIDOS = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

type Cliente = {
  id: number;
  nombre: string;
  rut: string | null;
  email: string | null;
};

type Contrato = {
  id: number;
  clienteId: number;
  nombreArchivo: string;
  fechaInicio: string | null;
  fechaTermino: string | null;
  estado: "Vigente" | "Vencido" | "Finalizado";
  observaciones: string | null;
  createdAt: string;
  cliente?: Cliente;
};

function limpiarRut(rut: string) {
  return rut.replace(/[.\s-]/g, "").toLowerCase();
}

function mostrarFecha(fecha: string | null) {
  if (!fecha) return "Sin fecha";

  const partes = fecha.slice(0, 10).split("-");
  if (partes.length !== 3) return fecha;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function obtenerMensajeError(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    const mensaje =
      typeof data === "object" && data !== null
        ? (data as { mensaje?: unknown; error?: unknown }).mensaje ??
          (data as { error?: unknown }).error
        : null;

    if (typeof mensaje === "string") return mensaje;
    if (error.response?.status === 401) {
      return "Tu sesión expiró. Inicia sesión nuevamente.";
    }
    if (error.response?.status === 403) {
      return "No tienes permisos para administrar contratos.";
    }
  }

  return "No se pudo completar la operación. Inténtalo nuevamente.";
}

function InsigniaEstado({ estado }: { estado: Contrato["estado"] }) {
  const clases = {
    Vigente: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    Vencido: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    Finalizado: "border-gray-500/30 bg-gray-500/10 text-gray-300",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${clases[estado]}`}
    >
      {estado}
    </span>
  );
}

export default function ContratosPage() {
  const router = useRouter();
  const { usuario, cargando, token } = useAuth();
  const archivoInputRef = useRef<HTMLInputElement>(null);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [busquedaRut, setBusquedaRut] = useState("");
  const [clienteSeleccionado, setClienteSeleccionado] =
    useState<Cliente | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaTermino, setFechaTermino] = useState("");
  const [estado, setEstado] =
    useState<Contrato["estado"]>("Vigente");
  const [observaciones, setObservaciones] = useState("");
  const [busquedaContratos, setBusquedaContratos] = useState("");
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [descargandoId, setDescargandoId] = useState<number | null>(
    null
  );
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

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

  const cargarDatos = useCallback(async () => {
    const [respuestaClientes, respuestaContratos] = await Promise.all([
      axios.get<Cliente[]>(`${API_URL}/clientes`, config),
      axios.get<Contrato[]>(`${API_URL}/contratos`, config),
    ]);

    setClientes(respuestaClientes.data);
    setContratos(respuestaContratos.data);
  }, [config]);

  useEffect(() => {
    if (cargando || !usuario || usuario.rol !== "admin" || !token) {
      return;
    }

    let activo = true;

    async function iniciarCarga() {
      setCargandoDatos(true);
      setError("");

      try {
        await cargarDatos();
      } catch (err) {
        if (activo) {
          setError(obtenerMensajeError(err));
        }
      } finally {
        if (activo) setCargandoDatos(false);
      }
    }

    void iniciarCarga();

    return () => {
      activo = false;
    };
  }, [cargando, usuario, token, cargarDatos]);

  const clientesCoincidentes = useMemo(() => {
    const busqueda = limpiarRut(busquedaRut.trim());
    if (!busqueda || clienteSeleccionado) return [];

    return clientes
      .filter(
        (cliente) =>
          cliente.rut && limpiarRut(cliente.rut).includes(busqueda)
      )
      .slice(0, 6);
  }, [clientes, busquedaRut, clienteSeleccionado]);

  const contratosFiltrados = useMemo(() => {
    const texto = busquedaContratos.trim().toLowerCase();
    const rut = limpiarRut(busquedaContratos.trim());

    if (!texto) return contratos;

    return contratos.filter((contrato) => {
      const cliente = contrato.cliente;
      return (
        contrato.nombreArchivo.toLowerCase().includes(texto) ||
        contrato.estado.toLowerCase().includes(texto) ||
        cliente?.nombre.toLowerCase().includes(texto) ||
        limpiarRut(cliente?.rut ?? "").includes(rut)
      );
    });
  }, [contratos, busquedaContratos]);

  function seleccionarArchivo(evento: ChangeEvent<HTMLInputElement>) {
    const seleccionado = evento.target.files?.[0] ?? null;
    setError("");

    if (!seleccionado) {
      setArchivo(null);
      return;
    }

    if (!TIPOS_PERMITIDOS.includes(seleccionado.type)) {
      setArchivo(null);
      evento.target.value = "";
      setError("El archivo debe ser PDF, JPG o PNG.");
      return;
    }

    if (seleccionado.size > TAMANO_MAXIMO) {
      setArchivo(null);
      evento.target.value = "";
      setError("El archivo no puede superar los 10 MB.");
      return;
    }

    setArchivo(seleccionado);
  }

  function limpiarFormulario() {
    setBusquedaRut("");
    setClienteSeleccionado(null);
    setArchivo(null);
    if (archivoInputRef.current) archivoInputRef.current.value = "";
    setFechaInicio("");
    setFechaTermino("");
    setEstado("Vigente");
    setObservaciones("");
  }

  async function registrarContrato(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!token || guardando) return;

    setError("");
    setMensaje("");

    if (!clienteSeleccionado) {
      setError("Busca y selecciona al cliente usando su RUT.");
      return;
    }

    if (!archivo) {
      setError("Adjunta una copia digital del contrato firmado.");
      return;
    }

    if (fechaInicio && fechaTermino && fechaTermino < fechaInicio) {
      setError("La fecha de término no puede ser anterior al inicio.");
      return;
    }

    const datos = new FormData();
    datos.append("clienteId", String(clienteSeleccionado.id));
    datos.append("archivo", archivo);
    datos.append("fechaInicio", fechaInicio);
    datos.append("fechaTermino", fechaTermino);
    datos.append("estado", estado);
    datos.append("observaciones", observaciones.trim());

    setGuardando(true);

    try {
      await axios.post(`${API_URL}/contratos`, datos, config);
      limpiarFormulario();
      setMensaje("Contrato cargado y asignado al cliente correctamente.");

      try {
        await cargarDatos();
      } catch (err) {
        setError(
          `El contrato se guardó, pero no se pudo actualizar el listado. ${obtenerMensajeError(err)}`
        );
      }
    } catch (err) {
      setError(obtenerMensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  async function descargarContrato(contrato: Contrato) {
    if (!token || descargandoId !== null) return;

    setError("");
    setDescargandoId(contrato.id);

    try {
      const respuesta = await axios.get<Blob>(
        `${API_URL}/contratos/${contrato.id}/archivo`,
        { ...config, responseType: "blob" }
      );
      const url = URL.createObjectURL(respuesta.data);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = contrato.nombreArchivo;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(obtenerMensajeError(err));
    } finally {
      setDescargandoId(null);
    }
  }

  if (cargando || !usuario || usuario.rol !== "admin") {
    return (
      <main className="min-h-screen bg-black p-6 text-white">
        <p>{cargando ? "Cargando..." : "Verificando acceso..."}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black p-6 text-white md:p-10">
      <AdminSectionHeader
        titulo="Gestión de"
        destacado="Contratos"
        descripcion="Guarda la copia digital del contrato firmado presencialmente y asígnala al cliente mediante su RUT."
      />

      <div className="mx-auto max-w-7xl space-y-8">
        {error && (
          <div
            className="flex items-start justify-between gap-4 rounded-xl border border-red-500/30 bg-red-950/40 px-5 py-4 text-sm text-red-200"
            role="alert"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              className="font-semibold text-red-100 hover:text-white"
              aria-label="Cerrar mensaje de error"
            >
              Cerrar
            </button>
          </div>
        )}

        {mensaje && (
          <div
            className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-5 py-4 text-sm text-emerald-200"
            role="status"
          >
            {mensaje}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="rounded-2xl border border-white/10 bg-neutral-900 p-6 sm:p-8">
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-400">
                Nuevo registro
              </p>
              <h2 className="mt-2 text-2xl font-bold">
                Cargar contrato firmado
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-400">
                Busca al cliente por RUT y adjunta el documento firmado
                presencialmente.
              </p>
            </div>

            <form onSubmit={registrarContrato} className="space-y-5">
              <div>
                <label
                  htmlFor="rut-cliente"
                  className="mb-2 block text-sm font-semibold text-gray-200"
                >
                  RUT del cliente <span className="text-red-400">*</span>
                </label>
                <input
                  id="rut-cliente"
                  type="search"
                  autoComplete="off"
                  placeholder="Ej.: 12.345.678-9"
                  value={busquedaRut}
                  onChange={(evento) => {
                    setBusquedaRut(evento.target.value);
                    setClienteSeleccionado(null);
                  }}
                  className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500"
                  aria-describedby="ayuda-rut"
                />
                <p id="ayuda-rut" className="mt-2 text-xs text-gray-500">
                  Escribe el RUT y selecciona el cliente encontrado.
                </p>
                {clientesCoincidentes.length > 0 && (
                  <ul className="mt-2 overflow-hidden rounded-xl border border-white/10 bg-neutral-950">
                    {clientesCoincidentes.map((cliente) => (
                      <li key={cliente.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setClienteSeleccionado(cliente);
                            setBusquedaRut(cliente.rut ?? "");
                          }}
                          className="w-full border-b border-white/5 px-4 py-3 text-left last:border-0 hover:bg-white/5"
                        >
                          <span className="block font-semibold text-white">
                            {cliente.nombre}
                          </span>
                          <span className="mt-1 block text-sm text-gray-400">
                            RUT: {cliente.rut}
                            {cliente.email ? ` · ${cliente.email}` : ""}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {busquedaRut.trim() &&
                  !clienteSeleccionado &&
                  clientesCoincidentes.length === 0 && (
                    <p className="mt-2 text-sm text-amber-300">
                      No se encontraron clientes con ese RUT.
                    </p>
                  )}
                {clienteSeleccionado && (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-500/25 bg-emerald-950/30 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-emerald-200">
                        Cliente asignado
                      </p>
                      <p className="truncate text-sm text-gray-300">
                        {clienteSeleccionado.nombre} ·{" "}
                        {clienteSeleccionado.rut}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setClienteSeleccionado(null);
                        setBusquedaRut("");
                      }}
                      className="shrink-0 text-xs font-semibold text-gray-300 hover:text-white"
                    >
                      Cambiar
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="archivo-contrato"
                  className="mb-2 block text-sm font-semibold text-gray-200"
                >
                  Copia digital <span className="text-red-400">*</span>
                </label>
                <input
                  ref={archivoInputRef}
                  id="archivo-contrato"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  onChange={seleccionarArchivo}
                  className="block w-full cursor-pointer rounded-xl border border-white/15 bg-black text-sm text-gray-300 file:mr-4 file:border-0 file:bg-red-700 file:px-4 file:py-3 file:font-semibold file:text-white hover:file:bg-red-600"
                />
                <p className="mt-2 text-xs text-gray-500">
                  PDF, JPG o PNG. Tamaño máximo: 10 MB.
                </p>
                {archivo && (
                  <p className="mt-2 truncate text-sm text-gray-300">
                    Archivo seleccionado: {archivo.name}
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="fecha-inicio"
                    className="mb-2 block text-sm font-semibold text-gray-200"
                  >
                    Fecha de inicio
                  </label>
                  <input
                    id="fecha-inicio"
                    type="date"
                    value={fechaInicio}
                    max={fechaTermino || undefined}
                    onChange={(evento) => setFechaInicio(evento.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-white outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="fecha-termino"
                    className="mb-2 block text-sm font-semibold text-gray-200"
                  >
                    Fecha de término
                  </label>
                  <input
                    id="fecha-termino"
                    type="date"
                    value={fechaTermino}
                    min={fechaInicio || undefined}
                    onChange={(evento) =>
                      setFechaTermino(evento.target.value)
                    }
                    className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-white outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="estado"
                  className="mb-2 block text-sm font-semibold text-gray-200"
                >
                  Estado
                </label>
                <select
                  id="estado"
                  value={estado}
                  onChange={(evento) =>
                    setEstado(evento.target.value as Contrato["estado"])
                  }
                  className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-white outline-none focus:border-red-500"
                >
                  <option value="Vigente">Vigente</option>
                  <option value="Vencido">Vencido</option>
                  <option value="Finalizado">Finalizado</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="observaciones"
                  className="mb-2 block text-sm font-semibold text-gray-200"
                >
                  Observaciones
                </label>
                <textarea
                  id="observaciones"
                  rows={3}
                  value={observaciones}
                  onChange={(evento) =>
                    setObservaciones(evento.target.value)
                  }
                  placeholder="Notas adicionales (opcional)"
                  className="w-full resize-y rounded-xl border border-white/15 bg-black px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-red-500"
                />
              </div>

              <button
                type="submit"
                disabled={guardando || cargandoDatos}
                className="w-full rounded-xl bg-red-700 px-5 py-3 font-bold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {guardando ? "Guardando contrato..." : "Cargar y asignar contrato"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-white/10 bg-neutral-900 p-6 sm:p-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-400">
                  Archivo y asignación
                </p>
                <h2 className="mt-2 text-2xl font-bold">
                  Contratos registrados
                </h2>
                <p className="mt-2 text-sm text-gray-400">
                  {cargandoDatos
                    ? "Cargando registros..."
                    : `${contratos.length} ${
                        contratos.length === 1 ? "contrato" : "contratos"
                      }`}
                </p>
              </div>
              <Link
                href="/admin"
                className="text-sm font-semibold text-gray-300 transition hover:text-white"
              >
                Volver al panel
              </Link>
            </div>

            <div className="mt-6">
              <label htmlFor="buscar-contrato" className="sr-only">
                Buscar contratos por RUT, cliente, archivo o estado
              </label>
              <input
                id="buscar-contrato"
                type="search"
                placeholder="Buscar por RUT, cliente, archivo o estado"
                value={busquedaContratos}
                onChange={(evento) =>
                  setBusquedaContratos(evento.target.value)
                }
                className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-red-500"
              />
            </div>

            {cargandoDatos ? (
              <p className="py-12 text-center text-sm text-gray-400">
                Cargando contratos...
              </p>
            ) : contratosFiltrados.length === 0 ? (
              <div className="py-12 text-center">
                <p className="font-semibold text-gray-200">
                  {contratos.length === 0
                    ? "Aún no hay contratos registrados."
                    : "No se encontraron contratos para esa búsqueda."}
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  Los contratos cargados aparecerán aquí asociados a su
                  cliente.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {contratosFiltrados.map((contrato) => (
                  <article
                    key={contrato.id}
                    className="rounded-xl border border-white/10 bg-black/50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="break-all font-semibold text-white">
                          {contrato.nombreArchivo}
                        </h3>
                        <p className="mt-1 text-sm text-gray-300">
                          {contrato.cliente?.nombre || "Cliente sin nombre"}
                        </p>
                        <p className="text-xs text-gray-500">
                          RUT: {contrato.cliente?.rut || "No registrado"}
                        </p>
                      </div>
                      <InsigniaEstado estado={contrato.estado} />
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
                      <p className="text-xs text-gray-400">
                        Vigencia: {mostrarFecha(contrato.fechaInicio)} —{" "}
                        {mostrarFecha(contrato.fechaTermino)}
                      </p>
                      <button
                        type="button"
                        onClick={() => void descargarContrato(contrato)}
                        disabled={descargandoId !== null}
                        className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-gray-200 transition hover:border-red-500/50 hover:text-white disabled:opacity-50"
                      >
                        {descargandoId === contrato.id
                          ? "Descargando..."
                          : "Descargar copia"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
