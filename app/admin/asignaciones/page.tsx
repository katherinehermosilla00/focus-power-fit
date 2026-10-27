"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import axios from "axios";

import { useRouter } from "next/navigation";

import { useAuth } from "../../auth/AuthContext";

import Link from "next/link";

type Cliente = {

  id: number;

  nombre: string;

  email: string | null;

  rut: string | null;

};

type Plan = {

  id: number;

  nombre: string;

  modalidad: "Individual" | "Compartido" | null;

  duracionMeses: number | null;

  precio: string | number | null;

  estado: "Activo" | "Inactivo";

};

type Profesor = {

  id: number;

  nombre: string;

  especialidad: string | null;

};

type Horario = {

  id: number;

  diaSemana: string;

  horaInicio: string;

  horaFin: string;

  modalidad: "Individual" | "Compartido";

  estado: "Activo" | "Inactivo";

  profesor: Profesor | null;

};

type Asignacion = {

  id: number;

  clienteId: number;

  fechaInicio: string;

  fechaTermino: string | null;

  estado: "Activa" | "Finalizada" | "Congelada";

  observaciones: string | null;

  cliente: Cliente | null;

  plan: Plan | null;

  horario: Horario | null;

};

const API_BASE = "http://localhost:3001/api";

function mensajeError(error: unknown, mensajePredeterminado: string) {

  if (axios.isAxiosError<{ mensaje?: string }>(error)) {

    return error.response?.data?.mensaje ?? mensajePredeterminado;

  }

  return mensajePredeterminado;

}

function horaCorta(hora: string) {

  return hora.slice(0, 5);

}

