# Focus Power Fit CRM

Sistema CRM desarrollado para **Focus Power Fit**, orientado a digitalizar, centralizar y optimizar la gestión de clientes, sucursales, profesores, planes de entrenamiento y procesos administrativos del gimnasio.

La plataforma ofrece una interfaz web responsive, con acceso diferenciado para administradores y clientes. Su objetivo es mejorar la organización de la información, automatizar tareas y facilitar la gestión operativa del gimnasio.

Este proyecto se desarrolla en el contexto de la asignatura **Capstone de Ingeniería Informática de Duoc UC**.

## Objetivo del proyecto

Desarrollar una plataforma web de gestión con enfoque CRM que permita al dueño de Focus Power Fit administrar centralizadamente las operaciones del gimnasio y entregar a los clientes acceso controlado a su información.

La solución contempla gestión administrativa, automatización de recordatorios, control de acceso y asistencia mediante un chatbot de preguntas frecuentes.

## Funcionalidades del sistema

El proyecto contempla los siguientes módulos:

- Gestión de clientes y sus datos personales.
- Gestión de sucursales.
- Gestión administrativa de profesores.
- Gestión de planes y servicios de entrenamiento.
- Asignación de profesores, planes y horarios.
- Registro y control de asistencias.
- Digitalización y consulta de contratos.
- Orientación sobre cancelaciones, recuperaciones y congelamientos de planes a través de FitBot.
- Registro administrativo de pagos efectuados fuera de la plataforma.
- Recordatorios automáticos de clases por correo electrónico.
- Cuentas de clientes con permisos limitados.
- Chatbot FitBot para preguntas frecuentes y orientación.
- Recuperación de contraseña por correo.
- Administración centralizada de la información.

> Las funcionalidades se encuentran en distintas etapas de desarrollo, integración y validación. Su inclusión en esta lista no implica que todas hayan completado las pruebas finales.

## Usuarios del sistema

El CRM contempla dos tipos de cuentas:

**Administrador:** corresponde exclusivamente al dueño de Focus Power Fit, quien posee acceso a las funcionalidades administrativas.

**Cliente:** puede consultar la información habilitada de su plan, profesor, horario y contrato, según los permisos correspondientes.

Los profesores se registran y administran dentro del CRM, pero **no poseen cuentas de acceso**.

## Reglas de negocio

La solución considera las condiciones establecidas en los contratos de prestación de servicios de Focus Power Fit:

- Las sesiones de entrenamiento personalizado tienen una duración máxima de 60 minutos.
- El cliente puede recuperar una sesión cuando el profesor no asiste o presenta un retraso superior a 20 minutos por una causa atribuible al profesor.
- Las cancelaciones del cliente deben informarse con al menos 6 horas hábiles de anticipación.
- La asistencia debe registrarse en el mesón o mediante el sistema de control correspondiente.
- Los planes pueden extenderse cuando existan situaciones justificadas y documentación de respaldo.
- Los planes pueden congelarse por accidentes, enfermedad, embarazo o viajes, según las condiciones del contrato.
- Los servicios de entrenamiento personalizado pueden ser individuales o compartidos.
- La firma de contratos y los pagos se mantienen como procesos presenciales en la versión actual.
- Los clientes pueden consultar sus horarios, pero no modificarlos directamente desde la plataforma.

## Tecnologías utilizadas

### Backend

- Node.js y Express 5.
- Sequelize ORM con MySQL (SQLite en memoria solo para pruebas).
- JWT y bcryptjs para autenticación.
- Helmet y express-rate-limit para protección HTTP.
- Multer para gestión de archivos.
- Nodemailer para envío de correos.
- ExcelJS para importar clientes.
- Node.js Test Runner y Supertest para pruebas automatizadas.

### Frontend

- React 19, TypeScript y Next.js con App Router.
- Tailwind CSS y CSS propio.
- Axios y Context API para autenticación.
- Vitest y React Testing Library.

### Infraestructura

- Docker y Docker Compose. Hoy n8n corre en Docker; el resto se completa para el despliegue.

### Automatización

- n8n para el flujo del chatbot FitBot.
- JavaScript para la lógica de respuestas del chatbot.
- Ollama con `llama3.2:3b` para interpretar preguntas que las reglas no reconocen.
- Nodemailer para las notificaciones por correo electrónico.

### Herramientas de desarrollo

- Visual Studio Code.
- Git.
- GitHub.
- ESLint.
- TypeScript.
- Scrum para gestión del proyecto.

## Chatbot FitBot

