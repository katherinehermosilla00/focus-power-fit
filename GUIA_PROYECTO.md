# Focus Power Fit — Guía del Proyecto y Desarrollo

> Documentación general y técnica del proyecto **Focus Power Fit**.
> Este documento describe el propósito del sistema, alcance, reglas de negocio,
> arquitectura, tecnologías, metodología de trabajo, equipo, ejecución local,
> estado de desarrollo y evolución futura.

---

## 1. ¿Qué es Focus Power Fit?

**Focus Power Fit** es un sistema web de gestión con enfoque CRM desarrollado
para digitalizar y centralizar procesos administrativos de un gimnasio dedicado
principalmente al entrenamiento personalizado.

El cliente del proyecto es el dueño de **Focus Power Fit**, quien será el único
usuario con privilegios administrativos dentro de la plataforma.

El sistema busca centralizar procesos relacionados con:

- Clientes existentes y nuevos.
- Profesores.
- Planes de entrenamiento.
- Horarios.
- Asistencias.
- Contratos.
- Registro administrativo de pagos.
- Recordatorios de clases por correo electrónico.
- Información disponible para los clientes.
- Preguntas frecuentes mediante chatbot.

Los profesores forman parte de la información administrada por el sistema,
pero **no tendrán cuentas de acceso**.

Los clientes dispondrán de una cuenta con permisos limitados principalmente
a la consulta de su información.

---

## 2. Problema y contexto

Focus Power Fit actualmente requiere coordinar diferentes procesos mediante
atención presencial y distintos mecanismos de registro.

Esto puede dificultar la centralización y consulta de información relacionada
con clientes, profesores, planes, horarios, contratos y asistencias.

El proyecto busca entregar una solución web que permita al dueño administrar
esta información desde una plataforma centralizada y que, al mismo tiempo,
entregue a los clientes acceso controlado a información relacionada con su
servicio.

---

## 3. Objetivo general

Desarrollar una plataforma web de gestión con enfoque CRM para **Focus Power Fit**
que permita al dueño centralizar la administración del gimnasio y entregar a
los clientes acceso controlado a su información, incorporando recordatorios
automatizados y un chatbot de orientación.

---

## 4. Objetivos específicos

1. Analizar y documentar los requerimientos del cliente y las reglas de negocio.
2. Diseñar una solución modular, escalable y mantenible.
3. Diseñar el modelo de datos necesario para soportar las funcionalidades.
4. Implementar la gestión de clientes, profesores, planes, horarios,
   asistencias, contratos y registros administrativos.
5. Implementar autenticación y control de acceso.
6. Mantener al dueño como único usuario con privilegios administrativos.
7. Automatizar recordatorios de clases mediante correo electrónico.
8. Incorporar un chatbot para orientar a clientes nuevos y existentes.
9. Integrar frontend, backend, base de datos y servicios complementarios.
10. Validar las funcionalidades mediante pruebas.

---

## 5. Alcance del sistema

La versión actual contempla:

- Administración exclusiva del dueño de Focus Power Fit.
- Registro y gestión de clientes existentes.
- Registro y gestión de clientes nuevos.
- Gestión informativa de profesores.
- Gestión de planes.
- Asociación entre cliente, profesor, plan y horario.
- Gestión de horarios.
- Registro y control de asistencias.
- Gestión de contratos digitalizados.
- Cuenta personal para clientes.
- Consulta de plan.
- Consulta de profesor.
- Consulta de horario.
- Consulta de contrato.
- Registro administrativo de pagos realizados fuera de la plataforma.
- Recordatorios de clases mediante correo electrónico.
- Chatbot para preguntas frecuentes.
- Diseño responsive.
- Identidad visual basada principalmente en negro y rojo.

---

## 6. Límites del alcance

Existen procesos que continuarán realizándose presencialmente.

### Contratos

El contrato y la declaración relacionada con la condición física del cliente
se firman presencialmente.

Posteriormente, el sistema podrá mantener una **copia digital del documento**
para que pueda ser consultada desde la cuenta correspondiente.

### Horarios

El cliente puede consultar su horario desde la plataforma.

