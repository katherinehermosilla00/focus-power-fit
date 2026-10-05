import Link from "next/link";

export default function AdminSectionHeader({
  titulo,
  destacado,
  descripcion,
}: {
  titulo: string;
  destacado: string;
  descripcion: string;
}) {
  return (
    <div className="-mx-6 -mt-6 mb-10 md:-mx-10 md:-mt-10">
      <nav className="border-b border-white/10 bg-black/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 md:px-8">
          <Link href="/" className="flex items-center gap-3 font-black tracking-wide">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-sm">
              FP
            </span>
            <span>FOCUS <span className="text-red-500">POWER FIT</span></span>
          </Link>
          <Link
            href="/admin"
            className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-gray-300 transition hover:border-red-500/50 hover:text-white"
          >
            ← Volver al panel
          </Link>
        </div>
      </nav>
      <section className="relative isolate border-b border-white/5">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_80%_35%,rgba(153,27,27,0.2),transparent_45%),linear-gradient(115deg,#080808_35%,#160909_100%)]" />
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 px-5 py-11 sm:flex-row sm:items-end md:px-8 md:py-14">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-red-400">
              Panel administrativo
            </p>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl">
              {titulo} <span className="text-red-500">{destacado}</span>
            </h1>
            <p className="mt-3 max-w-2xl leading-7 text-gray-300">
              {descripcion}
            </p>
          </div>
          <span className="w-fit rounded-full border border-white/10 bg-black/30 px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-400">
            Gestión Focus Power Fit
          </span>
        </div>
      </section>
    </div>
  );
}
