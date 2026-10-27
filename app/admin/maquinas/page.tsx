
"use client";

/* eslint-disable @next/next/no-img-element */

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../auth/AuthContext";
import Toast from "../../components/Toast";

const API_URL = "http://localhost:3001/api";
const POR_PAGINA = 10;

type EstadoMaquina =
  | "Operativa"
  | "En mantención"
  | "Fuera de servicio";

interface Sucursal {
  id: number;
  nombre: string;
  comuna?: string;
  estado?: string;
}

interface Maquina {
  id: number;
  codigo: string;
  nombre: string;
  marca: string | null;
  modelo: string | null;
  sucursalId: number;
  sucursal?: Sucursal | null;
  estado: EstadoMaquina;
  fechaUltimaMantencion: string | null;
  fechaProximaMantencion: string | null;
  observaciones: string | null;
}

interface ImagenMaquina {
  id: number;
  categoria: string;
  referenciaId: number | null;
  orden: number;
}

interface FormularioMaquina {
  codigo: string;
  nombre: string;
  marca: string;
  modelo: string;
  sucursalId: string;
  estado: EstadoMaquina;
  fechaUltimaMantencion: string;
  fechaProximaMantencion: string;
  observaciones: string;
}

const ESTADOS: EstadoMaquina[] = [
  "Operativa",
  "En mantención",
  "Fuera de servicio",
];

const FORMULARIO_INICIAL: FormularioMaquina = {
  codigo: "",
  nombre: "",
  marca: "",
  modelo: "",
  sucursalId: "",
  estado: "Operativa",
  fechaUltimaMantencion: "",
  fechaProximaMantencion: "",
  observaciones: "",
};

function obtenerMensajeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const mensaje = error.response?.data?.mensaje;

    if (typeof mensaje === "string") return mensaje;

    if (error.response?.status === 401) {
      return "Tu sesión expiró. Inicia sesión nuevamente.";
    }

    if (error.response?.status === 403) {
      return "No tienes permisos para realizar esta operación.";
    }

    if (!error.response) {
      return "No se pudo conectar con el servidor.";
    }

    return "No fue posible completar la operación.";
  }

  return error instanceof Error
    ? error.message
    : "Ocurrió un error inesperado.";
}

function extraerMaquinas(datos: unknown): Maquina[] {
  if (
    datos &&
    typeof datos === "object" &&
    "maquinas" in datos &&
    Array.isArray(datos.maquinas)
  ) {
    return datos.maquinas;
  }

  throw new Error(
    "Formato de respuesta de máquinas no válido."
  );
}

function extraerSucursales(datos: unknown): Sucursal[] {
  if (Array.isArray(datos)) return datos;

  if (datos && typeof datos === "object") {
    if (
      "sucursales" in datos &&
      Array.isArray(datos.sucursales)
    ) {
      return datos.sucursales;
    }

    if ("data" in datos && Array.isArray(datos.data)) {
      return datos.data;
    }
  }

  throw new Error(
    "Formato de respuesta de sucursales no válido."
  );
}

function extraerImagenesMaquinas(
  datos: unknown
): ImagenMaquina[] {
  let lista: unknown = datos;

  if (
    datos &&
    typeof datos === "object" &&
    !Array.isArray(datos)
  ) {
    const respuesta = datos as Record<string, unknown>;
    lista = respuesta.imagenes ?? respuesta.data ?? [];
  }

  if (!Array.isArray(lista)) return [];

  return lista
    .filter((item): item is ImagenMaquina => {
      if (!item || typeof item !== "object") {
        return false;
      }

      const imagen = item as Record<string, unknown>;

      return (
        imagen.categoria === "maquina" &&
        Number.isSafeInteger(Number(imagen.id)) &&
        Number(imagen.id) > 0 &&
        imagen.referenciaId != null &&
        Number.isSafeInteger(
          Number(imagen.referenciaId)
        ) &&
        Number(imagen.referenciaId) > 0
      );
    })
    .map((imagen) => ({
      ...imagen,
      id: Number(imagen.id),
      referenciaId: Number(imagen.referenciaId),
      orden: Number(imagen.orden) || 0,
    }));
}