Sin embargo:

> El cliente no puede modificar directamente su horario desde su cuenta.

Los cambios deben coordinarse de acuerdo con el procedimiento establecido por
Focus Power Fit.

### Profesores

Los profesores:

- Se registran dentro del sistema.
- Pueden asociarse a clientes y planes.
- Pueden mostrarse dentro de la plataforma.
- **No poseen cuentas de acceso.**

### Pagos

La versión actual permite mantener un **registro administrativo de pagos
realizados fuera de la plataforma**.

Los pagos online no forman parte del alcance actual.

---

## 7. Reglas de negocio

Las reglas consideradas para el desarrollo fueron obtenidas a partir de los
requerimientos del cliente y del contrato utilizado por Focus Power Fit.

### Sesiones

- El Personal Trainer puede ser seleccionado por el socio.
- Los días y horas se coordinan entre socio y profesor.
- Los horarios se informan mediante los procedimientos definidos por el gimnasio.
- Las sesiones de Personal Training tienen una duración máxima de 60 minutos.

### Recuperación de sesiones

Si una sesión:

- No se realiza por una causa atribuible al profesor, o
- El profesor presenta un retraso superior a 20 minutos,

el socio puede solicitar una sesión de recuperación.

### Asistencia

El socio debe registrar su asistencia mediante el mesón o sistema de control
correspondiente.

### Cancelaciones

Cuando el socio no pueda asistir, debe avisar con al menos **6 horas hábiles
de anticipación**, de acuerdo con las condiciones establecidas.

### Congelación o extensión de planes

Los planes pueden congelarse o extenderse cuando exista una situación
justificada y respaldada documentalmente.

Por ejemplo:

- Accidentes.
- Enfermedad.
- Embarazo.
- Viajes.

### Modalidades

Los servicios de Personal Training pueden ser:

- Individuales.
- Compartidos.

---

## 8. Usuarios y permisos

El sistema considera principalmente dos tipos de usuarios con acceso.

### 8.1 Administrador / Dueño

El dueño de Focus Power Fit será el **único administrador del sistema**.

Tendrá acceso a las funcionalidades administrativas relacionadas con:

- Clientes.
- Profesores.
- Planes.
- Horarios.
- Asistencias.
- Contratos.
- Pagos registrados.
- Recordatorios.
- Información necesaria para la operación del gimnasio.

### 8.2 Cliente

Los clientes tendrán cuentas con permisos limitados.

Podrán consultar principalmente:

- Su plan.
- Profesor asociado.
- Horario.
- Copia digital de su contrato.
- Información habilitada por el gimnasio.

No podrán acceder al panel administrativo.

### 8.3 Profesor

Los profesores **no tendrán cuentas de usuario**.

Su información será administrada exclusivamente desde el sistema administrativo.

---

## 9. Requisitos funcionales principales

| ID | Requisito |
|---|---|
| RF-01 | Solo el dueño tendrá privilegios administrativos. |
| RF-02 | El administrador podrá registrar y gestionar clientes existentes y nuevos. |
| RF-03 | El administrador podrá gestionar profesores sin crear cuentas para ellos. |
| RF-04 | El administrador podrá gestionar planes de entrenamiento. |
| RF-05 | El administrador podrá asociar plan, profesor y horario a cada cliente. |
| RF-06 | El cliente podrá iniciar sesión y consultar la información habilitada. |
| RF-07 | El cliente podrá consultar su plan. |
| RF-08 | El cliente podrá consultar información de su profesor. |
| RF-09 | El cliente podrá consultar su horario, pero no modificarlo directamente. |
| RF-10 | El administrador podrá gestionar asistencias. |
| RF-11 | El administrador podrá cargar una copia digital del contrato. |
| RF-12 | El cliente podrá visualizar la copia digital de su contrato. |
| RF-13 | El sistema podrá mantener información de sesiones y vigencia de planes. |
| RF-14 | El sistema permitirá registrar pagos realizados fuera de la plataforma. |
| RF-15 | El sistema enviará recordatorios asociados a clases programadas. |
| RF-16 | El sistema incorporará un chatbot para preguntas frecuentes. |
| RF-17 | El administrador podrá mantener actualizada la información de profesores y planes. |

