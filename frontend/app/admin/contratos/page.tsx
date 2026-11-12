"use client";

import {
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
import "../modulo-oscuro.css";
import { useCerrarSolo } from "../../components/useCerrarSolo";

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api`;
const TAMANO_MAXIMO = 10 * 1024 * 1024;

type EstadoContrato = "Vigente" | "Vencido" | "Finalizado";

type Cliente = {
  id: number;
  nombre: string;
  rut: string | null;
};

type Contrato = {
  id: number;
  clienteId: number;
  nombreArchivo: string;
  fechaInicio: string | null;
  fechaTermino: string | null;
  estado: EstadoContrato;
  observaciones: string | null;
  cliente?: { nombre: string; rut: string | null };
};

function mensajeError(error: unknown, defecto: string) {
  if (axios.isAxiosError(error)) {
    const mensaje = error.response?.data?.mensaje;

    if (typeof mensaje === "string") return mensaje;
  }

  return defecto;
}

function mostrarFecha(fecha: string | null) {
  if (!fecha) return "Sin fecha";

  const [anio, mes, dia] = fecha.slice(0, 10).split("-");

  return `${dia}/${mes}/${anio}`;
}

export default function ContratosPage() {
  const router = useRouter();
  const { usuario, cargando, token } = useAuth();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaTermino, setFechaTermino] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  useCerrarSolo(mensaje, setMensaje);

  const campoArchivo = useRef<HTMLInputElement>(null);

  const config = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
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
    if (cargando || usuario?.rol !== "admin" || !token) return;

    let activo = true;

    async function iniciarCarga() {
      try {
        await cargarDatos();
      } catch (err) {
        if (activo) {
          setError(mensajeError(err, "No se pudieron cargar los contratos."));
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

  const contratosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return contratos;

    return contratos.filter((contrato) =>
      [
        contrato.cliente?.nombre,
        contrato.cliente?.rut,
        contrato.nombreArchivo,
        contrato.estado,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(texto)
    );
  }, [contratos, busqueda]);

  const indicadores = useMemo(
    () => ({
      total: contratos.length,
      vigentes: contratos.filter(({ estado }) => estado === "Vigente").length,
      vencidos: contratos.filter(({ estado }) => estado === "Vencido").length,
      finalizados: contratos.filter(({ estado }) => estado === "Finalizado")
        .length,
    }),
    [contratos]
  );

  const registrar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();

    if (guardando) return;

    setError("");
    setMensaje("");

    if (!clienteId || !archivo) {
      setError("Selecciona un cliente y adjunta la copia del contrato.");
      return;
    }

    if (archivo.size > TAMANO_MAXIMO) {
      setError("El archivo no puede superar los 10 MB.");
      return;
    }

    if (fechaInicio && fechaTermino && fechaTermino < fechaInicio) {
      setError("La fecha de término no puede ser anterior a la de inicio.");
      return;
    }

    const datos = new FormData();
    datos.append("clienteId", clienteId);
    datos.append("archivo", archivo);
    if (fechaInicio) datos.append("fechaInicio", fechaInicio);
    if (fechaTermino) datos.append("fechaTermino", fechaTermino);
    if (observaciones.trim()) {
      datos.append("observaciones", observaciones.trim());
    }

    setGuardando(true);

    try {
      await axios.post(`${API_URL}/contratos`, datos, config);
      await cargarDatos();

      setClienteId("");
      setArchivo(null);
      setFechaInicio("");
      setFechaTermino("");
      setObservaciones("");
      if (campoArchivo.current) campoArchivo.current.value = "";

      setMensaje("Contrato cargado correctamente.");
    } catch (err) {
      setError(mensajeError(err, "No se pudo cargar el contrato."));
    } finally {
      setGuardando(false);
    }
  };

  const abrir = async (contrato: Contrato) => {
    const ventana = window.open("about:blank", "_blank");

    if (!ventana) {
      setError("Permite las ventanas emergentes para abrir el contrato.");
      return;
    }

    try {
      const respuesta = await axios.get<Blob>(
        `${API_URL}/contratos/${contrato.id}/archivo`,
        { ...config, responseType: "blob" }
      );

      ventana.location.href = URL.createObjectURL(respuesta.data);
    } catch {
      ventana.close();
      setError("No se pudo abrir el contrato.");
    }
  };

  const cambiarEstado = async (contrato: Contrato, estado: EstadoContrato) => {
    setError("");
    setMensaje("");

    try {
      await axios.put(`${API_URL}/contratos/${contrato.id}`, { estado }, config);
      await cargarDatos();
      setMensaje("Estado del contrato actualizado.");
    } catch (err) {
      setError(mensajeError(err, "No se pudo actualizar el contrato."));
    }
  };

  const eliminar = async (contrato: Contrato) => {
    const confirmado = window.confirm(
      `¿Eliminar el contrato de ${contrato.cliente?.nombre ?? "este cliente"}?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmado) return;

    setError("");
    setMensaje("");

    try {
      await axios.delete(`${API_URL}/contratos/${contrato.id}`, config);
      await cargarDatos();
      setMensaje("Contrato eliminado correctamente.");
    } catch (err) {
      setError(mensajeError(err, "No se pudo eliminar el contrato."));
    }
  };

  if (cargando || usuario?.rol !== "admin") {
    return (
      <main className="admin-clientes">
        <p>{cargando ? "Cargando..." : "Verificando acceso..."}</p>
      </main>
    );
  }

  return (
    <main className="admin-clientes admin-modulo modulo-oscuro">
      <div className="admin-modulo-contenedor">
        <header className="admin-modulo-encabezado">
          <div>
            <p className="admin-modulo-etiqueta">FOCUS POWER FIT</p>
            <h1 className="admin-modulo-titulo">
              Gestión de <span>Contratos</span>
            </h1>
            <p className="admin-modulo-descripcion">
              Carga la copia digital del contrato firmado presencialmente y
              asóciala a su cliente.
            </p>
          </div>

          <Link href="/admin" className="clientes-volver fp-btn fp-btn-volver">
            Volver al panel
          </Link>
        </header>

        {error && (
          <div className="admin-alert admin-alert-error" role="alert">
            <span>{error}</span>
            <button
              type="button"
              className="fp-btn fp-btn-secondary"
              onClick={() => setError("")}
            >
              Cerrar
            </button>
          </div>
        )}

        {mensaje && (
          <div className="admin-alert admin-alert-success" role="status">
            <span>{mensaje}</span>
            <button
              type="button"
              className="fp-btn fp-btn-secondary"
              onClick={() => setMensaje("")}
            >
              Cerrar
            </button>
          </div>
        )}

        <section
          className="admin-modulo-resumen"
          aria-label="Resumen de contratos"
        >
          {[
            ["Total", indicadores.total],
            ["Vigentes", indicadores.vigentes],
            ["Vencidos", indicadores.vencidos],
            ["Finalizados", indicadores.finalizados],
          ].map(([titulo, valor]) => (
            <article className="admin-modulo-indicador" key={titulo}>
              <span>{titulo}</span>
              <strong>{cargandoDatos ? "—" : valor}</strong>
              <p>Contratos</p>
            </article>
          ))}
        </section>

        <div className="modulo-distribucion">
          <section className="admin-modulo-panel modulo-panel">
            <h2 className="admin-modulo-panel-titulo">Cargar contrato</h2>
            <p className="admin-modulo-descripcion">
              PDF, JPG o PNG de hasta 10 MB.
            </p>

            <form onSubmit={registrar} className="admin-modulo-formulario">
              <div className="admin-modulo-campo">
                <label htmlFor="contrato-cliente">Cliente *</label>
                <select
                  id="contrato-cliente"
                  value={clienteId}
                  required
                  onChange={(evento) => setClienteId(evento.target.value)}
                >
                  <option value="">Seleccionar cliente</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nombre}
                      {cliente.rut ? ` - ${cliente.rut}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-modulo-campo">
                <label htmlFor="contrato-archivo">Archivo *</label>
                <input
                  id="contrato-archivo"
                  ref={campoArchivo}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  required
                  onChange={(evento) =>
                    setArchivo(evento.target.files?.[0] ?? null)
                  }
                />
              </div>

              <div className="admin-modulo-campo">
                <label htmlFor="contrato-inicio">Fecha de inicio</label>
                <input
                  id="contrato-inicio"
                  type="date"
                  value={fechaInicio}
                  onChange={(evento) => setFechaInicio(evento.target.value)}
                />
              </div>

              <div className="admin-modulo-campo">
                <label htmlFor="contrato-termino">Fecha de término</label>
                <input
                  id="contrato-termino"
                  type="date"
                  min={fechaInicio || undefined}
                  value={fechaTermino}
                  onChange={(evento) => setFechaTermino(evento.target.value)}
                />
              </div>

              <div className="admin-modulo-campo">
                <label htmlFor="contrato-observaciones">Observaciones</label>
                <textarea
                  id="contrato-observaciones"
                  rows={3}
                  value={observaciones}
                  onChange={(evento) => setObservaciones(evento.target.value)}
                  placeholder="No registres aquí datos de salud"
                />
              </div>

              <div className="admin-modulo-acciones">
                <button
                  type="submit"
                  disabled={guardando || cargandoDatos}
                  className="admin-modulo-boton admin-modulo-boton--principal fp-btn fp-btn-primary"
                >
                  {guardando ? "Cargando..." : "Cargar contrato"}
                </button>
              </div>
            </form>
          </section>

          <section className="admin-modulo-panel modulo-panel">
            <div className="modulo-encabezado-listado">
              <div>
                <h2 className="admin-modulo-panel-titulo">
                  Contratos registrados
                </h2>
                <p className="admin-modulo-descripcion">
                  Mostrando {contratosFiltrados.length} de {contratos.length}
                </p>
              </div>

              <input
                type="search"
                className="admin-modulo-buscador"
                style={{ maxWidth: 320 }}
                placeholder="Buscar cliente, RUT o archivo..."
                aria-label="Buscar contratos"
                value={busqueda}
                onChange={(evento) => setBusqueda(evento.target.value)}
              />
            </div>

            {cargandoDatos ? (
              <div className="admin-modulo-vacio">Cargando contratos...</div>
            ) : contratosFiltrados.length === 0 ? (
              <div className="admin-modulo-vacio">
                No se encontraron contratos.
              </div>
            ) : (
              <div className="admin-modulo-tabla-contenedor">
                <table className="admin-modulo-tabla">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Archivo</th>
                      <th>Vigencia</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contratosFiltrados.map((contrato) => (
                      <tr key={contrato.id}>
                        <td>
                          <strong>
                            {contrato.cliente?.nombre ?? "No disponible"}
                          </strong>
                          <p className="modulo-secundario">
                            {contrato.cliente?.rut ?? "Sin RUT"}
                          </p>
                        </td>
                        <td>{contrato.nombreArchivo}</td>
                        <td>
                          <p>{mostrarFecha(contrato.fechaInicio)}</p>
                          <p className="modulo-secundario">
                            hasta {mostrarFecha(contrato.fechaTermino)}
                          </p>
                        </td>
                        <td>
                          <select
                            className="admin-modulo-buscador"
                            aria-label={`Estado del contrato ${contrato.id}`}
                            value={contrato.estado}
                            onChange={(evento) =>
                              void cambiarEstado(
                                contrato,
                                evento.target.value as EstadoContrato
                              )
                            }
                          >
                            <option value="Vigente">Vigente</option>
                            <option value="Vencido">Vencido</option>
                            <option value="Finalizado">Finalizado</option>
                          </select>
                        </td>
                        <td>
                          <div className="modulo-acciones">
                            <button
                              type="button"
                              className="fp-btn fp-btn-secondary"
                              onClick={() => void abrir(contrato)}
                            >
                              Abrir
                            </button>
                            <button
                              type="button"
                              className="fp-btn fp-btn-danger"
                              onClick={() => void eliminar(contrato)}
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
