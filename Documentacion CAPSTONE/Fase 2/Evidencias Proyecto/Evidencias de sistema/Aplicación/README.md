# Evidencias de sistema: Aplicación

El código de Focus Power Fit CRM está en la raíz del repositorio, para que se pueda instalar y ejecutar directamente. Esta carpeta lo referencia y guarda las evidencias de pruebas de la aplicación.

## Dónde está el código

| Carpeta | Contenido | Tecnología |
|---|---|---|
| [`frontend/`](../../../../../frontend) | Sitio público, portal del cliente («Mi cuenta») y panel de administración con 12 módulos | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| [`backend/`](../../../../../backend) | API REST con las reglas de negocio, los permisos y los recordatorios por correo | Node.js, Express 5, Sequelize 6 |
| [`backend/src/tests/`](../../../../../backend/src/tests) | 126 pruebas automatizadas del backend | Node.js Test Runner y Supertest |
| [`n8n/`](../../../../../n8n) | Flujo del chatbot FitBot | n8n |
| [`deploy/`](../../../../../deploy) | Despliegue con Docker, HTTPS y respaldos cifrados | Docker Compose y Caddy |
| [`pruebas/`](../../../../../pruebas) | Campaña de QA: Postman, Playwright, Chrome DevTools, OWASP ZAP y n8n | — |
| [`.github/workflows/ci.yml`](../../../../../.github/workflows/ci.yml) | Revisión automática en cada cambio: lint, tipos, pruebas y compilación | GitHub Actions |

La base de datos se documenta en la carpeta hermana [`Base de datos`](../Base%20de%20datos).

## Cómo ejecutarla

Las instrucciones de instalación están en el [README principal](../../../../../README.md) y la guía de despliegue en [`deploy/README.md`](../../../../../deploy/README.md).

## Evidencias de esta carpeta

| Archivo | Qué demuestra |
|---|---|
| `Evidencia_Pruebas_Focus_Power_Fit.txt` | Resultado de las pruebas, el lint y la compilación |
| `Evidencia_03_Pruebas_Seguridad.txt` | Resultado de las pruebas de seguridad |
| `Evidencias Seguridad/` | Pruebas de seguridad de los contratos (acceso solo del cliente dueño y del administrador) |

Las evidencias de la campaña de QA (capturas, informes de Postman, Lighthouse y OWASP ZAP) se guardan fuera del repositorio porque usan una copia de los datos del gimnasio. Su resumen está en el Informe Final de la Fase 2 (sección 7 y Anexo B).
