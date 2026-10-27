

/* eslint-disable @next/next/no-img-element */

"use client";



import {

  useCallback,

  useEffect,

  useMemo,

  useRef,

  useState,

} from "react";

import type { FormEvent } from "react";

import Link from "next/link";

import axios from "axios";



const API = (

  process.env.NEXT_PUBLIC_API_URL ||

  "http://localhost:3001"

).replace(/\/+$/, "");



type Categoria = "profesor" | "sucursal" | "maquina" | "sitio";



type Imagen = {

  id: number;

  categoria: Categoria;

  referenciaId: number | null;

  nombreOriginal: string | null;

  mostrarPublicamente: boolean;

  orden: number;

};



type Registro = {

  id: number;

  nombre: string;

};



const CATEGORIAS: { value: Categoria; label: string }[] = [

  { value: "profesor", label: "Profesores" },

  { value: "sucursal", label: "Sucursales" },

  { value: "maquina", label: "Máquinas" },

  { value: "sitio", label: "Sitio web" },

];



const POR_PAGINA = 12;



function obtenerToken() {

  if (typeof window === "undefined") return "";

  return localStorage.getItem("focusPowerFitToken") || "";

}



function configuracionAuth() {

  return {

    headers: {

      Authorization: `Bearer ${obtenerToken()}`,

    },

  };

}



function obtenerMensajeError(error: unknown): string {

  if (axios.isAxiosError(error)) {

    const mensaje = error.response?.data?.mensaje;



    if (typeof mensaje === "string") return mensaje;



    if (error.response?.status === 401) {

      return "Tu sesión no es válida. Inicia sesión nuevamente.";

    }



    if (error.response?.status === 403) {

      return "No tienes permisos para administrar imágenes.";

    }



    return error.message;

  }



  return error instanceof Error

    ? error.message

    : "Ocurrió un error inesperado.";

}



function extraerLista(datos: unknown, claves: string[]): unknown[] {

  if (Array.isArray(datos)) return datos;



  if (datos && typeof datos === "object") {

    const objeto = datos as Record<string, unknown>;



    for (const clave of [...claves, "data", "resultados"]) {

      if (Array.isArray(objeto[clave])) {

        return objeto[clave] as unknown[];

      }

    }

  }



  return [];

}



function normalizarRegistros(

  datos: unknown,

  claves: string[]

): Registro[] {

  return extraerLista(datos, claves)

    .filter(

      (valor): valor is Record<string, unknown> =>

        valor !== null &&

        typeof valor === "object" &&

        !Array.isArray(valor)

    )

    .map((registro) => {

      const id = Number(registro.id);



      return {

        id,

        nombre: String(

          registro.nombre ||

          registro.descripcion ||

          `Registro #${id}`

        ),

      };

    })

    .filter(

      (registro) =>

        Number.isSafeInteger(registro.id) && registro.id > 0

    );

}



function nombreCategoria(categoria: Categoria) {

  return (

    CATEGORIAS.find((item) => item.value === categoria)?.label ||

    categoria

  );

}



function VistaPreviaImagen({

  imagen,

}: {

  imagen: Imagen;

}) {

  const [urlTemporal, setUrlTemporal] = useState("");

  const [cargando, setCargando] = useState(true);

  const [error, setError] = useState(false);



  useEffect(() => {

    const controlador = new AbortController();

    let urlCreada = "";

    let activo = true;



    async function cargar() {

      try {

        const respuesta = await axios.get(

          `${API}/api/imagenes/${imagen.id}/archivo-admin`,

          {

            ...configuracionAuth(),

            responseType: "blob",

            signal: controlador.signal,

          }

        );



        if (!activo) return;



        const blob = respuesta.data as Blob;



        if (!blob.type.startsWith("image/")) {

          throw new Error("El servidor no devolvió una imagen.");

        }



        urlCreada = URL.createObjectURL(blob);

        setUrlTemporal(urlCreada);

        setError(false);

      } catch (err) {

        if (activo && !axios.isCancel(err)) {

          setError(true);

        }

      } finally {

        if (activo) setCargando(false);

      }

    }



    void cargar();



    return () => {

      activo = false;

      controlador.abort();

      if (urlCreada) URL.revokeObjectURL(urlCreada);

    };

  }, [imagen.id]);



  if (cargando) {

    return (

      <div className="admin-imagenes-oculta">

        Cargando fotografía...

      </div>

    );

  }



  if (error || !urlTemporal) {

    return (

      <div className="admin-imagenes-oculta">

        No se pudo mostrar la fotografía.

      </div>

    );

  }



  return (

    <img

      src={urlTemporal}

      alt={imagen.nombreOriginal || "Fotografía de Focus Power Fit"}

      loading="lazy"

      style={{

        width: "100%",

        height: "100%",

        objectFit: "cover",

      }}

    />

  );

}



