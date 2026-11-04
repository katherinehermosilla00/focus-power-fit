
import Link from "next/link";
import styles from "./terminos.module.css";

type Condicion = {
  numero: string;
  titulo: string;
  descripcion: string;
};

const condiciones: Condicion[] = [
  {
    numero: "01",
    titulo: "Modalidades de entrenamiento",
    descripcion:
      "Focus Power Fit ofrece entrenamiento personalizado en modalidad individual y compartida. Las características específicas de cada plan se informan al momento de contratarlo.",
  },
  {
    numero: "02",
    titulo: "Asistencia a las sesiones",
    descripcion:
      "La asistencia a las sesiones se registra en el mesón de atención o mediante el sistema habilitado por Focus Power Fit.",
  },
  {
    numero: "03",
    titulo: "Cancelación de sesiones",
    descripcion:
      "Si necesitas cancelar una sesión, debes avisar con al menos 6 horas hábiles de anticipación. Las condiciones aplicables a una cancelación fuera de plazo se rigen por el contrato suscrito.",
  },
  {
    numero: "04",
    titulo: "Inasistencia o retraso del profesor",
    descripcion:
      "Si el profesor no asiste o se retrasa más de 20 minutos, el cliente puede recuperar la sesión conforme a las condiciones del contrato.",
  },
  {
    numero: "05",
    titulo: "Congelamiento del plan",
    descripcion:
      "Los planes de entrenamiento personalizado pueden contemplar congelamiento por situaciones como accidentes, enfermedad, embarazo o viajes. La solicitud y los antecedentes necesarios se revisan según las condiciones contractuales.",
  },
  {
    numero: "06",
    titulo: "Extensión de vigencia",
    descripcion:
      "En los casos contemplados por el contrato, es posible solicitar una extensión del plan presentando la documentación que respalde la situación correspondiente.",
  },
];

const iconos = ["♜", "▣", "◷", "↻", "❄", "⌛"];

const enlaces = [
  { nombre: "Inicio", href: "/" },
  { nombre: "Planes", href: "/#planes" },
  { nombre: "Profesores", href: "/profesores" },
  { nombre: "Sucursales", href: "/sucursales" },
];

export default function TerminosPage() {
  return (
    <main className={styles.page}>
      <nav className={styles.nav} aria-label="Navegación principal">
        <Link href="/" className={styles.brand}>
          FOCUS <span>POWER FIT</span>
        </Link>

        <div className={styles.navLinks}>
          {enlaces.map((enlace) => (
            <Link key={enlace.href} href={enlace.href}>
              {enlace.nombre}
            </Link>
          ))}

          <Link
            href="/terminos"
            aria-current="page"
            className={styles.active}
          >
            Términos y Condiciones
          </Link>
        </div>

        <Link href="/login" className={styles.login}>
          Iniciar sesión
        </Link>
      </nav>

      <header className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>
            INFORMACIÓN PARA NUESTROS CLIENTES
          </p>

          <h1>
            Términos y <span>Condiciones</span>
          </h1>

          <p className={styles.heroDescription}>
            Conoce las principales condiciones asociadas a nuestros
            planes de entrenamiento personalizado, para que puedas
            disfrutar de tu experiencia en Focus Power Fit con
            información clara.
          </p>

          <div className={styles.pills}>
            <span>Entrenamiento personalizado</span>
            <span>Planes individuales y compartidos</span>
          </div>
        </div>

        <div className={styles.heroTag} aria-hidden="true">
          TU BIENESTAR
          <br />
          NUESTRAS REGLAS
          <br />
          <strong>UNA MEJOR EXPERIENCIA</strong>
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>
              LO QUE DEBES CONOCER
            </p>
            <h2>Condiciones del servicio</h2>
          </div>

          <p className={styles.sectionDescription}>
            Estas condiciones aplican a nuestros planes de
            entrenamiento personalizado y permiten conocer
            sus principales reglas.
          </p>

          <span className={styles.counter}>
            6 condiciones principales
          </span>
        </div>

        <section
          className={styles.cards}
          aria-label="Condiciones del entrenamiento"
        >
          {condiciones.map((condicion, index) => (
            <article
              className={styles.card}
              key={condicion.numero}
            >
              <div className={styles.cardTop}>
                <span className={styles.number}>
                  {condicion.numero}
                </span>

                <span className={styles.icon} aria-hidden="true">
                  {iconos[index]}
                </span>
              </div>

              <h3>{condicion.titulo}</h3>
              <p>{condicion.descripcion}</p>

              <span
                className={styles.cardAccent}
                aria-hidden="true"
              />
            </article>
          ))}
        </section>

        <aside className={styles.notice}>
          <div
            className={styles.noticeIcon}
            aria-hidden="true"
          >
            !
          </div>

          <div>
            <p className={styles.eyebrow}>
              INFORMACIÓN CONTRACTUAL
            </p>

            <h2>Importante antes de contratar</h2>

            <p>
              Esta página es un resumen informativo y no
              reemplaza el contrato de prestación de servicios
              de entrenamiento personalizado. Para conocer
              los requisitos, excepciones y efectos de cada
              condición, revisa el contrato entregado por
              Focus Power Fit. Si existe alguna diferencia,
              debe revisarse el texto contractual aplicable.
            </p>
          </div>
        </aside>

        <section className={styles.actions}>
          <div>
            <h2>¿Quieres comenzar a entrenar?</h2>

            <p>
              Conoce nuestros planes y encuentra la modalidad
              que mejor se adapte a ti.
            </p>
          </div>

          <div className={styles.actionButtons}>
            <Link
              href="/#planes"
              className={styles.primary}
            >
              Ver planes de entrenamiento
            </Link>

            <Link href="/" className={styles.secondary}>
              Volver al inicio
            </Link>
          </div>
        </section>
      </div>

      <footer className={styles.footer}>
        <strong>
          FOCUS <span>POWER FIT</span>
        </strong>

        <p>
          Información sobre las condiciones de nuestros
          servicios de entrenamiento.
        </p>
      </footer>
    </main>
  );
}
