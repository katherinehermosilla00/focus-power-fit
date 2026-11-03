"use client";
import "./bienvenida.css";

import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth/AuthContext";

export default function BienvenidaPage() {
  const router = useRouter();
  const { usuario, cargando } = useAuth();

  useEffect(() => {
    if (!cargando && !usuario) {
      router.replace("/login");
    }
  }, [cargando, usuario, router]);

  if (cargando || !usuario) {
    return (
      <main className="bienvenida-cargando">
        <div className="bienvenida-loader" />
        <p>Cargando tu espacio...</p>
      </main>
    );
  }

  const nombre = usuario.nombre?.trim() || "Usuario";
  const primerNombre = nombre.split(" ")[0];

  return (
    <main className="bienvenida-pagina">
      {/* NAVEGACIÓN */}
      <header className="bienvenida-header">
        <Link href="/" className="bienvenida-marca">
          <Image
            src="/logo.png"
            width={48}
            height={48}
            className="bienvenida-logo"
            alt="Logo de Focus Power Fit"
            priority
          />

          <div className="bienvenida-marca-texto">
            <strong>FOCUS POWER FIT</strong>
            <span>Tu espacio de entrenamiento</span>
          </div>
        </Link>

        <nav
          className="bienvenida-nav"
          aria-label="Navegación principal"
        >
          <Link href="/">Inicio</Link>
          <Link href="/sucursales">Sucursales</Link>
          <Link href="/profesores">Profesores</Link>
          <Link href="/mi-cuenta" className="bienvenida-nav-cuenta">
            Mi cuenta
          </Link>
        </nav>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <div className="bienvenida-contenido">
        <section className="bienvenida-hero">
          <div className="bienvenida-hero-interior">
            <span className="bienvenida-etiqueta">
              BIENVENIDO A FOCUS POWER FIT
            </span>

            <h1>
              ¡Hola, <span>{primerNombre}!</span>
            </h1>

            <p className="bienvenida-subtitulo">
              Nos alegra tenerte aquí. Este es tu espacio
              para mantenerte conectado con Focus Power Fit
              y seguir avanzando hacia tus objetivos.
            </p>

            <div className="bienvenida-hero-acciones">
              <Link
                href="/mi-cuenta"
                className="bienvenida-boton bienvenida-boton-principal"
              >
                Ir a mi cuenta
                <span aria-hidden="true">→</span>
              </Link>

              <Link
                href="/sucursales"
                className="bienvenida-boton bienvenida-boton-secundario"
              >
                Ver sucursales
              </Link>
            </div>
          </div>

          <div className="bienvenida-hero-decoracion" aria-hidden="true">
            <span>FOCUS</span>
            <span>POWER</span>
            <span>FIT</span>
          </div>
        </section>

        {/* ACCESOS RÁPIDOS */}
        <section className="bienvenida-secciones">
          <div className="bienvenida-secciones-encabezado">
            <div>
              <span className="bienvenida-seccion-etiqueta">
                EXPLORA TU ESPACIO
              </span>
              <h2>¿Qué deseas hacer hoy?</h2>
            </div>

            <p>
              Accede fácilmente a las distintas secciones
              de nuestra plataforma.
            </p>
          </div>

          <div className="bienvenida-tarjetas">
            <Link href="/mi-cuenta" className="bienvenida-tarjeta">
              <div className="bienvenida-tarjeta-icono" aria-hidden="true">
                <span className="material-icons">person</span>
              </div>

              <h3>Mi cuenta</h3>
              <p>
                Consulta tu información personal y accede
                a tu perfil.
              </p>

              <span className="bienvenida-tarjeta-enlace">
                Ir a mi cuenta <span aria-hidden="true">→</span>
              </span>
            </Link>

            <Link href="/sucursales" className="bienvenida-tarjeta">
              <div className="bienvenida-tarjeta-icono" aria-hidden="true">
                <span className="material-icons">location_on</span>
              </div>

              <h3>Sucursales</h3>
              <p>
                Conoce nuestras sucursales y encuentra
                tu lugar de entrenamiento.
              </p>

              <span className="bienvenida-tarjeta-enlace">
                Ver sucursales <span aria-hidden="true">→</span>
              </span>
            </Link>

            <Link href="/profesores" className="bienvenida-tarjeta">
              <div className="bienvenida-tarjeta-icono" aria-hidden="true">
                <span className="material-icons">fitness_center</span>
              </div>

              <h3>Profesores</h3>
              <p>
                Conoce a los profesionales que te acompañan
                en tu entrenamiento.
              </p>

              <span className="bienvenida-tarjeta-enlace">
                Ver profesores <span aria-hidden="true">→</span>
              </span>
            </Link>
          </div>
        </section>

        {/* MENSAJE FINAL */}
        <section className="bienvenida-mensaje">
          <span>FOCUS POWER FIT</span>
          <h2>Tu progreso comienza contigo.</h2>
          <p>
            Constancia, esfuerzo y dedicación.
            Cada paso cuenta para alcanzar tus metas.
          </p>
        </section>
      </div>

      <footer className="bienvenida-footer">
        <span>© {new Date().getFullYear()} Focus Power Fit</span>
        <span>Entrena con propósito.</span>
      </footer>
    </main>
  );
}