export default function AdministrarImagenes() {

  const [imagenes, setImagenes] = useState<Imagen[]>([]);

  const [categoria, setCategoria] =

    useState<Categoria>("profesor");

  const [referenciaId, setReferenciaId] = useState("");

  const [registros, setRegistros] = useState<Registro[]>([]);



  const [busqueda, setBusqueda] = useState("");

  const [filtroVisibilidad, setFiltroVisibilidad] =

    useState("Todas");

  const [paginaActual, setPaginaActual] = useState(1);



  const [archivo, setArchivo] = useState<File | null>(null);

  const [ordenNuevo, setOrdenNuevo] = useState(0);



  const [cargando, setCargando] = useState(true);

  const [cargandoRegistros, setCargandoRegistros] =

    useState(false);

  const [procesando, setProcesando] = useState(false);

  const [procesandoId, setProcesandoId] =

    useState<number | null>(null);



  const [imagenDetalle, setImagenDetalle] =

    useState<Imagen | null>(null);



  const [error, setError] = useState("");

  const [exito, setExito] = useState("");



  const inputArchivo = useRef<HTMLInputElement>(null);

  const operacionEnCurso = useRef(false);



  useEffect(() => {

    if (!exito) return;



    const temporizador = window.setTimeout(() => {

      setExito("");

    }, 3000);



    return () => window.clearTimeout(temporizador);

  }, [exito]);



  const cargarImagenes = useCallback(async () => {

    const respuesta = await axios.get(

      `${API}/api/imagenes`,

      configuracionAuth()

    );



    setImagenes(

      extraerLista(respuesta.data, ["imagenes"]) as Imagen[]

    );

  }, []);



  useEffect(() => {

    let activo = true;



    axios

      .get(`${API}/api/imagenes`, configuracionAuth())

      .then((respuesta) => {

        if (!activo) return;



        setImagenes(

          extraerLista(respuesta.data, ["imagenes"]) as Imagen[]

        );

      })

      .catch((err) => {

        if (activo) setError(obtenerMensajeError(err));

      })

      .finally(() => {

        if (activo) setCargando(false);

      });



    return () => {

      activo = false;

    };

  }, []);



  useEffect(() => {

    if (categoria === "sitio") {

      return;

    }



    let activo = true;



    const rutas: Record<Exclude<Categoria, "sitio">, string> = {

      profesor: "/api/profesores",

      sucursal: "/api/sucursales",

      maquina: "/api/maquinas",

    };



    const claves: Record<

      Exclude<Categoria, "sitio">,

      string[]

    > = {

      profesor: ["profesores"],

      sucursal: ["sucursales"],

      maquina: ["maquinas", "máquinas"],

    };



    axios

      .get(`${API}${rutas[categoria]}`, configuracionAuth())

      .then((respuesta) => {

        if (!activo) return;



        setRegistros(

          normalizarRegistros(

            respuesta.data,

            claves[categoria]

          )

        );

      })

      .catch((err) => {

        if (activo) setError(obtenerMensajeError(err));

      })

      .finally(() => {

        if (activo) setCargandoRegistros(false);

      });



    return () => {

      activo = false;

    };

  }, [categoria]);



  const seleccionarCategoria = (nueva: Categoria) => {

    setCategoria(nueva);

    setReferenciaId("");

    setRegistros([]);

    setCargandoRegistros(nueva !== "sitio");

    setBusqueda("");

    setPaginaActual(1);

    setError("");

  };



  async function subirImagen(

    evento: FormEvent<HTMLFormElement>

  ) {

    evento.preventDefault();



    if (operacionEnCurso.current) return;



    setError("");

    setExito("");



    if (!archivo) {

      setError("Selecciona una fotografía.");

      return;

    }



    if (

      categoria !== "sitio" &&

      (!referenciaId || !Number(referenciaId))

    ) {

      setError(

        "Selecciona el registro al que pertenece la fotografía."

      );

      return;

    }



    const tiposPermitidos = [

      "image/jpeg",

      "image/png",

      "image/webp",

    ];



    if (!tiposPermitidos.includes(archivo.type)) {

      setError("Solo se permiten imágenes JPG, PNG o WebP.");

      return;

    }



    if (archivo.size > 5 * 1024 * 1024) {

      setError("La fotografía no puede superar los 5 MB.");

      return;

    }



    if (!Number.isSafeInteger(ordenNuevo) || ordenNuevo < 0) {

      setError("El orden debe ser un entero positivo o cero.");

      return;

    }



    operacionEnCurso.current = true;

    setProcesando(true);



    try {

      const formulario = new FormData();



      formulario.append("imagen", archivo);

      formulario.append("categoria", categoria);

      formulario.append("orden", String(ordenNuevo));



      if (categoria !== "sitio") {

        formulario.append("referenciaId", referenciaId);

      }



      await axios.post(

        `${API}/api/imagenes`,

        formulario,

        configuracionAuth()

      );



      setArchivo(null);

      setOrdenNuevo(0);



      if (inputArchivo.current) {

        inputArchivo.current.value = "";

      }



      await cargarImagenes();



      setExito(

        categoria === "maquina"

          ? "Fotografía guardada. Solo los administradores pueden verla."

          : "Fotografía guardada. Puedes publicarla desde la biblioteca."

      );

    } catch (err) {

      setError(obtenerMensajeError(err));

    } finally {

      operacionEnCurso.current = false;

      setProcesando(false);

    }

  }



  async function cambiarVisibilidad(imagen: Imagen) {

    if (operacionEnCurso.current) return;



    if (imagen.categoria === "maquina") {

      setError(

        "Las fotografías de máquinas son privadas y no pueden publicarse."

      );

      return;

    }



    operacionEnCurso.current = true;

    setProcesandoId(imagen.id);

    setError("");

    setExito("");



    try {

      await axios.patch(

        `${API}/api/imagenes/${imagen.id}/visibilidad`,

        {

          mostrarPublicamente: !imagen.mostrarPublicamente,

        },

        configuracionAuth()

      );



      await cargarImagenes();

      setExito("Visibilidad actualizada correctamente.");

    } catch (err) {

      setError(obtenerMensajeError(err));

    } finally {

      operacionEnCurso.current = false;

      setProcesandoId(null);

    }

  }



  async function cambiarOrden(

    imagen: Imagen,

    nuevoOrden: number

  ) {

    if (operacionEnCurso.current) return;

    if (nuevoOrden === imagen.orden) return;



    if (

      !Number.isSafeInteger(nuevoOrden) ||

      nuevoOrden < 0

    ) {

      setError(

        "El orden debe ser un entero positivo o cero."

      );

      return;

    }



    operacionEnCurso.current = true;

    setProcesandoId(imagen.id);

    setError("");

    setExito("");



    try {

      await axios.patch(

        `${API}/api/imagenes/${imagen.id}/orden`,

        { orden: nuevoOrden },

        configuracionAuth()

      );



      await cargarImagenes();

      setExito("Orden actualizado correctamente.");

    } catch (err) {

      setError(obtenerMensajeError(err));

    } finally {

      operacionEnCurso.current = false;

      setProcesandoId(null);

    }

  }



  async function eliminarImagen(imagen: Imagen) {

    if (operacionEnCurso.current) return;



    const confirmar = window.confirm(

      `¿Seguro que deseas eliminar "${

        imagen.nombreOriginal || `Imagen #${imagen.id}`

      }"?\n\nEsta acción no se puede deshacer.`

    );



    if (!confirmar) return;



    operacionEnCurso.current = true;

    setProcesandoId(imagen.id);

    setError("");

    setExito("");



    try {

      await axios.delete(

        `${API}/api/imagenes/${imagen.id}`,

        configuracionAuth()

      );



      setImagenDetalle(null);

      await cargarImagenes();



      setExito(

        "Fotografía eliminada correctamente de la biblioteca."

      );

    } catch (err) {

      setError(obtenerMensajeError(err));

    } finally {

      operacionEnCurso.current = false;

      setProcesandoId(null);

    }

  }



  const imagenesFiltradas = useMemo(() => {

    const textoBuscado = busqueda.trim().toLowerCase();



    return imagenes

      .filter((imagen) => imagen.categoria === categoria)

      .filter((imagen) => {

        const texto = [

          imagen.nombreOriginal || "",

          nombreCategoria(imagen.categoria),

          imagen.referenciaId || "",

        ]

          .join(" ")

          .toLowerCase();



        const coincideBusqueda =

          texto.includes(textoBuscado);



        const esPublica =

          imagen.categoria !== "maquina" &&

          imagen.mostrarPublicamente;



        const coincideVisibilidad =

          filtroVisibilidad === "Todas" ||

          (filtroVisibilidad === "Publicas" && esPublica) ||

          (filtroVisibilidad === "Ocultas" && !esPublica);



        return coincideBusqueda && coincideVisibilidad;

      })

      .sort(

        (a, b) =>

          a.orden - b.orden || b.id - a.id

      );

  }, [imagenes, categoria, busqueda, filtroVisibilidad]);



  const total = imagenes.length;



  const publicas = imagenes.filter(

    (imagen) =>

      imagen.categoria !== "maquina" &&

      imagen.mostrarPublicamente

  ).length;



  const ocultas = total - publicas;



  const totalPaginas = Math.max(

    1,

    Math.ceil(imagenesFiltradas.length / POR_PAGINA)

  );



  const paginaSegura = Math.min(

    paginaActual,

    totalPaginas

  );



  const imagenesPaginadas = imagenesFiltradas.slice(

    (paginaSegura - 1) * POR_PAGINA,

    paginaSegura * POR_PAGINA

  );



  const actualizarBiblioteca = async () => {

    setCargando(true);

    setError("");



    try {

      await cargarImagenes();

    } catch (err) {

      setError(obtenerMensajeError(err));

    } finally {

      setCargando(false);

    }

  };



  return (

    <main className="admin-modulo admin-imagenes-pagina">

<style>{`
.admin-imagenes-pagina{background:#000!important;color:#fff!important;min-height:100vh;width:100%;}
.admin-imagenes-pagina .admin-modulo-contenedor{max-width:1600px;margin:0 auto;padding:30px 28px 60px;}
.admin-imagenes-pagina .admin-modulo-encabezado{display:flex;justify-content:space-between;align-items:center;gap:22px;margin-bottom:28px;flex-wrap:wrap;}
.admin-imagenes-pagina .admin-modulo-etiqueta{color:#dc2626;font-size:12px;letter-spacing:.15em;font-weight:800;margin:0 0 8px;}
.admin-imagenes-pagina .admin-modulo-titulo{font-size:clamp(28px,3vw,40px);font-weight:800;color:#fff;margin:0 0 10px;}
.admin-imagenes-pagina .admin-modulo-titulo span{color:#dc2626;}
.admin-imagenes-pagina .admin-modulo-descripcion{color:#aaa;font-size:14px;line-height:1.6;}
.admin-imagenes-pagina .clientes-volver{display:inline-flex;align-items:center;justify-content:center;background:#202024!important;color:#fff!important;border:1px solid #414149!important;border-radius:12px!important;padding:14px 20px!important;font-size:14px;font-weight:700;text-decoration:none!important;white-space:nowrap;transition:none!important;}
.admin-imagenes-pagina .clientes-volver:hover{background:#202024!important;color:#fff!important;border-color:#414149!important;}
.admin-imagenes-pagina .admin-imagenes-resumen{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin:0 0 24px;}
.admin-imagenes-pagina .admin-modulo-indicador{background:#0d0d0f!important;border:1px solid #303036!important;border-left:4px solid #dc2626!important;border-radius:14px;padding:23px;display:flex;flex-direction:column;gap:12px;}
.admin-imagenes-pagina .admin-modulo-indicador span{color:#b7b7bd;font-size:14px;}
.admin-imagenes-pagina .admin-modulo-indicador strong{color:#fff;font-size:32px;line-height:1.1;}
.admin-imagenes-pagina .admin-imagenes-distribucion{display:grid;grid-template-columns:minmax(290px,340px) minmax(0,1fr);align-items:start;gap:20px;}
.admin-imagenes-pagina .admin-modulo-panel{min-width:0;background:#0d0d0f!important;border:1px solid #303036!important;border-radius:14px;padding:24px;color:#fff;}
.admin-imagenes-pagina .admin-modulo-panel-titulo{font-size:20px;font-weight:750;color:#fff;margin:0 0 10px;}
.admin-imagenes-pagina .admin-imagenes-formulario{display:grid;gap:16px;margin-top:22px;max-width:none;}
.admin-imagenes-pagina .admin-modulo-campo{min-width:0;display:flex;flex-direction:column;gap:8px;}
.admin-imagenes-pagina .admin-modulo-campo label{color:#eee;font-weight:650;font-size:14px;}
.admin-imagenes-pagina input,.admin-imagenes-pagina select{background:#09090b!important;color:#fff!important;border:1px solid #414149!important;border-radius:9px!important;min-height:44px;padding:10px 12px;box-sizing:border-box;width:100%;font:inherit;}
.admin-imagenes-pagina input[type=file]{height:auto;max-width:100%;font-size:13px;}
.admin-imagenes-pagina input:focus,.admin-imagenes-pagina select:focus{outline:2px solid #dc2626;outline-offset:1px;}
.admin-imagenes-pagina .fp-btn{border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer;}
.admin-imagenes-pagina .fp-btn-primary,.admin-imagenes-pagina .admin-modulo-boton--principal{background:#dc2626!important;color:#fff!important;border:1px solid #dc2626!important;}
.admin-imagenes-pagina .fp-btn-secondary{background:#202024!important;color:#fff!important;border:1px solid #414149!important;}
.admin-imagenes-pagina .fp-btn-danger{background:#55191e!important;color:#fff!important;border:1px solid #a72b34!important;}
.admin-imagenes-pagina button:disabled{opacity:.55;cursor:not-allowed;}
.admin-imagenes-pagina .admin-imagenes-cabecera{display:flex;align-items:start;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:20px;}
.admin-imagenes-pagina .admin-imagenes-filtros{display:grid;grid-template-columns:minmax(0,2fr) repeat(2,minmax(130px,1fr));gap:12px;margin-bottom:22px;}
.admin-imagenes-pagina .admin-imagenes-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;}
.admin-imagenes-pagina .admin-imagenes-tarjeta{min-width:0;overflow:hidden;background:#101012!important;border:1px solid #333339!important;border-radius:12px;}
.admin-imagenes-pagina .admin-imagenes-preview{height:185px;display:flex;align-items:center;justify-content:center;background:#070709!important;overflow:hidden;}
.admin-imagenes-pagina .admin-imagenes-detalles{padding:16px;display:flex;flex-direction:column;gap:12px;}
.admin-imagenes-pagina .admin-imagenes-nombre{color:#fff;font-size:15px;overflow-wrap:anywhere;margin:0;}
.admin-imagenes-pagina .admin-imagenes-categoria{color:#aaa;font-size:13px;}
.admin-imagenes-pagina .admin-imagenes-acciones{display:flex;flex-wrap:wrap;gap:8px;}
.admin-imagenes-pagina .admin-imagenes-paginacion{display:flex;justify-content:center;align-items:center;gap:15px;margin-top:22px;flex-wrap:wrap;}
.admin-imagenes-pagina .admin-modulo-vacio,.admin-imagenes-pagina .admin-imagenes-oculta{color:#aaa;padding:25px;text-align:center;}
.admin-imagenes-pagina .admin-modulo-estado{display:inline-flex;align-self:start;border-radius:30px;padding:5px 10px;font-size:12px;font-weight:700;background:#29292c;color:#eee;}
.admin-imagenes-pagina .admin-modulo-estado--activo{background:#173e2a;color:#86efac;}
.admin-imagenes-pagina .admin-modulo-estado--inactivo{background:#3b2024;color:#fca5a5;}
@media(max-width:1150px){.admin-imagenes-pagina .admin-imagenes-distribucion{grid-template-columns:1fr}.admin-imagenes-pagina .admin-imagenes-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}
@media(max-width:650px){.admin-imagenes-pagina .admin-modulo-contenedor{padding:20px 14px 40px}.admin-imagenes-pagina .admin-imagenes-resumen{grid-template-columns:1fr}.admin-imagenes-pagina .admin-imagenes-filtros{grid-template-columns:1fr}.admin-imagenes-pagina .admin-imagenes-grid{grid-template-columns:1fr}.admin-imagenes-pagina .admin-modulo-panel{padding:17px}}
`}</style>


      <div className="admin-modulo-contenedor">

        {/* ENCABEZADO */}

        <header className="admin-modulo-encabezado">

          <div>

            <p className="admin-modulo-etiqueta">

              FOCUS POWER FIT

            </p>



            <h1 className="admin-modulo-titulo">

              Gestión de <span>Imágenes</span>

            </h1>



            <p className="admin-modulo-descripcion">

              Administra las fotografías de profesores,

              sucursales, máquinas y contenido del sitio web.

            </p>

          </div>



          <Link

            href="/admin"

            className="clientes-volver fp-btn fp-btn-volver"

          >

            Volver al panel

          </Link>

        </header>



        {/* MENSAJES */}

        {error && (

          <div

            className="admin-alert admin-alert-error"

            role="alert"

          >

            <span>{error}</span>

            <button

              type="button"

              onClick={() => setError("")}

              aria-label="Cerrar error"

              className="fp-btn fp-btn-secondary"

            >

              Cerrar

            </button>

          </div>

        )}



        {exito && (

          <div

            className="admin-alert admin-alert-success"

            role="status"

          >

            <span>{exito}</span>

          </div>

        )}



        {/* RESUMEN */}

        <section

          className="admin-modulo-resumen admin-imagenes-resumen"

          aria-label="Resumen de imágenes"

        >

          <article className="admin-modulo-indicador">

            <span>Total de imágenes</span>

            <strong>{total}</strong>

          </article>



          <article className="admin-modulo-indicador">

            <span>Imágenes públicas</span>

            <strong>{publicas}</strong>

          </article>



          <article className="admin-modulo-indicador">

            <span>Privadas u ocultas</span>

            <strong>{ocultas}</strong>

          </article>

        </section>



        {/* FORMULARIO Y BIBLIOTECA */}

        <div className="admin-modulo-distribucion admin-imagenes-distribucion">

          {/* SUBIR IMAGEN */}

          <section className="admin-modulo-panel admin-imagenes-seccion">

            <h2 className="admin-modulo-panel-titulo">

              Subir nueva imagen

            </h2>



            <p className="admin-modulo-descripcion">

              Formatos JPG, PNG y WebP. Tamaño máximo: 5 MB.

            </p>



            {categoria === "maquina" && (

              <p className="admin-modulo-descripcion">

                Las fotografías de máquinas son privadas

                y solo pueden verse en el administrador.

              </p>

            )}



            <form

              className="admin-modulo-formulario admin-imagenes-formulario"

              onSubmit={subirImagen}

            >

              <div className="admin-modulo-campo">

                <label htmlFor="categoria-imagen">

                  Categoría

                </label>



                <select

                  id="categoria-imagen"

                  value={categoria}

                  disabled={procesando}

                  onChange={(evento) =>

                    seleccionarCategoria(

                      evento.target.value as Categoria

                    )

                  }

                >

                  {CATEGORIAS.map((opcion) => (

                    <option

                      key={opcion.value}

                      value={opcion.value}

                    >

                      {opcion.label}

                    </option>

                  ))}

                </select>

              </div>



              {categoria !== "sitio" && (

                <div className="admin-modulo-campo">

                  <label htmlFor="referencia-imagen">

                    Seleccionar registro

                  </label>



                  <select

                    id="referencia-imagen"

                    value={referenciaId}

                    required

                    disabled={

                      procesando || cargandoRegistros

                    }

                    onChange={(evento) =>

                      setReferenciaId(evento.target.value)

                    }

                  >

                    <option value="">

                      {cargandoRegistros

                        ? "Cargando registros..."

                        : "Selecciona una opción"}

                    </option>



                    {registros.map((registro) => (

                      <option

                        key={registro.id}

                        value={registro.id}

                      >

                        {registro.nombre}

                      </option>

                    ))}

                  </select>

                </div>

              )}



              <div className="admin-modulo-campo">

                <label htmlFor="archivo-imagen">

                  Seleccionar fotografía

                </label>



                <input

                  ref={inputArchivo}

                  id="archivo-imagen"

                  type="file"

                  accept="image/jpeg,image/png,image/webp"

                  required

                  disabled={procesando}

                  onChange={(evento) =>

                    setArchivo(

                      evento.target.files?.[0] || null

                    )

                  }

                />

              </div>



              <div className="admin-modulo-campo">

                <label htmlFor="orden-imagen">

                  Orden de visualización

                </label>



                <input

                  id="orden-imagen"

                  type="number"

                  min={0}

                  step={1}

                  value={ordenNuevo}

                  disabled={procesando}

                  onChange={(evento) =>

                    setOrdenNuevo(Number(evento.target.value))

                  }

                />

              </div>



              <button

                type="submit"

                disabled={

                  procesando ||

                  cargandoRegistros ||

                  !archivo

                }

                className="admin-modulo-boton admin-modulo-boton--principal fp-btn fp-btn-primary"

              >

                {procesando

                  ? "Subiendo imagen..."

                  : "Subir imagen"}

              </button>

            </form>

          </section>



          {/* BIBLIOTECA */}

          <section className="admin-modulo-panel admin-imagenes-biblioteca">

            <div className="admin-imagenes-cabecera">

              <div>

                <h2 className="admin-modulo-panel-titulo">

                  Biblioteca de imágenes

                </h2>



                <p className="admin-modulo-descripcion">

                  Mostrando {imagenesFiltradas.length} de{" "}

                  {imagenes.filter(

                    (imagen) =>

                      imagen.categoria === categoria

                  ).length}{" "}

                  imágenes de la categoría

                </p>

              </div>



              <button

                type="button"

                disabled={cargando}

                onClick={() => void actualizarBiblioteca()}

                className="fp-btn fp-btn-secondary"

              >

                Actualizar

              </button>

            </div>



            <div className="admin-imagenes-filtros">

              <input

                type="search"

                className="admin-modulo-buscador"

                placeholder="Buscar imágenes..."

                aria-label="Buscar imágenes"

                value={busqueda}

                onChange={(evento) => {

                  setBusqueda(evento.target.value);

                  setPaginaActual(1);

                }}

              />



              <select

                className="admin-select"

                aria-label="Filtrar por visibilidad"

                value={filtroVisibilidad}

                onChange={(evento) => {

                  setFiltroVisibilidad(evento.target.value);

                  setPaginaActual(1);

                }}

              >

                <option value="Todas">

                  Todas las imágenes

                </option>

                <option value="Publicas">

                  Públicas

                </option>

                <option value="Ocultas">

                  Privadas u ocultas

                </option>

              </select>



              <select

                className="admin-select"

                aria-label="Filtrar por categoría"

                value={categoria}

                onChange={(evento) =>

                  seleccionarCategoria(

                    evento.target.value as Categoria

                  )

                }

              >

                {CATEGORIAS.map((opcion) => (

                  <option

                    key={opcion.value}

                    value={opcion.value}

                  >

                    {opcion.label}

                  </option>

                ))}

              </select>

            </div>



            {cargando ? (

              <div className="admin-modulo-vacio">

                Cargando imágenes...

              </div>

            ) : imagenesFiltradas.length === 0 ? (

              <div className="admin-modulo-vacio">

                No se encontraron imágenes.

              </div>

            ) : (

              <>

                <div className="admin-imagenes-grid">

                  {imagenesPaginadas.map((imagen) => (

                    <article

                      key={imagen.id}

                      className="admin-imagenes-tarjeta"

                    >

                      <div className="admin-imagenes-preview">

                        <VistaPreviaImagen imagen={imagen} />

                      </div>



                      <div className="admin-imagenes-detalles">

                        <h3 className="admin-imagenes-nombre">

                          {imagen.nombreOriginal ||

                            `Imagen #${imagen.id}`}

                        </h3>



                        <p className="admin-imagenes-categoria">

                          {nombreCategoria(imagen.categoria)}

                          {imagen.referenciaId !== null

                            ? ` · Registro #${imagen.referenciaId}`

                            : ""}

                        </p>



                        <span

                          className={`admin-modulo-estado ${

                            imagen.categoria === "maquina" ||

                            !imagen.mostrarPublicamente

                              ? "admin-modulo-estado--inactivo"

                              : "admin-modulo-estado--activo"

                          }`}

                        >

                          {imagen.categoria === "maquina"

                            ? "Privada · Solo administrador"

                            : imagen.mostrarPublicamente

                              ? "Pública"

                              : "Oculta"}

                        </span>



                        <div className="admin-modulo-campo">

                          <label htmlFor={`orden-${imagen.id}`}>

                            Orden

                          </label>



                          <input

                            key={`${imagen.id}-${imagen.orden}`}

                            id={`orden-${imagen.id}`}

                            type="number"

                            min={0}

                            step={1}

                            defaultValue={imagen.orden}

                            disabled={

                              procesandoId !== null ||

                              procesando

                            }

                            onBlur={(evento) => {

                              const valor = Number(

                                evento.target.value

                              );



                              if (valor !== imagen.orden) {

                                void cambiarOrden(imagen, valor);

                              }

                            }}

                          />

                        </div>



                        <div className="admin-imagenes-acciones">

                          <button

                            type="button"

                            onClick={() =>

                              setImagenDetalle(imagen)

                            }

                            className="fp-btn fp-btn-secondary"

                          >

                            Ver

                          </button>



                          {imagen.categoria !== "maquina" && (

                            <button

                              type="button"

                              disabled={

                                procesandoId !== null ||

                                procesando

                              }

                              onClick={() =>

                                void cambiarVisibilidad(imagen)

                              }

                              className="fp-btn fp-btn-secondary"

                            >

                              {imagen.mostrarPublicamente

                                ? "Ocultar"

                                : "Publicar"}

                            </button>

                          )}



                          <button

                            type="button"

                            disabled={

                              procesandoId !== null ||

                              procesando

                            }

                            onClick={() =>

                              void eliminarImagen(imagen)

                            }

                            className="fp-btn fp-btn-danger"

                          >

                            {procesandoId === imagen.id

                              ? "Procesando..."

                              : "Eliminar"}

                          </button>

                        </div>

                      </div>

                    </article>

                  ))}

                </div>



                {totalPaginas > 1 && (

                  <div className="admin-imagenes-paginacion">

                    <button

                      type="button"

                      disabled={paginaSegura === 1}

                      onClick={() =>

                        setPaginaActual((actual) =>

                          Math.max(1, actual - 1)

                        )

                      }

                      className="fp-btn fp-btn-secondary"

                    >

                      Anterior

                    </button>



                    <span>

                      Página {paginaSegura} de {totalPaginas}

                    </span>



                    <button

                      type="button"

                      disabled={

                        paginaSegura === totalPaginas

                      }

                      onClick={() =>

                        setPaginaActual((actual) =>

                          Math.min(totalPaginas, actual + 1)

                        )

                      }

                      className="fp-btn fp-btn-secondary"

                    >

                      Siguiente

                    </button>

                  </div>

                )}

              </>

            )}

          </section>

        </div>

      </div>



      {/* VENTANA DE DETALLES */}

      {imagenDetalle && (

        <div

          className="clientes-modal-overlay"

          onClick={() => setImagenDetalle(null)}

        >

          <div

            className="clientes-modal"

            role="dialog"

            aria-modal="true"

            aria-labelledby="detalle-imagen-titulo"

            onClick={(evento) => evento.stopPropagation()}

          >

            <h2 id="detalle-imagen-titulo">

              Detalle de imagen

            </h2>



            <div className="admin-imagenes-preview">

              <VistaPreviaImagen imagen={imagenDetalle} />

            </div>



            <div className="admin-imagenes-detalles">

              <p>

                <strong>Nombre:</strong>{" "}

                {imagenDetalle.nombreOriginal ||

                  `Imagen #${imagenDetalle.id}`}

              </p>



              <p>

                <strong>Categoría:</strong>{" "}

                {nombreCategoria(imagenDetalle.categoria)}

              </p>



              <p>

                <strong>Registro asociado:</strong>{" "}

                {imagenDetalle.referenciaId ??

                  "Contenido general del sitio"}

              </p>



              <p>

                <strong>Orden:</strong>{" "}

                {imagenDetalle.orden}

              </p>



              <p>

                <strong>Visibilidad:</strong>{" "}

                {imagenDetalle.categoria === "maquina"

                  ? "Privada · Solo administrador"

                  : imagenDetalle.mostrarPublicamente

                    ? "Pública"

                    : "Oculta"}

              </p>

            </div>



            <div className="admin-imagenes-acciones">

              <button

                type="button"

                onClick={() => setImagenDetalle(null)}

                className="fp-btn fp-btn-secondary"

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
