

"use client";

import {

  useCallback,

  useEffect,

  useMemo,

  useRef,

  useState,

  type FormEvent,

} from "react";

import Link from "next/link";

import { useRouter } from "next/navigation";

import { useAuth } from "../../auth/AuthContext";



type EstadoSucursal = "Activa" | "Inactiva";

type Sucursal = {

  id: number;

  nombre: string;

  direccion: string | null;

  comuna: string;

  ciudad: string | null;

  horarioAtencion: string | null;

  telefono: string | null;

  estado: EstadoSucursal;

};

type Cliente = {

  id: number;

  sucursalId: number | null;

};

type FormularioSucursal = {

  nombre: string;

  direccion: string;

  comuna: string;

  ciudad: string;

  horarioAtencion: string;

  telefono: string;

  estado: EstadoSucursal;

};

const FORMULARIO_INICIAL: FormularioSucursal = {

  nombre: "",

  direccion: "",

  comuna: "",

  ciudad: "",

  horarioAtencion: "",

  telefono: "",

  estado: "Activa",

};

const API = (

  process.env.NEXT_PUBLIC_API_URL ||

  "http://localhost:3001"

).replace(/\/$/, "");

const POR_PAGINA = 10;

function obtenerToken(): string | null {

  if (typeof window === "undefined") {

    return null;

  }

  return localStorage.getItem("focusPowerFitToken");

}

async function leerRespuesta(

  respuesta: Response

): Promise<unknown> {

  const texto = await respuesta.text();

  if (!texto) {

    return null;

  }

  try {

    return JSON.parse(texto);

  } catch {

    return null;

  }

}

function obtenerMensaje(

  datos: unknown,

  mensajePredeterminado: string

): string {

  if (

    datos !== null &&

    typeof datos === "object" &&

    "mensaje" in datos &&

    typeof datos.mensaje === "string"

  ) {

    return datos.mensaje;

  }

  return mensajePredeterminado;

}