---

## 10. Requisitos no funcionales

### Diseño

La identidad visual solicitada por el cliente utiliza principalmente:

- Negro.
- Rojo.

### Responsive

La plataforma deberá adaptarse a:

- Computadores.
- Tablets.
- Teléfonos.

Se utilizará un enfoque **mobile-first**.

### Seguridad

El sistema deberá proteger las funciones administrativas y diferenciar los
permisos según el tipo de usuario.

### Modularidad

Las funcionalidades deberán organizarse mediante módulos que permitan mantener
separadas las distintas responsabilidades del sistema.

### Escalabilidad

La solución deberá permitir incorporar nuevas funcionalidades sin tener que
reconstruir completamente la plataforma.

### Mantenibilidad

Se buscará mantener una estructura organizada, reutilizable y comprensible
para facilitar futuras modificaciones.

### Usabilidad

Las interfaces deben ser claras y fáciles de utilizar tanto para el dueño
como para los clientes.

---

## 11. Arquitectura general

La arquitectura objetivo del proyecto contempla la separación entre la
interfaz web, lógica del sistema y persistencia de datos.

```text
                    FOCUS POWER FIT

┌─────────────────────────────────────────────┐
│                  USUARIOS                   │
│                                             │
│       Administrador           Cliente       │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│                  FRONTEND                   │
│                                             │
│          React + TypeScript + Next.js       │
│                                             │
│   Login · Admin · Mi Cuenta · Interfaces    │
└──────────────────────┬──────────────────────┘
                       │
                    HTTP/API
                       │
                       ▼
┌─────────────────────────────────────────────┐
│                   BACKEND                   │
│                                             │
│             Node.js + Express               │
│                  Sequelize                  │
│                                             │
│  Auth · Clientes · Planes · Contratos ...  │
└──────────────────────┬──────────────────────┘
                       │
                      SQL
                       │
                       ▼
┌─────────────────────────────────────────────┐
│                   MySQL 8                   │
│                                             │
│             Base de datos FPF               │
└─────────────────────────────────────────────┘
```

> La arquitectura continuará ajustándose durante el desarrollo y debe
> documentarse según la implementación real del repositorio.

---

## 12. Tecnologías del proyecto

### Backend

Tecnologías consideradas para `ccbackend`:

- Node.js.
- Express.
- Sequelize ORM.
- SQL.
- Redis.
- Swagger.
- Multer.
- Nodemailer.
- Testing.
- Docker.
- Docker Compose.

### Funciones asociadas

**Sequelize**

Permite trabajar con la persistencia de información y modelos de datos.

**Redis**

Previsto para funciones que requieran almacenamiento temporal o caché.

**Swagger**

Utilizado para documentar los servicios de la API.

**Multer**

Permite gestionar la carga de archivos, especialmente documentos asociados
a funcionalidades como contratos.

**Nodemailer**

Permite implementar el envío de correos electrónicos, incluyendo los
recordatorios de clases.

---

## 13. Frontend

Tecnologías consideradas para `ccfrontend`:

- React.
- TypeScript.
- Next.js.
- Bootstrap 5.
- CSS Custom Properties.
- Material Icons.
- Axios.
- Context API.
- CSS Grid.
- Flexbox.
- Animaciones CSS.
- Diseño responsive mobile-first.
- Docker.

### Axios

Se utilizará como cliente HTTP para la comunicación con servicios del backend.

### Context API

Se considera para gestionar información compartida relacionada con
autenticación y sesión.

### Bootstrap 5

Se utilizará como apoyo para la construcción de interfaces responsive.

### CSS

El diseño debe mantener la identidad visual definida para Focus Power Fit,
principalmente:

```text
NEGRO + ROJO
```

---

## 14. Base de datos

El sistema utilizará:

**MySQL 8**

Durante el desarrollo local se utilizará:

```text
Host: 127.0.0.1
Puerto: 3306
```

La administración visual puede realizarse mediante:

**MySQL Workbench**

### ORM

