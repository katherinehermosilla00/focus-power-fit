import Link from "next/link";

const condiciones = [
  { numero: "01", titulo: "Modalidades de entrenamiento", descripcion: "Focus Power Fit ofrece entrenamiento personalizado en modalidad individual y compartida. Las características específicas de cada plan se informan al momento de contratarlo." },
  { numero: "02", titulo: "Asistencia a las sesiones", descripcion: "La asistencia a las sesiones se registra en el mesón de atención o mediante el sistema habilitado por Focus Power Fit." },
  { numero: "03", titulo: "Cancelación de sesiones", descripcion: "Si necesitas cancelar una sesión, debes avisar con al menos 6 horas hábiles de anticipación. Las condiciones aplicables a una cancelación fuera de plazo se rigen por el contrato suscrito." },
  { numero: "04", titulo: "Inasistencia o retraso del profesor", descripcion: "Si el profesor no asiste o se retrasa más de 20 minutos, el cliente puede recuperar la sesión conforme a las condiciones del contrato." },
  { numero: "05", titulo: "Congelamiento del plan", descripcion: "Los planes de entrenamiento personalizado pueden contemplar congelamiento por situaciones como accidentes, enfermedad, embarazo o viajes. La solicitud y los antecedentes necesarios se revisan según las condiciones contractuales." },
  { numero: "06", titulo: "Extensión de vigencia", descripcion: "En los casos contemplados por el contrato, es posible solicitar una extensión del plan presentando la documentación que respalde la situación correspondiente." },
];

export default function TerminosPage() {
  return (
    <main className="min-h-screen w-full bg-(--background) text-(--foreground)">
      <div className="mx-auto w-full max-w-400 px-5 pb-20 pt-7 sm:px-8 lg:px-12 xl:px-16">
        <nav
            aria-label="Navegación principal"
            className="mb-12 flex flex-wrap items-center justify-between gap-4 border-b border-(--color-border) pb-6"
            >
            <Link
                href="/"
                className="text-lg font-black tracking-tight transition-opacity hover:opacity-80"
            >
                FOCUS <span className="text-(--color-primary)">POWER FIT</span>
            </Link>

            <div className="flex flex-wrap items-center gap-5">
                <Link href="/" className="text-sm font-semibold hover:text-(--color-primary)">
                Inicio
                </Link>

                <Link href="/#planes" className="text-sm font-semibold hover:text-(--color-primary)">
                Planes
                </Link>

                <Link href="/profesores" className="text-sm font-semibold hover:text-(--color-primary)">
                Profesores
                </Link>

                <Link href="/sucursales" className="text-sm font-semibold hover:text-(--color-primary)">
                Sucursales
                </Link>

                <Link
                href="/terminos"
                aria-current="page"
                className="text-sm font-bold text-(--color-primary)"
                >
                Términos y Condiciones
                </Link>

                <Link
                href="/login"
                className="inline-flex min-h-11 items-center rounded-xl bg-(--color-primary) px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-(--color-primary-hover)"
                >
                Iniciar sesión
                </Link>
            </div>
        </nav>

        <header className="mb-10 max-w-4xl text-left sm:mb-12">
          <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.25em] text-(--color-primary)">
            Información para nuestros clientes
          </p>
          <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Términos y <span className="text-(--color-primary)">condiciones</span>
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-(--color-text-secondary)">
            Conoce las principales condiciones asociadas a los planes de entrenamiento personalizado de Focus Power Fit.
          </p>
        </header>

        <section aria-label="Condiciones del entrenamiento" className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
          {condiciones.map((condicion) => (
            <article key={condicion.numero} className="group flex h-full flex-col rounded-2xl border border-(--color-border) bg-(--color-surface) p-6 transition-all duration-200 hover:-translate-y-1 hover:border-(--color-primary) hover:shadow-(--shadow-card-selected) sm:p-8">
              <div className="mb-6 flex items-center justify-between">
                <span className="text-xs font-black tracking-[0.2em] text-(--color-primary)">{condicion.numero}</span>
                <span aria-hidden="true" className="h-1 w-12 rounded-full bg-(--color-primary) opacity-70" />
              </div>
              <h2 className="mb-4 text-xl font-extrabold tracking-tight sm:text-2xl">{condicion.titulo}</h2>
              <p className="text-sm leading-7 text-(--color-text-secondary) sm:text-base">{condicion.descripcion}</p>
            </article>
          ))}
        </section>

        <aside className="mt-8 rounded-2xl border border-(--color-border) bg-(--color-surface-secondary) p-6 sm:p-8">
          <h2 className="text-xl font-extrabold">Importante antes de contratar</h2>
          <p className="mt-3 max-w-5xl text-sm leading-7 text-(--color-text-secondary) sm:text-base">
            Esta página es un resumen informativo y no reemplaza el contrato de prestación de servicios de entrenamiento personalizado. Para conocer los requisitos, excepciones y efectos de cada condición, revisa el contrato entregado por Focus Power Fit. Si existe alguna diferencia, debe revisarse el texto contractual aplicable.
          </p>
        </aside>

        <div className="mt-10 flex flex-wrap justify-start gap-3">
          <Link href="/#planes" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-(--color-primary) px-7 py-3 text-sm font-extrabold text-white transition-all hover:-translate-y-0.5 hover:bg-(--color-primary-hover) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">
            Ver planes de entrenamiento
          </Link>
          <Link href="/" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-(--color-border) px-7 py-3 text-sm font-extrabold transition-colors hover:border-(--color-primary)">
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
