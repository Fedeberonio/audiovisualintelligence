# Visión AI autoguiado — Arquitectura de producto

## Estado

**En desarrollo.** Las grabaciones fuente existen, pero todavía no constituyen un curso publicable. La compra, el acceso a video y el progreso comercial no están habilitados.

La implementación actual sólo crea:

- una página pública de descubrimiento;
- un contrato de contenido versionado sin URLs privadas;
- un prototipo protegido de campus;
- la frontera técnica para incorporar comercio, entitlement, video y progreso después.

## Superficies

| Superficie | Ruta | Visibilidad | Responsabilidad |
|---|---|---|---|
| Academia | `academia.html` | Pública | Descubrir programas y formatos |
| Programa | `programa.html?slug=...` | Pública | Entender audiencia, objetivos, temario y modalidad |
| Curso autoguiado | `curso-vision-ai.html` | Pública | Explicar el producto futuro y registrar interés |
| Campus prototipo | `mi-curso.html` | Sesión AVI | Validar la estructura de módulos; no concede compra ni reproduce videos |
| Aula de cohorte | `aula.html` | Sesión AVI | Continuidad de talleres en vivo y materiales actuales |

## Contrato público actual

`data/vision-ai-autoguiado.json` contiene únicamente metadatos publicables:

- producto y estado comercial;
- estado editorial de las grabaciones;
- etapas, lecciones propuestas y fuentes generales;
- experiencia prevista;
- compuertas de publicación.

No debe contener rutas locales, enlaces de Drive, URLs de reproducción, nombres de alumnos, transcripciones sin revisar ni datos de compra.

## Modelo de dominio futuro

| Entidad | Campos mínimos |
|---|---|
| `products` | `id`, `slug`, `title`, `status`, `price`, `currency`, `version` |
| `modules` | `id`, `productId`, `order`, `title`, `status` |
| `lessons` | `id`, `moduleId`, `order`, `title`, `duration`, `status` |
| `videoAssets` | `id`, `lessonId`, `providerAssetId`, `captionTracks`, `status` |
| `purchases` | `id`, `userId`, `productId`, `provider`, `providerRef`, `status`, `paidAt` |
| `entitlements` | `userId`, `productId`, `status`, `grantedAt`, `expiresAt` |
| `lessonProgress` | `userId`, `lessonId`, `positionSeconds`, `completedAt`, `updatedAt` |
| `assessments` | `id`, `moduleId`, `version`, `passingRule` |
| `submissions` | `userId`, `assessmentId`, `answers`, `score`, `submittedAt` |
| `certificates` | `id`, `userId`, `productId`, `issuedAt`, `verificationCode` |

El certificado es una capacidad futura. No debe prometerse hasta definir evaluación, identidad y criterio de aprobación.

## Flujo comercial seguro

1. El visitante conoce el curso en la página pública.
2. Un proveedor de pago procesa la compra.
3. El webhook del proveedor llega a un backend verificado.
4. El backend registra `purchase` y concede `entitlement` al usuario autenticado.
5. El campus consulta el entitlement antes de mostrar una lección.
6. El backend genera un token de reproducción corto para el proveedor de video.
7. El navegador reproduce sin recibir la URL maestra del archivo.
8. El progreso se guarda por usuario y lección.

Nunca se concede acceso desde una redirección de éxito del navegador ni desde un campo enviado por el cliente. La fuente de verdad es el webhook validado y el entitlement persistido por servidor.

## Video y materiales

GitHub Pages no es almacenamiento para el curso pago. Las grabaciones editadas deben vivir en un proveedor que soporte reproducción privada o firmada. La selección de proveedor queda pendiente de comparar costo, subtítulos, analítica, DRM práctico y operación regional.

Los recursos descargables requieren la misma política que los materiales actuales: autorización real fuera del HTML público. Una URL oculta en JavaScript no es protección.

## Pipeline editorial obligatorio

Cada grabación debe pasar por:

1. inventario y verificación técnica;
2. transcripción y concordancia con lo efectivamente dictado;
3. selección de bloques que sí forman parte del curso autoguiado;
4. edición pedagógica en lecciones breves;
5. limpieza de datos personales, reuniones y referencias no publicables;
6. revisión de derechos, identidad y material de terceros;
7. subtítulos, transcripción y recursos;
8. QA de imagen, audio, comprensión, móvil y velocidad reducida;
9. aprobación editorial explícita;
10. publicación como nueva versión inmutable de la lección.

## Fases

### Fase 0 — Esqueleto actual

- Estado público `En desarrollo`.
- Modelo de módulos y lecciones.
- Página de producto y campus prototipo.
- Sin compra, video ni progreso real.

### Fase 1 — Auditoría editorial

- Inventario exacto de las tres grabaciones.
- Matriz grabación → tema → lección → decisión editorial.
- Primer módulo editado como piloto.
- Subtítulos y transcripción verificados.

### Fase 2 — Comercio y entitlement

- Decisión de proveedor de pago y video.
- Backend para webhook, compra y entitlement.
- Acceso probado con usuario comprador, no comprador y reembolso.

### Fase 3 — Experiencia de aprendizaje

- Reproductor, capítulos, transcripción y recursos.
- Progreso sincronizado.
- Reanudación entre dispositivos.
- Evaluación y soporte definidos.

### Fase 4 — Publicación

- Checkout productivo.
- Emails transaccionales.
- Analítica de conversión, reproducción y finalización.
- Soporte operativo y política de actualización.

## Definición de listo para vender

El curso no pasa de `in_development` hasta que:

- todas las lecciones publicadas estén aprobadas editorialmente;
- no existan datos personales o activos sin permiso;
- subtítulos y transcripciones hayan sido revisados;
- compra, reembolso y entitlement funcionen de punta a punta;
- un usuario sin compra no pueda obtener reproducción;
- el progreso sobreviva a cierre de sesión y cambio de dispositivo;
- se hayan probado escritorio, móvil, teclado y movimiento reducido;
- precio, alcance, soporte y política de actualización estén definidos.