El backend contempla **Sequelize** como ORM para facilitar la interacción entre
Node.js y MySQL.

### Seguridad de credenciales

Nunca se deben publicar en GitHub:

- Contraseñas de MySQL.
- Contraseña de `root`.
- Tokens.
- Secretos JWT.
- Credenciales de correo.
- Claves de servicios externos.

Estos valores deberán almacenarse mediante variables de entorno.

---

## 15. Módulos del sistema

La plataforma se divide conceptualmente en los siguientes módulos:

```text
Focus Power Fit
│
├── Autenticación
│
├── Administración
│   ├── Clientes
│   ├── Profesores
│   ├── Planes
│   ├── Horarios
│   ├── Asistencias
│   ├── Contratos
│   ├── Pagos
│   └── Recordatorios
│
├── Cliente
│   └── Mi Cuenta
│       ├── Plan
│       ├── Profesor
│       ├── Horario
│       └── Contrato
│
├── Comunicaciones
│   └── Correo electrónico
│
└── Chatbot
```

---

## 16. Chatbot

Focus Power Fit contempla la incorporación de un chatbot dentro de la
plataforma.

Su propósito será apoyar principalmente en:

- Preguntas frecuentes.
- Información general del gimnasio.
- Orientación para clientes nuevos.
- Orientación para clientes existentes.

El alcance específico de sus preguntas, respuestas y funcionamiento deberá
definirse y validarse durante el desarrollo.

---

## 17. Recordatorios por correo

El sistema contempla enviar correos electrónicos relacionados con las clases
programadas.

La tecnología considerada para esta funcionalidad es:

**Nodemailer**

El momento exacto en que debe enviarse cada recordatorio deberá ser definido
con el cliente antes de considerar terminada la funcionalidad.

---

## 18. Equipo del proyecto

El proyecto está compuesto por tres integrantes.

| Integrante | Rol Scrum | Participación |
|---|---|---|
| **Katherine Hermosilla** | Scrum Master | Gestión Scrum + desarrollo técnico |
| **Martina Vergara** | Product Owner | Gestión del Product Backlog + desarrollo técnico |
| **Javier Vargas** | Developer | Desarrollo técnico |

### Katherine Hermosilla — Scrum Master

Responsabilidades principales:

- Facilitar la aplicación de Scrum.
- Coordinar el seguimiento del proyecto.
- Apoyar la resolución de impedimentos.
- Facilitar las ceremonias.
- Participar en tareas técnicas asignadas.

### Martina Vergara — Product Owner

Responsabilidades principales:

- Representar las necesidades del cliente dentro del equipo.
- Gestionar el Product Backlog.
- Priorizar funcionalidades.
- Verificar que los incrementos aporten valor.
- Participar en tareas técnicas asignadas.

### Javier Vargas — Developer

Responsabilidades principales:

- Análisis.
- Diseño.
- Programación.
- Integración.
- Pruebas.
- Documentación técnica.

### Participación técnica

Los tres integrantes pueden participar en tareas técnicas.

Los roles de Product Owner y Scrum Master agregan responsabilidades específicas,
pero no impiden que Katherine y Martina participen en programación, pruebas,
base de datos, documentación u otras tareas.

---

## 19. Metodología de desarrollo

El proyecto utiliza **Scrum** como metodología ágil.

Scrum permitirá organizar el desarrollo mediante ciclos incrementales,
priorizar funcionalidades y obtener avances verificables durante el semestre.

---

## 20. Artefactos Scrum

### Product Backlog

Contiene:

- Historias de usuario.
- Requisitos.
- Mejoras.
- Errores.
- Tareas técnicas.

### Sprint Backlog

Contiene las tareas seleccionadas para desarrollar durante un Sprint.

### Incremento

Representa el resultado funcional y verificable producido durante el Sprint.

### Definition of Done

Define los criterios necesarios para considerar una funcionalidad terminada.

---

## 21. Ceremonias Scrum

El equipo contempla:

### Sprint Planning

Planificación del trabajo que será desarrollado durante el Sprint.

### Daily Scrum / seguimiento

Revisión breve de:

