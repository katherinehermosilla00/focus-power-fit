import Link from "next/link";

const sucursales = [
  {
    nombre: "La Reina",
    direccion: "Carlos Silva Vildósola 9326, local 20, segundo piso",
    horario: [
      "Lunes a viernes: 6:00 a 22:00",
      "Sábado y domingo: 9:00 a 14:00",
    ],
  },
  {
    nombre: "Peñalolén",
    direccion: "Las Perdices 2990, local 37, segundo piso",
    horario: [
      "Lunes a viernes: 6:00 a 22:00",
      "Sábado y domingo: 9:00 a 14:00",
    ],
  },
];

export default function Sucursales() {
  return (
    <main className="bg-black text-white min-h-screen p-8 md:p-12">

      {/* BOTÓN VOLVER */}
      <Link href="/" className="text-red-500 hover:underline text-sm">
        ← Volver al inicio
      </Link>

      <p className="font-[family-name:var(--font-geist-mono)] text-red-500 text-xs md:text-sm tracking-[0.35em] uppercase mt-10 mb-2">
        ● Encuéntranos
      </p>

      <h1 className="font-[family-name:var(--font-bebas-neue)] text-6xl md:text-8xl leading-[0.9] tracking-wide mb-2">
        NUESTRAS <span className="text-red-500">SUCURSALES</span>
      </h1>

      <div className="h-2 w-24 bg-red-600 -skew-x-12 mb-12" />

      <div className="grid gap-6 md:grid-cols-2">
        {sucursales.map((suc, i) => (
          <div key={i} className="bg-gray-900 p-6 rounded-xl border border-red-500">
            <h2 className="text-2xl font-bold text-red-400 mb-3">📍 {suc.nombre}</h2>
            <p className="text-gray-400 mb-4">{suc.direccion}</p>

            <h3 className="text-sm uppercase tracking-wider text-red-500 mb-1">Horario</h3>
            <ul className="text-gray-400 space-y-1">
              {suc.horario.map((h, j) => (
                <li key={j}>{h}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* NOTA DE DÍAS FESTIVOS */}
      <p className="text-gray-500 text-sm mt-8">
        Días festivos: Ambas sedes atienden de 9:00 a 14:00.
      </p>

    </main>
  );
}