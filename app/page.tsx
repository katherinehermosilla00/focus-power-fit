"use client";



import Link from "next/link";
import { useAuth } from "./auth/AuthContext";

import styles from "./page.module.css";

import FitBot from "../app/components/FitBot";

type Paquete = {

  clases: number;

  precio: number;

  vigencia: number | null;

};

const planesIndividuales: Paquete[] = [

  { clases: 5, precio: 100000, vigencia: 60 },

  { clases: 8, precio: 152000, vigencia: 60 },

  { clases: 12, precio: 216000, vigencia: 60 },

  { clases: 20, precio: 340000, vigencia: null },

  { clases: 24, precio: 388800, vigencia: 90 },

  { clases: 36, precio: 558000, vigencia: 120 },

  { clases: 72, precio: 1036800, vigencia: 240 },

  { clases: 96, precio: 1324800, vigencia: 360 },

  { clases: 120, precio: 1584000, vigencia: 360 },

];

const planesDupla: Paquete[] = [

  { clases: 5, precio: 150000, vigencia: 60 },

  { clases: 8, precio: 232000, vigencia: 60 },

  { clases: 12, precio: 336000, vigencia: 60 },

  { clases: 20, precio: 540000, vigencia: null },

  { clases: 24, precio: 628800, vigencia: 90 },

  { clases: 36, precio: 918000, vigencia: 120 },

  { clases: 72, precio: 1684800, vigencia: 240 },

  { clases: 96, precio: 2188800, vigencia: 360 },

  { clases: 120, precio: 2544000, vigencia: 360 },

];

const formatoPrecio = (valor: number) =>

  new Intl.NumberFormat("es-CL", {

    style: "currency",

    currency: "CLP",

    maximumFractionDigits: 0,

  }).format(valor);

type IconoNombre = "entrenamiento" | "ubicacion" | "equipo";

function Icono({

  nombre,

  className,

}: {

  nombre: IconoNombre;

  className?: string;

}) {

  const rutas = {

    entrenamiento: (

      <>

        <path d="M6.5 6.5 17.5 17.5" />

        <path d="M4 9 9 4" />

        <path d="M15 20 20 15" />

        <path d="M2.5 7.5 7.5 2.5" />

        <path d="M16.5 21.5 21.5 16.5" />

      </>

    ),

    ubicacion: (

      <>

        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />

        <circle cx="12" cy="10" r="2.5" />

      </>

    ),

    equipo: (

      <>

        <circle cx="9" cy="8" r="3" />

        <path d="M3 20v-2a6 6 0 0 1 12 0v2" />

        <path d="M16 5.2a3 3 0 0 1 0 5.6" />

        <path d="M18 14a5 5 0 0 1 3 4.6V20" />

      </>

    ),

  };

  return (

    <svg

      className={className}

      viewBox="0 0 24 24"

      width="28"

      height="28"

      fill="none"

      stroke="currentColor"

      strokeWidth="1.7"

      strokeLinecap="round"

      strokeLinejoin="round"

      aria-hidden="true"

    >

      {rutas[nombre]}

    </svg>

  );

}

function TarjetaInicio({

  icono,

  numero,

  titulo,

  descripcion,

  href,

  boton,

}: {

  icono: IconoNombre;

  numero: string;

  titulo: string;

  descripcion: string;

  href: string;

  boton: string;

}) {

  return (

    <article className={styles.card}>

      <span className={styles.cardNumber} aria-hidden="true">

        {numero}

      </span>

      <div className={styles.cardIcon}>

        <Icono nombre={icono} />

      </div>

      <h3 className={styles.cardTitle}>{titulo}</h3>

      <p className={styles.cardDescription}>

        {descripcion}

      </p>

      <Link href={href} className={styles.cardButton}>

        {boton}

      </Link>

    </article>

  );

}

