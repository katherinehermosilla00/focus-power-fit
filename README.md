# Focus Power Fit CRM

Sistema CRM desarrollado para **Focus Power Fit**, orientado a digitalizar, centralizar y optimizar la gestión de clientes, sucursales, servicios y procesos administrativos del gimnasio.

El sistema funciona mediante una interfaz web responsive, pero su propósito principal es actuar como una herramienta CRM para apoyar la administración y el seguimiento de las operaciones de Focus Power Fit.

## Funcionalidades

El proyecto contempla los siguientes módulos y funcionalidades:

* Gestión de clientes.
* Gestión de sucursales.
* Gestión administrativa de profesores.
* Gestión de planes y servicios.
* Gestión de horarios y sesiones.
* Registro y control de asistencias.
* Digitalización y gestión de contratos.
* Gestión de cancelaciones, recuperaciones y congelamientos.
* Registro administrativo de pagos realizados por medios externos.
* Recordatorios de clases por correo electrónico.
* Cuenta de cliente con acceso limitado.
* Chatbot de preguntas frecuentes y orientación.
* Administración centralizada de la información.

## Usuarios del sistema

El CRM contempla dos tipos de cuenta:

* **Administrador:** corresponde al dueño de Focus Power Fit y posee acceso completo a la administración del sistema.
* **Cliente:** posee acceso limitado a su información y a las funcionalidades autorizadas.

Los profesores son registrados y administrados dentro del CRM, pero **no poseen cuentas de acceso**.

## Reglas del servicio

El sistema considera las principales reglas establecidas en los contratos de prestación de servicios de Focus Power Fit:

* El cliente puede recuperar una sesión cuando el profesor no asiste o presenta un retraso superior a 20 minutos.
* Las cancelaciones del cliente deben informarse con un mínimo de 6 horas hábiles de anticipación.
* Los planes de entrenamiento personalizado pueden extenderse con la documentación correspondiente.
* Los planes pueden congelarse por accidentes, enfermedad, embarazo o viajes.
* Los servicios de entrenamiento personalizado pueden ser individuales o compartidos.

## Tecnologías

### Backend

* Node.js.
* Express.
* Sequelize ORM.
* Base de datos SQL.
* Redis.
* Swagger.
* Multer.
* Nodemailer.
* Docker.
* Pruebas automatizadas.

### Frontend

* React.
* TypeScript.
* Next.js Pages Router.
* Vite.
* Bootstrap 5.
* Axios.
* Context API.
* CSS Grid y Flexbox.
* Diseño responsive mobile-first.
* Docker.

### Control de versiones

* Git.
* GitHub.

Las herramientas y tecnologías podrán actualizarse según las necesidades técnicas del proyecto.

## Diseño

La interfaz considera los requisitos visuales y de usabilidad definidos para Focus Power Fit:

* Identidad visual principalmente negra y roja.
* Diseño responsive.
* Enfoque mobile-first.
* Navegación clara y consistente.
* Interfaces diferenciadas según el tipo de cuenta.
* Compatibilidad con computadores, tablets y dispositivos móviles.

## Equipo

| Integrante           | Rol Scrum     |
| -------------------- | ------------- |
| Katherine Hermosilla | Scrum Master  |
| Martina Vergara      | Product Owner |
| Javier Vargas        | Developer     |

Los tres integrantes pueden participar en las tareas técnicas del proyecto, manteniendo las responsabilidades correspondientes a sus roles Scrum.

## Metodología

El proyecto utiliza **Scrum** como marco de trabajo ágil.

El trabajo se organiza mediante:

* Product Backlog.
* Sprint Backlog.
* Sprints.
* Sprint Planning.
* Seguimiento del avance.
* Sprint Review.
* Sprint Retrospective.

## Estructura del proyecto

El proyecto está dividido principalmente en:

* `ccbackend`: backend desarrollado con Node.js, Express y Sequelize.
* `ccfrontend`: frontend desarrollado con React y TypeScript.

## Ejecución del proyecto

### Backend

Ingresar a la carpeta del backend:

```bash
cd ccbackend
```

Instalar las dependencias:

```bash
npm install
```

Iniciar el entorno de desarrollo:

```bash
npm run dev
```

### Frontend

Ingresar a la carpeta del frontend:

```bash
cd ccfrontend
```

Instalar las dependencias:

```bash
npm install
```

Iniciar el entorno de desarrollo:

```bash
npm run dev
```

Luego, abrir en el navegador la dirección local indicada por Vite.

## Documentación

La documentación técnica detallada del proyecto se encuentra en:

`GUIA_PROYECTO.md`

La documentación de los endpoints del backend está disponible mediante Swagger cuando el servidor se encuentra en ejecución.

## Estado del proyecto

🚧 **Proyecto actualmente en desarrollo.**

Entre las funcionalidades prioritarias pendientes se encuentran:

* Implementación y consolidación del módulo de sucursales.
* Desarrollo e integración del chatbot.
* Aplicación de las reglas contractuales.
* Integración y pruebas de los módulos del CRM.
* Pruebas funcionales y documentación final.

## Alcance de los pagos

La versión actual permite únicamente el **registro administrativo de pagos realizados por medios externos**.

El procesamiento de pagos online no forma parte del alcance actual del CRM.

## Alcance futuro

Como evolución futura del proyecto se podrá evaluar la integración de pasarelas de pago como:

* Webpay.
* Mercado Pago.

Estas integraciones corresponden a mejoras futuras y no deben considerarse funcionalidades implementadas en la versión actual.
