"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../auth/AuthContext";
import "../modulo-oscuro.css";

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api`;

type Recordatorio = {
  id: number;
  tipo: "Clase" | "Vencimiento" | "Otro";
  titulo: string;
  mensaje: string;
  fechaEnvio: string;
  estado: "Pendiente" | "Enviado" | "Cancelado";
  cliente?: { nombre: string; email: string | null };
};

const formatoFecha = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "short",
  timeStyle: "short",
});

export default function RecordatoriosPage() {
  const router = useRouter();
  const { usuario, cargando, token } = useAuth();

  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>([]);
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (cargando) return;

    if (!usuario) {
      router.replace("/login");
    } else if (usuario.rol !== "admin") {
      router.replace("/mi-cuenta");
    }
  }, [cargando, usuario, router]);

  useEffect(() => {
    if (cargando || usuario?.rol !== "admin" || !token) return;

    let activo = true;

    axios
      .get<Recordatorio[]>(`${API_URL}/recordatorios`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(({ data }) => {
        if (activo) setRecordatorios(data);
      })
      .catch(() => {
        if (activo) setError("No se pudieron cargar los recordatorios.");
      })
      .finally(() => {
        if (activo) setCargandoDatos(false);
      });

    return () => {
      activo = false;
    };
  }, [cargando, usuario, token]);

  const filtrados = useMemo(
    () =>
      filtroEstado === "Todos"
        ? recordatorios
        : recordatorios.filter(({ estado }) => estado === filtroEstado),
    [recordatorios, filtroEstado]
  );

  const contar = (estado: Recordatorio["estado"]) =>
    recordatorios.filter((recordatorio) => recordatorio.estado === estado)
      .length;

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
              Registro de <span>Recordatorios</span>
            </h1>
            <p className="admin-modulo-descripcion">
              El sistema programa y envía los correos 24 horas antes de cada
              clase. Aquí puedes revisar su resultado.
            </p>
          </div>

          <Link href="/admin" className="clientes-volver fp-btn fp-btn-volver">
            Volver al panel
          </Link>
        </header>

        {error && (
          <div className="admin-alert admin-alert-error" role="alert">
            <span>{error}</span>
          </div>
        )}

        <section
          className="admin-modulo-resumen"
          aria-label="Resumen de recordatorios"
        >
          {(
            [
              ["Total", recordatorios.length],
              ["Pendientes", contar("Pendiente")],
              ["Enviados", contar("Enviado")],
              ["Cancelados", contar("Cancelado")],
            ] as const
          ).map(([titulo, valor]) => (
            <article className="admin-modulo-indicador" key={titulo}>
              <span>{titulo}</span>
              <strong>{cargandoDatos ? "—" : valor}</strong>
              <p>Recordatorios</p>
            </article>
          ))}
        </section>

        <section className="admin-modulo-panel modulo-panel">
          <div className="modulo-encabezado-listado">
            <h2 className="admin-modulo-panel-titulo">Correos programados</h2>

            <select
              className="admin-modulo-buscador"
              style={{ maxWidth: 240 }}
              aria-label="Filtrar por estado"
              value={filtroEstado}
              onChange={(evento) => setFiltroEstado(evento.target.value)}
            >
              <option value="Todos">Todos los estados</option>
              <option value="Pendiente">Pendientes</option>
              <option value="Enviado">Enviados</option>
              <option value="Cancelado">Cancelados</option>
            </select>
          </div>

          {cargandoDatos ? (
            <div className="admin-modulo-vacio">Cargando recordatorios...</div>
          ) : filtrados.length === 0 ? (
            <div className="admin-modulo-vacio">
              No hay recordatorios para mostrar.
            </div>
          ) : (
            <div className="admin-modulo-tabla-contenedor">
              <table className="admin-modulo-tabla">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Recordatorio</th>
                    <th>Envío programado</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((recordatorio) => (
                    <tr key={recordatorio.id}>
                      <td>
                        <strong>
                          {recordatorio.cliente?.nombre ?? "No disponible"}
                        </strong>
                        <p className="modulo-secundario">
                          {recordatorio.cliente?.email ?? "Sin correo"}
                        </p>
                      </td>
                      <td>
                        <strong>{recordatorio.titulo}</strong>
                        <p className="modulo-secundario">
                          {recordatorio.mensaje}
                        </p>
                      </td>
                      <td>
                        {formatoFecha.format(new Date(recordatorio.fechaEnvio))}
                      </td>
                      <td>
                        <span
                          className={
                            recordatorio.estado === "Enviado"
                              ? "admin-modulo-estado admin-modulo-estado--activo"
                              : "admin-modulo-estado admin-modulo-estado--inactivo"
                          }
                        >
                          {recordatorio.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
