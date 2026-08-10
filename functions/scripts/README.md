# Scripts de administración — Visión AI

Scripts locales con Firebase Admin SDK y Google Drive API. No se despliegan y sus
credenciales nunca se commitean.

## Preparación

```bash
cd functions/scripts
npm install
export GOOGLE_APPLICATION_CREDENTIALS="$PWD/serviceAccount.json"
```

Archivos ignorados: `serviceAccount.json`, `students.csv`, `activaciones-*.csv`,
`activacion-*.txt`, `credenciales-*.csv` y `materiales/`.

## Crear alumnos

```bash
node create-students.js --dry-run
node create-students.js
```

El script crea cuentas con claim `student:true` y entrega un CSV de enlaces de
activación. No distribuye contraseñas provisorias. Una cuenta existente sólo se
resetea usando expresamente `--reset-existing`.

Los dominios `.test` se excluyen del lote normal. La cuenta de prueba se crea
aparte con:

```bash
node create-students.js students-test.csv --include-test
```

## Acceso docente y administrativo

Los roles internos también se asignan con claims; no hay listas de emails con
permisos en el JavaScript público. Ejemplo para la cuenta institucional AVI:

```bash
node grant-role.js \
  --email academy@audiovisualintelligence.ai \
  --name "Docencia AVI" \
  --role teacher \
  --create
```

Si la cuenta ya existe en Firebase, conserva su contraseña. Si no existe,
`--create` genera un enlace de activación temporal en un archivo local 0600.
Docentes y administradores ingresan al aula, pero no reciben acceso automático
a las carpetas nominales de los alumnos.

## Subir materiales a Drive

La cuenta de servicio debe ser Content manager de un Shared Drive. Definí:

```bash
export AVI_SHARED_DRIVE_ID="..."
export AVI_DRIVE_ROOT_FOLDER_ID="..."
```

Luego:

```bash
VAULT="/Users/aimac/Documents/Federico Knowledge Base/30_Proyectos/AVI_Vision"
node upload-materials.js \
  --clase-01 "$VAULT/material_apoyo_D1/final/personalizados/pdf" \
  --clase-02 "$VAULT/material_apoyo_D2_3/final/personalizados/pdf" \
  --dry-run
```

Quitá `--dry-run` sólo cuando el resultado sea 19/19 en cada clase y cero
ambigüedades. Agregá `--notify` únicamente si querés que Drive envíe la invitación
al alumno. Las cuentas de dominios `.test` se excluyen salvo `--include-test`.

El script es idempotente: encuentra las carpetas y archivos por propiedades AVI,
actualiza el PDF si ya existe y registra en Firestore el `webViewLink` de cada
clase para el uid correspondiente.