**FitBot** responde preguntas frecuentes de clientes nuevos y existentes sobre sucursales, planes, horarios, cancelaciones, recuperación de sesiones, congelamientos, pagos, contratos y contacto. Está disponible en la página principal y en la cuenta del cliente.

Funciona en **n8n**. Primero responden reglas en JavaScript. Si no reconocen la pregunta, una **IA local con Ollama** elige el tema más cercano entre categorías cerradas y el bot entrega un texto ya aprobado. La IA no redacta respuestas, no tiene herramientas y no accede a datos de clientes; si falla, responde el mensaje original. El navegador se comunica con el backend, que actúa de intermediario hacia n8n.

La instalación, la publicación y la solución de problemas están en [`n8n/README.md`](n8n/README.md).

### Archivos relacionados

- `n8n/fitbot-workflow.json`: flujo oficial publicado en n8n.
- `n8n/probar-fitbot.mjs`: prueba de preguntas frecuentes y de la IA.
- `frontend/app/components/FitBot.tsx`: componente del chat.
- `backend/src/routes/fitbot.js`: intermediario entre el CRM y n8n.

## Recordatorios automáticos por correo

El CRM contempla el envío automático de recordatorios de clases **24 horas antes de las sesiones programadas**, para clientes con asignación activa.

El backend revisa periódicamente los recordatorios pendientes y utiliza Nodemailer para gestionar el envío de correos.

Las variables de configuración del servicio son:

```env
EMAIL_HOST=
EMAIL_PORT=
EMAIL_SECURE=
EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM=
```

Las credenciales reales deben configurarse localmente y no publicarse en el repositorio.

## Arquitectura del sistema

**Frontend:** interfaz web con Next.js, React y TypeScript (`frontend/`).

**Backend:** API con Node.js y Express (`backend/src/`), que concentra reglas de negocio, permisos y acceso a datos.

**Persistencia:** MySQL mediante Sequelize ORM.

**Servicios complementarios:** Nodemailer para correo, Multer para archivos, n8n para FitBot y Ollama para su IA local.

## Estructura del proyecto

```text
focus-power-fit/
├── frontend/               # Interfaz web (Next.js)
│   ├── app/                # Páginas y componentes
│   ├── public/             # Imágenes y archivos estáticos
│   └── tests/              # Pruebas del frontend
├── backend/                # API, lógica de negocio y persistencia
│   ├── src/                # Código y pruebas
│   └── crear-admin.mjs     # Creación del administrador
├── n8n/                    # Flujo de FitBot
├── Documentacion CAPSTONE/ # Evidencias e informes académicos
├── docs/iso/ # Diagnóstico y documentos de ISO/IEC 27001 e ISO 9001
└── README.md
```

## Instalación y ejecución

### Requisitos previos

- Node.js y npm.
- Git.
- Base de datos SQL configurada.
- Servicios complementarios requeridos por el entorno.
- Docker y Docker Compose, si se utiliza el entorno contenerizado.

### 1. Clonar el repositorio

```bash
git clone https://github.com/katherinehermosilla00/focus-power-fit.git
cd focus-power-fit
```

### 2. Configurar el backend

```bash
cd backend
npm install
cp .env.example .env
```

Completa `.env` con la base de datos, la clave JWT y el correo.

Si la base de datos ya existía, respáldala y ejecuta una vez:

```bash
npm run migrar:seguridad
```

Si informa fichas repetidas por clientes importados en dos sucursales, simula cómo quedarían. Este comando no cambia nada:

```bash
npm run unir:duplicados
```

Para aplicarlo, indica el nombre de la base, que debe coincidir con `DB_NAME`, y vuelve a ejecutar la migración:

```bash
npm run unir:duplicados -- --aplicar --base=NOMBRE_DE_LA_BASE
```

