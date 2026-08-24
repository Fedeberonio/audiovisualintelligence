# AVI Learning Platform

Primera base de producto para convertir Audiovisual Intelligence en una plataforma de formacion y consultoria. El programa inicial es **Vision AI**, dirigido a profesionales audiovisuales.

## Experiencias principales

- `index.html`: landing publica de marca, oferta breve, contacto y acceso al aula.
- `plataforma.html`: experiencia interna del equipo AVI durante la etapa actual.
- `aula.html`: espacio inicial del alumno, protegido por el flujo de acceso existente.
- `invitacion.html`: validación pública de un código de invitación opaco.
- `hub.html`: continuidad privada inicial de cada persona invitada.
- `capacitaciones.html`: catalogo anterior de capacitaciones.
- `quienes-somos.html`: trayectoria y equipo.

## Arquitectura de contenido

- `data/vision-ai.json`: fuente versionada del programa, resultados, modulos, recursos y servicios.
- `data/vision-ai-cohort-2026-08.json`: estado factual de la cohorte en curso, sus clases dictadas y la próxima clase.
- `assets/platform.js`: render de la página pública a partir de los datos del programa.
- `assets/classroom.js`: render del estado de la cohorte que corresponde al aula.
- `assets/navigation.js`: navegacion movil publica y accesible.
- `assets/gate.js`: guard de interfaz para paginas internas.
- `assets/styles.css`: sistema visual compartido.
- `PRODUCT.md`: contexto estrategico de producto.
- `DESIGN.md`: sistema visual y reglas de interfaz.
- `docs/PLATFORM_ARCHITECTURE.md`: frontera de seguridad y contrato para el backend futuro.

## Ejecutar localmente

Desde la raiz del proyecto:

```bash
python3 -m http.server 4173
```

Abrir `http://127.0.0.1:4173/`.

El servidor local es necesario porque los navegadores no permiten cargar el JSON mediante `fetch()` desde `file://`.

Para revisar la nueva experiencia sin publicar ni usar cuentas reales:

```bash
npm run preview
```

Abrir `http://127.0.0.1:4173/`. La invitación de demostración local está en
`/invitacion.html?code=AVI-LOCAL-DEMO-2026`; el modo demo sólo existe en
`localhost`, no consulta Firebase y no puede activarse desde el dominio público.

## Acceso y seguridad

- Firebase Authentication habilita alumnos mediante el claim `student:true`.
- Firebase Authentication habilita miembros del Hub mediante `member:true`; el
  código de invitación no es una credencial de acceso a materiales.
- Firestore entrega a cada uid únicamente sus propios enlaces de materiales.
- Los PDF nominales viven en un Google Shared Drive y se comparten por email con rol de lectura.
- Google Drive valida la cuenta autorizada o el PIN de visitante; el enlace por sí solo no concede acceso.
- GitHub Pages sigue siendo estático: el HTML y los JSON del repositorio deben considerarse públicos.

Ver `docs/ACCESO-ALUMNOS.md` para el runbook completo.

## Camino de escalabilidad

1. Validar Vision AI con la pagina publica y el aula base.
2. Mantener cada cohorte factual en un archivo de datos separado del programa comercial.
3. Definir alumnos, inscripciones y progreso sincronizado sólo cuando haga falta.
4. Persistir cohortes y progreso cuando la operación docente lo requiera.
5. Incorporar formularios, CRM y pagos.
6. Agregar nuevos programas reutilizando el esquema de datos.
7. Evaluar migracion a Next.js o una plataforma equivalente cuando el modelo operativo lo justifique.

## Despliegue actual

El sitio se publica mediante GitHub Pages y usa el dominio definido en `CNAME`.
