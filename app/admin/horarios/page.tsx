"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useAuth } from "../../auth/AuthContext";
import AdminSectionHeader from "../components/AdminSectionHeader";

type Estado = "Activo" | "Inactivo";
type DiaSemana =
  | "Lunes"
  | "Martes"
  | "Miércoles"
  | "Jueves"
  | "Viernes"
  | "Sábado"
  | "Domingo";
type Modalidad = "Individual" | "Compartido";

type Profesor = {
  id: number;
  nombre: string;
  especialidad: string | null;
  estado: Estado;
};

type Horario = {
  id: number;
  profesorId: number;
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
  modalidad: Modalidad;
  cupos: number;
  estado: Estado;
  profesor?: Profesor | null;
};

const API_URL = "http://localhost:3001/api";
const DIAS: DiaSemana[] = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

function mensajeError(error: unknown, mensajePredeterminado: string) {
  if (axios.isAxiosError<{ mensaje?: string }>(error)) {
    return error.response?.data?.mensaje ?? mensajePredeterminado;
  }

  return mensajePredeterminado;
}

export default function HorariosPage() {
  const router = useRouter();
  const { usuario, token, cargando } = useAuth();
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [profesorId, setProfesorId] = useState("");
  const [diaSemana, setDiaSemana] = useState<DiaSemana | "">("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [modalidad, setModalidad] = useState<Modalidad>("Individual");
  const [cupos, setCupos] = useState("1");
  const [horarioEditandoId, setHorarioEditandoId] = useState<number | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorCarga, setErrorCarga] = useState("");
  const [errorFormulario, setErrorFormulario] = useState("");

  useEffect(() => {
    if (cargando) return;

    if (!usuario) {
      router.replace("/login");
    } else if (usuario.rol !== "admin") {
      router.replace("/mi-cuenta");
    }
  }, [cargando, router, usuario]);

  const cargarDatos = useCallback(async () => {
    if (!token) return;

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [horariosRespuesta, profesoresRespuesta] = await Promise.all([
        axios.get<Horario[]>(`${API_URL}/horarios`, config),
        axios.get<Profesor[]>(`${API_URL}/profesores`, config),
      ]);

      setHorarios(horariosRespuesta.data);
      setProfesores(profesoresRespuesta.data);
      setErrorCarga("");
    } catch (error) {
      console.error("Error al cargar horarios:", error);
      setErrorCarga(mensajeError(error, "No se pudieron cargar los horarios."));
    } finally {
      setCargandoDatos(false);
    }
  }, [token]);

  useEffect(() => {
    if (!cargando && usuario?.rol === "admin" && token) {
      void Promise.resolve().then(cargarDatos);
    }
  }, [cargando, cargarDatos, token, usuario]);

  const limpiarFormulario = () => {
    setProfesorId("");
    setDiaSemana("");
    setHoraInicio("");
    setHoraFin("");
    setModalidad("Individual");
    setCupos("1");
    setHorarioEditandoId(null);
    setErrorFormulario("");
  };

  const guardarHorario = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!token) return;

    setGuardando(true);
    setErrorFormulario("");
    const datos = {
      profesorId: Number(profesorId),
      diaSemana,
      horaInicio,
      horaFin,
      modalidad,
      cupos: modalidad === "Individual" ? 1 : Number(cupos),
    };
    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      if (horarioEditandoId === null) {
        await axios.post(`${API_URL}/horarios`, datos, config);
      } else {
        await axios.put(`${API_URL}/horarios/${horarioEditandoId}`, datos, config);
      }

      limpiarFormulario();
      await cargarDatos();
    } catch (error) {
      console.error("Error al guardar horario:", error);
      setErrorFormulario(
        mensajeError(error, "No se pudo guardar el horario.")
      );
    } finally {
      setGuardando(false);
    }
  };

  const editarHorario = (horario: Horario) => {
    setProfesorId(String(horario.profesorId));
    setDiaSemana(horario.diaSemana);
    setHoraInicio(horario.horaInicio.slice(0, 5));
    setHoraFin(horario.horaFin.slice(0, 5));
    setModalidad(horario.modalidad);
    setCupos(String(horario.cupos));
    setHorarioEditandoId(horario.id);
    setErrorFormulario("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cambiarEstado = async (horario: Horario) => {
    if (!token) return;

    try {
      await axios.put(
        `${API_URL}/horarios/${horario.id}`,
        { estado: horario.estado === "Activo" ? "Inactivo" : "Activo" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await cargarDatos();
    } catch (error) {
      console.error("Error al cambiar estado del horario:", error);
      setErrorCarga(mensajeError(error, "No se pudo cambiar el estado del horario."));
    }
  };

  const eliminarHorario = async (horario: Horario) => {
    if (!token || !window.confirm("¿Seguro que deseas eliminar este horario?")) return;

    try {
      await axios.delete(`${API_URL}/horarios/${horario.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (horarioEditandoId === horario.id) limpiarFormulario();
      await cargarDatos();
    } catch (error) {
      console.error("Error al eliminar horario:", error);
      setErrorCarga(mensajeError(error, "No se pudo eliminar el horario."));
    }
  };

  const horariosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase("es-CL");
    return horarios.filter((horario) =>
      [
        horario.diaSemana,
        horario.horaInicio,
        horario.horaFin,
        horario.modalidad,
        horario.estado,
        horario.profesor?.nombre ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase("es-CL")
        .includes(termino)
    );
  }, [busqueda, horarios]);

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

  const profesoresDisponibles = profesores.filter(
    (profesor) =>
      profesor.estado === "Activo" || String(profesor.id) === profesorId
  );

  return (
    <main className="min-h-screen bg-[#080808] text-white p-6 md:p-10">
      <AdminSectionHeader
        titulo="Gestión de"
        destacado="Horarios"
        descripcion="Crea y administra horarios de entrenamiento y sus profesores."
      />

      {errorCarga && (
        <div role="alert" className="mb-6 rounded-lg border border-red-800 bg-red-950/50 p-4 text-red-200">
          {errorCarga}
          <button
            type="button"
            onClick={() => {
              setCargandoDatos(true);
              void cargarDatos();
            }}
            className="ml-3 underline"
          >
            Reintentar
          </button>
        </div>
      )}

      <section className="grid lg:grid-cols-3 gap-8">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 sm:p-8">
          <h2 className="text-2xl font-bold mb-6">
            {horarioEditandoId === null ? "Registrar horario" : "Editar horario"}
          </h2>
          {profesoresDisponibles.length === 0 && !cargandoDatos && (
            <p className="mb-5 rounded-lg border border-amber-800 bg-amber-950/40 p-3 text-sm text-amber-200">
              Registra un profesor activo antes de crear un horario.
            </p>
          )}
          {errorFormulario && (
            <p role="alert" className="mb-5 rounded-lg border border-red-800 bg-red-950/50 p-3 text-red-200">
              {errorFormulario}
            </p>
          )}
          <form onSubmit={guardarHorario} className="space-y-5">
            <div>
              <label htmlFor="profesor" className="block mb-2 font-semibold">Profesor</label>
              <select
                id="profesor"
                value={profesorId}
                onChange={(evento) => setProfesorId(evento.target.value)}
                required
                disabled={cargandoDatos || profesoresDisponibles.length === 0}
                className="w-full bg-black border border-zinc-700 rounded-lg p-3 outline-none focus:border-red-600 disabled:opacity-60"
              >
                <option value="">Seleccionar profesor</option>
                {profesoresDisponibles.map((profesor) => (
                  <option key={profesor.id} value={profesor.id}>
                    {profesor.nombre}{profesor.estado === "Inactivo" ? " (Inactivo)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="dia-semana" className="block mb-2 font-semibold">Día</label>
              <select
                id="dia-semana"
                value={diaSemana}
                onChange={(evento) => setDiaSemana(evento.target.value as DiaSemana | "")}
                required
                className="w-full bg-black border border-zinc-700 rounded-lg p-3 outline-none focus:border-red-600"
              >
                <option value="">Seleccionar día</option>
                {DIAS.map((dia) => <option key={dia} value={dia}>{dia}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <CampoHora label="Hora de inicio" value={horaInicio} onChange={setHoraInicio} />
              <CampoHora label="Hora de término" value={horaFin} onChange={setHoraFin} />
            </div>

            <div>
              <label htmlFor="modalidad" className="block mb-2 font-semibold">Modalidad</label>
              <select
                id="modalidad"
                value={modalidad}
                onChange={(evento) => {
                  const nuevaModalidad = evento.target.value as Modalidad;
                  setModalidad(nuevaModalidad);
                  if (nuevaModalidad === "Individual") setCupos("1");
                }}
                className="w-full bg-black border border-zinc-700 rounded-lg p-3 outline-none focus:border-red-600"
              >
                <option value="Individual">Individual</option>
                <option value="Compartido">Compartido</option>
              </select>
            </div>

            {modalidad === "Compartido" && (
              <CampoNumero label="Cupos" value={cupos} onChange={setCupos} />
            )}

            <button
              type="submit"
              disabled={guardando || cargandoDatos || profesoresDisponibles.length === 0}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 transition py-3 rounded-xl font-bold"
            >
              {guardando ? "Guardando..." : horarioEditandoId === null ? "Registrar horario" : "Guardar cambios"}
            </button>
            <button
              type="button"
              onClick={limpiarFormulario}
              className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 py-3 rounded-xl"
            >
              {horarioEditandoId === null ? "Limpiar formulario" : "Cancelar edición"}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-950">
          <div className="p-6 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Horarios registrados</h2>
              <p className="text-gray-400 mt-1">Total: {horarios.length}</p>
            </div>
            <input
              type="search"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Buscar horario o profesor..."
              aria-label="Buscar horario o profesor"
              className="bg-black border border-zinc-700 rounded-lg px-4 py-3 outline-none focus:border-red-600"
            />
          </div>

          {cargandoDatos ? (
            <div className="p-10 text-center text-gray-400">Cargando horarios...</div>
          ) : horariosFiltrados.length === 0 ? (
            <div className="p-10 text-center text-gray-400">No se encontraron horarios.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-zinc-900">
                  <tr>
                    <th className="p-4">Profesor</th>
                    <th className="p-4">Día y hora</th>
                    <th className="p-4">Modalidad / cupos</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {horariosFiltrados.map((horario) => (
                    <tr key={horario.id} className="border-t border-zinc-800 hover:bg-zinc-900/50">
                      <td className="p-4">
                        <p className="font-semibold">{horario.profesor?.nombre ?? "Profesor no disponible"}</p>
                        {horario.profesor?.especialidad && (
                          <p className="text-gray-500 text-sm">{horario.profesor.especialidad}</p>
                        )}
                      </td>
                      <td className="p-4 text-gray-300">
                        <p>{horario.diaSemana}</p>
                        <p className="text-gray-500 text-sm">{horario.horaInicio.slice(0, 5)}–{horario.horaFin.slice(0, 5)}</p>
                      </td>
                      <td className="p-4 text-gray-300">
                        {horario.modalidad}{horario.modalidad === "Compartido" ? ` · ${horario.cupos} cupos` : ""}
                      </td>
                      <td className="p-4">
                        <span className={horario.estado === "Activo" ? "text-green-500 font-bold" : "text-gray-500 font-bold"}>
                          {horario.estado}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => editarHorario(horario)}
                            className="border border-yellow-600 text-yellow-400 hover:bg-yellow-600 hover:text-black px-3 py-2 rounded-lg transition"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => void cambiarEstado(horario)}
                            className="border border-red-600 text-red-500 hover:bg-red-600 hover:text-white px-3 py-2 rounded-lg transition"
                          >
                            {horario.estado === "Activo" ? "Desactivar" : "Activar"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void eliminarHorario(horario)}
                            className="border border-zinc-600 text-gray-300 hover:bg-zinc-700 px-3 py-2 rounded-lg transition"
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
        </div>
      </section>
    </main>
  );
}

function CampoHora({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block mb-2 font-semibold">{label}</label>
      <input
        type="time"
        value={value}
        onChange={(evento) => onChange(evento.target.value)}
        required
        className="w-full bg-black border border-zinc-700 rounded-lg p-3 outline-none focus:border-red-600"
      />
    </div>
  );
}

function CampoNumero({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block mb-2 font-semibold">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(evento) => onChange(evento.target.value)}
        min="1"
        step="1"
        required
        className="w-full bg-black border border-zinc-700 rounded-lg p-3 outline-none focus:border-red-600"
      />
    </div>
  );
}
