# AVI Learning Platform — Arquitectura de evolución

## Estado actual

La plataforma continúa desplegable como sitio estático en GitHub Pages. La primera capa separa presentación, contenido y experiencia:

- `plataforma.html`: descubrimiento y conversión pública.
- `aula.html`: experiencia inicial del alumno.
- `data/vision-ai.json`: definición del programa.
- `data/vision-ai-cohort-demo.json`: definición reemplazable de cohorte y sesiones.
- `assets/platform.js`: render compartido del programa.
- `assets/classroom.js`: estado de cohorte y progreso local.

El progreso se conserva en `localStorage` con la clave `avi_progress:vision-ai:device`. Es deliberadamente local y no representa una cuenta real.

## Frontera de seguridad

El guard actual controla navegación en el navegador, pero GitHub Pages sirve los archivos antes de ejecutar JavaScript. Por lo tanto:

- No almacenar grabaciones privadas en `media/`.
- No almacenar nombres, correos, evaluaciones o entregas en JSON público.
- No interpretar la cookie `avi_auth=ok` como autorización.
- No añadir pagos ni información sensible hasta tener endpoints autenticados.

## Contrato de backend recomendado

La interfaz ya trabaja con identificadores estables de programa, módulo, recurso, cohorte y sesión. El backend futuro debe conservar ese contrato.

### Entidades mínimas

| Entidad | Campos esenciales |
|---|---|
| `programs` | `id`, `slug`, `title`, `status`, `version` |
| `modules` | `id`, `programId`, `order`, `title`, `status` |
| `resources` | `id`, `moduleId`, `type`, `storagePath`, `visibility` |
| `cohorts` | `id`, `programId`, `label`, `timezone`, `status` |
| `sessions` | `id`, `cohortId`, `order`, `startsAt`, `meetingUrl`, `recordingPath` |
| `enrollments` | `userId`, `cohortId`, `role`, `status`, `enrolledAt` |
| `progress` | `userId`, `moduleId`, `completedAt`, `updatedAt` |

### Reglas obligatorias

1. El servidor obtiene `userId` del token verificado; nunca del cuerpo de la solicitud.
2. Un alumno solo lee cohortes y recursos asociados a una inscripción activa.
3. Las grabaciones usan URLs firmadas o almacenamiento con reglas, no rutas públicas.
4. El progreso solo puede escribirse para el usuario autenticado.
5. Docentes y administradores usan roles explícitos, no una allowlist implícita del frontend.
6. Toda modificación administrativa genera una traza mínima de auditoría.

## Ruta de migración

### Fase A — Validación estática, actual

- Propuesta pública.
- Cohorte demostrativa.
- Progreso por dispositivo.
- Recursos públicos o marcados como próximos.

### Fase B — Identidad y cohortes reales

- Firebase Authentication controlado por la misma aplicación.
- Firestore para programas, cohortes, sesiones, inscripciones y progreso.
- Storage protegido para grabaciones y entregables.
- Reglas versionadas dentro del repositorio.

### Fase C — Operación docente

- Panel docente.
- Invitaciones e inscripción.
- Registro de asistencia.
- Publicación de materiales por sesión.
- Entregas y feedback.

### Fase D — Comercial

- Formularios persistentes y CRM.
- Cotizaciones de consultoría.
- Pagos o enlaces de pago.
- Métricas de conversión y finalización.

## Decisión de stack

No es necesario migrar de inmediato. La migración a Next.js, Firebase Hosting u otra plataforma se justifica cuando se inicie la Fase B. Antes de ese punto, el sitio estático es la herramienta más económica para validar propuesta, contenido y operación de una cohorte.
