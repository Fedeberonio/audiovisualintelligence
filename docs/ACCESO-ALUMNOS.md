# Acceso de alumnos — Visión AI, agosto 2026

Cómo funciona el acceso al aula y la descarga de los PDF de clase, y qué hay que
correr para ponerlo en producción.

## Cómo funciona

| Pieza | Dónde | Qué hace |
|---|---|---|
| Custom claim `student: true` | Firebase Auth | Único permiso real. Lo pone `create-students.js`. |
| `students/{uid}.mustChangePassword` | Firestore | Marca que la contraseña sigue siendo la provisoria. |
| `materiales/vision-ai/clase-0X/{uid}.pdf` | Cloud Storage | Un PDF con marca de agua por alumno y por clase. |
| `storage.rules` | Storage | Cada alumno lee **solo** el archivo con su uid. Nadie escribe desde el cliente. |
| `firestore.rules` | Firestore | Cada alumno lee su doc y solo puede bajar `mustChangePassword` a `false`. |
| `assets/gate.js` | Web | Bloquea las páginas internas si no hay claim `student` (o cuenta admin). |
| `cambiar-clave.html` | Web | Pantalla de contraseña nueva, obligatoria antes de entrar. |
| `assets/materials.js` | Web | Descarga el PDF con el ID token del alumno. |

**No hay Cloud Functions**, así que el proyecto no necesita plan Blaze.

### Por qué no usamos `getDownloadURL()`

Esa llamada devuelve una URL con un token permanente que funciona para cualquiera
que la reciba, aunque no tenga sesión. Rompería la marca de agua como control.

En su lugar pedimos el objeto directo con el ID token del alumno:

```
GET https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<path>?alt=media
Authorization: Firebase <idToken>
```

Así `storage.rules` se evalúa en **cada** request y no queda ninguna URL compartible.

### Recorrido del alumno

1. Recibe email + contraseña provisoria.
2. `login.html` → valida el claim `student`.
3. Como `mustChangePassword` está en `true`, va a `cambiar-clave.html`.
4. Elige su contraseña (`updatePassword`) → el flag baja a `false`.
5. Entra a `aula.html` → **Materiales por clase** → descarga su PDF de cada clase.

El gate revisa el flag en **todas** las páginas internas, así que no se puede
saltear yendo directo a `aula.html`.

## Puesta en producción

### 0. Requisito previo

El CLI tiene que estar logueado con una cuenta con permisos sobre
`audiovisual-intelligence`:

```bash
firebase login --reauth
firebase projects:list
```

`audiovisual-intelligence` tiene que aparecer en la lista.

Además, **Firestore tiene que estar habilitado** en el proyecto (modo producción,
región `southamerica-east1` o la que uses). Es gratis en el plan Spark.

### 1. Desplegar las reglas

```bash
firebase deploy --only storage,firestore:rules
```

### 2. Crear las cuentas y subir los PDF

Ver [`functions/scripts/README.md`](../functions/scripts/README.md).

```bash
cd functions/scripts
npm install
export GOOGLE_APPLICATION_CREDENTIALS="$PWD/serviceAccount.json"
node create-students.js
node upload-materials.js --placeholder
```

### 3. Publicar el sitio

El sitio es GitHub Pages: se publica con `git push` a `main`.

### 4. CORS del bucket (solo si la descarga falla)

Si al hacer clic en *Descargar PDF* la consola muestra un error de CORS,
aplicá `cors.json`:

```bash
gcloud storage buckets update gs://audiovisual-intelligence.firebasestorage.app --cors-file=cors.json
```

## Verificación

```bash
# el PDF de un alumno NO se abre sin sesión -> 403
curl -s -o /dev/null -w "%{http_code}\n" \
  "https://firebasestorage.googleapis.com/v0/b/audiovisual-intelligence.firebasestorage.app/o/materiales%2Fvision-ai%2Fclase-01%2F<UID>.pdf?alt=media"

# tampoco por GCS directo -> 403
curl -s -o /dev/null -w "%{http_code}\n" \
  "https://storage.googleapis.com/audiovisual-intelligence.firebasestorage.app/materiales/vision-ai/clase-01/<UID>.pdf"
```

En el navegador, con `test-alumno@avi.test`: login con la provisoria → cambio de
clave → aula → descarga de las dos clases.

## Mantenimiento

- **Alumno nuevo**: agregalo a `students.csv` y corré `create-students.js`. Solo
  toca a los que estén en el CSV.
- **Resetear una contraseña**: dejá solo a ese alumno en un CSV y corré el script;
  le genera una provisoria nueva y lo vuelve a marcar.
- **Sacar el acceso a alguien**: quitá el claim desde la consola o deshabilitá la
  cuenta en Firebase Auth.
- **Reemplazar un PDF**: volvé a correr `upload-materials.js` con la carpeta
  actualizada.