Para respaldar la base y los archivos, configura `RESPALDOS_DIR` y `RESPALDO_CLAVE`, y sigue el [procedimiento de respaldos](docs/iso/03-procedimientos.md#p4-respaldos).

Inicia el servidor:

```bash
npm run dev
```

### 3. Configurar el frontend

Desde la raíz del repositorio:

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Abre la dirección local indicada por Next.js.

### 4. Configurar FitBot

Sigue los pasos de [`n8n/README.md`](n8n/README.md).

## Pruebas y aseguramiento de calidad

```bash
cd backend && npm test
cd ../frontend && npm run lint && npx tsc --noEmit && npm test && npm run build
```

Las pruebas del backend no necesitan `.env` ni MySQL y cubren autenticación, control de acceso, registro, recuperación de contraseña, contratos, cargas, recordatorios y migración. Los resultados de cada ejecución se guardan en `Documentacion CAPSTONE/Fase 03/Evidencias Seguridad/`.

Las pruebas son evidencia de calidad, no una garantía de ausencia de fallas.

### Automatización de calidad y respaldos

- **Revisión automática:** en cada cambio que llega a GitHub, [GitHub Actions](.github/workflows/ci.yml) ejecuta lint, tipos, pruebas y compilación del frontend, y las pruebas y la auditoría de dependencias del backend. No usa la base real ni envía correos.
- **Dependencias:** [Dependabot](.github/dependabot.yml) revisa cada lunes si hay versiones con correcciones y abre una solicitud de cambio, que pasa por la revisión automática.
- **Respaldos:** un respaldo cifrado diario y una prueba de restauración semanal, programados con [scripts/programar-respaldos.ps1](scripts/programar-respaldos.ps1). Ver el [procedimiento de respaldos](docs/iso/03-procedimientos.md#p4-respaldos).

### Notas para el despliegue

El sistema completo (MySQL, API, sitio, n8n y HTTPS) se despliega con Docker siguiendo la [guía de despliegue](deploy/README.md).

- Detrás de un proxy HTTPS (Caddy o Nginx), define `TRUST_PROXY=1` en `backend/.env`. Sin eso, los límites de intentos de inicio de sesión y de FitBot serían uno solo para todos los visitantes.
- Ejecuta **una sola instancia** del backend. Los códigos de registro y recuperación se guardan en memoria: al reiniciar el backend se pierden, y quien estaba registrándose debe pedir un código nuevo. Conviene reiniciar fuera del horario de atención.
- Define `CORS_ORIGINS` con el dominio real del sitio y `NEXT_PUBLIC_API_URL` con la dirección pública de la API.

## Metodología de trabajo

El proyecto utiliza **Scrum** como marco de trabajo ágil.

La planificación y el seguimiento se realizan mediante:

- Product Backlog.
- Sprint Backlog.
- Sprints.
- Sprint Planning.
- Seguimiento de tareas e impedimentos.
- Sprint Review.
- Sprint Retrospective.
- Definition of Done.
- Carta Gantt.

### Equipo de desarrollo

| Integrante | Rol Scrum |
|---|---|
| Martina Vergara | Product Owner |
| Katherine Hermosilla | Scrum Master |
| Javier Vargas | Developer |

Los tres integrantes participan en actividades técnicas de acuerdo con las necesidades del proyecto, manteniendo sus responsabilidades Scrum específicas.

## Control de versiones

El código fuente se administra mediante Git y GitHub.

Se utilizan ramas de desarrollo, commits y Pull Requests para organizar cambios, facilitar la colaboración y mantener la trazabilidad de los avances.

**Repositorio oficial:**

https://github.com/katherinehermosilla00/focus-power-fit

## Diseño y experiencia de usuario

La interfaz considera los requisitos visuales definidos por Focus Power Fit:

- Identidad visual principalmente negra y roja.
- Diseño responsive.
- Enfoque mobile-first.
- Navegación clara y consistente.
- Interfaces diferenciadas según los permisos.
- Compatibilidad con computadores, tablets y teléfonos móviles.

## Documentación

La documentación complementaria del proyecto se encuentra en:

- `Documentacion CAPSTONE/`.
- `n8n/README.md` para el chatbot.

## Estado actual del proyecto

🚧 **Proyecto en desarrollo y validación — Fase 2 de Capstone.**

Entre los avances documentados se encuentran:

- Desarrollo de la arquitectura frontend y backend.
- Implementación de módulos administrativos del CRM.
- Gestión de autenticación y permisos.
- Integración de componentes y servicios.
- Desarrollo e integración del chatbot FitBot con n8n.
- Incorporación de pruebas automatizadas.
- Uso de GitHub para seguimiento y control de versiones.
- Elaboración de documentación técnica y evidencias de avance.

### Actividades pendientes o en consolidación

- Completar y validar el módulo de sucursales.
- Verificar integralmente las reglas contractuales.
- Ampliar las pruebas funcionales y automatizadas.
- Consolidar la integración de todos los módulos.
- Completar la documentación y validación final del proyecto.

## Alcance de los pagos

La versión actual permite el **registro administrativo de pagos realizados por medios externos**.

El procesamiento de pagos online no forma parte del alcance actual.

### Mejoras futuras

Se podrá evaluar la integración de pasarelas de pago como:

- Webpay.
- Mercado Pago.

Estas integraciones corresponden exclusivamente a posibles mejoras futuras y no deben considerarse funcionalidades implementadas.

---

**Focus Power Fit CRM — Proyecto Capstone, Ingeniería Informática, Duoc UC · 2026.**
