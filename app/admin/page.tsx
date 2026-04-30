export default function Admin() {
  return (
    <main className="bg-black text-white min-h-screen p-8">

      <h1 className="text-4xl font-bold text-red-500 mb-8">
        Panel Administrativo ⚙️
      </h1>

      <div className="grid gap-6 md:grid-cols-2">

        {/* PROMOCIONES */}
        <div className="bg-gray-900 p-6 rounded-xl border border-red-500">
          <h2 className="text-xl font-bold text-red-400 mb-4">
            Crear Promoción
          </h2>

          <input
            placeholder="Título"
            className="w-full p-2 mb-2 bg-black border border-gray-700 rounded"
          />

          <input
            placeholder="Descripción"
            className="w-full p-2 mb-2 bg-black border border-gray-700 rounded"
          />

          <button className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded">
            Guardar
          </button>
        </div>

        {/* PLANES */}
        <div className="bg-gray-900 p-6 rounded-xl border border-red-500">
          <h2 className="text-xl font-bold text-red-400 mb-4">
            Crear Plan
          </h2>

          <input
            placeholder="Nombre del plan"
            className="w-full p-2 mb-2 bg-black border border-gray-700 rounded"
          />

          <input
            placeholder="Precio"
            className="w-full p-2 mb-2 bg-black border border-gray-700 rounded"
          />

          <button className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded">
            Guardar
          </button>
        </div>

      </div>

    </main>
  );
}