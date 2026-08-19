# AVI Learning Platform — Arquitectura de evolución

## Estado actual

La plataforma continúa desplegable como sitio estático en GitHub Pages. La primera capa separa presentación, contenido y experiencia:

- `index.html`: landing pública y contenida, con territorio AVI, oferta breve, contacto y acceso al aula.
- `plataforma.html`: plataforma interna del equipo AVI durante esta etapa.
- `aula.html`: experiencia inicial del alumno.
- `data/vision-ai.json`: definición del programa.
- `data/vision-ai-cohort-2026-08.json`: definición reemplazable de cohorte y sesiones.
- `assets/platform.js`: render compartido del programa.
- `assets/classroom.js`: estado de cohorte y progreso local.

La landing no publica proyectos, clientes, alianzas, metodologías, herramientas específicas ni hojas de ruta. El aula admite cuentas con claims autorizados; las demás páginas internas continúan limitadas al equipo AVI.

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

### Fase A — Puerta pública y acceso autenticado, actual

- Landing pública deliberadamente contenida.
- Oferta comercial breve y contacto rápido.
- Acceso autenticado de alumnos y equipo.
- Aula con cohorte y materiales autorizados.

### Fase B — Identidad y materiales reales

- Firebase Authentication con claims administrados fuera del navegador.
- Firestore para el perfil mínimo y los enlaces privados de cada uid.
- Google Shared Drive para PDFs nominales, con permisos por email.
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