function mostrarFecha(fecha: string | null): string {
  if (!fecha) return "No registrada";

  const soloFecha = fecha.slice(0, 10);
  const partes = soloFecha.split("-");

  if (partes.length !== 3) return fecha;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function fechaInput(fecha: string | null): string {
  return fecha ? fecha.slice(0, 10) : "";
}

function claseEstado(estado: EstadoMaquina): string {
  switch (estado) {
    case "Operativa":
      return "maquinas-estado maquinas-estado-operativa admin-modulo-estado admin-modulo-estado--activo";
    case "En mantención":
      return "maquinas-estado maquinas-estado-mantencion admin-modulo-estado";
    case "Fuera de servicio":
      return "maquinas-estado maquinas-estado-fuera admin-modulo-estado admin-modulo-estado--inactivo";
  }
}

export default function MaquinasAdminPage() {
  const router = useRouter();
  const { usuario, token, cargando } = useAuth();
  const esAdmin = usuario?.rol === "admin";

  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [imagenesMaquinas, setImagenesMaquinas] =
    useState<ImagenMaquina[]>([]);
  const [fotos, setFotos] =
    useState<Record<number, string>>({});

  const [cargandoDatos, setCargandoDatos] =
    useState(true);
  const [cargaExitosa, setCargaExitosa] =
    useState(false);
  const [guardando, setGuardando] = useState(false);
  const [eliminandoId, setEliminandoId] =
    useState<number | null>(null);

  const [editandoId, setEditandoId] =
    useState<number | null>(null);

  const [formulario, setFormulario] =
    useState<FormularioMaquina>({
      ...FORMULARIO_INICIAL,
    });

  const [busqueda, setBusqueda] = useState("");
  const [filtroSucursal, setFiltroSucursal] =
    useState("");
  const [filtroEstado, setFiltroEstado] =
    useState("");
  const [paginaActual, setPaginaActual] = useState(1);

  const [detalle, setDetalle] =
    useState<Maquina | null>(null);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    if (cargando) return;

    if (!usuario) {
      router.replace("/login");
      return;
    }

    if (!esAdmin) {
      router.replace("/mi-cuenta");
    }
  }, [cargando, usuario, esAdmin, router]);

  const cargarDatos = useCallback(async () => {
    if (!token || !esAdmin) return;

    const configuracion = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    const [
      respuestaMaquinas,
      respuestaSucursales,
      respuestaImagenes,
    ] = await Promise.all([
      axios.get(
        `${API_URL}/maquinas`,
        configuracion
      ),
      axios.get(
        `${API_URL}/sucursales/admin`,
        configuracion
      ),
      axios.get(
        `${API_URL}/imagenes?categoria=maquina`,
        configuracion
      ),
    ]);

    setMaquinas(
      extraerMaquinas(respuestaMaquinas.data)
    );

    setSucursales(
      extraerSucursales(respuestaSucursales.data)
    );

    setImagenesMaquinas(
      extraerImagenesMaquinas(
        respuestaImagenes.data
      )
    );

    setCargaExitosa(true);
  }, [token, esAdmin]);

  useEffect(() => {
    if (cargando || !esAdmin || !token) return;

    let activo = true;

    async function iniciarCarga() {
      setCargandoDatos(true);

      try {
        await cargarDatos();
        if (activo) setError("");
      } catch (err) {
        if (activo) {
          setCargaExitosa(false);
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
  }, [cargando, esAdmin, token, cargarDatos]);

  // Fotografías privadas con autenticación.
  useEffect(() => {
    if (!token || !esAdmin) return;

    let cancelado = false;
    const urls: string[] = [];
    const controlador = new AbortController();

    async function cargarFotos() {
      const primeras =
        new Map<number, ImagenMaquina>();

      const ordenadas = [...imagenesMaquinas].sort(
        (a, b) =>
          a.orden - b.orden || b.id - a.id
      );

      for (const imagen of ordenadas) {
        if (
          imagen.referenciaId &&
          !primeras.has(imagen.referenciaId)
        ) {
          primeras.set(
            imagen.referenciaId,
            imagen
          );
        }
      }

      const entradas = await Promise.all(
        Array.from(primeras.entries()).map(
          async ([maquinaId, imagen]) => {
            try {
              const respuesta = await axios.get(
                `${API_URL}/imagenes/${imagen.id}/archivo-admin`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                  responseType: "blob",
                  signal: controlador.signal,
                }
              );

              if (cancelado) return null;

              const blob = respuesta.data as Blob;

              if (!blob.type.startsWith("image/")) {
                return null;
              }

              const url =
                URL.createObjectURL(blob);

              urls.push(url);

              return [
                maquinaId,
                url,
              ] as const;
            } catch {
              return null;
            }
          }
        )
      );

      if (!cancelado) {
        setFotos(
          Object.fromEntries(
            entradas.filter(
              (
                entrada
              ): entrada is readonly [
                number,
                string
              ] => entrada !== null
            )
          )
        );
      }
    }

    void cargarFotos();

    return () => {
      cancelado = true;
      controlador.abort();

      urls.forEach((url) =>
        URL.revokeObjectURL(url)
      );
    };
  }, [token, esAdmin, imagenesMaquinas]);

  const maquinasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return maquinas.filter((maquina) => {
      const sucursalNombre =
        maquina.sucursal?.nombre ??
        sucursales.find(
          (sucursal) =>
            sucursal.id === maquina.sucursalId
        )?.nombre ??
        "";

      const valores = [
        maquina.codigo,
        maquina.nombre,
        maquina.marca,
        maquina.modelo,
        sucursalNombre,
      ];

      const coincideBusqueda =
        !texto ||
        valores.some(
          (valor) =>
            typeof valor === "string" &&
            valor.toLowerCase().includes(texto)
        );

      const coincideSucursal =
        !filtroSucursal ||
        String(maquina.sucursalId) ===
          filtroSucursal;

      const coincideEstado =
        !filtroEstado ||
        maquina.estado === filtroEstado;

      return (
        coincideBusqueda &&
        coincideSucursal &&
        coincideEstado
      );
    });
  }, [
    maquinas,
    sucursales,
    busqueda,
    filtroSucursal,
    filtroEstado,
  ]);

  const indicadores = useMemo(
    () => ({
      total: maquinas.length,
      operativas: maquinas.filter(
        (maquina) =>
          maquina.estado === "Operativa"
      ).length,
      mantencion: maquinas.filter(
        (maquina) =>
          maquina.estado === "En mantención"
      ).length,
      fueraServicio: maquinas.filter(
        (maquina) =>
          maquina.estado === "Fuera de servicio"
      ).length,
    }),
    [maquinas]
  );

  const totalPaginas = Math.max(
    1,
    Math.ceil(
      maquinasFiltradas.length / POR_PAGINA
    )
  );

  const paginaSegura = Math.min(
    paginaActual,
    totalPaginas
  );

  const maquinasPaginadas =
    maquinasFiltradas.slice(
      (paginaSegura - 1) * POR_PAGINA,
      paginaSegura * POR_PAGINA
    );

  function cambiarCampo<
    K extends keyof FormularioMaquina
  >(
    nombre: K,
    valor: FormularioMaquina[K]
  ) {
    setFormulario((anterior) => ({
      ...anterior,
      [nombre]: valor,
    }));
  }

  function abrirEdicion(maquina: Maquina) {
    setFormulario({
      codigo: maquina.codigo,
      nombre: maquina.nombre,
      marca: maquina.marca ?? "",
      modelo: maquina.modelo ?? "",
      sucursalId: String(
        maquina.sucursalId
      ),
      estado: maquina.estado,
      fechaUltimaMantencion: fechaInput(
        maquina.fechaUltimaMantencion
      ),
      fechaProximaMantencion: fechaInput(
        maquina.fechaProximaMantencion
      ),
      observaciones:
        maquina.observaciones ?? "",
    });

    setEditandoId(maquina.id);
    setDetalle(null);
    setError("");
    setMensaje("");

    document
      .getElementById("formulario-maquinas")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }

  function cancelarEdicion() {
    if (guardando) return;

    setEditandoId(null);
    setFormulario({ ...FORMULARIO_INICIAL });
  }

  async function guardarMaquina(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    if (!token || !esAdmin || guardando) {
      return;
    }

    setError("");
    setMensaje("");

    if (
      !formulario.codigo.trim() ||
      !formulario.nombre.trim() ||
      !formulario.sucursalId
    ) {
      setError(
        "El código, nombre y sucursal son obligatorios."
      );
      return;
    }

    const sucursalId = Number(
      formulario.sucursalId
    );

    if (
      !Number.isInteger(sucursalId) ||
      sucursalId <= 0
    ) {
      setError(
        "Selecciona una sucursal válida."
      );
      return;
    }

    if (
      formulario.fechaUltimaMantencion &&
      formulario.fechaProximaMantencion &&
      formulario.fechaProximaMantencion <
        formulario.fechaUltimaMantencion
    ) {
      setError(
        "La próxima mantención no puede ser anterior a la última mantención."
      );
      return;
    }

    const datos = {
      codigo: formulario.codigo.trim(),
      nombre: formulario.nombre.trim(),
      marca:
        formulario.marca.trim() || null,
      modelo:
        formulario.modelo.trim() || null,
      sucursalId,
      estado: formulario.estado,
      fechaUltimaMantencion:
        formulario.fechaUltimaMantencion ||
        null,
      fechaProximaMantencion:
        formulario.fechaProximaMantencion ||
        null,
      observaciones:
        formulario.observaciones.trim() ||
        null,
    };

    setGuardando(true);

    try {
      const configuracion = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      if (editandoId !== null) {
        await axios.put(
          `${API_URL}/maquinas/${editandoId}`,
          datos,
          configuracion
        );
      } else {
        await axios.post(
          `${API_URL}/maquinas`,
          datos,
          configuracion
        );
      }

      await cargarDatos();

      setMensaje(
        editandoId !== null
          ? "Máquina actualizada correctamente."
          : "Máquina registrada correctamente."
      );

      setFormulario({
        ...FORMULARIO_INICIAL,
      });
      setEditandoId(null);
    } catch (err) {
      setError(obtenerMensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarMaquina(
    maquina: Maquina
  ) {
    if (
      !token ||
      !esAdmin ||
      eliminandoId !== null
    ) {
      return;
    }

    const confirmado = window.confirm(
      `¿Deseas eliminar la máquina "${maquina.nombre}" (${maquina.codigo})?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmado) return;

    setEliminandoId(maquina.id);
    setError("");
    setMensaje("");

    try {
      await axios.delete(
        `${API_URL}/maquinas/${maquina.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      await cargarDatos();

      setDetalle(null);
      setMensaje(
        "Máquina eliminada correctamente."
      );
    } catch (err) {
      setError(obtenerMensajeError(err));
    } finally {
      setEliminandoId(null);
    }
  }

  function nombreSucursal(
    maquina: Maquina
  ): string {
    return (
      maquina.sucursal?.nombre ??
      sucursales.find(
        (sucursal) =>
          sucursal.id === maquina.sucursalId
      )?.nombre ??
      "Sin información"
    );
  }

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

  return (
    <main className="admin-clientes maquinas-pagina">
      <style>{`
/* Apariencia local: Gestión de Máquinas. No modifica estilos globales. */
.maquinas-pagina{background:#000!important;color:#fff!important;min-height:100vh;width:100%;padding:28px 24px 64px;box-sizing:border-box}
.maquinas-pagina .maquinas-contenedor{max-width:1600px;margin:0 auto;width:100%}
.maquinas-pagina .admin-modulo-encabezado{display:flex;justify-content:space-between;align-items:center;gap:24px;margin-bottom:30px;flex-wrap:wrap}
.maquinas-pagina .admin-modulo-etiqueta{color:#dc2626;font-size:12px;font-weight:800;letter-spacing:2px;margin:0 0 8px}
.maquinas-pagina .admin-modulo-titulo{color:#fff;font-size:clamp(27px,3vw,38px);font-weight:800;margin:0 0 9px}
.maquinas-pagina .admin-modulo-titulo span{color:#dc2626}
.maquinas-pagina .admin-modulo-descripcion{color:#a3a3a3;margin:6px 0 0;font-size:14px}
.maquinas-pagina .maquinas-volver{display:inline-flex;align-items:center;justify-content:center;padding:13px 19px;border-radius:9px;border:1px solid #444;background:#202024!important;color:#fff!important;text-decoration:none;font-weight:700;font-size:13px;white-space:nowrap;transition:none}
.maquinas-pagina .maquinas-volver:hover,.maquinas-pagina .maquinas-volver:focus{background:#202024!important;border-color:#444!important;color:#fff!important}
.maquinas-pagina .maquinas-indicadores{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin:0 0 24px}
.maquinas-pagina .maquinas-indicadores .admin-modulo-indicador{background:#101010!important;border:1px solid #303030!important;border-left:4px solid #dc2626!important;border-radius:12px;padding:22px 24px;display:flex;flex-direction:column;gap:11px;min-width:0;box-shadow:none;color:#fff}
.maquinas-pagina .maquinas-indicadores span{color:#b7b7b7;font-size:14px}
.maquinas-pagina .maquinas-indicadores strong{font-size:30px;line-height:1.1;color:#fff}
.maquinas-pagina .admin-modulo-distribucion{display:grid;grid-template-columns:minmax(290px,340px) minmax(0,1fr);gap:20px;align-items:start}
.maquinas-pagina .maquinas-panel,.maquinas-pagina .maquinas-inventario{background:#101010!important;color:#fff!important;border:1px solid #303030!important;border-radius:13px;padding:24px;min-width:0;box-shadow:none}
.maquinas-pagina .admin-modulo-panel-titulo{font-size:19px;color:#fff!important;font-weight:800;margin:0 0 18px}
.maquinas-pagina .maquinas-formulario{display:grid;gap:15px}
.maquinas-pagina .admin-modulo-campo{display:flex;flex-direction:column;gap:7px;min-width:0}
.maquinas-pagina .admin-modulo-campo label{font-size:13px;color:#f1f1f1;font-weight:650}
.maquinas-pagina .admin-modulo-campo input,.maquinas-pagina .admin-modulo-campo select,.maquinas-pagina .admin-modulo-campo textarea,.maquinas-pagina .maquinas-filtros input,.maquinas-pagina .maquinas-filtros select{width:100%;min-width:0;box-sizing:border-box;border:1px solid #3e3e3e!important;border-radius:8px;background:#090909!important;color:#fff!important;padding:11px 12px;min-height:43px;font:inherit;color-scheme:dark}
.maquinas-pagina input:focus,.maquinas-pagina select:focus,.maquinas-pagina textarea:focus{outline:2px solid #dc2626;outline-offset:1px}
.maquinas-pagina input::placeholder,.maquinas-pagina textarea::placeholder{color:#858585}
.maquinas-pagina .admin-modulo-acciones{display:flex;flex-wrap:wrap;gap:10px;margin-top:8px}
.maquinas-pagina .fp-btn{border-radius:8px;padding:10px 14px;font-weight:700;font-size:13px;cursor:pointer;text-decoration:none}
.maquinas-pagina button.fp-btn-primary{background:#dc2626!important;border:1px solid #dc2626!important;color:white!important}
.maquinas-pagina button.fp-btn-secondary{background:#242424!important;border:1px solid #444!important;color:#fff!important}
.maquinas-pagina button.fp-btn-danger{background:#5d161b!important;border:1px solid #a82b32!important;color:#fff!important}
.maquinas-pagina button:disabled{opacity:.5;cursor:not-allowed}
.maquinas-pagina .maquinas-inventario-encabezado{display:flex;align-items:start;justify-content:space-between;gap:14px;margin-bottom:18px}
.maquinas-pagina .maquinas-inventario-encabezado .admin-modulo-panel-titulo{margin-bottom:4px}
.maquinas-pagina .maquinas-filtros{display:grid;grid-template-columns:minmax(0,2fr) minmax(140px,1fr) minmax(140px,1fr);gap:10px;margin-bottom:20px}
.maquinas-pagina .maquinas-tabla-contenedor{overflow-x:auto;width:100%}
.maquinas-pagina .maquinas-tabla{width:100%;border-collapse:collapse;min-width:860px;text-align:left}
.maquinas-pagina .maquinas-tabla th{background:#1b1b1b!important;color:#d0d0d0!important;padding:13px 12px;font-size:12px;white-space:nowrap}
.maquinas-pagina .maquinas-tabla td{padding:14px 12px;border-bottom:1px solid #303030;color:#e6e6e6;vertical-align:middle;font-size:13px}
.maquinas-pagina .maquinas-tabla td strong{color:#fff}
.maquinas-pagina .maquinas-tabla td div:not(.maquinas-tabla-acciones){color:#a3a3a3}
.maquinas-pagina .maquinas-tabla-acciones{display:flex;flex-wrap:wrap;gap:7px}
.maquinas-pagina .maquinas-estado{display:inline-flex;padding:6px 10px;border-radius:999px;font-size:12px;font-weight:750}
.maquinas-pagina .maquinas-estado-operativa{background:#153c2b;color:#86efac}
.maquinas-pagina .maquinas-estado-mantencion{background:#473514;color:#fde68a}
.maquinas-pagina .maquinas-estado-fuera{background:#4c1f24;color:#fca5a5}
.maquinas-pagina .clientes-paginacion{display:flex;justify-content:center;align-items:center;gap:14px;margin-top:22px;flex-wrap:wrap}
.maquinas-pagina .admin-modulo-vacio{color:#aaa;padding:28px 12px;text-align:center}
.maquinas-pagina .clientes-modal-overlay{position:fixed;inset:0;background:#000b;display:flex;justify-content:center;align-items:center;z-index:1000;padding:16px}
.maquinas-pagina .clientes-modal{background:#111!important;color:#fff!important;border:1px solid #444;border-radius:14px;padding:25px;width:min(100%,530px);max-height:90vh;overflow:auto}
.maquinas-pagina .clientes-modal h2{color:#fff;margin:0 0 18px}
.maquinas-pagina .clientes-detalles p{color:#ddd;margin:10px 0}
.maquinas-pagina .clientes-modal-acciones{display:flex;gap:10px;justify-content:flex-end;margin-top:20px}
@media(max-width:1150px){.maquinas-pagina .admin-modulo-distribucion{grid-template-columns:1fr}.maquinas-pagina .maquinas-indicadores{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:650px){.maquinas-pagina{padding:20px 12px 40px}.maquinas-pagina .maquinas-indicadores{gap:10px}.maquinas-pagina .maquinas-indicadores .admin-modulo-indicador{padding:16px}.maquinas-pagina .maquinas-panel,.maquinas-pagina .maquinas-inventario{padding:16px}.maquinas-pagina .maquinas-filtros{grid-template-columns:1fr}}
`}</style>
      <div className="admin-modulo-contenedor maquinas-contenedor">
        {/* ENCABEZADO */}
        <header className="admin-modulo-encabezado">
          <div>
            <p className="admin-modulo-etiqueta">
              FOCUS POWER FIT
            </p>

            <h1 className="admin-modulo-titulo">
              Gestión de <span>Máquinas</span>
            </h1>

            <p className="admin-modulo-descripcion">
              Administra el inventario, estado y
              mantenciones de los equipos de cada
              sucursal.
            </p>
          </div>

          <Link
            href="/admin"
            className="maquinas-volver"
          >
            Volver al panel
          </Link>
        </header>

        {/* MENSAJES */}
        {error && (
          <Toast
            mensaje={error}
            tipo="error"
            duracion={0}
            onCerrar={() => setError("")}
          />
        )}

        {mensaje && (
          <Toast
            mensaje={mensaje}
            tipo="success"
            duracion={3000}
            onCerrar={() => setMensaje("")}
          />
        )}

        {/* INDICADORES */}
        <section className="admin-modulo-resumen maquinas-indicadores">
          <article className="admin-modulo-indicador">
            <span>Total de máquinas</span>
            <strong>
              {cargandoDatos || !cargaExitosa
                ? "—"
                : indicadores.total}
            </strong>
          </article>

          <article className="admin-modulo-indicador">
            <span>Operativas</span>
            <strong>
              {cargandoDatos || !cargaExitosa
                ? "—"
                : indicadores.operativas}
            </strong>
          </article>

          <article className="admin-modulo-indicador">
            <span>En mantención</span>
            <strong>
              {cargandoDatos || !cargaExitosa
                ? "—"
                : indicadores.mantencion}
            </strong>
          </article>

          <article className="admin-modulo-indicador">
            <span>Fuera de servicio</span>
            <strong>
              {cargandoDatos || !cargaExitosa
                ? "—"
                : indicadores.fueraServicio}
            </strong>
          </article>
        </section>

        <div className="admin-modulo-distribucion">
          {/* FORMULARIO */}
          <section
            id="formulario-maquinas"
            className="admin-modulo-panel maquinas-panel"
          >
            <div className="maquinas-panel-encabezado">
              <h2 className="admin-modulo-panel-titulo">
                {editandoId !== null
                  ? "Editar máquina"
                  : "Registrar máquina"}
              </h2>
            </div>

            <form
              onSubmit={guardarMaquina}
              className="admin-modulo-formulario maquinas-formulario"
            >
              <div className="admin-modulo-campo">
                <label htmlFor="maquina-codigo">
                  Código de máquina *
                </label>
                <input
                  id="maquina-codigo"
                  type="text"
                  maxLength={50}
                  required
                  value={formulario.codigo}
                  onChange={(evento) =>
                    cambiarCampo(
                      "codigo",
                      evento.target.value
                    )
                  }
                  placeholder="Código interno"
                />
              </div>

              <div className="admin-modulo-campo">
                <label htmlFor="maquina-nombre">
                  Nombre de máquina *
                </label>
                <input
                  id="maquina-nombre"
                  type="text"
                  maxLength={150}
                  required
                  value={formulario.nombre}
                  onChange={(evento) =>
                    cambiarCampo(
                      "nombre",
                      evento.target.value
                    )
                  }
                  placeholder="Nombre del equipo"
                />
              </div>

              <div className="admin-modulo-campo">
                <label htmlFor="maquina-marca">
                  Marca
                </label>
                <input
                  id="maquina-marca"
                  type="text"
                  maxLength={100}
                  value={formulario.marca}
                  onChange={(evento) =>
                    cambiarCampo(
                      "marca",
                      evento.target.value
                    )
                  }
                  placeholder="Marca del fabricante"
                />
              </div>

              <div className="admin-modulo-campo">
                <label htmlFor="maquina-modelo">
                  Modelo
                </label>
                <input
                  id="maquina-modelo"
                  type="text"
                  maxLength={100}
                  value={formulario.modelo}
                  onChange={(evento) =>
                    cambiarCampo(
                      "modelo",
                      evento.target.value
                    )
                  }
                  placeholder="Modelo del equipo"
                />
              </div>

              <div className="admin-modulo-campo">
                <label htmlFor="maquina-sucursal">
                  Sucursal *
                </label>
                <select
                  id="maquina-sucursal"
                  required
                  value={formulario.sucursalId}
                  onChange={(evento) =>
                    cambiarCampo(
                      "sucursalId",
                      evento.target.value
                    )
                  }
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

                {cargaExitosa &&
                  sucursales.length === 0 && (
                    <small>
                      No hay sucursales registradas.
                    </small>
                  )}
              </div>

              <div className="admin-modulo-campo">
                <label htmlFor="maquina-estado">
                  Estado *
                </label>
                <select
                  id="maquina-estado"
                  required
                  value={formulario.estado}
                  onChange={(evento) =>
                    cambiarCampo(
                      "estado",
                      evento.target
                        .value as EstadoMaquina
                    )
                  }
                >
                  {ESTADOS.map((estado) => (
                    <option
                      key={estado}
                      value={estado}
                    >
                      {estado}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-modulo-campo">
                <label htmlFor="maquina-ultima">
                  Última mantención
                </label>
                <input
                  id="maquina-ultima"
                  type="date"
                  value={
                    formulario.fechaUltimaMantencion
                  }
                  onChange={(evento) =>
                    cambiarCampo(
                      "fechaUltimaMantencion",
                      evento.target.value
                    )
                  }
                />
              </div>

              <div className="admin-modulo-campo">
                <label htmlFor="maquina-proxima">
                  Próxima mantención
                </label>
                <input
                  id="maquina-proxima"
                  type="date"
                  value={
                    formulario.fechaProximaMantencion
                  }
                  onChange={(evento) =>
                    cambiarCampo(
                      "fechaProximaMantencion",
                      evento.target.value
                    )
                  }
                />
              </div>

              <div className="admin-modulo-campo">
                <label htmlFor="maquina-observaciones">
                  Observaciones
                </label>
                <textarea
                  id="maquina-observaciones"
                  rows={4}
                  value={
                    formulario.observaciones
                  }
                  onChange={(evento) =>
                    cambiarCampo(
                      "observaciones",
                      evento.target.value
                    )
                  }
                  placeholder="Detalles del equipo o sus mantenciones..."
                />
              </div>

              <div className="admin-modulo-acciones">
                {editandoId !== null && (
                  <button
                    type="button"
                    onClick={cancelarEdicion}
                    disabled={guardando}
                    className="fp-btn fp-btn-secondary"
                  >
                    Cancelar edición
                  </button>
                )}

                <button
                  type="submit"
                  disabled={
                    guardando ||
                    sucursales.length === 0
                  }
                  className="admin-modulo-boton admin-modulo-boton--principal fp-btn fp-btn-primary"
                >
                  {guardando
                    ? "Guardando..."
                    : editandoId !== null
                      ? "Guardar cambios"
                      : "Registrar máquina"}
                </button>
              </div>
            </form>
          </section>

          {/* INVENTARIO */}
          <section className="admin-modulo-panel maquinas-inventario">
            <div className="maquinas-inventario-encabezado">
              <div>
                <h2 className="admin-modulo-panel-titulo">
                  Inventario de máquinas
                </h2>
                <p className="admin-modulo-descripcion">
                  {cargaExitosa
                    ? maquinasFiltradas.length
                    : "—"}{" "}
                  resultados
                </p>
              </div>

              <button
                type="button"
                className="fp-btn fp-btn-secondary"
                disabled={cargandoDatos}
                onClick={() => {
                  setCargandoDatos(true);
                  setError("");

                  void cargarDatos()
                    .catch((err) => {
                      setCargaExitosa(false);
                      setError(
                        obtenerMensajeError(err)
                      );
                    })
                    .finally(() =>
                      setCargandoDatos(false)
                    );
                }}
              >
                Actualizar
              </button>
            </div>

            {/* FILTROS */}
            <div className="maquinas-filtros">
              <input
                type="search"
                className="admin-modulo-buscador"
                value={busqueda}
                onChange={(evento) => {
                  setBusqueda(evento.target.value);
                  setPaginaActual(1);
                }}
                placeholder="Buscar por código, nombre, marca..."
                aria-label="Buscar máquinas"
              />

              <select
                className="admin-select"
                value={filtroSucursal}
                onChange={(evento) => {
                  setFiltroSucursal(
                    evento.target.value
                  );
                  setPaginaActual(1);
                }}
                aria-label="Filtrar por sucursal"
              >
                <option value="">
                  Todas las sucursales
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

              <select
                className="admin-select"
                value={filtroEstado}
                onChange={(evento) => {
                  setFiltroEstado(
                    evento.target.value
                  );
                  setPaginaActual(1);
                }}
                aria-label="Filtrar por estado"
              >
                <option value="">
                  Todos los estados
                </option>
                {ESTADOS.map((estado) => (
                  <option
                    key={estado}
                    value={estado}
                  >
                    {estado}
                  </option>
                ))}
              </select>
            </div>

            {cargandoDatos ? (
              <div className="admin-modulo-vacio">
                Cargando máquinas...
              </div>
            ) : !cargaExitosa ? (
              <div className="admin-modulo-vacio">
                No se pudo cargar el inventario.
                Comprueba la conexión con el backend.
              </div>
            ) : maquinasFiltradas.length === 0 ? (
              <div className="admin-modulo-vacio">
                {maquinas.length === 0
                  ? "No hay máquinas registradas."
                  : "No se encontraron máquinas con esos filtros."}
              </div>
            ) : (
              <>
                <div className="maquinas-tabla-contenedor">
                  <table className="maquinas-tabla">
                    <thead>
                      <tr>
                        <th>Foto</th>
                        <th>Código</th>
                        <th>Máquina</th>
                        <th>Sucursal</th>
                        <th>Estado</th>
                        <th>Próxima mantención</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>

                    <tbody>
                      {maquinasPaginadas.map(
                        (maquina) => (
                          <tr key={maquina.id}>
                            <td>
                              {fotos[maquina.id] ? (
                                <img
                                  src={
                                    fotos[maquina.id]
                                  }
                                  alt={`Fotografía de ${maquina.nombre}`}
                                  style={{
                                    width: 64,
                                    height: 64,
                                    objectFit: "cover",
                                    borderRadius: 8,
                                  }}
                                />
                              ) : (
                                <span>
                                  Sin foto
                                </span>
                              )}
                            </td>

                            <td>
                              <strong>
                                {maquina.codigo}
                              </strong>
                            </td>

                            <td>
                              <strong>
                                {maquina.nombre}
                              </strong>
                              <div>
                                {[
                                  maquina.marca,
                                  maquina.modelo,
                                ]
                                  .filter(Boolean)
                                  .join(" · ") ||
                                  "Sin marca ni modelo"}
                              </div>
                            </td>

                            <td>
                              {nombreSucursal(
                                maquina
                              )}
                            </td>

                            <td>
                              <span
                                className={claseEstado(
                                  maquina.estado
                                )}
                              >
                                {maquina.estado}
                              </span>
                            </td>

                            <td>
                              {mostrarFecha(
                                maquina.fechaProximaMantencion
                              )}
                            </td>

                            <td>
                              <div className="maquinas-tabla-acciones">
                                <button
                                  type="button"
                                  className="fp-btn fp-btn-secondary"
                                  onClick={() =>
                                    setDetalle(
                                      maquina
                                    )
                                  }
                                >
                                  Ver
                                </button>

                                <button
                                  type="button"
                                  className="fp-btn fp-btn-secondary"
                                  onClick={() =>
                                    abrirEdicion(
                                      maquina
                                    )
                                  }
                                >
                                  Editar
                                </button>

                                <button
                                  type="button"
                                  className="fp-btn fp-btn-danger"
                                  disabled={
                                    eliminandoId !==
                                    null
                                  }
                                  onClick={() =>
                                    void eliminarMaquina(
                                      maquina
                                    )
                                  }
                                >
                                  {eliminandoId ===
                                  maquina.id
                                    ? "Eliminando..."
                                    : "Eliminar"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>

                {totalPaginas > 1 && (
                  <div className="clientes-paginacion">
                    <button
                      type="button"
                      className="fp-btn fp-btn-secondary"
                      disabled={
                        paginaSegura === 1
                      }
                      onClick={() =>
                        setPaginaActual(
                          paginaSegura - 1
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
                        paginaSegura ===
                        totalPaginas
                      }
                      onClick={() =>
                        setPaginaActual(
                          paginaSegura + 1
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

        {/* DETALLE */}
        {detalle && (
          <div
            className="clientes-modal-overlay"
            onClick={() => setDetalle(null)}
          >
            <div
              className="clientes-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="detalle-maquina"
              onClick={(evento) =>
                evento.stopPropagation()
              }
            >
              <h2 id="detalle-maquina">
                Detalle de máquina
              </h2>

              {fotos[detalle.id] && (
                <img
                  src={fotos[detalle.id]}
                  alt={detalle.nombre}
                  style={{
                    width: "100%",
                    maxHeight: 230,
                    objectFit: "contain",
                    borderRadius: 10,
                  }}
                />
              )}

              <div className="clientes-detalles">
                <p>
                  <strong>Código:</strong>{" "}
                  {detalle.codigo}
                </p>
                <p>
                  <strong>Nombre:</strong>{" "}
                  {detalle.nombre}
                </p>
                <p>
                  <strong>Marca:</strong>{" "}
                  {detalle.marca || "No registrada"}
                </p>
                <p>
                  <strong>Modelo:</strong>{" "}
                  {detalle.modelo || "No registrado"}
                </p>
                <p>
                  <strong>Sucursal:</strong>{" "}
                  {nombreSucursal(detalle)}
                </p>
                <p>
                  <strong>Estado:</strong>{" "}
                  {detalle.estado}
                </p>
                <p>
                  <strong>Última mantención:</strong>{" "}
                  {mostrarFecha(
                    detalle.fechaUltimaMantencion
                  )}
                </p>
                <p>
                  <strong>Próxima mantención:</strong>{" "}
                  {mostrarFecha(
                    detalle.fechaProximaMantencion
                  )}
                </p>
                <p>
                  <strong>Observaciones:</strong>{" "}
                  {detalle.observaciones ||
                    "Sin observaciones"}
                </p>
              </div>

              <div className="clientes-modal-acciones">
                <button
                  type="button"
                  className="fp-btn fp-btn-secondary"
                  onClick={() =>
                    setDetalle(null)
                  }
                >
                  Cerrar
                </button>

                <button
                  type="button"
                  className="fp-btn fp-btn-primary"
                  onClick={() =>
                    abrirEdicion(detalle)
                  }
                >
                  Editar máquina
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
