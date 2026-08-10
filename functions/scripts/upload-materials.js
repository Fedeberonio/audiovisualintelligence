#!/usr/bin/env node
/**
 * Sube los PDF de clase (con marca de agua por alumno) a Cloud Storage.
 *
 * Destino, un archivo por alumno y por clase:
 *   materiales/vision-ai/clase-01/{uid}.pdf
 *   materiales/vision-ai/clase-02/{uid}.pdf
 *
 * storage.rules deja que cada alumno lea SOLO el archivo con su uid.
 *
 * Uso:
 *   cd functions/scripts
 *   npm install
 *   export GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json
 *
 *   # 1) mientras no esten los PDF definitivos: el mismo placeholder para todos
 *   node upload-materials.js --placeholder
 *
 *   # 2) con los PDF reales, una carpeta por clase, un PDF por alumno
 *   node upload-materials.js --clase-01 ./materiales/clase-01 --clase-02 ./materiales/clase-02
 *
 *   node upload-materials.js --clase-01 ./materiales/clase-01 --dry-run
 *
 * Los PDF de cada carpeta se emparejan con el alumno por nombre de archivo:
 * vale el email ("puenteale@hotmail.com.pdf"), el usuario del email
 * ("puenteale.pdf") o el nombre ("Alejandro Puente.pdf", "alejandro-puente.pdf").
 * Ignora acentos, mayusculas, guiones y espacios.
 *
 * No se genera downloadToken: los objetos NO son accesibles por URL publica.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const PROJECT_ID = 'audiovisual-intelligence';
const BUCKET = 'audiovisual-intelligence.firebasestorage.app';
const BASE = 'materiales/vision-ai';
const CLASES = ['clase-01', 'clase-02'];

const REPO = path.resolve(__dirname, '..', '..');
const PLACEHOLDERS = {
  'clase-01': path.join(REPO, 'media', 'AVI-Presentacion_VISION_A.I._SPA_.pdf'),
  'clase-02': path.join(__dirname, 'placeholders', 'clase-02-placeholder.pdf')
};

const dryRun = process.argv.includes('--dry-run');
const usarPlaceholder = process.argv.includes('--placeholder');

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1]
    : null;
}

function fail(message) {
  console.error('\n  ERROR: ' + message + '\n');
  process.exit(1);
}

/** minusculas, sin acentos, sin nada que no sea a-z0-9 */
function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseCsvLine(line) {
  const out = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { field += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { out.push(field.trim()); field = ''; }
    else field += ch;
  }
  out.push(field.trim());
  return out;
}

