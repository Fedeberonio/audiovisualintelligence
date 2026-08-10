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

| Clase | Estado | Origen |
|---|---|---|
| Clase 2 | **Completa**: 19 PDF nominales, 29 páginas, marca de agua + pie con el nombre del alumno | vault → `AVI_Vision/material_apoyo_D2_3/final/personalizados/pdf/` |
| Clase 1 | **Solo el ejemplar de revisión** (Alejandro Puente). Faltan 18. El README del material dice que no se genera el resto del roster hasta aprobar ese ejemplar. | vault → `AVI_Vision/material_apoyo_D1/final/personalizados/pdf/` |

### Comandos

Clase 2 real + Clase 1 con placeholder para todos (una sola pasada). Ajustá la
ruta del vault si cambió:

```bash
VAULT="/Users/aimac/Documents/Federico Knowledge Base/30_Proyectos/AVI_Vision"
node upload-materials.js --placeholder --clase-02 "$VAULT/material_apoyo_D2_3/final/personalizados/pdf" --dry-run
node upload-materials.js --placeholder --clase-02 "$VAULT/material_apoyo_D2_3/final/personalizados/pdf"
```

La cuenta de prueba no tiene PDF nominal, así que se le sube placeholder aparte:

```bash
node upload-materials.js --placeholder --csv students-test.csv
```

Cuando estén los 18 PDF que faltan de la Clase 1:

```bash
node upload-materials.js --clase-01 "$VAULT/material_apoyo_D1/final/personalizados/pdf" --dry-run
node upload-materials.js --clase-01 "$VAULT/material_apoyo_D1/final/personalizados/pdf"
```

Los archivos se emparejan con el alumno por nombre: vale el email
(`puenteale@hotmail.com.pdf`), el usuario del email (`puenteale.pdf`) o el nombre
(`AVI Vision AI - Clase 1 - Alejandro Puente.pdf`). Ignora acentos, mayúsculas,
espacios y guiones.

**Corré siempre `--dry-run` primero** y revisá la lista: avisa qué alumno quedó sin
PDF y qué PDF no matcheó con nadie.

Para reemplazar el PDF de un alumno, volvé a correr el script con la carpeta
actualizada: pisa el objeto anterior.
