# Revisión de código y QA

**Fecha:** 8 de noviembre de 2026, actualizado el 9 de noviembre. **Rama:** `dev/khermosilla`, con cambios sin commit.

**Entorno:** MySQL 8.0.46 temporal, con la estructura real y datos ficticios. Sin datos reales ni correos enviados.

## Estado al 9 de noviembre de 2026

| Prueba | Resultado |
|---|---|
| Pruebas automáticas de backend | 126 de 126 |
| Pruebas automáticas de frontend | 1 de 1 |
| Lint, tipos y compilación | Sin errores |
| Dependencias de producción | Frontend 0 alertas; backend 3 moderadas |
| Campaña de pruebas de QA | 127 de 147 casos aprobados; 0 alertas altas de OWASP ZAP (ver la última sección) |
| Defectos de la campaña | 5: 4 corregidos y re-probados, 1 aceptado por el equipo |

Las secciones siguientes son el historial de cada revisión, en orden.

## Resumen de la primera revisión

| Prueba | Resultado |
|---|---|
| Pruebas automáticas de backend | 97 de 97 (116 de 116 tras las correcciones) |
| Pruebas automáticas de frontend | 1 de 1 |
| Lint y tipos | Sin errores |
| Dependencias de producción | Frontend 0 alertas; backend 3 moderadas |
| QA exploratorio de API | 14 aprobadas, 15 fallas |
| Navegador, 13 pantallas del panel en escritorio | Cargan sin errores ni desborde. El panel principal muestra un aviso porque los datos ficticios no tienen sucursales llamadas Peñalolén y La Reina |
| Navegador, 7 del panel y 4 públicas en celular (375 px) | Sin desborde horizontal |
| Sesión vencida | Falla: no vuelve al inicio de sesión |

## Hallazgos priorizados

**Crítico:** pérdida de datos o datos incorrectos. **Alto:** error visible para el dueño o los clientes. **Medio:** mantenibilidad o casos menos frecuentes. **Bajo:** mejora deseable.

| ID | Prioridad | Área | Hallazgo | Evidencia | Recomendación |
|---|---|---|---|---|---|
| H-01 | Crítico | Backend y datos | Eliminar un profesor borra en cascada sus horarios, asignaciones y asistencias | QA-21: 2 asistencias pasaron a 0 | Bloquear con 409 si hay datos asociados; desactivar en vez de borrar |
| H-02 | Crítico | Backend y datos | Eliminar un horario borra las asignaciones de los alumnos | QA-22 | Igual que H-01 |
| H-03 | Crítico | Backend y datos | Eliminar una sucursal borra sus máquinas y deja a sus clientes sin sucursal | QA-23 | Igual que H-01 |
| H-04 | Crítico | Backend y datos | Eliminar una asignación borra todas sus asistencias | QA-24 | Finalizarla en vez de borrarla |
| H-05 | Alto | Backend | Al editar, pagos, planes, horarios, asistencias, recordatorios y sucursales aceptan cualquier campo, sin las validaciones de la creación | QA-08, 09, 13 y 19; `update(req.body)` en 5 controladores | Lista de campos permitidos y la misma validación al crear y editar |
| H-06 | Alto | Backend | El estado de un pago se guarda al crearlo y nunca cambia a Vencido | QA-11 | Calcularlo según la fecha al consultar |
| H-07 | Alto | Frontend | Con la sesión vencida, el panel muestra contadores en 0 y un mensaje técnico, sin volver al inicio de sesión | Prueba en navegador | Cliente HTTP común que cierre la sesión ante un 401 |
| H-08 | Alto | Backend | Se puede registrar dos veces la misma asistencia, y la sesión se cuenta doble | QA-16 | Índice único por asignación y fecha |
| H-09 | Alto | Frontend | El panel principal solo funciona con sucursales llamadas Peñalolén y La Reina | Navegador | Calcular por las sucursales existentes |
| H-10 | Medio | Backend | Se aceptan precios negativos, 0 cupos en horarios compartidos y asistencias con fecha futura | QA-14, 17 y 18 | Validaciones de rango |
| H-11 | Medio | Backend | Un profesor puede tener dos horarios superpuestos | QA-15 | Validar solapamiento por profesor y día |
| H-12 | Medio | Arquitectura | No hay un esquema de validación: cada controlador valida a mano y de forma distinta | Código | Validación centralizada, por ejemplo con zod |
| H-13 | Medio | Arquitectura | Sin migraciones versionadas: la estructura cambia con `sync` o scripts sueltos | Código | Migraciones versionadas |
| H-14 | Medio | Frontend | Las páginas del panel tienen entre 450 y 1.400 líneas, y repiten la URL de la API, la protección de sesión y el manejo de errores en unos 20 archivos. Se mezclan `fetch` y `axios`. `globals.css` tiene 4.453 líneas | Código | Cliente de API único, protección en `admin/layout`, y componentes y estilos compartidos |
| H-15 | Medio | Frontend | Clientes usa `alert()` para avisos y errores | Código | Avisos en pantalla, como en las otras páginas |
| H-16 | Medio | Backend | Las fechas usan la zona del servidor. En un contenedor en UTC, después de las 21:00 o 20:00 de Chile cambia de día | Código | Definir `TZ=America/Santiago` en el despliegue |
| H-17 | Medio | Rendimiento | Ninguna lista tiene paginación. Con 1.918 clientes la respuesta pesa 967 KB, aunque tarda menos de 1 s | QA-29 | Paginación y búsqueda en el servidor |
| H-18 | Medio | Pruebas | El frontend tiene una sola prueba automática, y pagos, horarios, máquinas e imágenes no tienen pruebas en el backend | Código | Pruebas de API para esos módulos y algunas de extremo a extremo |
| H-19 | Bajo | Backend | Las respuestas no tienen un formato común: unas devuelven una lista y otras `{ ok, ... }`; un error de base se informa como 400 | Código | Formato y códigos de estado comunes |
| H-20 | Bajo | Seguridad | El token se guarda en `localStorage`; la política de seguridad de contenido reduce el riesgo, pero no lo elimina | Código | Cookie `HttpOnly` cuando haya dominio propio |
| H-21 | Bajo | Mantenimiento | Queda `backend/src/mailer.js` vacío. `crear-admin.mjs` usa reglas de contraseña distintas al resto | Código | Limpieza |

