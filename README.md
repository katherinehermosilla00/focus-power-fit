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
- Gestión de cancelaciones, recuperaciones y congelamientos de planes.
- Registro administrativo de pagos efectuados fuera de la plataforma.
- Recordatorios automáticos de clases por correo electrónico.
- Cuentas de clientes con permisos limitados.
- Chatbot FitBot para preguntas frecuentes y orientación.
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

- Node.js.
- Express.js.
- Sequelize ORM.
- Base de datos SQL.
- Redis.
- Swagger / OpenAPI.
- Multer para gestión de archivos.
- Nodemailer para envío de correos.
- Node.js Test Runner para pruebas automatizadas.
- Docker y Docker Compose.

### Frontend

- React 19.
- TypeScript.
- Next.js 16.4.1 con App Router.
- Turbopack.
- Bootstrap 5.
- Material Icons.
- Axios.
- Context API para autenticación.
- Componentes CRUD reutilizables.
- CSS Grid y Flexbox.
- Diseño responsive mobile-first.
- Vitest.
- React Testing Library.
- Docker y Docker Compose.

### Automatización

- n8n para el flujo del chatbot FitBot.
- JavaScript para la lógica de respuestas del chatbot.
- Nodemailer para las notificaciones por correo electrónico.

### Herramientas de desarrollo

- Visual Studio Code.
- Git.
- GitHub.
- Swagger.
- ESLint.
- TypeScript.
- Scrum para gestión del proyecto.

## Chatbot FitBot

**FitBot** es el chatbot de orientación desarrollado para Focus Power Fit.

Su propósito es responder preguntas frecuentes de clientes nuevos y existentes, facilitando el acceso a información general sobre los servicios del gimnasio.

El chatbot fue desarrollado utilizando **n8n y JavaScript**, e integrado a la interfaz del CRM mediante componentes React.

### Funcionalidades

- Responder preguntas frecuentes.
- Orientar a clientes sobre los servicios disponibles.
- Entregar información general del gimnasio y sus sucursales.
- Proporcionar respuestas automatizadas mediante un flujo de n8n.

### Archivos relacionados

- `n8n/fitbot-workflow.json`: exportación del flujo de automatización.
- `FitBot.tsx`: componente React del chatbot.
- `FitBot.module.css`: estilos del chatbot.

El flujo y la interfaz se encuentran desarrollados e integrados. La documentación de pruebas debe incluir evidencia de su funcionamiento dentro del CRM.

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

El proyecto utiliza una arquitectura modular que separa las principales responsabilidades del sistema.

**Frontend:** interfaz web desarrollada con Next.js, React y TypeScript.

**Backend:** API desarrollada con Node.js y Express para gestionar las reglas de negocio y la comunicación con la base de datos.

**Persistencia:** almacenamiento de información mediante una base de datos SQL y Sequelize ORM.

**Servicios complementarios:** Redis, Nodemailer, Multer y n8n.

Esta separación facilita el mantenimiento, la integración de componentes y la incorporación de futuras funcionalidades.

## Estructura del proyecto

```text
focus-power-fit/
├── ccbackend/             # API, lógica de negocio y persistencia
├── ccfrontend/            # Interfaz web del CRM
├── n8n/                   # Flujos de automatización de FitBot
├── Documentacion CAPSTONE/ # Evidencias e informes académicos
├── GUIA_PROYECTO.md       # Documentación técnica complementaria
└── README.md              # Presentación general del proyecto
```

La estructura puede variar según las actualizaciones del repositorio.

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
cd ccbackend
npm install
```

Configurar las variables de entorno necesarias para la conexión a la base de datos, autenticación y servicios complementarios.

Iniciar el servidor:

```bash
npm run dev
```

### 3. Configurar el frontend

Desde la raíz del repositorio:

```bash
cd ccfrontend
npm install
npm run dev
```

Abrir la dirección local indicada por Next.js en la terminal.

### 4. Configurar FitBot

El workflow de FitBot se encuentra en:

```text
n8n/fitbot-workflow.json
```

Para utilizarlo en un nuevo entorno, es necesario importar el archivo en n8n y configurar las conexiones correspondientes entre el flujo y la interfaz del CRM.

## Pruebas y aseguramiento de calidad

El proyecto incorpora pruebas automatizadas y herramientas de revisión de calidad.

### Backend

- Node.js Test Runner.
- Pruebas de autenticación.
- Validaciones de registro.
- Consultas de información.
- Verificación de autorización por roles.

**Último resultado documentado:** 7 de 7 pruebas aprobadas.

### Frontend

- Vitest.
- React Testing Library.
- jest-dom.
- jsdom.

**Último resultado documentado:** 1 prueba de componente aprobada.

### Verificaciones complementarias

- ESLint.
- Comprobación de tipos con TypeScript.
- Compilación de producción.
- Auditoría de dependencias.

En la última revisión documentada, la auditoría de dependencias de producción no detectó vulnerabilidades. Este resultado no reemplaza futuras revisiones de seguridad.

Las pruebas existentes constituyen evidencia de avance y no representan todavía una cobertura completa del CRM.

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

- `GUIA_PROYECTO.md`.
- `Documentacion CAPSTONE/`.
- Swagger para la documentación de endpoints del backend.
- `n8n/fitbot-workflow.json` para el flujo del chatbot.

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
- Registrar evidencias de validación de FitBot dentro del CRM.
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