function leerAlumnos(file) {
  if (!fs.existsSync(file)) fail('no encuentro ' + file);
  const lineas = fs.readFileSync(file, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const encabezado = parseCsvLine(lineas[0]).map((h) => h.toLowerCase());
  const iEmail = encabezado.indexOf('email');
  const iNombre = encabezado.indexOf('nombre');
  if (iEmail === -1) fail('el CSV necesita una columna "email"');

  return lineas.slice(1).map((l) => {
    const cols = parseCsvLine(l);
    const email = (cols[iEmail] || '').toLowerCase();
    return email ? { email, nombre: iNombre === -1 ? '' : (cols[iNombre] || '') } : null;
  }).filter(Boolean);
}

/** claves con las que un archivo puede referirse a este alumno */
function clavesDe(alumno) {
  const claves = new Set();
  claves.add(normalizar(alumno.email));
  claves.add(normalizar(alumno.email.split('@')[0]));
  if (alumno.nombre) claves.add(normalizar(alumno.nombre));
  return claves;
}

function emparejar(alumnos, carpeta) {
  if (!fs.existsSync(carpeta)) fail('no encuentro la carpeta ' + carpeta);
  const archivos = fs.readdirSync(carpeta).filter((f) => f.toLowerCase().endsWith('.pdf'));

  const pares = [];
  const sinArchivo = [];
  const usados = new Set();

  for (const alumno of alumnos) {
    const claves = clavesDe(alumno);
    const match = archivos.find((f) => {
      if (usados.has(f)) return false;
      const base = normalizar(path.basename(f, path.extname(f)));
      for (const clave of claves) {
        if (clave && (base === clave || base.includes(clave) || clave.includes(base))) return true;
      }
      return false;
    });
    if (match) { usados.add(match); pares.push({ alumno, archivo: path.join(carpeta, match) }); }
    else sinArchivo.push(alumno);
  }

  const huerfanos = archivos.filter((f) => !usados.has(f));
  return { pares, sinArchivo, huerfanos };
}

async function main() {
  const csvPath = path.resolve(__dirname, argValue('--csv') || 'students.csv');
  const alumnos = leerAlumnos(csvPath);

  const carpetas = {};
  for (const clase of CLASES) {
    const dir = argValue('--' + clase);
    if (dir) carpetas[clase] = path.resolve(process.cwd(), dir);
  }

  if (!usarPlaceholder && !Object.keys(carpetas).length) {
    fail('deci que subir: --placeholder  o  --clase-01 <carpeta> [--clase-02 <carpeta>]');
  }

  console.log('\n  Bucket  : ' + BUCKET);
  console.log('  Alumnos : ' + alumnos.length + ' (' + csvPath + ')');
  console.log('  Modo    : ' + (usarPlaceholder ? 'PLACEHOLDER para todos' : 'PDF por alumno') +
    (dryRun ? '   [DRY RUN]' : '') + '\n');

  // Planificar antes de tocar la nube: asi el dry run muestra todo.
  const plan = [];
  for (const clase of CLASES) {
    if (usarPlaceholder && !carpetas[clase]) {
      const origen = PLACEHOLDERS[clase];
      if (!fs.existsSync(origen)) fail('falta el placeholder ' + origen);
      alumnos.forEach((alumno) => plan.push({ clase, alumno, archivo: origen, placeholder: true }));
      console.log('  ' + clase + ': placeholder para los ' + alumnos.length + ' alumnos');
      continue;
    }
    if (!carpetas[clase]) { console.log('  ' + clase + ': sin carpeta, la salteo'); continue; }

    const { pares, sinArchivo, huerfanos } = emparejar(alumnos, carpetas[clase]);
    console.log('  ' + clase + ': ' + pares.length + '/' + alumnos.length + ' emparejados');
    sinArchivo.forEach((a) => console.warn('    ! sin PDF: ' + a.email + ' (' + a.nombre + ')'));
    huerfanos.forEach((f) => console.warn('    ! PDF sin alumno: ' + f));
    pares.forEach((p) => plan.push({ clase, alumno: p.alumno, archivo: p.archivo, placeholder: false }));
  }

  if (!plan.length) fail('no hay nada para subir');
  console.log('\n  Total a subir: ' + plan.length + ' archivos\n');

  if (dryRun) {
    plan.forEach((p) => console.log('  ' + p.clase + '  ' + p.alumno.email + '  <- ' + path.basename(p.archivo)));
    console.log('\n  Dry run: no se subio nada.\n');
    return;
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.FIREBASE_CONFIG) {
    fail('falta GOOGLE_APPLICATION_CREDENTIALS apuntando al serviceAccount.json.');
  }

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: PROJECT_ID,
    storageBucket: BUCKET
  });
  const auth = admin.auth();
  const bucket = admin.storage().bucket();

  const uids = new Map();
  let ok = 0;
  let errores = 0;

  for (const item of plan) {
    try {
      if (!uids.has(item.alumno.email)) {
        const user = await auth.getUserByEmail(item.alumno.email);
        uids.set(item.alumno.email, user.uid);
      }
      const uid = uids.get(item.alumno.email);
      const destino = BASE + '/' + item.clase + '/' + uid + '.pdf';

      await bucket.upload(item.archivo, {
        destination: destino,
        resumable: false,
        metadata: {
          contentType: 'application/pdf',
          cacheControl: 'private, max-age=0, no-transform',
          contentDisposition: 'attachment; filename="AVI-Vision-AI-' + item.clase + '.pdf"',
          metadata: {
            clase: item.clase,
            programa: 'vision-ai',
            alumno: item.alumno.email,
            placeholder: String(item.placeholder)
          }
        }
      });
      ok += 1;
      console.log('  + ' + item.clase + '  ' + item.alumno.email + '  -> ' + uid + '.pdf');
    } catch (err) {
      errores += 1;
      const msg = err && err.code === 'auth/user-not-found'
        ? 'no existe la cuenta (corre create-students.js primero)'
        : (err && err.message ? err.message : String(err));
      console.error('  x ' + item.clase + '  ' + item.alumno.email + ' -> ' + msg);
    }
  }

  console.log('\n  Subidos: ' + ok + '   Errores: ' + errores);
  console.log('  Los objetos no tienen downloadToken: solo se leen con auth y solo el propio.\n');
  if (errores) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
