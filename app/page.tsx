
import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>

      {/* BARRA DE NAVEGACIÓN */}
      <nav className={styles.navbar}>

        {/* IDENTIDAD DEL GIMNASIO */}
        <div className={styles.brand}>
          <div className={styles.logo}>
            F
          </div>

          <h1 className={styles.brandName}>
            Focus Power Fit
          </h1>
        </div>

        {/* MENÚ DE NAVEGACIÓN */}
        <ul className={styles.navLinks}>
          <li>
            <Link href="/" className={styles.navLink}>
              Inicio
            </Link>
          </li>

          <li>
            <Link
              href="/sucursales"
              className={styles.navLink}
            >
              Sucursales
            </Link>
          </li>

          <li>
            <Link
              href="/profesores"
              className={styles.navLink}
            >
              Profesores
            </Link>
          </li>

          <li>
            <Link
              href="/registro"
              className={styles.navLink}
            >
              Registro
            </Link>
          </li>

          <li>
            <Link
              href="/login"
              className={styles.loginButton}
            >
              Iniciar sesión
            </Link>
          </li>
        </ul>
      </nav>

      {/* CONTENIDO PRINCIPAL */}
      <section className={styles.hero}>

        {/* TÍTULO PRINCIPAL */}
        <h2 className={styles.heroTitle}>
          Entrena fuerte. Vive mejor.
        </h2>

        {/* DESCRIPCIÓN */}
        <p className={styles.heroDescription}>
          En Focus Power Fit te acompañamos en tus objetivos
          mediante entrenamientos personalizados, con atención
          en nuestras sucursales de La Reina y Peñalolén.
        </p>

        {/* TARJETAS INFORMATIVAS */}
        <div className={styles.cards}>

          {/* TARJETA: ENTRENAMIENTOS */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>
              Entrenamiento personalizado
            </h3>

            <p className={styles.cardDescription}>
              Conoce nuestras opciones de entrenamiento
              individual y compartido.
            </p>
          </div>

          {/* TARJETA: SUCURSALES */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>
              Nuestras sucursales
            </h3>

            <p className={styles.cardDescription}>
              Estamos presentes en La Reina y Peñalolén.
            </p>

            <Link
              href="/sucursales"
              className={styles.cardLink}
            >
              Ver sucursales →
            </Link>
          </div>

          {/* TARJETA: PROFESORES */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>
              Nuestro equipo
            </h3>

            <p className={styles.cardDescription}>
              Conoce a los profesores de Focus Power Fit.
            </p>

            <Link
              href="/profesores"
              className={styles.cardLink}
            >
              Ver profesores →
            </Link>
          </div>

        </div>

        {/* BOTÓN DE ACCESO */}
        <div className={styles.ctaContainer}>
          <Link
            href="/registro"
            className={styles.ctaButton}
          >
            Conoce Focus Power Fit
          </Link>
        </div>

      </section>

      {/* PIE DE PÁGINA */}
      <footer className={styles.footer}>
        <p className={styles.footerText}>
          © {new Date().getFullYear()} Focus Power Fit.
          Todos los derechos reservados.
        </p>
      </footer>

    </main>
  );
}