## Lo que está bien

- Seguridad de acceso: las 4 pruebas de permisos pasaron, igual que las 97 automatizadas.
- Robustez: maneja bien cuerpos grandes, JSON inválido, rutas inexistentes e identificadores no numéricos.
- Validación en el navegador sin desbordes ni errores de consola, salvo el 401 esperado de la prueba de sesión.
- Formularios con etiquetas asociadas y botones con nombre en todas las pantallas revisadas.
- Configuración segura del servidor: Helmet, CORS restringido, límite de tamaño y un manejador de errores sin detalles internos.

## Correcciones del 8 de noviembre de 2026

QA de API repetido sobre MySQL 8.0.46 con datos ficticios: **28 de 29** (antes 14 de 29). La única falla que queda es la paginación (H-17).

| ID | Estado | Comprobación |
|---|---|---|
| H-01 a H-04 | Corregido: responde 409 y pide desactivar o finalizar en vez de borrar | QA-21 a QA-24, pruebas automáticas y aviso visto en la pantalla de profesores |
| H-05 | Corregido: lista de campos permitidos y las mismas reglas al crear y editar en pagos, planes, horarios, asistencias, recordatorios y sucursales | QA-08, 09, 13 y 19, y pruebas automáticas |
| H-06 | Corregido: el estado del pago se calcula con la fecha de Chile | QA-11 y prueba automática |
| H-07 | Corregido: al vencer o ser rechazado el token, vuelve al inicio de sesión con un aviso | Probado en el navegador con un token expirado y con uno rechazado |
| H-08 | Corregido: validación en el servidor e índice único, creado por `npm run migrar:seguridad` | QA-16 e índice creado en MySQL |
| H-09 | Corregido: el panel principal y la pantalla de clientes muestran todas las sucursales registradas. El gráfico se calcula con los datos; antes mostraba un 69,12 % fijo | Navegador |
| H-10 y H-11 | Corregido: precios negativos, 0 cupos, fechas futuras y horarios superpuestos | QA-14, 15, 17 y 18, y pruebas automáticas |
| H-15 | Corregido: los avisos de clientes aparecen en la pantalla | Revisión del código; no se probó en el navegador |
| H-16 | Corregido: la zona horaria es `America/Santiago` por defecto | Revisión del código; no se probó con un servidor en otra zona |
| H-18 | Parcial: 8 pruebas nuevas de backend (105 en total); el frontend sigue con 1 | `npm test` |
| Nuevo | Corregido: al crear una sucursal se perdían la ciudad y el horario de atención | Prueba automática |
| H-21 | Parcial: se eliminó `mailer.js`; falta unificar las reglas de contraseña de `crear-admin.mjs` | Código |
| H-12, H-13, H-14, H-17, H-19 y H-20 | Pendiente: reestructuraciones grandes o mejoras menores, propuestas para después de la presentación | — |

## Segunda revisión, 8 de noviembre de 2026

