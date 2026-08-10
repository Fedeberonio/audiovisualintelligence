# Acceso de alumnos — Visión AI, agosto 2026

Arquitectura sin costo adicional: Firebase Authentication y Firestore en Spark,
sitio en GitHub Pages y materiales nominales en el Google Workspace existente.

`audiovisualintelligence.ai` se conserva. GoDaddy administra el dominio y su DNS;
actualmente el dominio apunta al sitio estático publicado por GitHub Pages. El
dominio identifica la plataforma, pero no reemplaza el almacenamiento ni el
control de permisos de Drive.

## Cómo funciona

| Pieza | Dónde | Función |
|---|---|---|
| Claim `student: true` | Firebase Auth | Habilita el acceso al aula. Sólo lo asigna el Admin SDK. |
| Claims `teacher: true` / `admin: true` | Firebase Auth | Habilitan el acceso interno sin exponer materiales nominales de alumnos. |
| `students/{uid}` | Firestore | Perfil mínimo y enlaces Drive del alumno. Sólo el propio uid puede leerlo. |
| PDFs nominales | Google Shared Drive | Una carpeta privada por alumno con sus dos materiales. |
| Permiso `reader` | Google Drive | Comparte la carpeta únicamente con el email del alumno. |
| `assets/gate.js` | Web | Controla la experiencia de acceso del aula. |
| `assets/materials.js` | Web | Lee los enlaces privados del uid y los muestra en el aula. |

El enlace de Drive no es una autorización. Aunque alguien lo copie, Drive exige
la cuenta Google autorizada o el PIN de visitante enviado al email compartido.

## Alta segura

No se distribuyen contraseñas provisorias. `create-students.js` crea la cuenta con
una clave aleatoria que nunca sale del script y genera un enlace temporal de
activación/restablecimiento. El CSV de enlaces queda ignorado por git y con modo
0600.

```bash
cd functions/scripts
npm install
export GOOGLE_APPLICATION_CREDENTIALS="$PWD/serviceAccount.json"
node create-students.js --dry-run
node create-students.js
```

Las cuentas existentes no se modifican por defecto. Para regenerar su acceso se
requiere la opción explícita `--reset-existing`.

Las cuentas `.test` se excluyen del lote normal y se crean aparte con
`node create-students.js students-test.csv --include-test`.

El acceso docente se asigna por claim, nunca por una lista de emails en el
navegador:

```bash
node grant-role.js \
  --email academy@audiovisualintelligence.ai \
  --name "Docencia AVI" \
  --role teacher \
  --create
```

## Preparación de Google Drive

1. Crear un Shared Drive de AVI.
2. Crear una carpeta raíz para la cohorte Visión AI 2026-08.
3. Habilitar la API de Google Drive en el proyecto `audiovisual-intelligence`.
4. Agregar el email de la cuenta de servicio como **Content manager** del Shared Drive.
5. Confirmar en Workspace que se permite compartir externamente y que **Visitor sharing** está habilitado para emails sin cuenta Google.
6. Copiar los IDs del Shared Drive y de la carpeta raíz.

La cuenta de servicio no es propietaria: los archivos quedan bajo propiedad del
Shared Drive de la organización.

## Subida de materiales

```bash
VAULT="/Users/aimac/Documents/Federico Knowledge Base/30_Proyectos/AVI_Vision"
export AVI_SHARED_DRIVE_ID="ID_DEL_SHARED_DRIVE"
export AVI_DRIVE_ROOT_FOLDER_ID="ID_DE_LA_CARPETA_RAIZ"

node upload-materials.js \
  --clase-01 "$VAULT/material_apoyo_D1/final/personalizados/pdf" \
  --clase-02 "$VAULT/material_apoyo_D2_3/final/personalizados/pdf" \
  --dry-run

node upload-materials.js \
  --clase-01 "$VAULT/material_apoyo_D1/final/personalizados/pdf" \
  --clase-02 "$VAULT/material_apoyo_D2_3/final/personalizados/pdf"
```

El dry-run exige un emparejamiento exacto. Cualquier alumno sin PDF, archivo
huérfano o coincidencia ambigua aborta el proceso antes de tocar Drive.

Por defecto no se envían emails desde Drive. `--notify` envía una única invitación
al compartir la carpeta individual, después de subir ambos PDFs.

## Publicación técnica

Sólo Firestore necesita reglas desplegadas:

```bash
firebase login --reauth
firebase projects:list
firebase deploy --only firestore:rules
```

El sitio continúa publicándose con GitHub Pages. No se usa Firebase Storage, no
se despliegan Cloud Functions y no se necesita plan Blaze.

## Verificación obligatoria

1. Cuenta de prueba: activación, login y acceso al aula.
2. Alumno A abre sus dos PDFs.
3. Alumno A no puede abrir el enlace nominal del alumno B.
4. Ventana privada sin sesión de Google/visitor: el enlace no entrega el PDF.
5. Email no Google: recepción y renovación del PIN de visitante.
6. Firestore: un uid no puede leer `students/{otroUid}`.
7. Los 38 PDFs conservan marca de agua y pie nominal.

## Límites conocidos

- GitHub Pages siempre sirve el HTML y los JSON estáticos públicamente. No poner
  allí reuniones, listas de alumnos ni materiales sensibles.
- El gate de JavaScript controla la interfaz; la protección fuerte de los PDFs
  la aplica Google Drive.
- Visitor sharing debe estar permitido por el administrador de Workspace. El PIN
  de visitante se revalida periódicamente.
