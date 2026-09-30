"use client";

import { FormEvent, useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../auth/AuthContext";

type EstadoPlan = "Activo" | "Inactivo";
type ModalidadPlan = "Individual" | "Compartido";

type Plan = {
  id: number;
  nombre: string;
  descripcion: string | null;
  duracionMeses: number | null;
  sesiones: number | null;
  precio: string | number | null;
  modalidad: ModalidadPlan | null;
  estado: EstadoPlan;
};

const API_URL = "http://localhost:3001/api/planes";

export default function PlanesPage() {
  const router = useRouter();
  const { usuario, token, cargando } = useAuth();
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [duracionMeses, setDuracionMeses] = useState("");
  const [sesiones, setSesiones] = useState("");
  const [precio, setPrecio] = useState("");
  const [modalidad, setModalidad] = useState<ModalidadPlan | "">("");
  const [busqueda, setBusqueda] = useState("");
  const [planEditandoId, setPlanEditandoId] = useState<number | null>(null);
  const [cargandoPlanes, setCargandoPlanes] = useState(true);

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

  const cargarPlanes = async () => {
    if (!token) return;

    try {
      setCargandoPlanes(true);
      const respuesta = await axios.get<Plan[]>(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPlanes(respuesta.data);
    } catch (error) {
      console.error("Error al cargar planes:", error);
      alert("No se pudieron cargar los planes.");
    } finally {
      setCargandoPlanes(false);
    }
  };

  useEffect(() => {
    if (!cargando && usuario?.rol === "admin" && token) {
      cargarPlanes();
    }
  }, [cargando, token, usuario]);

  const limpiarFormulario = () => {
    setNombre("");
    setDescripcion("");
    setDuracionMeses("");
    setSesiones("");
    setPrecio("");
    setModalidad("");
    setPlanEditandoId(null);
  };

  const guardarPlan = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!token) return;

    const datos = {
      nombre,
      descripcion: descripcion || null,
      duracionMeses: duracionMeses ? Number(duracionMeses) : null,
      sesiones: sesiones ? Number(sesiones) : null,
      precio: precio ? Number(precio) : null,
      modalidad: modalidad || null,
    };

    try {
      const configuracion = {
        headers: { Authorization: `Bearer ${token}` },
      };

      if (planEditandoId !== null) {
        await axios.put(`${API_URL}/${planEditandoId}`, datos, configuracion);
        alert("Plan actualizado correctamente.");
      } else {
        await axios.post(API_URL, datos, configuracion);
        alert("Plan registrado correctamente.");
      }

      limpiarFormulario();
      await cargarPlanes();
    } catch (error) {
      console.error("Error al guardar plan:", error);
      alert("No se pudo guardar el plan.");
    }
  };

  const editarPlan = (plan: Plan) => {
    setNombre(plan.nombre);
    setDescripcion(plan.descripcion ?? "");
    setDuracionMeses(plan.duracionMeses?.toString() ?? "");
    setSesiones(plan.sesiones?.toString() ?? "");
    setPrecio(plan.precio?.toString() ?? "");
    setModalidad(plan.modalidad ?? "");
    setPlanEditandoId(plan.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cambiarEstado = async (plan: Plan) => {
    if (!token) return;

    try {
      await axios.put(
        `${API_URL}/${plan.id}`,
        { estado: plan.estado === "Activo" ? "Inactivo" : "Activo" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await cargarPlanes();
    } catch (error) {
      console.error("Error al cambiar estado del plan:", error);
      alert("No se pudo cambiar el estado del plan.");
    }
  };

  const planesFiltrados = planes.filter((plan) => {
    const texto = busqueda.trim().toLowerCase();
    return [plan.nombre, plan.descripcion ?? "", plan.modalidad ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(texto);
  });

  if (cargando) {
    return <main className="min-h-screen bg-black text-white flex items-center justify-center">Cargando...</main>;
  }

  if (!usuario || usuario.rol !== "admin") {
    return <main className="min-h-screen bg-black text-white flex items-center justify-center">Verificando acceso...</main>;
  }

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <p className="text-gray-400">Panel administrativo</p>
          <h1 className="text-4xl font-black mt-1">Gestión de <span className="text-red-600">Planes</span></h1>
          <p className="text-gray-400 mt-2">Crea y administra los planes de entrenamiento.</p>
        </div>
        <Link href="/admin" className="bg-zinc-900 border border-zinc-700 hover:border-red-600 px-5 py-3 rounded-xl font-bold transition">
          Volver al panel
        </Link>
      </header>

      <section className="grid lg:grid-cols-3 gap-8">
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-6">{planEditandoId !== null ? "Editar plan" : "Registrar plan"}</h2>
          <form onSubmit={guardarPlan} className="space-y-5">
            <Campo label="Nombre" value={nombre} onChange={setNombre} placeholder="Ej: Plan mensual" required />
            <div>
              <label className="block mb-2 font-semibold">Descripción</label>
              <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="w-full min-h-24 bg-black border border-zinc-700 rounded-lg p-3 outline-none focus:border-red-600" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Duración (meses)" value={duracionMeses} onChange={setDuracionMeses} type="number" min="1" />
              <Campo label="Sesiones" value={sesiones} onChange={setSesiones} type="number" min="1" />
            </div>
            <Campo label="Precio" value={precio} onChange={setPrecio} type="number" min="0" step="0.01" />
            <div>
              <label className="block mb-2 font-semibold">Modalidad</label>
              <select value={modalidad} onChange={(e) => setModalidad(e.target.value as ModalidadPlan | "")} className="w-full bg-black border border-zinc-700 rounded-lg p-3 outline-none focus:border-red-600">
                <option value="">Seleccionar modalidad</option>
                <option value="Individual">Individual</option>
                <option value="Compartido">Compartido</option>
              </select>
            </div>
            <button type="submit" className="w-full bg-red-600 hover:bg-red-700 transition py-3 rounded-xl font-bold">{planEditandoId !== null ? "Guardar cambios" : "Registrar plan"}</button>
            <button type="button" onClick={limpiarFormulario} className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 py-3 rounded-xl">{planEditandoId !== null ? "Cancelar edición" : "Limpiar formulario"}</button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div><h2 className="text-2xl font-bold">Planes registrados</h2><p className="text-gray-400 mt-1">Total: {planes.length}</p></div>
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar plan..." className="bg-black border border-zinc-700 rounded-lg px-4 py-3 outline-none focus:border-red-600" />
          </div>
          {cargandoPlanes ? <div className="p-10 text-center text-gray-400">Cargando planes...</div> : planesFiltrados.length === 0 ? <div className="p-10 text-center text-gray-400">No se encontraron planes.</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-zinc-900"><tr><th className="p-4">Plan</th><th className="p-4">Duración</th><th className="p-4">Precio</th><th className="p-4">Estado</th><th className="p-4">Acciones</th></tr></thead>
                <tbody>{planesFiltrados.map((plan) => <tr key={plan.id} className="border-t border-zinc-800 hover:bg-zinc-900/50">
                  <td className="p-4"><p className="font-semibold">{plan.nombre}</p><p className="text-gray-500 text-sm">{plan.modalidad ?? "Sin modalidad"}</p></td>
                  <td className="p-4 text-gray-300">{plan.duracionMeses ? `${plan.duracionMeses} meses` : "Sin duración"}</td>
                  <td className="p-4 text-gray-300">{plan.precio !== null ? `$${plan.precio}` : "Sin precio"}</td>
                  <td className="p-4"><span className={plan.estado === "Activo" ? "text-green-500 font-bold" : "text-gray-500 font-bold"}>{plan.estado}</span></td>
                  <td className="p-4"><div className="flex flex-wrap gap-2"><button onClick={() => editarPlan(plan)} className="border border-yellow-600 text-yellow-400 hover:bg-yellow-600 hover:text-black px-3 py-2 rounded-lg transition">Editar</button><button onClick={() => cambiarEstado(plan)} className="border border-red-600 text-red-500 hover:bg-red-600 hover:text-white px-3 py-2 rounded-lg transition">{plan.estado === "Activo" ? "Desactivar" : "Activar"}</button></div></td>
                </tr>)}</tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function Campo({ label, value, onChange, type = "text", placeholder = "", min, step, required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; min?: string; step?: string; required?: boolean }) {
  return <div><label className="block mb-2 font-semibold">{label}</label><input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} min={min} step={step} required={required} className="w-full bg-black border border-zinc-700 rounded-lg p-3 outline-none focus:border-red-600" /></div>;
}