| ID | Hallazgo | Estado |
|---|---|---|
| R2-01 | Los cupos de los horarios no se respetaban al asignar alumnos | Corregido, incluido bajar cupos con alumnos activos |
| R2-02 | Un dato antiguo inválido impedía, por ejemplo, desactivar un plan | Corregido: al editar se valida solo lo que cambia |
| R2-03 | El estado de los contratos no vencía por fecha y no se validaban sus fechas | Corregido |
| R2-04 | No se podía quitar la fecha de término de una asignación, ni se validaban sus fechas | Corregido |
| R2-05 | Se registraba asistencia en planes congelados o finalizados, y fuera de su período | Corregido |
| R2-06 | El aviso pide finalizar una asignación, pero el panel no tiene esa opción | Corregido: la pantalla permite congelar, reactivar y finalizar. Probado en el navegador, incluido el bloqueo por falta de cupo |
| R2-07 | El cierre de sesión ante un token rechazado no cubre las pantallas con `fetch` ni la instancia propia de Clientes | Corregido: panel principal, Sucursales, Clientes y Mi cuenta vuelven al inicio de sesión. Probado en el navegador con un token rechazado |
| R2-08 | Manejo de errores duplicado en clientes | Pendiente |
| R2-09 | Clase CSS con nombre de sucursal y regla sin uso | Pendiente |

Comprobación: 110 pruebas de backend; 15 de 15 flujos y QA de API sobre MySQL 8.0.46 sin regresiones.

## Tercera revisión, 8 de noviembre de 2026

| ID | Hallazgo | Estado |
|---|---|---|
| R3-01 | Un contrato marcado como Vencido por el administrador volvía a mostrarse Vigente si su fecha no había pasado | Corregido: se respeta el estado elegido; la fecha solo vence los que siguen Vigentes. Lo mismo en pagos |
| R3-02 | Congelar una asignación liberaba su cupo; al reactivarla, el horario quedaba con más alumnos que cupos | Corregido: un plan congelado conserva su cupo y sigue siendo el plan del cliente |
| R3-03 | Se podía desactivar un horario con alumnos activos | Corregido: responde 409 y pide finalizar o cambiar las asignaciones |
| R3-04 | Enviar un estado vacío reactivaba una asignación congelada o finalizada | Corregido: responde 400 |
| R3-05 | Tras cada cambio de estado se volvían a descargar clientes, planes y horarios | Corregido: solo se recargan las asignaciones |
| R3-06 | Un estado desconocido en una asignación rompía la tabla | Corregido |

Comprobación: 112 pruebas de backend (2 nuevas), tipos y lint sin errores. No se repitió la prueba en el navegador.

## Sin cubrir

- Flujos completos de cada formulario en el navegador: se revisó la carga, no cada creación o edición.
- Accesibilidad con lector de pantalla y contraste de colores.
- Pruebas de carga con usuarios simultáneos.
- Correo real y FitBot a través de esta prueba: FitBot se probó aparte.

## Cuarta revisión, 8 de noviembre de 2026

| ID | Hallazgo | Estado |
|---|---|---|
| R4-01 | Un recordatorio de clase ya creado se enviaba aunque el plan se congelara, finalizara o cambiara de horario | Corregido: antes de enviarlo se revisa que la clase siga vigente; si no, queda Cancelado |
| R4-02 | Con datos anteriores a la regla de cupos, reactivar un plan congelado podía dejar al cliente con dos planes activos | Corregido: responde 409 |
| R4-03 | Con el plan congelado, el cliente veía su cuenta como si no tuviera plan | Corregido: lo ve marcado como congelado |
| R4-04 | Si el último pago estaba anulado, se informaba el plan como vigente | Corregido: se ignoran los pagos anulados |
| R4-05 | FitBot respondía a una lista con 1 o 2 solo con «sí» o «no», y luego trataba cualquier número como opción | Corregido: acepta 1, 2, el nombre o «las dos»; solo los números del 1 al 4 se tratan como opción |
| R4-06 | Documentación con cifras y estados antiguos | Corregido |

Comprobación: 115 pruebas de backend, 52 de 52 conversaciones de FitBot, tipos y lint sin errores. No se repitió la prueba en el navegador.

## Quinta revisión, 8 de noviembre de 2026

Revisión de autenticación, subida de archivos, configuración del servidor, frontend y automatización.