export default function AsignacionesPage() {

  const router = useRouter();

  const { usuario, token, cargando } = useAuth();

  const [clientes, setClientes] = useState<Cliente[]>([]);

  const [planes, setPlanes] = useState<Plan[]>([]);

  const [horarios, setHorarios] = useState<Horario[]>([]);

  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);

  const [clienteId, setClienteId] = useState("");

  const [busquedaRutCliente, setBusquedaRutCliente] = useState("");

  const [planId, setPlanId] = useState("");

  const [horarioId, setHorarioId] = useState("");

  const [fechaInicio, setFechaInicio] = useState("");

  const [fechaTermino, setFechaTermino] = useState("");

  const [observaciones, setObservaciones] = useState("");

  const [cargandoDatos, setCargandoDatos] = useState(true);

  const [guardando, setGuardando] = useState(false);

  const [mensaje, setMensaje] = useState("");

  const [errorFormulario, setErrorFormulario] = useState("");

  const [errorCarga, setErrorCarga] = useState("");
  const [busquedaListado, setBusquedaListado] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todas");
  const [pagina, setPagina] = useState(1);

  useEffect(() => {

    if (cargando) return;

    if (!usuario) {

      router.replace("/login");

      return;

    }

    if (usuario.rol !== "admin") {

      router.replace("/mi-cuenta");

    }

  }, [cargando, router, usuario]);

  const cargarDatos = useCallback(async () => {

    if (!token) return;

    try {

      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [clientesRes, planesRes, horariosRes, asignacionesRes] =

        await Promise.all([

          axios.get<Cliente[]>(`${API_BASE}/clientes`, config),

          axios.get<Plan[]>(`${API_BASE}/planes`, config),

          axios.get<Horario[]>(`${API_BASE}/horarios`, config),

          axios.get<Asignacion[]>(`${API_BASE}/asignaciones`, config),

        ]);

      setClientes(clientesRes.data);

      setPlanes(planesRes.data);

      setHorarios(horariosRes.data);

      setAsignaciones(asignacionesRes.data);

      setErrorCarga("");

    } catch (error) {

      console.error("Error al cargar datos de asignaciones:", error);

      setErrorCarga(mensajeError(error, "No se pudieron cargar los datos."));

    } finally {

      setCargandoDatos(false);

    }

  }, [token]);

  const reintentarCarga = () => {

    setCargandoDatos(true);

    setErrorCarga("");

    void cargarDatos();

  };

  useEffect(() => {

    if (!cargando && usuario?.rol === "admin" && token) {

      void Promise.resolve().then(cargarDatos);

    }

  }, [cargando, cargarDatos, token, usuario]);

  const planesActivos = useMemo(

    () => planes.filter((plan) => plan.estado === "Activo"),

    [planes]

  );

  const horariosActivos = useMemo(

    () => horarios.filter((horario) => horario.estado === "Activo"),

    [horarios]

  );

  const planSeleccionado = planesActivos.find((plan) => String(plan.id) === planId);
  const horariosCompatibles = horariosActivos.filter(
    (horario) => !planSeleccionado?.modalidad || horario.modalidad === planSeleccionado.modalidad
  );

  const clientesConAsignacionActiva = useMemo(

    () =>

      new Set(

        asignaciones

          .filter((asignacion) => asignacion.estado === "Activa")

          .map((asignacion) => asignacion.clienteId)

      ),

    [asignaciones]

  );

  const clientesDisponibles = clientes.filter(

    (cliente) => !clientesConAsignacionActiva.has(cliente.id)

  );

  const rutBuscado = busquedaRutCliente

    .trim()

    .replace(/[.\s-]/g, "")

    .toLowerCase();

  const clientesFiltrados = clientesDisponibles.filter((cliente) =>

    (cliente.rut ?? "")

      .replace(/[.\s-]/g, "")

      .toLowerCase()

      .includes(rutBuscado)

  );

  const clienteSeleccionado = clientesDisponibles.find(

    (cliente) => String(cliente.id) === clienteId

  );

  const opcionesCliente = clienteSeleccionado &&

    !clientesFiltrados.some((cliente) => cliente.id === clienteSeleccionado.id)

    ? [clienteSeleccionado, ...clientesFiltrados]

    : clientesFiltrados;

  const asignacionesFiltradas = useMemo(() => {
    const texto = busquedaListado.trim().toLocaleLowerCase("es-CL");
    return asignaciones.filter((asignacion) => {
      if (filtroEstado !== "Todas" && asignacion.estado !== filtroEstado) return false;
      const contenido = [asignacion.cliente?.nombre, asignacion.cliente?.rut,
        asignacion.plan?.nombre, asignacion.horario?.profesor?.nombre]
        .filter(Boolean).join(" ").toLocaleLowerCase("es-CL");
      return contenido.includes(texto);
    });
  }, [asignaciones, busquedaListado, filtroEstado]);

  const cantidadActivas = asignaciones.filter((a) => a.estado === "Activa").length;
  const cantidadFinalizadas = asignaciones.filter((a) => a.estado === "Finalizada").length;
  const cantidadCongeladas = asignaciones.filter((a) => a.estado === "Congelada").length;

  const porPagina = 10;
  const totalPaginas = Math.max(1, Math.ceil(asignacionesFiltradas.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const asignacionesPagina = asignacionesFiltradas.slice((paginaActual - 1) * porPagina, paginaActual * porPagina);

  const guardarAsignacion = async (evento: FormEvent<HTMLFormElement>) => {

    evento.preventDefault();

    if (!token) {
      setErrorFormulario("Tu sesión ha expirado. Vuelve a iniciar sesión.");
      return;
    }

    if (!clienteId || !planId || !horarioId || !fechaInicio) {
      setErrorFormulario("Selecciona cliente, plan, horario y fecha de inicio.");
      return;
    }

    if (fechaTermino && fechaTermino < fechaInicio) {
      setErrorFormulario("La fecha de término no puede ser anterior al inicio.");
      return;
    }

    const planSeleccionado = planesActivos.find((plan) => String(plan.id) === planId);
    const horarioSeleccionado = horariosActivos.find((horario) => String(horario.id) === horarioId);

    if (!planSeleccionado || !horarioSeleccionado) {
      setErrorFormulario("Selecciona un plan y un horario activos.");
      return;
    }

    if (planSeleccionado.modalidad && planSeleccionado.modalidad !== horarioSeleccionado.modalidad) {
      setErrorFormulario("El plan y el horario deben tener la misma modalidad.");
      return;
    }

    if (!horarioSeleccionado.profesor) {
      setErrorFormulario("El horario seleccionado no tiene profesor asignado.");
      return;
    }

    setGuardando(true);

    setMensaje("");

    setErrorFormulario("");

    try {

      await axios.post(

        `${API_BASE}/asignaciones`,

        {

          clienteId: Number(clienteId),

          planId: Number(planId),

          horarioId: Number(horarioId),

          fechaInicio,

          fechaTermino: fechaTermino || null,

          observaciones: observaciones.trim() || null,

        },

        { headers: { Authorization: `Bearer ${token}` } }

      );

      setClienteId("");

      setBusquedaRutCliente("");

      setPlanId("");

      setHorarioId("");

      setFechaInicio("");

      setFechaTermino("");

      setObservaciones("");

      setMensaje("Asignación creada correctamente.");

      await cargarDatos();

    } catch (error) {

      console.error("Error al crear asignación:", error);

      setErrorFormulario(

        mensajeError(error, "No se pudo crear la asignación.")

      );

    } finally {

      setGuardando(false);

    }

  };

  if (cargando) {

    return (

      <main className="min-h-screen bg-black text-white flex items-center justify-center">

        Cargando...

      </main>

    );

  }

  if (!usuario || usuario.rol !== "admin") {

    return (

      <main className="min-h-screen bg-black text-white flex items-center justify-center">

        Verificando acceso...

      </main>

    );

  }

  return (
    <main className="asignaciones-redisenadas">
      <header className="asig-header">
        <div>
          <p className="asig-eyebrow">PANEL ADMINISTRATIVO / ASIGNACIONES</p>
          <h1>Gestión de <span>Asignaciones</span></h1>
          <p className="asig-subtitle">Vincula clientes con planes y horarios, y consulta sus asignaciones.</p>
        </div>
        <Link href="/admin" className="asig-back" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", backgroundColor: "#202024", border: "1px solid #414149", borderRadius: "12px", color: "#ffffff", padding: "14px 20px", fontSize: "14px", fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>Volver al panel</Link>
      </header>

      <section className="asig-kpis" aria-label="Resumen de asignaciones">
        {[
          { titulo: "Total de asignaciones", valor: asignaciones.length },
          { titulo: "Activas", valor: cantidadActivas },
          { titulo: "Finalizadas", valor: cantidadFinalizadas },
          { titulo: "Congeladas", valor: cantidadCongeladas },
        ].map((item) => (
          <article className="asig-kpi" key={item.titulo} style={{ borderLeft: "4px solid #dc2626" }}>
            <span>{item.titulo}</span>
            <strong>{item.valor}</strong>
          </article>
        ))}
      </section>

      {errorCarga && (
        <div className="asig-alert asig-error" role="alert">
          <span>{errorCarga}</span>
          <button type="button" onClick={reintentarCarga} className="asig-button asig-button-outline">Reintentar</button>
        </div>
      )}

      <div className="asig-layout">
        <section className="asig-panel">
          <p className="asig-eyebrow">FORMULARIO</p><h2>Nueva asignación</h2>
          <p className="asig-muted">Selecciona un cliente, plan y horario. El profesor se determina según el horario.</p>
          <form className="asig-form" onSubmit={guardarAsignacion}>
            <div className="asig-field">
              <label htmlFor="busqueda-rut-cliente">Buscar cliente por RUT</label>
              <input id="busqueda-rut-cliente" type="search" placeholder="Ej.: 12.345.678-9"
                value={busquedaRutCliente} onChange={(e) => setBusquedaRutCliente(e.target.value)} />
            </div>
            <div className="asig-field">
              <label htmlFor="cliente">Cliente</label>
              <select id="cliente" required value={clienteId} onChange={(e) => setClienteId(e.target.value)}
                disabled={cargandoDatos || clientesDisponibles.length === 0}>
                <option value="">Seleccionar cliente</option>
                {opcionesCliente.map((c) => <option key={c.id} value={c.id}>{c.nombre} — {c.rut || "Sin RUT"}</option>)}
              </select>
              {!cargandoDatos && clientesDisponibles.length === 0 && <small>No hay clientes disponibles sin asignación activa.</small>}
              {!cargandoDatos && clientesDisponibles.length > 0 && clientesFiltrados.length === 0 && <small>No se encontraron clientes con ese RUT.</small>}
            </div>
            <div className="asig-field">
              <label htmlFor="plan">Plan activo</label>
              <select id="plan" required value={planId} disabled={cargandoDatos || planesActivos.length === 0}
                onChange={(e) => { setPlanId(e.target.value); setHorarioId(""); }}>
                <option value="">Seleccionar plan</option>
                {planesActivos.map((p) => <option key={p.id} value={p.id}>
                  {p.nombre}{p.modalidad ? ` — ${p.modalidad}` : ""}{p.duracionMeses ? ` — ${p.duracionMeses} meses` : ""}
                </option>)}
              </select>
            </div>
            <div className="asig-field">
              <label htmlFor="horario">Horario y profesor</label>
              <select id="horario" required value={horarioId} disabled={cargandoDatos || horariosCompatibles.length === 0}
                onChange={(e) => setHorarioId(e.target.value)}>
                <option value="">Seleccionar horario</option>
                {horariosCompatibles.map((h) => <option key={h.id} value={h.id}>
                  {h.diaSemana}, {horaCorta(h.horaInicio)}–{horaCorta(h.horaFin)} · {h.profesor?.nombre ?? "Profesor no disponible"} · {h.modalidad}
                </option>)}
              </select>
              {!cargandoDatos && horariosCompatibles.length === 0 && <small>No hay horarios activos compatibles con el plan seleccionado.</small>}
            </div>
            <div className="asig-date-grid">
              <div className="asig-field">
                <label htmlFor="fechaInicio">Fecha de inicio</label>
                <input id="fechaInicio" type="date" required value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
              </div>
              <div className="asig-field">
                <label htmlFor="fechaTermino">Fecha de término</label>
                <input id="fechaTermino" type="date" min={fechaInicio || undefined} value={fechaTermino} onChange={(e) => setFechaTermino(e.target.value)} />
              </div>
            </div>
            <div className="asig-field">
              <label htmlFor="observaciones">Observaciones</label>
              <textarea id="observaciones" rows={3} placeholder="Información adicional (opcional)"
                value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
            </div>
            {mensaje && <div className="asig-alert asig-success" role="status">{mensaje}</div>}
            {errorFormulario && <div className="asig-alert asig-error" role="alert">{errorFormulario}</div>}
            <button className="asig-button asig-button-primary asig-submit" type="submit"
              disabled={guardando || cargandoDatos || Boolean(errorCarga)}>
              {guardando ? "Guardando..." : "Crear asignación"}
            </button>
          </form>
        </section>

        <section className="asig-panel asig-results">
          <div className="asig-heading">
            <div>
              <p className="asig-eyebrow">DIRECTORIO</p><h2>Asignaciones registradas</h2>
              <p className="asig-muted">Mostrando {asignacionesFiltradas.length} de {asignaciones.length} asignaciones</p>
            </div>
            <button type="button" className="asig-button asig-button-outline" onClick={reintentarCarga} disabled={cargandoDatos}>Actualizar</button>
          </div>
          <div className="asig-filters">
            <input type="search" aria-label="Buscar asignaciones" placeholder="Buscar cliente, RUT, plan o profesor"
              value={busquedaListado} onChange={(e) => { setBusquedaListado(e.target.value); setPagina(1); }} />
            <select aria-label="Filtrar por estado" value={filtroEstado}
              onChange={(e) => { setFiltroEstado(e.target.value); setPagina(1); }}>
              <option value="Todas">Todos los estados</option>
              <option value="Activa">Activas</option>
              <option value="Finalizada">Finalizadas</option>
              <option value="Congelada">Congeladas</option>
            </select>
          </div>
          {cargandoDatos ? <p className="asig-empty">Cargando asignaciones...</p> : asignacionesFiltradas.length === 0 ? (
            <p className="asig-empty">{asignaciones.length === 0 ? "Todavía no hay asignaciones." : "No hay resultados para los filtros seleccionados."}</p>
          ) : (
            <>
              <div className="asig-table-scroll">
                <table className="asig-table">
                  <thead><tr><th>Cliente</th><th>Plan</th><th>Profesor / horario</th><th>Vigencia</th><th>Estado</th></tr></thead>
                  <tbody>
                    {asignacionesPagina.map((a) => (
                      <tr key={a.id}>
                        <td><strong>{a.cliente?.nombre ?? "Cliente"}</strong><small>{a.cliente?.rut ?? a.cliente?.email ?? "Sin contacto"}</small></td>
                        <td>{a.plan?.nombre ?? "No disponible"}</td>
                        <td><strong>{a.horario?.profesor?.nombre ?? "No disponible"}</strong><small>{a.horario ? `${a.horario.diaSemana}, ${horaCorta(a.horario.horaInicio)}–${horaCorta(a.horario.horaFin)}` : "Sin horario"}</small></td>
                        <td><span>{a.fechaInicio}</span><small>{a.fechaTermino ? `Hasta ${a.fechaTermino}` : "Sin término"}</small></td>
                        <td><span className={`asig-status asig-status-${a.estado.toLowerCase()}`}>{a.estado}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="asig-pagination">
                <span>Página {paginaActual} de {totalPaginas}</span>
                <div>
                  <button type="button" disabled={paginaActual === 1} onClick={() => setPagina(paginaActual - 1)}>Anterior</button>
                  <button type="button" disabled={paginaActual === totalPaginas} onClick={() => setPagina(paginaActual + 1)}>Siguiente</button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
      <style jsx>{`
        .asignaciones-redisenadas { box-sizing: border-box; min-height: 100vh; padding: 28px clamp(16px,2.5vw,36px) 44px; background: #000 !important; color: #fff; width: 100%; min-width: 0; font-family: Arial, Helvetica, sans-serif; }
        .asignaciones-redisenadas * { box-sizing: border-box; }
        .asig-header { display:flex; align-items:flex-start; justify-content:space-between; gap:24px; margin-bottom:28px; }
        .asig-eyebrow { color:#e3343b; font-size:11px; font-weight:800; letter-spacing:1.5px; margin:0 0 12px; text-transform:uppercase; }
        .asig-header h1 { font-size:clamp(28px,3vw,42px); font-weight:900; line-height:1.15; margin:0 0 12px; color:#fff; }
        .asig-header h1 span { color:#dc2626; }
        .asig-subtitle { color:#b3b3b3; font-size:14px; line-height:1.6; margin:0; }
        .asig-back { display:inline-flex; align-items:center; justify-content:center; text-decoration:none; white-space:nowrap; border:1px solid #444; border-radius:9px; background:#202024; color:#fff; padding:14px 20px; font-size:13px; font-weight:700; }
        .asig-back:hover { border-color:#dc2626; color:#fff; }
        .asig-kpis { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 16px; margin: 24px 0; }
        .asig-kpi { min-width: 0; background: #000; border: 1px solid #404040; border-radius: 16px; padding: 22px; display: flex; flex-direction: column; gap: 12px; }
        .asig-kpi span { color: #c4c4c4; font-size: 14px; }
        .asig-kpi strong { color: white; font-size: 32px; line-height: 1; }
        .asig-layout { display: grid; grid-template-columns: minmax(300px, 0.9fr) minmax(0, 1.7fr); gap: 20px; align-items: start; }
        .asig-panel { min-width: 0; background: #000; border: 1px solid #404040; border-radius: 16px; padding: 24px; }
        .asig-panel h2 { font-size: 21px; font-weight: 700; color: white; margin: 0 0 8px; }
        .asig-muted { color: #b8b8b8; font-size: 13px; margin: 0; line-height: 1.55; }
        .asig-form { display: flex; flex-direction: column; gap: 15px; margin-top: 22px; }
        .asig-field { min-width: 0; display: flex; flex-direction: column; gap: 7px; }
        .asig-field label { color: #eee; font-weight: 600; font-size: 13px; }
        .asig-field small { color: #ffb3b3; font-size: 12px; }
        .asig-field input, .asig-field select, .asig-field textarea, .asig-filters input, .asig-filters select { width: 100%; min-width: 0; background: #000; color: #fff; border: 1px solid #414141; border-radius: 10px; padding: 11px 12px; font-size: 14px; color-scheme: dark; }
        .asig-field input:focus, .asig-field select:focus, .asig-field textarea:focus, .asig-filters input:focus, .asig-filters select:focus { outline: 2px solid #c72b31; outline-offset: 1px; }
        .asig-date-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px; }
        .asig-button { border-radius: 10px; padding: 10px 16px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
        .asig-button:disabled, .asig-pagination button:disabled { opacity: .5; cursor: not-allowed; }
        .asig-button-primary { background: #b91c1c; color: #fff; }
        .asig-button-primary:hover:not(:disabled) { background: #991b1b; }
        .asig-button-outline { background: #000; border-color: #555; color: #fff; }
        .asig-button-outline:hover:not(:disabled) { border-color: #c52228; }
        .asig-submit { width: 100%; }
        .asig-alert { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 12px; border-radius: 10px; margin: 10px 0; font-size: 13px; }
        .asig-error { background: #3b1719; border: 1px solid #a32c32; color: #ffd3d3; }
        .asig-success { background: #143626; border: 1px solid #327a52; color: #c6f5d9; }
        .asig-heading { display: flex; justify-content: space-between; align-items: start; gap: 16px; margin-bottom: 20px; }
        .asig-filters { display: grid; grid-template-columns: minmax(0, 1fr) minmax(150px, .42fr); gap: 12px; margin-bottom: 18px; }
        .asig-table-scroll { overflow-x: auto; width: 100%; }
        .asig-table { border-collapse: collapse; width: 100%; min-width: 690px; text-align: left; }
        .asig-table th { color: #c9c9c9; font-size: 12px; font-weight: 700; background: #000; padding: 14px 12px; border-bottom: 1px solid #444; }
        .asig-table td { color: #eee; font-size: 13px; padding: 16px 12px; border-bottom: 1px solid #333; vertical-align: middle; }
        .asig-table td strong { display: block; font-weight: 600; color: white; }
        .asig-table td small { display: block; color: #aaa; margin-top: 5px; font-size: 12px; }
        .asig-table tbody tr:hover { background: #111; }
        .asig-status { display: inline-flex; padding: 6px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; white-space: nowrap; }
        .asig-status-activa { background: #153b2a; color: #9de5b7; }
        .asig-status-finalizada { background: #111; color: #e0e0e0; }
        .asig-status-congelada { background: #443317; color: #f9d489; }
        .asig-empty { padding: 35px 10px; color: #b8b8b8; text-align: center; }
        .asig-pagination { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-top: 20px; color: #bbb; font-size: 13px; }
        .asig-pagination div { display: flex; gap: 8px; }
        .asig-pagination button { padding: 9px 14px; border: 1px solid #484848; background: #000; color: white; border-radius: 9px; cursor: pointer; }
        @media (max-width: 1050px) { .asig-header { flex-direction:column; } .asig-layout { grid-template-columns: 1fr; } }
        @media (max-width: 750px) { .asig-kpis { grid-template-columns: repeat(2,minmax(0,1fr)); } .asig-panel { padding: 18px; } }
        @media (max-width: 520px) { .asig-kpis { grid-template-columns: 1fr; } .asig-filters, .asig-date-grid { grid-template-columns: 1fr; } .asig-heading { flex-direction: column; } }
      `}</style>
    </main>
  );
}
