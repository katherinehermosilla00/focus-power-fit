# Evidencias de sistema: Base de datos

Focus Power Fit CRM usa **MySQL 8.0** con codificación `utf8mb4` y **13 tablas** definidas como modelos de Sequelize. Esta carpeta reúne la estructura de la base, sus modelos y los scripts que la cargan y migran.

**No contiene datos de clientes**: solo la estructura.

## Archivos

| Archivo | Contenido |
|---|---|
| `estructura_base_datos.sql` | Estructura completa de las 13 tablas: columnas, índices únicos y claves foráneas, exportada con `mysqldump --no-data` |
| `diagrama-modelo-de-datos.png` | Diagrama simplificado del modelo de datos |
| `modelos/` | Copia de los 13 modelos de Sequelize |
| `scripts/migrarSeguridad.js` | Migración de seguridad: correos y RUT únicos, índice único de asistencias y quitar el rol profesor |
| `scripts/unirDuplicados.js` | Unión de fichas de clientes repetidas, con modo de simulación |
| `scripts/importarClientes.js` | Importación de los clientes desde las planillas del sistema anterior |
| `scripts/conexion-database.js` | Conexión de Sequelize a MySQL, configurada con variables de entorno |

Los modelos y scripts son una copia al 17-11-2026. La versión vigente está en [`backend/src/models/`](../../../../../backend/src/models) y [`backend/src/scripts/`](../../../../../backend/src/scripts).

## Tablas

| Tabla | Qué guarda |
|---|---|
| `usuarios` | Cuentas de acceso: correo, contraseña cifrada con bcrypt y rol (admin o cliente) |
| `clientes` | Ficha de cada cliente: datos de contacto, RUT, sucursal y estado |
| `sucursales` | Sedes del gimnasio (La Reina y Peñalolén) |
| `profesores` | Profesores, sin cuenta de acceso, asociados a una sucursal |
| `planes` | Planes Individual y Dupla, con clases, precio y vigencia |
| `horarios` | Clases de cada profesor: día, hora, modalidad y cupos |
| `asignaciones` | Une a un cliente con su plan y su horario; es la entidad central |
| `asistencias` | Asistencia de cada clase (Presente, Ausente o Justificada) |
| `pagos` | Pagos hechos en el gimnasio, con su estado calculado |
| `contratos` | Copia digital del contrato firmado de cada cliente |
| `recordatorios` | Correos de recordatorio 24 horas antes de cada clase |
| `maquinas` | Máquinas de cada sucursal y su estado de mantención |
| `imagenes` | Imágenes y promociones que se muestran en el sitio |
