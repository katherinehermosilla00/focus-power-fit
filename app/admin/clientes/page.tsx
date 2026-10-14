
"use client";

import "../admin.css";

import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
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

const API_CLIENTES = "http://localhost:3001/api/clientes";
const API_SUCURSALES = "http://localhost:3001/api/sucursales";
const POR_PAGINA = 20;

const api = axios.create();

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("focusPowerFitToken");

  if (!token) {
    return Promise.reject(
      new Error("Sesión no disponible. Inicia sesión nuevamente.")
    );
  }

  config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});

export default function ClientesPage() {
  const router = useRouter();
  const { usuario, cargando } = useAuth();

  const formularioRef = useRef<HTMLDivElement>(null);

  // DATOS
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [cargandoClientes, setCargandoClientes] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // FORMULARIO
  const [nombre, setNombre] = useState("");
  const [rut, setRut] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [plan, setPlan] = useState("");
  const [sucursalId, setSucursalId] = useState("");

  // FILTROS Y PAGINACIÓN
  const [busqueda, setBusqueda] = useState(() => {
    if (typeof window === "undefined") return "";

    return (
      new URLSearchParams(window.location.search).get("buscar") ?? ""
    );
  });

  const [sucursalFiltro, setSucursalFiltro] = useState("todas");
  const [pagina, setPagina] = useState(1);

  // EDICIÓN Y DETALLE
  const [clienteEditandoId, setClienteEditandoId] = useState<
    number | null
  >(null);

  const [clienteDetalle, setClienteDetalle] = useState<
    Cliente | null
  >(null);

  // PROTECCIÓN DE RUTA
  useEffect(() => {
    if (cargando) return;

    if (!usuario) {
      router.replace("/login");
    } else if (usuario.rol !== "admin") {
      router.replace("/mi-cuenta");
    }
  }, [cargando, usuario, router]);

  // CARGAR CLIENTES Y SUCURSALES
  useEffect(() => {
    if (cargando || !usuario || usuario.rol !== "admin") return;

    let activo = true;

    const cargarDatos = async () => {
      try {
        setCargandoClientes(true);

        const [respuestaClientes, respuestaSucursales] =
          await Promise.all([
            api.get<Cliente[]>(API_CLIENTES),
            api.get<Sucursal[]>(API_SUCURSALES),
          ]);

        if (activo) {
          setClientes(respuestaClientes.data);
          setSucursales(respuestaSucursales.data);
        }
      } catch (error) {
        console.error("Error al cargar datos:", error);

        if (activo) {
          alert(
            "No se pudieron cargar los clientes o las sucursales."
          );
        }
      } finally {
        if (activo) {
          setCargandoClientes(false);
        }
      }
    };

    void cargarDatos();

    return () => {
      activo = false;
    };
  }, [cargando, usuario]);

  // ACTUALIZAR LISTADO
  const cargarClientes = async () => {
    try {
      const respuesta = await api.get<Cliente[]>(API_CLIENTES);
      setClientes(respuesta.data);
    } catch (error) {
      console.error("Error al cargar clientes:", error);
      alert("No se pudo actualizar el listado de clientes.");
    }
  };

  // LIMPIAR FORMULARIO
  const limpiarFormulario = () => {
    setNombre("");
    setRut("");
    setEmail("");
    setTelefono("");
    setPlan("");
    setSucursalId("");
    setClienteEditandoId(null);
  };

  // REGISTRAR O EDITAR CLIENTE
  const guardarCliente = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!nombre.trim()) {
      alert("Debes ingresar el nombre del cliente.");
      return;
    }

    if (!sucursalId) {
      alert("Debes seleccionar una sucursal.");
      return;
    }

    const datosCliente = {
      nombre: nombre.trim(),
      nombres: nombre.trim(),
      rut: rut.trim() || null,
      email: email.trim() || null,
      telefono: telefono.trim() || null,
      plan: plan || null,
      sucursalId: Number(sucursalId),
    };

    try {
      setGuardando(true);

      if (clienteEditandoId !== null) {
        await api.put(
          `${API_CLIENTES}/${clienteEditandoId}`,
          datosCliente
        );

        alert("Cliente actualizado correctamente.");
      } else {
        await api.post(API_CLIENTES, datosCliente);

        alert("Cliente registrado correctamente.");
      }

      limpiarFormulario();
      await cargarClientes();
    } catch (error) {
      console.error("Error al guardar cliente:", error);
      alert("Ocurrió un error al guardar el cliente.");
    } finally {
      setGuardando(false);
    }
  };

  // EDITAR CLIENTE
  const editarCliente = (cliente: Cliente) => {
    setNombre(cliente.nombre ?? "");
    setRut(cliente.rut ?? "");
    setEmail(cliente.email ?? "");
    setTelefono(cliente.telefono ?? "");
    setPlan(cliente.plan ?? "");

    setSucursalId(
      cliente.sucursalId !== null
        ? String(cliente.sucursalId)
        : ""
    );

    setClienteEditandoId(cliente.id);

    formularioRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  // ACTIVAR O DESACTIVAR
  const cambiarEstado = async (cliente: Cliente) => {
    const nuevoEstado: EstadoCliente =
      cliente.estado === "Activo" ? "Inactivo" : "Activo";

    try {
      await api.put(`${API_CLIENTES}/${cliente.id}`, {
        estado: nuevoEstado,
      });

      await cargarClientes();
    } catch (error) {
      console.error("Error al cambiar estado:", error);
      alert("No se pudo cambiar el estado del cliente.");
    }
  };

  // ELIMINAR CLIENTE
  const eliminarCliente = async (id: number) => {
    const confirmado = window.confirm(
      "¿Seguro que deseas eliminar este cliente?"
    );

    if (!confirmado) return;

    try {
      await api.delete(`${API_CLIENTES}/${id}`);

      if (clienteEditandoId === id) {
        limpiarFormulario();
      }

      if (clienteDetalle?.id === id) {
        setClienteDetalle(null);
      }

      await cargarClientes();

      alert("Cliente eliminado correctamente.");
    } catch (error) {
      console.error("Error al eliminar cliente:", error);
      alert("No se pudo eliminar el cliente.");
    }
  };

  // FILTRAR CLIENTES
  const clientesFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return clientes.filter((cliente) => {
      const coincideSucursal =
        sucursalFiltro === "todas" ||
        cliente.sucursalId === Number(sucursalFiltro);

      const coincideBusqueda =
        !texto ||
        [
          cliente.nombre,
          cliente.rut,
          cliente.email,
          cliente.telefono,
          cliente.plan,
          cliente.numeroCliente,
          cliente.sucursal?.nombre,
        ].some((valor) =>
          (valor ?? "").toLowerCase().includes(texto)
        );

      return coincideSucursal && coincideBusqueda;
    });
  }, [clientes, busqueda, sucursalFiltro]);

  // PAGINACIÓN
  const totalPaginas = Math.max(
    1,
    Math.ceil(clientesFiltrados.length / POR_PAGINA)
  );

  const paginaActual = Math.min(pagina, totalPaginas);

  const clientesPagina = clientesFiltrados.slice(
    (paginaActual - 1) * POR_PAGINA,
    paginaActual * POR_PAGINA
  );

  // CONTADORES REALES
  const totalPenalolen = clientes.filter(
    (cliente) => cliente.sucursalId === 1
  ).length;

  const totalLaReina = clientes.filter(
    (cliente) => cliente.sucursalId === 2
  ).length;

  // CONTROL DE ACCESO
  if (cargando || !usuario || usuario.rol !== "admin") {
    return (
      <main className="cargando">
        {cargando ? "Cargando..." : "Verificando acceso..."}
      </main>
    );
  }

  return (
    <main className="admin-clientes">
      {/* ENCABEZADO */}
      <header className="clientes-encabezado">
        <div>
          <p className="clientes-etiqueta">
            PANEL ADMINISTRATIVO / CLIENTES
          </p>

          <h1>
            Gestión de <span>Clientes</span>
          </h1>

          <p className="clientes-subtitulo">
            Registra, consulta y administra los clientes de
            Focus Power Fit.
          </p>
        </div>

        <Link href="/admin" className="clientes-volver">
          ← Volver al panel
        </Link>
      </header>

      {/* TARJETAS DE RESUMEN */}
      <section
        className="clientes-resumen"
        aria-label="Resumen de clientes"
      >
        <Resumen
          titulo="Total de clientes"
          valor={clientes.length}
          detalle="En todas las sucursales"
        />

        <Resumen
          titulo="Peñalolén"
          valor={totalPenalolen}
          detalle="Clientes de la sucursal"
        />

        <Resumen
          titulo="La Reina"
          valor={totalLaReina}
          detalle="Clientes de la sucursal"
        />
      </section>

      {/* FORMULARIO Y DIRECTORIO */}
      <section className="clientes-distribucion">
        {/* FORMULARIO */}
        <div
          className="clientes-formulario-panel"
          ref={formularioRef}
        >
          <div className="clientes-panel-titulo">
            <p className="clientes-etiqueta">FORMULARIO</p>

            <h2>
              {clienteEditandoId !== null
                ? "Editar cliente"
                : "Registrar cliente"}
            </h2>

            <p>
              {clienteEditandoId !== null
                ? "Estás modificando un cliente existente."
                : "Ingresa los datos principales del cliente."}
            </p>
          </div>

          <form
            onSubmit={guardarCliente}
            className="clientes-formulario"
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

            <div className="clientes-campo">
              <label htmlFor="cliente-sucursal">
                Sucursal <span>*</span>
              </label>

              <select
                id="cliente-sucursal"
                value={sucursalId}
                onChange={(e) =>
                  setSucursalId(e.target.value)
                }
                required
              >
                <option value="">
                  Seleccionar sucursal
                </option>

                {sucursales.map((sucursal) => (
                  <option
                    key={sucursal.id}
                    value={sucursal.id}
                  >
                    {sucursal.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="clientes-campo">
              <label htmlFor="cliente-plan">Plan</label>

              <select
                id="cliente-plan"
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
              >
                <option value="">Sin plan asignado</option>
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

            <div className="clientes-formulario-acciones">
              <button
                type="submit"
                className="clientes-boton-primario"
                disabled={guardando}
              >
                {guardando
                  ? "Guardando..."
                  : clienteEditandoId !== null
                    ? "Guardar cambios"
                    : "Registrar cliente"}
              </button>

              <button
                type="button"
                className="clientes-boton-secundario"
                onClick={limpiarFormulario}
                disabled={guardando}
              >
                {clienteEditandoId !== null
                  ? "Cancelar edición"
                  : "Limpiar formulario"}
              </button>
            </div>
          </form>
        </div>

        {/* DIRECTORIO */}
        <div className="clientes-listado-panel">
          <div className="clientes-listado-cabecera">
            <div>
              <p className="clientes-etiqueta">DIRECTORIO</p>

              <h2>Clientes registrados</h2>

              <p>
                Mostrando {clientesFiltrados.length} de{" "}
                {clientes.length} clientes
              </p>
            </div>

            <div className="clientes-filtros">
              <select
                aria-label="Filtrar por sucursal"
                value={sucursalFiltro}
                onChange={(e) => {
                  setSucursalFiltro(e.target.value);
                  setPagina(1);
                }}
              >
                <option value="todas">
                  Todas las sucursales
                </option>

                {sucursales.map((sucursal) => (
                  <option
                    key={sucursal.id}
                    value={String(sucursal.id)}
                  >
                    {sucursal.nombre}
                  </option>
                ))}
              </select>

              <input
                type="search"
                aria-label="Buscar cliente"
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setPagina(1);
                }}
                placeholder="Buscar nombre, RUT, correo..."
              />
            </div>
          </div>

          {cargandoClientes ? (
            <div className="clientes-vacio">
              Cargando clientes...
            </div>
          ) : clientesFiltrados.length === 0 ? (
            <div className="clientes-vacio">
              No se encontraron clientes con estos filtros.
            </div>
          ) : (
            <>
              <div className="clientes-tabla-scroll">
                <table className="clientes-tabla">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>RUT</th>
                      <th>Sucursal</th>
                      <th>Plan</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {clientesPagina.map((cliente) => (
                      <tr key={cliente.id}>
                        <td>
                          <div className="clientes-nombre">
                            {cliente.nombre}
                          </div>

                          <div className="clientes-email">
                            {cliente.email || "Sin correo"}
                          </div>
                        </td>

                        <td className="clientes-dato">
                          {cliente.rut || "Sin RUT"}
                        </td>

                        <td>
                          <span className="clientes-sucursal">
                            {cliente.sucursal?.nombre ||
                              sucursales.find(
                                (s) =>
                                  s.id === cliente.sucursalId
                              )?.nombre ||
                              "Sin sucursal"}
                          </span>
                        </td>

                        <td className="clientes-dato">
                          {cliente.plan || "Sin plan"}
                        </td>

                        <td>
                          <span
                            className={`clientes-estado ${
                              cliente.estado === "Activo"
                                ? "clientes-estado-activo"
                                : "clientes-estado-inactivo"
                            }`}
                          >
                            {cliente.estado}
                          </span>
                        </td>

                        <td>
                          <div className="clientes-acciones">
                            <button
                              type="button"
                              onClick={() =>
                                setClienteDetalle(cliente)
                              }
                              title="Ver detalles"
                            >
                              Ver
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                editarCliente(cliente)
                              }
                              title="Editar cliente"
                            >
                              Editar
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void cambiarEstado(cliente)
                              }
                              title={
                                cliente.estado === "Activo"
                                  ? "Desactivar cliente"
                                  : "Activar cliente"
                              }
                            >
                              {cliente.estado === "Activo"
                                ? "Desactivar"
                                : "Activar"}
                            </button>

                            <button
                              type="button"
                              className="clientes-accion-eliminar"
                              onClick={() =>
                                void eliminarCliente(cliente.id)
                              }
                              title="Eliminar cliente"
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

              {/* PAGINACIÓN */}
              <div className="clientes-paginacion">
                <span>
                  Página {paginaActual} de {totalPaginas} ·{" "}
                  {clientesFiltrados.length} resultados
                </span>

                <div>
                  <button
                    type="button"
                    onClick={() =>
                      setPagina((p) => Math.max(1, p - 1))
                    }
                    disabled={paginaActual <= 1}
                  >
                    ← Anterior
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setPagina((p) =>
                        Math.min(totalPaginas, p + 1)
                      )
                    }
                    disabled={paginaActual >= totalPaginas}
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* MODAL DE DETALLE */}
      {clienteDetalle && (
        <div
          className="clientes-modal-overlay"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setClienteDetalle(null);
            }
          }}
        >
          <section
            className="clientes-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="clientes-modal-titulo"
          >
            <header className="clientes-modal-cabecera">
              <div>
                <p className="clientes-etiqueta">
                  INFORMACIÓN DEL CLIENTE
                </p>

                <h2 id="clientes-modal-titulo">
                  {clienteDetalle.nombre}
                </h2>
              </div>

              <button
                type="button"
                className="clientes-modal-cerrar"
                onClick={() => setClienteDetalle(null)}
                aria-label="Cerrar detalles"
              >
                ✕
              </button>
            </header>

            <div className="clientes-detalles">
              <Detalle
                titulo="N° cliente"
                valor={clienteDetalle.numeroCliente}
              />

              <Detalle
                titulo="Sucursal"
                valor={
                  clienteDetalle.sucursal?.nombre ||
                  sucursales.find(
                    (s) =>
                      s.id === clienteDetalle.sucursalId
                  )?.nombre
                }
              />

              <Detalle
                titulo="RUT"
                valor={clienteDetalle.rut}
              />

              <Detalle
                titulo="Correo electrónico"
                valor={clienteDetalle.email}
              />

              <Detalle
                titulo="Teléfono"
                valor={clienteDetalle.telefono}
              />

              <Detalle
                titulo="Teléfono secundario"
                valor={clienteDetalle.telefonoSecundario}
              />

              <Detalle
                titulo="Dirección"
                valor={clienteDetalle.direccion}
              />

              <Detalle
                titulo="Comuna"
                valor={clienteDetalle.comuna}
              />

              <Detalle
                titulo="Ciudad"
                valor={clienteDetalle.ciudad}
              />

              <Detalle
                titulo="Edad"
                valor={
                  clienteDetalle.edad !== null
                    ? String(clienteDetalle.edad)
                    : null
                }
              />

              <Detalle
                titulo="Género"
                valor={clienteDetalle.genero}
              />

              <Detalle
                titulo="Fecha nacimiento"
                valor={clienteDetalle.fechaNacimiento}
              />

              <Detalle
                titulo="Plan"
                valor={clienteDetalle.plan}
              />

              <Detalle
                titulo="Estado"
                valor={clienteDetalle.estado}
              />
            </div>

            <div className="clientes-modal-acciones">
              <button
                type="button"
                className="clientes-boton-primario"
                onClick={() => {
                  editarCliente(clienteDetalle);
                  setClienteDetalle(null);
                }}
              >
                Editar cliente
              </button>

              <button
                type="button"
                className="clientes-boton-secundario"
                onClick={() => setClienteDetalle(null)}
              >
                Cerrar
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

// CAMPO DE FORMULARIO
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
  const id = `cliente-${label
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")}`;

  return (
    <div className="clientes-campo">
      <label htmlFor={id}>
        {label}
        {required && <span> *</span>}
      </label>

      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}

// DETALLE DEL CLIENTE
function Detalle({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string | null | undefined;
}) {
  return (
    <div className="clientes-detalle">
      <span>{titulo}</span>
      <strong>{valor || "No informado"}</strong>
    </div>
  );
}

// TARJETA DE RESUMEN
function Resumen({
  titulo,
  valor,
  detalle,
}: {
  titulo: string;
  valor: number;
  detalle: string;
}) {
  return (
    <article className="clientes-tarjeta">
      <p>{titulo}</p>

      <strong>{valor.toLocaleString("es-CL")}</strong>

      <small>{detalle}</small>
    </article>
  );
}