export default function SucursalesPage() {

  const router = useRouter();

  const { usuario, cargando } = useAuth();

  const formularioRef = useRef<HTMLElement | null>(null);

  const [sucursales, setSucursales] = useState<

    Sucursal[]

  >([]);

  const [

    clientesPorSucursal,

    setClientesPorSucursal,

  ] = useState<Record<number, number>>({});

  const [formulario, setFormulario] =

    useState<FormularioSucursal>({

      ...FORMULARIO_INICIAL,

    });

  const [editandoId, setEditandoId] = useState<

    number | null

  >(null);

  const [sucursalDetalle, setSucursalDetalle] =

    useState<Sucursal | null>(null);

  const [busqueda, setBusqueda] = useState("");

  const [filtroEstado, setFiltroEstado] =

    useState("Todas");

  const [filtroComuna, setFiltroComuna] =

    useState("Todas");

  const [paginaActual, setPaginaActual] = useState(1);

  const [cargandoDatos, setCargandoDatos] =

    useState(true);

  const [guardando, setGuardando] = useState(false);

  const [procesandoId, setProcesandoId] = useState<

    number | null

  >(null);

  const [error, setError] = useState("");

  const [mensaje, setMensaje] = useState("");

  const esAdmin = usuario?.rol === "admin";

  // ========================================

  // CONTROL DE ACCESO

  // ========================================

  useEffect(() => {

    if (cargando) {

      return;

    }

    if (!usuario) {

      router.replace("/login");

      return;

    }

    if (!esAdmin) {

      router.replace("/mi-cuenta");

    }

  }, [cargando, usuario, esAdmin, router]);

  // ========================================

  // CARGAR SUCURSALES Y CLIENTES

  // ========================================

  const cargarDatos = useCallback(

    async (signal?: AbortSignal): Promise<void> => {

      if (signal?.aborted) {

        return;

      }

      setCargandoDatos(true);

      try {

        const token = obtenerToken();

        if (!token) {

          throw new Error(

            "No se encontró la sesión del administrador."

          );

        }

        const headers = {

          Authorization: `Bearer ${token}`,

        };

        const [

          respuestaSucursales,

          respuestaClientes,

        ] = await Promise.all([

          fetch(`${API}/api/sucursales/admin`, {

            headers,

            signal,

          }),

          fetch(`${API}/api/clientes`, {

            headers,

            signal,

          }),

        ]);

        if (!respuestaSucursales.ok) {

          const datos = await leerRespuesta(

            respuestaSucursales

          );

          throw new Error(

            obtenerMensaje(

              datos,

              "No se pudieron cargar las sucursales."

            )

          );

        }

        if (!respuestaClientes.ok) {

          const datos = await leerRespuesta(

            respuestaClientes

          );

          throw new Error(

            obtenerMensaje(

              datos,

              "No se pudieron cargar los clientes."

            )

          );

        }

        const datosSucursales: unknown =

          await respuestaSucursales.json();

        const datosClientes: unknown =

          await respuestaClientes.json();

        if (

          !Array.isArray(datosSucursales) ||

          !Array.isArray(datosClientes)

        ) {

          throw new Error(

            "El backend devolvió un formato inesperado."

          );

        }

        const listaSucursales =

          datosSucursales as Sucursal[];

        const listaClientes =

          datosClientes as Cliente[];

        const conteos: Record<number, number> = {};

        listaClientes.forEach((cliente) => {

          if (

            cliente.sucursalId !== null &&

            cliente.sucursalId !== undefined

          ) {

            const id = Number(cliente.sucursalId);

            if (Number.isFinite(id)) {

              conteos[id] = (conteos[id] ?? 0) + 1;

            }

          }

        });

        if (signal?.aborted) {

          return;

        }

        setSucursales(listaSucursales);

        setClientesPorSucursal(conteos);

        setError("");

      } catch (err) {

        if (signal?.aborted) {

          return;

        }

        if (

          err instanceof Error &&

          err.name === "AbortError"

        ) {

          return;

        }

        setError(

          err instanceof Error

            ? err.message

            : "Error al cargar las sucursales."

        );

      } finally {

        if (!signal?.aborted) {

          setCargandoDatos(false);

        }

      }

    },

    []

  );

  // ========================================

  // CARGA INICIAL CORREGIDA

  // ========================================

  useEffect(() => {

    if (cargando || !esAdmin) {

      return;

    }

    const controller = new AbortController();

    async function iniciarCarga(): Promise<void> {

      try {

        await cargarDatos(controller.signal);

      } catch (err) {

        if (!controller.signal.aborted) {

          console.error(

            "Error al iniciar la carga de sucursales:",

            err

          );

        }

      }

    }

    iniciarCarga().catch((err: unknown) => {

      if (!controller.signal.aborted) {

        console.error(

          "Error inesperado al cargar sucursales:",

          err

        );

      }

    });

    return () => {

      controller.abort();

    };

  }, [cargando, esAdmin, cargarDatos]);

  // ========================================

  // FORMULARIO

  // ========================================

  function cambiarCampo<

    K extends keyof FormularioSucursal

  >(

    campo: K,

    valor: FormularioSucursal[K]

  ): void {

    setFormulario((anterior) => ({

      ...anterior,

      [campo]: valor,

    }));

  }

  function limpiarFormulario(): void {

    setFormulario({ ...FORMULARIO_INICIAL });

    setEditandoId(null);

  }

  function editarSucursal(sucursal: Sucursal): void {

    setFormulario({

      nombre: sucursal.nombre,

      direccion: sucursal.direccion ?? "",

      comuna: sucursal.comuna,

      ciudad: sucursal.ciudad ?? "",

      horarioAtencion:

        sucursal.horarioAtencion ?? "",

      telefono: sucursal.telefono ?? "",

      estado: sucursal.estado,

    });

    setEditandoId(sucursal.id);

    setSucursalDetalle(null);

    setError("");

    setMensaje("");

    requestAnimationFrame(() => {

      formularioRef.current?.scrollIntoView({

        behavior: "smooth",

        block: "start",

      });

    });

  }

  // ========================================

  // REGISTRAR O EDITAR SUCURSAL

  // ========================================

  async function guardarSucursal(

    evento: FormEvent<HTMLFormElement>

  ): Promise<void> {

    evento.preventDefault();

    if (!esAdmin || guardando) {

      return;

    }

    if (

      !formulario.nombre.trim() ||

      !formulario.comuna.trim()

    ) {

      setError(

        "El nombre y la comuna son obligatorios."

      );

      return;

    }

    setGuardando(true);

    setError("");

    setMensaje("");

    try {

      const token = obtenerToken();

      if (!token) {

        throw new Error(

          "No se encontró la sesión del administrador."

        );

      }

      const esEdicion = editandoId !== null;

      const url = esEdicion

        ? `${API}/api/sucursales/${editandoId}`

        : `${API}/api/sucursales`;

      const respuesta = await fetch(url, {

        method: esEdicion ? "PUT" : "POST",

        headers: {

          "Content-Type": "application/json",

          Authorization: `Bearer ${token}`,

        },

        body: JSON.stringify({

          nombre: formulario.nombre.trim(),

          direccion:

            formulario.direccion.trim() || null,

          comuna: formulario.comuna.trim(),

          ciudad:

            formulario.ciudad.trim() || null,

          horarioAtencion:

            formulario.horarioAtencion.trim() ||

            null,

          telefono:

            formulario.telefono.trim() || null,

          estado: formulario.estado,

        }),

      });

      const datos = await leerRespuesta(respuesta);

      if (!respuesta.ok) {

        throw new Error(

          obtenerMensaje(

            datos,

            "No se pudo guardar la sucursal."

          )

        );

      }

      await cargarDatos();

      limpiarFormulario();

      setMensaje(

        esEdicion

          ? "Sucursal actualizada correctamente."

          : "Sucursal registrada correctamente."

      );

    } catch (err) {

      setError(

        err instanceof Error

          ? err.message

          : "No se pudo guardar la sucursal."

      );

    } finally {

      setGuardando(false);

    }

  }

  // ========================================

  // CAMBIAR ESTADO

  // ========================================

  async function cambiarEstado(

    sucursal: Sucursal

  ): Promise<void> {

    if (!esAdmin || procesandoId !== null) {

      return;

    }

    const nuevoEstado: EstadoSucursal =

      sucursal.estado === "Activa"

        ? "Inactiva"

        : "Activa";

    const confirmado = window.confirm(

      `¿Deseas cambiar el estado de "${sucursal.nombre}" a ${nuevoEstado}?`

    );

    if (!confirmado) {

      return;

    }

    setProcesandoId(sucursal.id);

    setError("");

    setMensaje("");

    try {

      const token = obtenerToken();

      if (!token) {

        throw new Error(

          "No se encontró la sesión del administrador."

        );

      }

      const respuesta = await fetch(

        `${API}/api/sucursales/${sucursal.id}`,

        {

          method: "PUT",

          headers: {

            "Content-Type": "application/json",

            Authorization: `Bearer ${token}`,

          },

          body: JSON.stringify({

            nombre: sucursal.nombre,

            direccion: sucursal.direccion,

            comuna: sucursal.comuna,

            ciudad: sucursal.ciudad,

            horarioAtencion:

              sucursal.horarioAtencion,

            telefono: sucursal.telefono,

            estado: nuevoEstado,

          }),

        }

      );

      const datos = await leerRespuesta(respuesta);

      if (!respuesta.ok) {

        throw new Error(

          obtenerMensaje(

            datos,

            "No se pudo cambiar el estado de la sucursal."

          )

        );

      }

      await cargarDatos();

      setSucursalDetalle(null);

      setMensaje(

        `Sucursal ${nuevoEstado.toLowerCase()} correctamente.`

      );

    } catch (err) {

      setError(

        err instanceof Error

          ? err.message

          : "No se pudo cambiar el estado."

      );

    } finally {

      setProcesandoId(null);

    }

  }

  // ========================================

  // ELIMINAR SUCURSAL

  // ========================================

  async function eliminarSucursal(

    sucursal: Sucursal

  ): Promise<void> {

    if (!esAdmin || procesandoId !== null) {

      return;

    }

    const cantidadClientes =

      clientesPorSucursal[sucursal.id] ?? 0;

    if (cantidadClientes > 0) {

      setError(

        `La sucursal "${sucursal.nombre}" tiene ${cantidadClientes} clientes asociados. Para conservar sus datos, cambia el estado de la sucursal a Inactiva.`

      );

      return;

    }

    const confirmado = window.confirm(

      `¿Estás segura de eliminar definitivamente la sucursal "${sucursal.nombre}"?\n\nEsta acción no se puede deshacer.`

    );

    if (!confirmado) {

      return;

    }

    setProcesandoId(sucursal.id);

    setError("");

    setMensaje("");

    try {

      const token = obtenerToken();

      if (!token) {

        throw new Error(

          "No se encontró la sesión del administrador."

        );

      }

      const respuesta = await fetch(

        `${API}/api/sucursales/${sucursal.id}`,

        {

          method: "DELETE",

          headers: {

            Authorization: `Bearer ${token}`,

          },

        }

      );

      const datos = await leerRespuesta(respuesta);

      if (!respuesta.ok) {

        throw new Error(

          obtenerMensaje(

            datos,

            "No se pudo eliminar la sucursal."

          )

        );

      }

      if (editandoId === sucursal.id) {

        limpiarFormulario();

      }

      setSucursalDetalle(null);

      await cargarDatos();

      setMensaje(

        "Sucursal eliminada correctamente."

      );

    } catch (err) {

      setError(

        err instanceof Error

          ? err.message

          : "Error al eliminar la sucursal."

      );

    } finally {

      setProcesandoId(null);

    }

  }

  // ========================================

  // INDICADORES

  // ========================================

  const indicadores = useMemo(() => {

    const activas = sucursales.filter(

      (sucursal) => sucursal.estado === "Activa"

    ).length;

    const totalClientes = Object.values(

      clientesPorSucursal

    ).reduce(

      (total, cantidad) => total + cantidad,

      0

    );

    return {

      total: sucursales.length,

      activas,

      inactivas: sucursales.length - activas,

      clientes: totalClientes,

    };

  }, [sucursales, clientesPorSucursal]);

  // ========================================

  // FILTROS

  // ========================================

  const comunas = useMemo(() => {

    return [

      ...new Set(

        sucursales.map(

          (sucursal) => sucursal.comuna

        )

      ),

    ].sort((a, b) => a.localeCompare(b, "es"));

  }, [sucursales]);

  const sucursalesFiltradas = useMemo(() => {

    const texto = busqueda.trim().toLowerCase();

    return sucursales.filter((sucursal) => {

      const contenido = [

        sucursal.nombre,

        sucursal.direccion ?? "",

        sucursal.comuna,

        sucursal.ciudad ?? "",

        sucursal.telefono ?? "",

        sucursal.horarioAtencion ?? "",

      ]

        .join(" ")

        .toLowerCase();

      const coincideBusqueda =

        contenido.includes(texto);

      const coincideEstado =

        filtroEstado === "Todas" ||

        sucursal.estado === filtroEstado;

      const coincideComuna =

        filtroComuna === "Todas" ||

        sucursal.comuna === filtroComuna;

      return (

        coincideBusqueda &&

        coincideEstado &&

        coincideComuna

      );

    });

  }, [

    sucursales,

    busqueda,

    filtroEstado,

    filtroComuna,

  ]);

  // ========================================

  // PAGINACIÓN

  // ========================================

  const totalPaginas = Math.max(

    1,

    Math.ceil(

      sucursalesFiltradas.length / POR_PAGINA

    )

  );

  const paginaSegura = Math.min(

    paginaActual,

    totalPaginas

  );

  const sucursalesPaginadas =

    sucursalesFiltradas.slice(

      (paginaSegura - 1) * POR_PAGINA,

      paginaSegura * POR_PAGINA

    );

  // ========================================

  // PROTEGER PÁGINA

  // ========================================

  if (cargando || !usuario || !esAdmin) {

    return (

      <main className="admin-clientes">

        <p>

          {cargando

            ? "Cargando..."

            : "Verificando acceso..."}

        </p>

      </main>

    );

  }

  // ========================================

  // INTERFAZ

  // ========================================

  return (

    <main className="admin-clientes admin-modulo sucursales-page sucursales-negro-rojo">

      <div className="admin-modulo-contenedor sucursales-contenedor">

        {/* ENCABEZADO */}

        <header className="admin-modulo-encabezado">

          <div>

            <p className="admin-modulo-etiqueta">

              FOCUS POWER FIT

            </p>

            <h1 className="admin-modulo-titulo">

              Gestión de <span>Sucursales</span>

            </h1>

            <p className="admin-modulo-descripcion">

              Administra las sedes del gimnasio,

              sus horarios y clientes asociados.

            </p>

          </div>

          <Link

            href="/admin"

            className="clientes-volver fp-btn fp-btn-volver"

          >

            Volver al panel

          </Link>

        </header>

        {/* INDICADORES */}

        <section

          className="admin-modulo-resumen sucursales-resumen"

          aria-label="Resumen de sucursales"

        >

          <article className="admin-modulo-indicador">

            <span>Total de sucursales</span>

            <strong>

              {cargandoDatos

                ? "—"

                : indicadores.total}

            </strong>

          </article>

          <article className="admin-modulo-indicador">

            <span>Sucursales activas</span>

            <strong>

              {cargandoDatos

                ? "—"

                : indicadores.activas}

            </strong>

          </article>

          <article className="admin-modulo-indicador">

            <span>Sucursales inactivas</span>

            <strong>

              {cargandoDatos

                ? "—"

                : indicadores.inactivas}

            </strong>

          </article>

          <article className="admin-modulo-indicador">

            <span>Clientes asociados</span>

            <strong>

              {cargandoDatos

                ? "—"

                : indicadores.clientes.toLocaleString(

                    "es-CL"

                  )}

            </strong>

          </article>

        </section>

        {/* MENSAJES */}

        {error && (

          <div

            className="admin-alert admin-alert-error"

            role="alert"

          >

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

          <div

            className="admin-alert admin-alert-success"

            role="status"

          >

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

        <div className="admin-modulo-distribucion sucursales-distribucion">

          {/* FORMULARIO */}

          <section

            ref={formularioRef}

            id="formulario-sucursales"

            className="admin-modulo-panel sucursales-panel"

          >

            <h2 className="admin-modulo-panel-titulo">

              {editandoId !== null

                ? "Editar sucursal"

                : "Registrar sucursal"}

            </h2>

            <p className="admin-modulo-descripcion">

              Completa la información de la sede.

            </p>

            <form

              onSubmit={guardarSucursal}

              className="admin-modulo-formulario sucursales-formulario"

            >

              <div className="admin-modulo-campo">

                <label htmlFor="sucursal-nombre">

                  Nombre de la sucursal *

                </label>

                <input

                  id="sucursal-nombre"

                  type="text"

                  required

                  maxLength={100}

                  value={formulario.nombre}

                  onChange={(evento) =>

                    cambiarCampo(

                      "nombre",

                      evento.target.value

                    )

                  }

                  placeholder="Ej: La Reina"

                />

              </div>

              <div className="admin-modulo-campo">

                <label htmlFor="sucursal-comuna">

                  Comuna *

                </label>

                <input

                  id="sucursal-comuna"

                  type="text"

                  required

                  maxLength={100}

                  value={formulario.comuna}

                  onChange={(evento) =>

                    cambiarCampo(

                      "comuna",

                      evento.target.value

                    )

                  }

                  placeholder="Ej: La Reina"

                />

              </div>

              <div className="admin-modulo-campo">

                <label htmlFor="sucursal-direccion">

                  Dirección

                </label>

                <input

                  id="sucursal-direccion"

                  type="text"

                  maxLength={255}

                  value={formulario.direccion}

                  onChange={(evento) =>

                    cambiarCampo(

                      "direccion",

                      evento.target.value

                    )

                  }

                  placeholder="Calle, número y local"

                />

              </div>

              <div className="admin-modulo-campo">

                <label htmlFor="sucursal-ciudad">

                  Ciudad

                </label>

                <input

                  id="sucursal-ciudad"

                  type="text"

                  maxLength={100}

                  value={formulario.ciudad}

                  onChange={(evento) =>

                    cambiarCampo(

                      "ciudad",

                      evento.target.value

                    )

                  }

                  placeholder="Ej: Santiago"

                />

              </div>

              <div className="admin-modulo-campo">

                <label htmlFor="sucursal-telefono">

                  Teléfono

                </label>

                <input

                  id="sucursal-telefono"

                  type="tel"

                  maxLength={30}

                  value={formulario.telefono}

                  onChange={(evento) =>

                    cambiarCampo(

                      "telefono",

                      evento.target.value

                    )

                  }

                  placeholder="Ej: +56 9 1234 5678"

                />

              </div>

              <div className="admin-modulo-campo">

                <label htmlFor="sucursal-horario">

                  Horario de atención

                </label>

                <input

                  id="sucursal-horario"

                  type="text"

                  maxLength={200}

                  value={formulario.horarioAtencion}

                  onChange={(evento) =>

                    cambiarCampo(

                      "horarioAtencion",

                      evento.target.value

                    )

                  }

                  placeholder="Ej: Lun-Vie 06:00-22:00"

                />

              </div>

              <div className="admin-modulo-campo">

                <label htmlFor="sucursal-estado">

                  Estado

                </label>

                <select

                  id="sucursal-estado"

                  value={formulario.estado}

                  onChange={(evento) =>

                    cambiarCampo(

                      "estado",

                      evento.target

                        .value as EstadoSucursal

                    )

                  }

                >

                  <option value="Activa">

                    Activa

                  </option>

                  <option value="Inactiva">

                    Inactiva

                  </option>

                </select>

              </div>

              <div className="admin-modulo-acciones sucursales-formulario-acciones">

                <button

                  type="submit"

                  disabled={guardando}

                  className="admin-modulo-boton admin-modulo-boton--principal fp-btn fp-btn-primary"

                >

                  {guardando

                    ? "Guardando..."

                    : editandoId !== null

                    ? "Guardar cambios"

                    : "Registrar sucursal"}

                </button>

                <button

                  type="button"

                  disabled={guardando}

                  className="fp-btn fp-btn-secondary"

                  onClick={limpiarFormulario}

                >

                  {editandoId !== null

                    ? "Cancelar edición"

                    : "Limpiar formulario"}

                </button>

              </div>

            </form>

          </section>

          {/* LISTADO */}

          <section className="admin-modulo-panel sucursales-panel">

            <div className="sucursales-listado-encabezado">

              <div>

                <h2 className="admin-modulo-panel-titulo">

                  Sucursales registradas

                </h2>

                <p className="admin-modulo-descripcion">

                  Mostrando {sucursalesFiltradas.length} de{" "}

                  {sucursales.length} sucursales

                </p>

              </div>

              <button

                type="button"

                className="fp-btn fp-btn-secondary"

                disabled={cargandoDatos}

                onClick={() => {

                  cargarDatos().catch((err: unknown) => {

                    console.error(

                      "Error al actualizar sucursales:",

                      err

                    );

                  });

                }}

              >

                {cargandoDatos

                  ? "Actualizando..."

                  : "Actualizar"}

              </button>

            </div>

            {/* FILTROS */}

            <div className="sucursales-filtros">

              <input

                type="search"

                className="admin-modulo-buscador"

                placeholder="Buscar sucursal, comuna, dirección..."

                aria-label="Buscar sucursales"

                value={busqueda}

                onChange={(evento) => {

                  setBusqueda(evento.target.value);

                  setPaginaActual(1);

                }}

              />

              <select

                className="admin-modulo-buscador"

                aria-label="Filtrar por estado"

                value={filtroEstado}

                onChange={(evento) => {

                  setFiltroEstado(evento.target.value);

                  setPaginaActual(1);

                }}

              >

                <option value="Todas">

                  Todos los estados

                </option>

                <option value="Activa">

                  Activas

                </option>

                <option value="Inactiva">

                  Inactivas

                </option>

              </select>

              <select

                className="admin-modulo-buscador"

                aria-label="Filtrar por comuna"

                value={filtroComuna}

                onChange={(evento) => {

                  setFiltroComuna(evento.target.value);

                  setPaginaActual(1);

                }}

              >

                <option value="Todas">

                  Todas las comunas

                </option>

                {comunas.map((comuna) => (

                  <option

                    key={comuna}

                    value={comuna}

                  >

                    {comuna}

                  </option>

                ))}

              </select>

            </div>

            {/* TARJETAS */}

            {cargandoDatos ? (

              <div className="admin-modulo-vacio">

                Cargando sucursales...

              </div>

            ) : sucursalesFiltradas.length === 0 ? (

              <div className="admin-modulo-vacio">

                No se encontraron sucursales.

              </div>

            ) : (

              <>

                <div className="sucursales-tarjetas">

                  {sucursalesPaginadas.map(

                    (sucursal) => {

                      const cantidadClientes =

                        clientesPorSucursal[

                          sucursal.id

                        ] ?? 0;

                      return (

                        <article

                          key={sucursal.id}

                          className="sucursales-tarjeta admin-modulo-panel"

                        >

                          <div className="sucursales-tarjeta-encabezado">

                            <div>

                              <h3>

                                {sucursal.nombre}

                              </h3>

                              <p>

                                {sucursal.comuna}

                              </p>

                            </div>

                            <span

                              className={

                                sucursal.estado === "Activa"

                                  ? "admin-modulo-estado admin-modulo-estado--activo"

                                  : "admin-modulo-estado admin-modulo-estado--inactivo"

                              }

                            >

                              {sucursal.estado}

                            </span>

                          </div>

                          <div className="sucursales-tarjeta-datos">

                            <p>

                              <strong>

                                Dirección:

                              </strong>{" "}

                              {sucursal.direccion ||

                                "No registrada"}

                            </p>

                            <p>

                              <strong>

                                Ciudad:

                              </strong>{" "}

                              {sucursal.ciudad ||

                                "No registrada"}

                            </p>

                            <p>

                              <strong>

                                Teléfono:

                              </strong>{" "}

                              {sucursal.telefono ||

                                "No registrado"}

                            </p>

                            <p>

                              <strong>

                                Horario:

                              </strong>{" "}

                              {sucursal.horarioAtencion ||

                                "No registrado"}

                            </p>

                          </div>

                          <div className="sucursales-tarjeta-clientes">

                            <span>

                              Clientes asociados

                            </span>

                            <strong>

                              {cantidadClientes.toLocaleString(

                                "es-CL"

                              )}

                            </strong>

                          </div>

                          <div className="sucursales-tarjeta-acciones">

                            <button

                              type="button"

                              className="fp-btn fp-btn-secondary"

                              onClick={() =>

                                setSucursalDetalle(

                                  sucursal

                                )

                              }

                            >

                              Ver detalles

                            </button>

                            <button

                              type="button"

                              className="fp-btn fp-btn-secondary"

                              onClick={() =>

                                editarSucursal(

                                  sucursal

                                )

                              }

                            >

                              Editar

                            </button>

                            <button

                              type="button"

                              className={

                                sucursal.estado === "Activa"

                                  ? "fp-btn fp-btn-danger"

                                  : "fp-btn fp-btn-primary"

                              }

                              disabled={

                                procesandoId !== null

                              }

                              onClick={() => {

                                cambiarEstado(

                                  sucursal

                                ).catch(console.error);

                              }}

                            >

                              {procesandoId === sucursal.id

                                ? "Procesando..."

                                : sucursal.estado === "Activa"

                                ? "Desactivar"

                                : "Activar"}

                            </button>

                            <button

                              type="button"

                              className="fp-btn fp-btn-danger"

                              disabled={

                                cantidadClientes > 0 ||

                                procesandoId !== null

                              }

                              title={

                                cantidadClientes > 0

                                  ? "No se puede eliminar: tiene clientes asociados"

                                  : "Eliminar sucursal"

                              }

                              onClick={() => {

                                eliminarSucursal(

                                  sucursal

                                ).catch(console.error);

                              }}

                            >

                              {procesandoId === sucursal.id

                                ? "Procesando..."

                                : "Eliminar"}

                            </button>

                          </div>

                        </article>

                      );

                    }

                  )}

                </div>

                {/* PAGINACIÓN */}

                {totalPaginas > 1 && (

                  <div className="clientes-paginacion sucursales-paginacion">

                    <button

                      type="button"

                      className="fp-btn fp-btn-secondary"

                      disabled={paginaSegura === 1}

                      onClick={() =>

                        setPaginaActual(

                          Math.max(

                            1,

                            paginaSegura - 1

                          )

                        )

                      }

                    >

                      Anterior

                    </button>

                    <span>

                      Página {paginaSegura} de{" "}

                      {totalPaginas}

                    </span>

                    <button

                      type="button"

                      className="fp-btn fp-btn-secondary"

                      disabled={

                        paginaSegura === totalPaginas

                      }

                      onClick={() =>

                        setPaginaActual(

                          Math.min(

                            totalPaginas,

                            paginaSegura + 1

                          )

                        )

                      }

                    >

                      Siguiente

                    </button>

                  </div>

                )}

              </>

            )}

          </section>

        </div>

        {/* MODAL DE DETALLES */}

        {sucursalDetalle && (

          <div

            className="clientes-modal-overlay"

            onClick={() =>

              setSucursalDetalle(null)

            }

          >

            <div

              className="clientes-modal sucursales-modal"

              role="dialog"

              aria-modal="true"

              aria-labelledby="detalle-sucursal-titulo"

              onClick={(evento) =>

                evento.stopPropagation()

              }

            >

              <p className="admin-modulo-etiqueta">

                DETALLE DE SUCURSAL

              </p>

              <h2 id="detalle-sucursal-titulo">

                {sucursalDetalle.nombre}

              </h2>

              <div className="clientes-detalles">

                <p>

                  <strong>Nombre:</strong>{" "}

                  {sucursalDetalle.nombre}

                </p>

                <p>

                  <strong>Dirección:</strong>{" "}

                  {sucursalDetalle.direccion ||

                    "No registrada"}

                </p>

                <p>

                  <strong>Comuna:</strong>{" "}

                  {sucursalDetalle.comuna}

                </p>

                <p>

                  <strong>Ciudad:</strong>{" "}

                  {sucursalDetalle.ciudad ||

                    "No registrada"}

                </p>

                <p>

                  <strong>Teléfono:</strong>{" "}

                  {sucursalDetalle.telefono ||

                    "No registrado"}

                </p>

                <p>

                  <strong>Horario:</strong>{" "}

                  {sucursalDetalle.horarioAtencion ||

                    "No registrado"}

                </p>

                <p>

                  <strong>Estado:</strong>{" "}

                  {sucursalDetalle.estado}

                </p>

                <p>

                  <strong>

                    Clientes asociados:

                  </strong>{" "}

                  {(

                    clientesPorSucursal[

                      sucursalDetalle.id

                    ] ?? 0

                  ).toLocaleString("es-CL")}

                </p>

              </div>

              <div className="clientes-modal-acciones">

                <button

                  type="button"

                  className="fp-btn fp-btn-secondary"

                  onClick={() =>

                    setSucursalDetalle(null)

                  }

                >

                  Cerrar

                </button>

                <button

                  type="button"

                  className="fp-btn fp-btn-primary"

                  onClick={() =>

                    editarSucursal(

                      sucursalDetalle

                    )

                  }

                >

                  Editar sucursal

                </button>

              </div>

            </div>

          </div>

        )}

      </div>


<style>{`
.sucursales-negro-rojo{background:#000!important;color:#f5f5f5!important;min-height:100vh;padding:32px 22px 70px}
.sucursales-negro-rojo *{box-sizing:border-box}
.sucursales-negro-rojo .admin-modulo-contenedor{max-width:1500px;margin:auto}
.sucursales-negro-rojo .admin-modulo-encabezado{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:26px}
.sucursales-negro-rojo .admin-modulo-etiqueta{color:#dc2626;font-size:12px;font-weight:800;letter-spacing:2px;margin:0 0 10px}
.sucursales-negro-rojo .admin-modulo-titulo{color:white;font-size:clamp(28px,3vw,42px);font-weight:850;margin:0 0 8px}
.sucursales-negro-rojo .admin-modulo-titulo span{color:#dc2626}
.sucursales-negro-rojo .admin-modulo-descripcion{color:#aaa;font-size:14px;margin:5px 0 16px;line-height:1.6}
.sucursales-negro-rojo .fp-btn{border:1px solid #444;border-radius:9px;background:#222;color:white;padding:10px 15px;font-size:13px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;transition:opacity .15s}
.sucursales-negro-rojo .fp-btn:hover{opacity:.85}
.sucursales-negro-rojo .fp-btn:disabled{opacity:.45;cursor:not-allowed}
.sucursales-negro-rojo .fp-btn-volver,.sucursales-negro-rojo .fp-btn-volver:hover{background:#262626!important;color:white!important;border-color:#404040!important;opacity:1!important;white-space:nowrap}
.sucursales-negro-rojo .fp-btn-primary,.sucursales-negro-rojo .admin-modulo-boton--principal{background:#dc2626!important;border-color:#dc2626!important;color:white!important}
.sucursales-negro-rojo .fp-btn-danger{background:#371717;border-color:#7f1d1d;color:#fecaca}
.sucursales-negro-rojo .admin-modulo-resumen{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:15px;margin:0 0 24px}
.sucursales-negro-rojo .admin-modulo-indicador{background:#0c0c0c;border:1px solid #303030;border-left:4px solid #dc2626;border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:12px}
.sucursales-negro-rojo .admin-modulo-indicador span{font-size:13px;color:#bbb}
.sucursales-negro-rojo .admin-modulo-indicador strong{font-size:30px;color:white}
.sucursales-negro-rojo .admin-modulo-distribucion{display:grid;grid-template-columns:minmax(300px,.85fr) minmax(0,1.65fr);gap:20px;align-items:start}
.sucursales-negro-rojo .admin-modulo-panel{background:#0b0b0b;border:1px solid #303030;border-radius:14px;padding:23px;min-width:0}
.sucursales-negro-rojo .admin-modulo-panel-titulo{font-size:21px;color:white;margin:0 0 8px;font-weight:800}
.sucursales-negro-rojo .admin-modulo-formulario{display:grid;gap:14px;margin-top:18px}
.sucursales-negro-rojo .admin-modulo-campo{display:flex;flex-direction:column;gap:7px}
.sucursales-negro-rojo .admin-modulo-campo label{font-size:13px;font-weight:700;color:#ddd}
.sucursales-negro-rojo input,.sucursales-negro-rojo select{background:#171717!important;color:#fff!important;border:1px solid #3b3b3b!important;border-radius:9px;padding:11px 12px;min-height:42px;width:100%;outline:none}
.sucursales-negro-rojo input:focus,.sucursales-negro-rojo select:focus{border-color:#dc2626!important}
.sucursales-negro-rojo input::placeholder{color:#777}
.sucursales-negro-rojo .admin-modulo-acciones{display:flex;gap:9px;flex-wrap:wrap;margin-top:8px}
.sucursales-negro-rojo .sucursales-listado-encabezado{display:flex;justify-content:space-between;align-items:start;gap:15px;margin-bottom:16px}
.sucursales-negro-rojo .sucursales-filtros{display:grid;grid-template-columns:minmax(0,1.6fr) repeat(2,minmax(0,1fr));gap:10px;margin-bottom:18px}
.sucursales-negro-rojo .sucursales-tarjetas{display:grid;gap:13px}
.sucursales-negro-rojo .sucursales-tarjeta{padding:18px;border-left:4px solid #dc2626}
.sucursales-negro-rojo .sucursales-tarjeta-encabezado{display:flex;justify-content:space-between;gap:12px;align-items:start;margin-bottom:14px}
.sucursales-negro-rojo .sucursales-tarjeta-encabezado h3{font-size:18px;color:white;margin:0 0 5px}
.sucursales-negro-rojo .sucursales-tarjeta-encabezado p{color:#aaa;margin:0;font-size:13px}
.sucursales-negro-rojo .admin-modulo-estado{border:1px solid #444;border-radius:99px;padding:5px 9px;font-size:12px;white-space:nowrap}
.sucursales-negro-rojo .admin-modulo-estado--activo{background:#11301c;color:#86efac;border-color:#23633a}
.sucursales-negro-rojo .admin-modulo-estado--inactivo{background:#331818;color:#fca5a5;border-color:#713333}
.sucursales-negro-rojo .sucursales-tarjeta-datos{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 15px}
.sucursales-negro-rojo .sucursales-tarjeta-datos p{font-size:13px;color:#b9b9b9;margin:4px 0;overflow-wrap:anywhere}
.sucursales-negro-rojo .sucursales-tarjeta-datos strong{color:#eee}
.sucursales-negro-rojo .sucursales-tarjeta-clientes{display:flex;align-items:center;justify-content:space-between;background:#161616;border-radius:9px;padding:12px 14px;margin:15px 0;color:#bbb;font-size:13px}
.sucursales-negro-rojo .sucursales-tarjeta-clientes strong{font-size:20px;color:white}
.sucursales-negro-rojo .sucursales-tarjeta-acciones{display:flex;gap:8px;flex-wrap:wrap}
.sucursales-negro-rojo .clientes-paginacion{display:flex;justify-content:center;align-items:center;gap:14px;margin-top:20px;font-size:13px}
.sucursales-negro-rojo .admin-modulo-vacio{padding:35px;text-align:center;color:#aaa;border:1px dashed #444;border-radius:10px}
.sucursales-negro-rojo .admin-alert{padding:14px;border-radius:9px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:center;gap:12px}
.sucursales-negro-rojo .admin-alert-error{background:#321616;color:#fecaca;border:1px solid #752323}
.sucursales-negro-rojo .admin-alert-success{background:#122a1b;color:#bbf7d0;border:1px solid #27563a}
.sucursales-negro-rojo .clientes-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px}
.sucursales-negro-rojo .clientes-modal{background:#101010;color:white;border:1px solid #444;border-left:4px solid #dc2626;border-radius:14px;padding:26px;max-width:560px;width:100%;max-height:90vh;overflow:auto}
.sucursales-negro-rojo .clientes-modal h2{font-size:24px;margin:0 0 18px}
.sucursales-negro-rojo .clientes-detalles{display:grid;gap:9px}
.sucursales-negro-rojo .clientes-detalles p{margin:0;color:#bbb;font-size:14px}
.sucursales-negro-rojo .clientes-detalles strong{color:white}
.sucursales-negro-rojo .clientes-modal-acciones{display:flex;gap:10px;justify-content:flex-end;margin-top:24px}
@media(max-width:1100px){.sucursales-negro-rojo .admin-modulo-distribucion{grid-template-columns:1fr}}
@media(max-width:700px){.sucursales-negro-rojo{padding:22px 12px 50px}.sucursales-negro-rojo .admin-modulo-resumen{grid-template-columns:repeat(2,minmax(0,1fr))}.sucursales-negro-rojo .admin-modulo-encabezado{flex-direction:column}.sucursales-negro-rojo .sucursales-filtros{grid-template-columns:1fr}.sucursales-negro-rojo .sucursales-tarjeta-datos{grid-template-columns:1fr}.sucursales-negro-rojo .sucursales-listado-encabezado{flex-wrap:wrap}}
`}</style>
</main>

  );

}
