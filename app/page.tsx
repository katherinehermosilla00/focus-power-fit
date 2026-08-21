"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function Home() {
  const [promociones, setPromociones] = useState<{ titulo: string; descripcion: string }[]>([]);
  const [planes, setPlanes] = useState<{ nombre: string; precio: string }[]>([]);

  useEffect(() => {
    const promosGuardadas = localStorage.getItem("promociones");
    const planesGuardados = localStorage.getItem("planes");
    if (promosGuardadas) setPromociones(JSON.parse(promosGuardadas));
    if (planesGuardados) setPlanes(JSON.parse(planesGuardados));
  }, []);

  return (
    <main className="bg-black text-white min-h-screen">

      {/* NAVBAR */}
      <nav className="flex justify-between items-center px-8 py-4 bg-black border-b border-red-500">
        <div className="flex items-center gap-3">
          <img src="/logo.png" className="w-10 h-10 rounded-full" />
          <h1 className="text-xl font-bold text-red-500">Focus Power Fit</h1>
        </div>
        <ul className="flex gap-6 text-white">
          <li><Link href="/" className="hover:text-red-500">Inicio</Link></li>
          <li><Link href="/sucursales" className="hover:text-red-500">Sucursales</Link></li>
          <li><Link href="/profesores" className="hover:text-red-500">Profesores</Link></li>
          <li><Link href="/registro" className="hover:text-red-500">Registro</Link></li>
        </ul>
      </nav>

      {/* HERO */}
      <section className="relative px-8 pt-20 pb-16 md:pt-28 md:pb-24 text-center overflow-hidden">
        <p className="font-[family-name:var(--font-geist-mono)] text-red-500 text-xs md:text-sm tracking-[0.35em] uppercase mb-6">
          ● Entrenamiento real, resultados reales
        </p>

        <h2 className="font-[family-name:var(--font-bebas-neue)] text-6xl sm:text-7xl md:text-[9rem] leading-[0.85] tracking-wide">
          ENTRENA FUERTE.
          <br />
          <span className="text-red-500">VIVE MEJOR.</span>
        </h2>

        <p className="text-gray-400 max-w-2xl mx-auto mt-8 mb-4 text-lg">
          En Focus Power Fit contamos con espacios equipados, profesores especializados
          y tres sucursales disponibles para ayudarte a alcanzar tu mejor versión.
        </p>
      </section>

      {/* DIVISOR DIAGONAL - firma visual de la marca */}
      <div className="h-3 md:h-4 bg-red-600 -skew-y-1 -mt-2 mb-12 md:mb-16" />

      {/* CONTENIDO PRINCIPAL */}
      <section className="px-8 pb-16 text-center">
        <div className="grid gap-6 md:grid-cols-3">
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

        {/* PROMOCIONES CREADAS DESDE EL PANEL ADMIN */}
        {promociones.length > 0 && (
          <div className="mt-16 text-left max-w-4xl mx-auto">
            <h3 className="text-3xl font-bold text-red-500 mb-6 text-center">
              Nuestras Promociones
            </h3>
            <div className="grid gap-6 md:grid-cols-2">
              {promociones.map((promo, i) => (
                <div key={i} className="bg-gray-900 border border-red-500 rounded-xl p-6">
                  <h4 className="text-xl font-bold text-red-400">{promo.titulo}</h4>
                  {promo.descripcion && (
                    <p className="text-gray-400 mt-2">{promo.descripcion}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PLANES CREADOS DESDE EL PANEL ADMIN */}
        {planes.length > 0 && (
          <div className="mt-16 text-left max-w-4xl mx-auto">
            <h3 className="text-3xl font-bold text-red-500 mb-6 text-center">
              Nuestros Planes
            </h3>
            <div className="grid gap-6 md:grid-cols-2">
              {planes.map((plan, i) => (
                <div key={i} className="bg-gray-900 border border-red-500 rounded-xl p-6 flex justify-between items-center">
                  <h4 className="text-xl font-bold text-red-400">{plan.nombre}</h4>
                  <span className="text-2xl text-white">${plan.precio}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

    </main>
  );
}