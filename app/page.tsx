import Link from "next/link";
export default function Home() {
  return (
    <main className="bg-black text-white min-h-screen">
      
      {/* NAVBAR */}
      <nav className="flex justify-between items-center px-8 py-4 bg-black border-b border-red-500">
        
        <div className="flex items-center gap-3">
          <img src="/logo.png" className="w-10 h-10 rounded-full" />
          <h1 className="text-xl font-bold text-red-500">Focus Power Fit</h1>
        </div>

        <ul className="flex gap-6 text-white">
          <li>
            <Link href="/" className="hover:text-red-500">
              Inicio
            </Link>
          </li>
          <li>
            <Link href="/sucursales" className="hover:text-red-500">
              Sucursales
            </Link>
          </li>
          <li>
            <Link href="/profesores" className="hover:text-red-500">
              Profesores
            </Link>
          </li>
          <li>
            <Link href="/registro" className="hover:text-red-500">
              Registro
            </Link>
          </li>
        </ul>

      </nav>

   {/* CONTENIDO PRINCIPAL */}
    <section className="px-8 py-16 text-center">
      <h2 className="text-5xl font-bold text-red-500 mb-4">
        Entrena fuerte. Vive mejor.
      </h2>

      <p className="text-gray-400 max-w-2xl mx-auto mb-8">
        En Focus Power Fit contamos con espacios equipados, profesores especializados
        y tres sucursales disponibles para ayudarte a alcanzar tu mejor versión.
      </p>

      <div className="grid gap-6 md:grid-cols-3 mt-10">
        <div className="bg-gray-900 border border-red-500 rounded-xl p-6">
          <h3 className="text-2xl font-bold text-red-400">Promoción mensual</h3>
          <p className="text-gray-400 mt-2">
            Inscripción gratis durante este mes para nuevos clientes.
          </p>
        </div>

        <div className="bg-gray-900 border border-red-500 rounded-xl p-6">
          <h3 className="text-2xl font-bold text-red-400">3 sucursales</h3>
          <p className="text-gray-400 mt-2">
            Entrena en cualquiera de nuestras sucursales disponibles.
          </p>
        </div>

        <div className="bg-gray-900 border border-red-500 rounded-xl p-6">
          <h3 className="text-2xl font-bold text-red-400">Profesores expertos</h3>
          <p className="text-gray-400 mt-2">
            Recibe orientación de profesionales en entrenamiento físico.
          </p>
        </div>
      </div>
    </section>

    </main>
  );
}