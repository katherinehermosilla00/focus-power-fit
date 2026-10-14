import Link from "next/link";

const profesoresLaReina = [
  { nombre: "Bastián Bustos", rol: "Profesor de Educación Física / Personal Trainer" },
  { nombre: "Juan Carlos Ignamarca", rol: "Personal Trainer" },
  { nombre: "Fabián Rodriguez", rol: "Personal Trainer", instagram: "@jesuss__fabian" },
  { nombre: "Carlos Cabrera", rol: "Personal Trainer", instagram: "@carlosalbertocabreramardones" },
  { nombre: "Fernando San Juan", rol: "Preparador Físico / Personal Trainer" },
];

const profesoresPenalolen = [
  { nombre: "César Salas", rol: "Personal Trainer" },
  { nombre: "Simón Guzmán", rol: "Profesor de Educación Física / Entrenador Personal" },
  { nombre: "Nicolás Pérez", rol: "Profesor de Educación Física / Jefe de Turno P.M." },
  { nombre: "Francisco Andrade", rol: "Profesor de Educación Física / Encargado Administrativo" },
  { nombre: "Cristian Hormazabal", rol: "Preparador Físico" },
  { nombre: "Didier Valdebenito", rol: "Preparador Físico" },
  { nombre: "Fernando Carvallo", rol: "Preparador Físico / Encargado Turno A.M." },
];

function TarjetaProfesor({ nombre, rol, instagram }: { nombre: string; rol: string; instagram?: string }) {
  const inicial = nombre.charAt(0);
  return (
    <div className="bg-gray-900 p-6 rounded-xl border border-red-500 flex flex-col items-center text-center">
      <div className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center text-3xl font-bold mb-4">
        {inicial}
      </div>
      <h3 className="text-xl font-bold text-red-400">{nombre}</h3>
      <p className="text-gray-400 mt-1">{rol}</p>
      {instagram && (
        <p className="text-gray-500 text-sm mt-2">{instagram}</p>
      )}
    </div>
  );
}

export default function Profesores() {
  return (
    <main className="bg-black text-white min-h-screen p-8 md:p-12">

      {/* BOTÓN VOLVER */}
      <Link href="/" className="text-red-500 hover:underline text-sm">
        ← Volver al inicio
      </Link>

      <p className="font-[family-name:var(--font-geist-mono)] text-red-500 text-xs md:text-sm tracking-[0.35em] uppercase mt-10 mb-2">
        ● Equipo profesional
      </p>

      <h1 className="font-[family-name:var(--font-bebas-neue)] text-6xl md:text-8xl leading-[0.9] tracking-wide mb-2">
        NUESTROS <span className="text-red-500">PROFESORES</span>
      </h1>

      <div className="h-2 w-24 bg-red-600 -skew-x-12 mb-12" />

      {/* LA REINA */}
      <h2 className="text-2xl font-bold text-white mb-6">📍 La Reina</h2>
      <div className="grid gap-6 md:grid-cols-3 mb-16">
        {profesoresLaReina.map((prof, i) => (
          <TarjetaProfesor key={i} {...prof} />
        ))}
      </div>

      {/* PEÑALOLÉN */}
      <h2 className="text-2xl font-bold text-white mb-6">📍 Peñalolén</h2>
      <div className="grid gap-6 md:grid-cols-3">
        {profesoresPenalolen.map((prof, i) => (
          <TarjetaProfesor key={i} {...prof} />
        ))}
      </div>

    </main>
  );
}