- Trabajo realizado.
- Trabajo pendiente.
- Impedimentos.

La frecuencia puede adaptarse a la disponibilidad académica del equipo.

### Sprint Review

Presentación y revisión del incremento desarrollado.

### Sprint Retrospective

Evaluación interna del trabajo realizado para identificar:

- Qué funcionó.
- Qué debe mejorar.
- Qué cambios aplicar en el siguiente Sprint.

---

## 22. Organización en Trello

El tablero del proyecto utiliza el siguiente flujo:

```text
Product Backlog
       ↓
Sprint actual
       ↓
Por hacer
       ↓
En proceso
       ↓
En pruebas
       ↓
Terminado
```

Las tarjetas pueden contener:

- Historia de usuario.
- Descripción.
- Responsable.
- Prioridad.
- Criterios de aceptación.
- Checklist.
- Evidencias.
- Fecha correspondiente.

---

## 23. Plan de Sprints

| Sprint | Semanas | Objetivo |
|---|---|---|
| Sprint 0 | S1-S4 | Definición, requerimientos, Product Backlog, arquitectura preliminar, datos y planificación |
| Sprint 1 | S5-S7 | Autenticación, permisos y gestión inicial de clientes |
| Sprint 2 | S8-S10 | Profesores, planes, asignaciones, horarios y asistencias |
| Sprint 3 | S11-S12 | Contratos digitales, archivos y consultas del cliente |
| Sprint 4 | S13-S14 | Correos, chatbot e integración |
| Sprint 5 | S15-S18 | Pruebas, correcciones, validación, documentación y presentación |

---

## 24. Fases académicas

### Fase 1 — Definición

Semanas 1 a 4.

Incluye:

- Definición del problema.
- Fundamentación.
- Requerimientos.
- Alcance.
- Objetivos.
- Scrum.
- Roles.
- Product Backlog inicial.
- Arquitectura preliminar.
- Modelo de datos preliminar.
- Plan de trabajo.
- Carta Gantt.

### Fase 2 — Desarrollo y seguimiento

Concentra los principales Sprints de desarrollo.

Incluye:

- Autenticación.
- Permisos.
- Clientes.
- Profesores.
- Planes.
- Horarios.
- Asistencias.
- Contratos.
- Pagos administrativos.
- Recordatorios.
- Chatbot.
- Integración.
- Pruebas parciales.

### Fase 3 — Validación y cierre

Incluye:

- Pruebas finales.
- Corrección de errores.
- Validación de requisitos.
- Consolidación de evidencias.
- Documentación.
- Demostración.
- Presentación final.

---

## 25. Carta Gantt general

| Actividad | Inicio | Fin |
|---|---:|---:|
| Definición y requerimientos | S1 | S4 |
| Arquitectura y modelo de datos preliminar | S3 | S5 |
| Autenticación, permisos y clientes | S5 | S7 |
| Profesores, planes, horarios y asistencias | S8 | S10 |
| Contratos y archivos | S11 | S12 |
| Correo, chatbot e integración | S13 | S14 |
| Pruebas y correcciones | S15 | S16 |
| Validación final | S16 | S17 |
| Documentación y presentación | S17 | S18 |

La Carta Gantt detallada puede mantenerse mediante **Google Sheets**.

---

## 26. Herramientas de apoyo

Además de las tecnologías utilizadas en la aplicación, el proyecto utiliza:

- Visual Studio Code.
- Git.
- GitHub.
- Trello.
- Google Sheets.
- MySQL Workbench.

---

## 27. Instalación local

### Requisitos

Antes de trabajar con el proyecto se recomienda tener instalado:

- Git.
- Node.js.
- npm.
- Visual Studio Code.
- MySQL 8.
- MySQL Workbench.

Cuando la contenerización esté completamente integrada:

- Docker.
- Docker Compose.

---

## 28. Clonar el repositorio

```powershell
git clone URL_DEL_REPOSITORIO
cd focus-power-fit
```

---

## 29. Instalar dependencias

Desde la carpeta correspondiente al proyecto:

```powershell
npm install
```

---

## 30. Ejecutar en desarrollo

```powershell
npm run dev
```