function TablaPlanes({

  titulo,

  descripcion,

  paquetes,

  destacado = false,

}: {

  titulo: string;

  descripcion: string;

  paquetes: Paquete[];

  destacado?: boolean;

}) {

  return (

    <article

      className={`${styles.planCard} ${

        destacado ? styles.planCardFeatured : ""

      }`}

    >

      <div className={styles.planHeader}>

        <div className={styles.planHeaderTop}>

          <span className={styles.planEyebrow}>

            PERSONAL TRAINING

          </span>

          <span className={styles.planTag}>

            {destacado ? "2 PERSONAS" : "1 PERSONA"}

          </span>

        </div>

        <h3 className={styles.planTitle}>{titulo}</h3>

        <p className={styles.planDescription}>

          {descripcion}

        </p>

      </div>

      <div className={styles.tableWrapper}>

        <table className={styles.planTable}>

          <thead>

            <tr>

              <th scope="col">Clases</th>

              <th scope="col">Precio total</th>

              <th scope="col">Vigencia</th>

            </tr>

          </thead>

          <tbody>

            {paquetes.map((paquete) => (

              <tr key={paquete.clases}>

                <td>

                  <span className={styles.classCount}>

                    {paquete.clases}

                  </span>

                </td>

                <td>

                  <span className={styles.price}>

                    {formatoPrecio(paquete.precio)}

                  </span>

                </td>

                <td>

                  {paquete.vigencia !== null

                    ? `${paquete.vigencia} días`

                    : "Por confirmar"}

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

      <div className={styles.planFooter}>

        <p>

          Consulta disponibilidad y condiciones antes de

          contratar.

        </p>

      </div>

    </article>

  );

}

export default function Home() {
  const { usuario, cargando } = useAuth();
  const destinoCuenta = usuario?.rol === "admin" ? "/admin" : "/mi-cuenta";

  return (

    <main className={styles.main}>

      {/* NAVEGACIÓN */}

      <nav className={styles.navbar} aria-label="Navegación principal">

        <Link href="/" className={styles.brand}>

          <span className={styles.logo}>F</span>

          <span className={styles.brandName}>

            Focus Power Fit

          </span>

        </Link>

        <ul className={styles.navLinks}>

          <li>

            <Link href="/" className={styles.navLink}>

              Inicio

            </Link>

          </li>

          <li>

            <Link href="/#planes" className={styles.navLink}>

              Planes

            </Link>

          </li>

          <li>

            <Link href="/sucursales" className={styles.navLink}>

              Sucursales

            </Link>

          </li>

          <li>

            <Link href="/profesores" className={styles.navLink}>

              Profesores

            </Link>

          </li>



          <li>
            <Link href="/terminos" className={styles.navLink}>
              Términos y Condiciones
            </Link>
          </li>


{!cargando && usuario ? (
  <li>
    <Link href={destinoCuenta} className={styles.loginButton}>
      {usuario.rol === "admin" ? "Administración" : "Mi Cuenta"}
    </Link>
  </li>
) : !cargando ? (
  <>
    <li>
      <Link href="/registro" className={styles.navLink}>
        Registro
      </Link>
    </li>
    <li>
      <Link href="/login" className={styles.loginButton}>
        Iniciar sesión
      </Link>
    </li>
  </>
) : null}

        </ul>

      </nav>

      {/* PORTADA */}

      <section className={styles.hero}>

        <div className={styles.heroContent}>

          <div className={styles.heroBadge}>

            <span className={styles.statusDot} />

            ENTRENAMIENTO PERSONALIZADO

          </div>

          <p className={styles.heroKicker}>

            FOCUS POWER FIT

          </p>

          <h1 className={styles.heroTitle}>

            SUPERA TUS

            <span>LÍMITES.</span>

          </h1>

          <p className={styles.heroDescription}>

            Entrena con propósito. Alcanza tus objetivos

            con el acompañamiento de nuestros profesores

            en La Reina y Peñalolén.

          </p>

          <div className={styles.heroActions}>

            <Link href="/#planes" className={styles.ctaButton}>

              Explorar planes

            </Link>

            <Link

              href="/sucursales"

              className={styles.secondaryButton}

            >

              Conocer sucursales

            </Link>

          </div>

        </div>

        {/* TARJETAS */}

        <div className={styles.cards}>

          <TarjetaInicio

            icono="entrenamiento"

            numero="01"

            titulo="Entrenamiento personalizado"

            descripcion="Planes individuales y Dupla diseñados para avanzar a tu ritmo."

            href="/#planes"

            boton="Ver planes"

          />

          <TarjetaInicio

            icono="ubicacion"

            numero="02"

            titulo="Nuestras sucursales"

            descripcion="Dos sedes para entrenar: La Reina y Peñalolén."

            href="/sucursales"

            boton="Ver sucursales"

          />

          <TarjetaInicio

            icono="equipo"

            numero="03"

            titulo="Nuestro equipo"

            descripcion="Profesores que te acompañan en cada etapa de tu entrenamiento."

            href="/profesores"

            boton="Ver profesores"

          />

        </div>

      </section>

      {/* PLANES */}

      <section

        id="planes"

        aria-labelledby="titulo-planes"

        className={styles.plansSection}

      >

        <div className={styles.plansContainer}>

          <header className={styles.sectionHeader}>

            <span className={styles.sectionEyebrow}>

              ELIGE TU ENTRENAMIENTO

            </span>

            <h2

              id="titulo-planes"

              className={styles.sectionTitle}

            >

              NUESTROS <span>PLANES</span>

            </h2>

            <div className={styles.sectionLine} />

            <p className={styles.sectionDescription}>

              Encuentra el paquete que se adapte a tus

              objetivos, disponibilidad y estilo de vida.

            </p>

          </header>

          <div className={styles.plansGrid}>

            <TablaPlanes

              titulo="Plan Individual"

              descripcion="Entrenamiento personalizado para una persona."

              paquetes={planesIndividuales}

            />

            <TablaPlanes

              titulo="Plan Dupla"

              descripcion="Entrenamiento compartido para dos personas."

              paquetes={planesDupla}

              destacado

            />

          </div>


          {/* RESUMEN DE TÉRMINOS DEL ENTRENAMIENTO */}
          <section className={styles.conditionsSection} aria-labelledby="titulo-condiciones">
            <div className={styles.conditionsHeading}>
              <span className={styles.sectionEyebrow}>ANTES DE COMENZAR</span>
              <h3 id="titulo-condiciones" className={styles.conditionsTitle}>
                Información importante <span>sobre tu plan</span>
              </h3>
              <p className={styles.conditionsIntro}>
                Revisa las principales condiciones del entrenamiento personalizado.
                Puedes abrir cada pregunta para conocer más detalles.
              </p>
            </div>
            <div className={styles.conditionsGrid}>
              {[
                { pregunta: "¿Cómo funcionan las cancelaciones?", respuesta: "Debes avisar con al menos 6 horas hábiles de anticipación. Las cancelaciones fuera de plazo se rigen por el contrato suscrito." },
                { pregunta: "¿Qué pasa si el profesor no asiste?", respuesta: "Si el profesor no asiste o se retrasa más de 20 minutos, puedes recuperar la sesión conforme a las condiciones del contrato." },
                { pregunta: "¿Puedo congelar mi plan?", respuesta: "Los planes pueden contemplar congelamiento por accidentes, enfermedad, embarazo o viajes, sujeto a las condiciones contractuales y antecedentes necesarios." },
                { pregunta: "¿Puedo extender la vigencia?", respuesta: "En los casos contemplados por el contrato, puedes solicitar una extensión presentando la documentación que respalde la situación." },
                { pregunta: "¿Cómo se registra mi asistencia?", respuesta: "La asistencia se registra en el mesón de atención o mediante el sistema habilitado por Focus Power Fit." },
                { pregunta: "¿Qué modalidades existen?", respuesta: "Hay entrenamiento personalizado individual y compartido (Dupla). Revisa las características específicas antes de contratar." },
              ].map((item) => (
                <details key={item.pregunta} className={styles.conditionItem}>
                  <summary className={styles.conditionQuestion}>
                    <span>{item.pregunta}</span>
                    <span className={styles.conditionChevron} aria-hidden="true">⌄</span>
                  </summary>
                  <p className={styles.conditionAnswer}>{item.respuesta}</p>
                </details>
              ))}
            </div>
            <p className={styles.conditionsDisclaimer}>
              Este resumen es informativo y no reemplaza el contrato firmado.
            </p>
            <Link href="/terminos" className={styles.conditionsLink}>
              Leer términos y condiciones completos →
            </Link>
          </section>

          <div className={styles.plansActions}>

            <Link

              href="/registro"

              className={styles.ctaButton}

            >

              Regístrate para comenzar

            </Link>

          </div>

        </div>

      </section>

      {/* PIE DE PÁGINA */}

      <footer className={styles.footer}>

        <span className={styles.footerBrand}>

          FOCUS POWER FIT

        </span>

          <Link href="/terminos" className={styles.navLink}>
            Términos y Condiciones
          </Link>

        <p className={styles.footerText}>

          © {new Date().getFullYear()} Focus Power Fit.

          Todos los derechos reservados.

        </p>

      </footer>

      {/* CHATBOT */}

      <FitBot />

    </main>

  );

}
