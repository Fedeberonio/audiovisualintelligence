# AVI Learning Platform

Primera base de producto para convertir Audiovisual Intelligence en una plataforma de formacion y consultoria. El programa inicial es **Vision AI**, dirigido a profesionales audiovisuales.

## Experiencias principales

- `index.html`: entrada audiovisual de marca.
- `plataforma.html`: pagina publica de Vision AI, recorrido, consultoria y captacion.
- `aula.html`: espacio inicial del alumno, protegido por el flujo de acceso existente.
- `capacitaciones.html`: catalogo anterior de capacitaciones.
- `quienes-somos.html`: trayectoria y equipo.

## Arquitectura de contenido

- `data/vision-ai.json`: fuente versionada del programa, resultados, modulos, recursos y servicios.
- `assets/platform.js`: render publico y del aula a partir de los datos.
- `assets/classroom.js`: cohorte demostrativa y progreso local por dispositivo.
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

Abrir `http://127.0.0.1:4173/plataforma.html`.

El servidor local es necesario porque los navegadores no permiten cargar el JSON mediante `fetch()` desde `file://`.

## Acceso y seguridad

- Firebase Authentication habilita alumnos mediante el claim `student:true`.
- Firestore entrega a cada uid únicamente sus propios enlaces de materiales.
- Los PDF nominales viven en un Google Shared Drive y se comparten por email con rol de lectura.
- Google Drive valida la cuenta autorizada o el PIN de visitante; el enlace por sí solo no concede acceso.
- GitHub Pages sigue siendo estático: el HTML y los JSON del repositorio deben considerarse públicos.

Ver `docs/ACCESO-ALUMNOS.md` para el runbook completo.

## Camino de escalabilidad

1. Validar Vision AI con la pagina publica y el aula base.
2. Reemplazar la cohorte demostrativa por fechas y accesos reales.
3. Definir alumnos, inscripciones y progreso sincronizado.
4. Persistir cohortes y progreso sólo cuando la operación docente lo requiera.
5. Incorporar formularios, CRM y pagos.
6. Agregar nuevos programas reutilizando el esquema de datos.
7. Evaluar migracion a Next.js o una plataforma equivalente cuando el modelo operativo lo justifique.

## Despliegue actual

El sitio se publica mediante GitHub Pages y usa el dominio definido en `CNAME`.
