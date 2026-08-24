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

## Invitar al Hub AVI

La invitación da continuidad privada a una persona antes de que tenga una
inscripción o un curso asignado. Crea una cuenta con el claim `member:true`, un
perfil privado `hub_members/{uid}` y un código opaco y permanente en
`invitations/{token}`. El token no guarda nombre ni email y no concede por sí
solo acceso a materiales: la cuenta Firebase sigue siendo la frontera real.

```bash
node create-invitation.js \
  --email persona@example.com \
  --name "Nombre Apellido" \
  --type m2-practica \
  --dry-run
```

Al quitar `--dry-run`, el script deja un archivo local 0600 con el código, la
URL privada y, si la cuenta es nueva, un enlace temporal de activación. No envía
WhatsApp ni correo. Antes de usarlo en producción deben estar desplegadas las
reglas de `firestore.rules` y habilitado el dominio público de continuación en
Firebase Authentication.

## Consultas web institucionales

La recepción primaria de consultas es la Web App institucional de Google Apps
Script: guarda cada consulta en la planilla privada de AVI y avisa a
`academy@audiovisualintelligence.ai`. El proyecto fuente vive en
`functions/apps-script/contact-intake.gs`; ver su README. `contact_requests`
es un respaldo opcional en Firebase que se activa al desplegar las reglas con
la cuenta AVI correcta. No se usa Gmail del visitante, WhatsApp personal ni
credenciales en el repositorio.

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

Para convertir una cuenta existente en alumno sin cambiar su contraseña:

```bash
node grant-role.js \
  --email fberon@gmail.com \
  --name "Federico Berón" \
  --role student
```

En este caso también se crea o actualiza el perfil privado de la cohorte en
Firestore.

Si el email de recuperación no llega, se puede generar un enlace temporal sin
alterar la contraseña hasta que el usuario complete el formulario:

```bash
node generate-reset-link.js fberon@gmail.com
```

El enlace queda en un archivo local 0600 ignorado por git.

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
  --online-clase-02 "$VAULT/material_apoyo_D2_3/final/Vision_IA_Clase_2_Guia_teorica_recorrido_de_clase.pdf" \
  --dry-run
```

Quitá `--dry-run` sólo cuando el resultado sea 19/19 en cada clase y cero
ambigüedades. Agregá `--notify` únicamente si querés que Drive envíe la invitación
al alumno. Las cuentas de dominios `.test` se excluyen salvo `--include-test`.

`--online-clase-02` publica una única copia maestra para lectura en el visor de
Drive. El script bloquea su descarga para lectores, la comparte con cada alumno
del CSV y registra el enlace en `class_materials/clase-02`. Cada PDF nominal se
mantiene en la carpeta privada del uid y se registra como `downloadUrl` en
`students/{uid}`.

El script es idempotente: encuentra carpetas y archivos por propiedades AVI y
actualiza las copias existentes sin duplicarlas.

## Verificación y reglas

```bash
node verify-materials.js fberon@gmail.com clase-02
node deploy-firestore-rules.js
node verify-firestore-rules.js
```

`verify-materials.js` comprueba archivos, permisos y restricción de descarga.
`verify-firestore-rules.js` usa tokens temporales para confirmar que alumno y
docente leen la guía común, mientras el perfil nominal sigue aislado por uid.
