# Scripts de administración — Visión AI

Scripts de un solo uso, corridos a mano con el Admin SDK. **No se despliegan**:
la solución no usa Cloud Functions, así que el proyecto no necesita plan Blaze.

## Preparación (una vez)

```bash
cd functions/scripts
npm install
```

Bajá la clave privada desde la consola de Firebase
(**Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada**),
guardala como `functions/scripts/serviceAccount.json` y exportá:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="$PWD/serviceAccount.json"
```

`serviceAccount.json`, `students.csv`, `credenciales-*.csv` y `materiales/` están
en `.gitignore`. **El repo del sitio es público: no los commitees nunca.**

## 1. Crear las cuentas provisorias

`students.csv` tiene el formato `email,nombre` (una fila por alumno).
`students.example.csv` es la plantilla versionada.

```bash
node create-students.js --dry-run   # muestra qué haría, no toca nada
node create-students.js             # crea de verdad
```

Por cada alumno: crea la cuenta con una contraseña provisoria generada, le pone el
custom claim `student: true`, invalida sesiones viejas y escribe
`students/{uid}` en Firestore con `mustChangePassword: true`.

Al final deja `credenciales-<fecha>.csv` con `email,nombre,password_provisoria`.
Mandá esas claves por canal privado y borrá el archivo.

Si un alumno ya existía, le regenera la contraseña provisoria y lo vuelve a marcar
para que la cambie. Es seguro correrlo de nuevo.

## 2. Subir los PDF por alumno

Cada alumno tiene su propio PDF con marca de agua en
`materiales/vision-ai/clase-01/{uid}.pdf` y `clase-02/{uid}.pdf`.
`storage.rules` deja que cada uno lea **solo** el archivo con su uid.

### Estado del material (verificado 2026-08-10)

Las dos clases están cerradas: 19 PDF nominales cada una, con marca de agua,
aviso NDA y pie con el nombre del alumno. Emparejan 38/38 contra las cuentas.

| Clase | Archivos | Páginas | Origen en el vault |
|---|---|---|---|
| Clase 1 | 19 PDF | 8 | `AVI_Vision/material_apoyo_D1/final/personalizados/pdf/` |
| Clase 2 | 19 PDF | 29 | `AVI_Vision/material_apoyo_D2_3/final/personalizados/pdf/` |

### Comandos

Ajustá la ruta del vault si cambió. Corré siempre el dry-run primero:

```bash
VAULT="/Users/aimac/Documents/Federico Knowledge Base/30_Proyectos/AVI_Vision"
node upload-materials.js \
  --clase-01 "$VAULT/material_apoyo_D1/final/personalizados/pdf" \
  --clase-02 "$VAULT/material_apoyo_D2_3/final/personalizados/pdf" --dry-run

node upload-materials.js \
  --clase-01 "$VAULT/material_apoyo_D1/final/personalizados/pdf" \
  --clase-02 "$VAULT/material_apoyo_D2_3/final/personalizados/pdf"
```

La cuenta de prueba no tiene PDF nominal (ni debe tenerlo), así que se le sube
placeholder aparte para poder probar el flujo completo:

```bash
node upload-materials.js --placeholder --csv students-test.csv
```

Los archivos se emparejan con el alumno por nombre: vale el email
(`puenteale@hotmail.com.pdf`), el usuario del email (`puenteale.pdf`) o el nombre
(`AVI Vision AI - Clase 1 - Alejandro Puente.pdf`). Ignora acentos, mayúsculas,
espacios y guiones.

**Corré siempre `--dry-run` primero** y revisá la lista: avisa qué alumno quedó sin
PDF y qué PDF no matcheó con nadie.

Para reemplazar el PDF de un alumno, volvé a correr el script con la carpeta
actualizada: pisa el objeto anterior.
