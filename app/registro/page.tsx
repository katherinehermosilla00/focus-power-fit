import Link from "next/link";

export default function Sucursales() {
  return (
    <main className="bg-black text-white min-h-screen p-8">

      {/* BOTÓN VOLVER */}
      <Link href="/" className="text-red-500 hover:underline">
        ← Volver al inicio
      </Link>

      <h1 className="text-4xl font-bold text-red-500 mt-8 mb-6">
        registro 
      </h1>

      
    </main>
  );
}