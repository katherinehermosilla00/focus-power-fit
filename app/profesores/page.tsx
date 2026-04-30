import Link from "next/link";

export default function Sucursales() {
  return (
    <main className="bg-black text-white min-h-screen p-8">

      {/* BOTÓN VOLVER */}
      <Link href="/" className="text-red-500 hover:underline">
        ← Volver al inicio
      </Link>

      <h1 className="text-4xl font-bold text-red-500 mt-8 mb-6">
        Nuestros profesores 💪
      </h1>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="bg-gray-900 p-4 rounded-xl border border-red-500">
          <h2 className="text-xl font-bold text-red-400">S</h2>
          <p className="text-gray-400">??</p>
          <p className="text-gray-400">ver</p>
        </div>
      </div>

    </main>
  );
}