| ID | Hallazgo | Estado |
|---|---|---|
| R5-01 | Detrás de un proxy HTTPS propio, todos los visitantes compartían la dirección del proxy y los límites de intentos eran uno solo para todos | Corregido: variable `TRUST_PROXY` |
| R5-02 | Un usuario desactivado seguía dentro del panel, viendo errores, hasta que vencía su sesión | Corregido: responde 401 y vuelve al inicio de sesión |
| R5-03 | La recuperación de contraseña tardaba más cuando la cuenta existía, lo que revelaba qué correos tienen cuenta | Corregido: el correo se envía sin esperar la respuesta del servidor de correo |
| R5-04 | Un recordatorio de un plan congelado se cancelaba aunque el plan se reactivara antes de la clase | Corregido: queda en espera y solo se cancela si la clase pasa |
| R5-05 | FitBot fallaba al abrir el sitio por la IP de la red local, sin HTTPS | Corregido |
| R5-06 | Los códigos de verificación se pierden al reiniciar el backend | Documentado en el README: una sola instancia y reinicios fuera del horario de atención |
| R5-07 | La revisión automática se ejecutaba dos veces en solicitudes de cambio desde ramas `dev/` | Corregido |

Comprobación: 116 pruebas de backend, tipos, lint y prueba de frontend sin errores. No se repitió la prueba en el navegador.

## Revisión en celular, 9 de noviembre de 2026

Navegador emulando un teléfono Android con Chrome, a 375 y 360 px de ancho, con datos ficticios.

| Pantallas | Resultado |
|---|---|
| Las 13 del panel de administración | Sin desborde horizontal. Las tablas se deslizan dentro de su recuadro |
| Portada, profesores, sucursales, términos, inicio de sesión, registro, recuperación, bienvenida y cuenta del cliente | Sin desborde horizontal |
| Ventana de FitBot | Cabe en la pantalla y deja ver el campo de texto |

Corregido: en registro, FitBot y varias pantallas del panel, los campos tenían letra de 12 a 14 px, y en iPhone (Safari o Chrome) la página se agrandaba al tocarlos. En pantallas de hasta 768 px todos los campos usan 16 px (`frontend/app/globals.css`).

Pendiente para cerrar VAL-08: probar en un teléfono físico.

## Campaña de pruebas de QA, 9 de noviembre de 2026

**Entorno:** instalación aparte en Docker, igual a la de producción (`deploy/`): Caddy con HTTPS, sitio, API, MySQL y n8n. Usó una copia de la base restaurada desde un respaldo cifrado, con los correos apagados y cuentas de prueba ficticias. El entorno se borró al terminar. Los scripts están en `pruebas/` y las instrucciones para repetirlas, en `pruebas/README.md`. Las evidencias se guardan fuera del repositorio.

| Herramienta | Qué se probó | Resultado |
|---|---|---|
| n8n | Flujo de FitBot publicado, ejecuciones y 52 conversaciones | Flujo y ejecuciones correctos; 35 de 52 conversaciones con la versión en uso (DEF-05) |
| Postman (Newman) | 38 casos de la API: funcionales, permisos y seguridad | 38 de 38; 96 de 96 verificaciones |
| Chrome DevTools | Lighthouse en celular y escritorio; consola, red, TLS y HAR | 9 de 10 auditorías con 90 o más; 7 páginas sin errores de consola ni de red; TLS 1.3 |
| Playwright | 34 pruebas de punta a punta en escritorio y celular | 34 de 34 |
| OWASP ZAP | Escaneo pasivo, escaneo activo con sesión de administrador y re-prueba | 0 alertas altas; sin inyección SQL, XSS ni inyección de comandos |

| Defecto | Detectado con | Corrección | Estado |
|---|---|---|---|
| DEF-01: se podía cancelar dos veces la misma clase, porque la base real no tenía el índice único de asistencias | Postman | Revisión en el código antes de guardar y migración de seguridad en la base real, con respaldo previo probado | Corregido y re-probado |
| DEF-02: la portada tardaba 14,9 s en mostrarse en celular | Lighthouse | Imagen en WebP (de 2,4 MB a 154 KB): 2,0 s y rendimiento de 71 a 83 | Corregido y re-probado |
| DEF-03: los formularios con contraseña podían enviarla en la URL | OWASP ZAP | `method="post"` en 5 formularios | Corregido y re-probado |
| DEF-04: el sitio informaba su tecnología en la cabecera `X-Powered-By` | OWASP ZAP | `poweredByHeader: false` | Corregido y re-probado |
| DEF-05: la versión de FitBot en uso no responde 17 de las 52 conversaciones | n8n | El equipo decidió mantener su versión, sin emojis; la versión completa quedó respaldada | Aceptado por el equipo |

Después de cada corrección se repitieron las pruebas de Playwright como regresión, sin fallas.

Mejora futura: la portada en celular queda en 83/100 por el JavaScript que se ejecuta al cargar. Se puede mejorar enviando menos JavaScript, con componentes de servidor de Next.js.

Registro en ISO: NC-16, NC-17 y NC-18 en [04-registros.md](../iso/04-registros.md).