Una vez iniciado correctamente, acceder desde el navegador a la dirección
indicada por el servidor de desarrollo.

Por ejemplo:

```text
http://localhost:3000
```

> El puerto debe confirmarse según la configuración real del proyecto.

---

## 31. Git y GitHub

Git se utiliza para mantener control de los cambios realizados por el equipo.

### Revisar cambios

```powershell
git status
```

### Preparar cambios

```powershell
git add .
```

### Crear commit

```powershell
git commit -m "Descripción del cambio"
```

### Subir cambios

```powershell
git push
```

Ejemplos de mensajes:

```text
Agregar autenticación de clientes
Crear gestión de clientes
Agregar estructura inicial de base de datos
Implementar vista de contratos
Corregir permisos del panel administrativo
Agregar recordatorios por correo
```

---

## 32. Estado del proyecto

El proyecto se encuentra actualmente **en desarrollo**.

La documentación debe diferenciar entre:

- Funcionalidades implementadas.
- Funcionalidades en desarrollo.
- Funcionalidades planificadas.
- Mejoras futuras.

No se debe documentar una funcionalidad como terminada hasta que exista una
implementación y evidencia verificable.

---

## 33. Roadmap

### Etapa 1 — Definición

- Requerimientos.
- Alcance.
- Reglas de negocio.
- Product Backlog.
- Arquitectura.
- Modelo de datos.

### Etapa 2 — Base técnica

- Autenticación.
- Roles.
- Base de datos.
- Integración frontend/backend.
- Seguridad inicial.

### Etapa 3 — Administración

- Clientes.
- Profesores.
- Planes.
- Horarios.
- Asistencias.

### Etapa 4 — Documentación del cliente

- Contratos.
- Carga de archivos.
- Consulta desde Mi Cuenta.

### Etapa 5 — Automatización

- Recordatorios por correo.
- Chatbot.

### Etapa 6 — Calidad

- Pruebas.
- Corrección de errores.
- Validaciones.
- Seguridad.
- Responsive.
- Documentación.

### Etapa 7 — Cierre

- Validación.
- Evidencias.
- Documentación final.
- Demostración.
- Presentación.

---

## 34. Mejoras futuras

### Pagos online

Los pagos online quedan **fuera del alcance de la versión actual**.

Como evolución futura se considera permitir que los clientes realicen pagos
directamente desde Focus Power Fit.

Las alternativas consideradas son:

- Mercado Pago.
- Webpay.

Una futura implementación deberá considerar:

- Seguridad.
- Confirmación de transacciones.
- Estados de pago.
- Conciliación.
- Registro de operaciones.
- Manejo de errores.
- Integración con la cuenta del cliente.

---

## 35. Principios técnicos

El desarrollo busca mantener los siguientes criterios:

### Modularidad

Separar funcionalidades por responsabilidad.

### Escalabilidad

Permitir incorporar nuevas funcionalidades sin reconstruir completamente
la plataforma.

### Mantenibilidad

Mantener código organizado, documentado y reutilizable.

### Seguridad

Proteger datos y funciones administrativas.

### Usabilidad

Mantener una interfaz sencilla para los usuarios reales.

### Responsive

Permitir el uso desde distintos tamaños de pantalla.

### Trazabilidad

Mantener cambios registrados mediante Git y GitHub.

---

## 36. Equipo

**Proyecto:** Focus Power Fit  
**Asignatura:** Capstone — Ingeniería Informática  
**Institución:** Duoc UC  

### Integrantes

- **Katherine Hermosilla — Scrum Master**
- **Martina Vergara — Product Owner**
- **Javier Vargas — Developer**

---

## 37. Nota de mantenimiento

Este documento debe actualizarse durante el desarrollo.

Cuando cambie:

- La arquitectura.
- Una tecnología.
- La estructura de carpetas.
- La base de datos.
- Una funcionalidad.
- Un requisito.
- Un procedimiento de instalación.

también deberá actualizarse `GUIA_PROYECTO.md`.

De esta manera, la guía representará el **estado real del proyecto Focus Power Fit**
y no solamente su planificación inicial.