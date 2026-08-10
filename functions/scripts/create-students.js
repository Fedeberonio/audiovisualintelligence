#!/usr/bin/env node
/**
 * Crea las cuentas provisorias de alumnos de Vision AI.
 *
 * Para cada fila de students.csv (email,nombre):
 *   1. crea el usuario en Firebase Auth con una contrasena provisoria generada
 *      (si ya existe, le resetea la contrasena y lo deja en estado provisorio)
 *   2. le pone el custom claim  { student: true }
 *   3. crea/actualiza  students/{uid}  en Firestore con mustChangePassword: true
 *   4. lo escribe en un CSV de salida  credenciales-<fecha>.csv  (email,nombre,password)
 *
 * Uso:
 *   cd functions/scripts
 *   npm install
 *   export GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json
 *   node create-students.js                 # lee students.csv
 *   node create-students.js otros.csv       # lee otro archivo
 *   node create-students.js --dry-run       # no escribe nada, solo muestra
 *
 * El CSV de salida contiene contrasenas en claro: mandalo por un canal privado
 * y borralo despues. Esta en .gitignore, no se commitea.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const admin = require('firebase-admin');

const PROJECT_ID = 'audiovisual-intelligence';
const PASSWORD_LENGTH = 12;
// Sin caracteres ambiguos (0/O, 1/l/I) porque las claves se dictan o se copian a mano.
const ALPHABET = 'abcdefghijkmnpqrstuvwxyzACDEFGHJKLMNPQRSTUVWXYZ23456789';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const csvArg = args.find((a) => !a.startsWith('--')) || 'students.csv';
const inputPath = path.resolve(__dirname, csvArg);

function fail(message) {
  console.error('\n  ERROR: ' + message + '\n');
  process.exit(1);
}

function generarPassword() {
  const bytes = crypto.randomBytes(PASSWORD_LENGTH);
  let out = '';
  for (let i = 0; i < PASSWORD_LENGTH; i += 1) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

/** CSV minimo: separa por coma, respeta comillas dobles. */
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
  const lineas = fs.readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lineas.length) fail(file + ' esta vacio');

  const encabezado = parseCsvLine(lineas[0]).map((h) => h.toLowerCase());
  const iEmail = encabezado.indexOf('email');
  const iNombre = encabezado.indexOf('nombre');
  if (iEmail === -1) fail('el CSV necesita una columna "email" (encabezado: email,nombre)');

  const alumnos = [];
  const vistos = new Set();
  for (let i = 1; i < lineas.length; i += 1) {
    const cols = parseCsvLine(lineas[i]);
    const email = (cols[iEmail] || '').toLowerCase();
    if (!email) continue;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.warn('  ! fila ' + (i + 1) + ': email invalido, la salteo -> ' + email);
      continue;
    }
    if (vistos.has(email)) {
      console.warn('  ! fila ' + (i + 1) + ': email repetido, la salteo -> ' + email);
      continue;
    }
    vistos.add(email);
    alumnos.push({ email, nombre: iNombre === -1 ? '' : (cols[iNombre] || '') });
  }
  if (!alumnos.length) fail('no hay alumnos validos en ' + file);
  return alumnos;
}

function csvEscape(value) {
  const s = String(value == null ? '' : value);
  return /[",\n]/.test(s) ? '"' + s.replaceAll('"', '""') + '"' : s;
}

async function main() {
  const alumnos = leerAlumnos(inputPath);
  console.log('\n  Proyecto : ' + PROJECT_ID);
  console.log('  Entrada  : ' + inputPath);
  console.log('  Alumnos  : ' + alumnos.length + (dryRun ? '   [DRY RUN]' : '') + '\n');

  if (dryRun) {
    alumnos.forEach((a) => console.log('  - ' + a.email + (a.nombre ? '  (' + a.nombre + ')' : '')));
    console.log('\n  Dry run: no se creo nada.\n');
    return;
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.FIREBASE_CONFIG) {
    fail('falta GOOGLE_APPLICATION_CREDENTIALS apuntando al serviceAccount.json.\n' +
         '  Firebase console > Configuracion del proyecto > Cuentas de servicio > Generar clave privada.');
  }

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: PROJECT_ID
  });
  const auth = admin.auth();
  const db = admin.firestore();

  const filas = [];
  const errores = [];

  for (const alumno of alumnos) {
    const password = generarPassword();
    try {
      let user;
      try {
        user = await auth.getUserByEmail(alumno.email);
        await auth.updateUser(user.uid, {
          password,
          displayName: alumno.nombre || user.displayName || undefined
        });
        console.log('  ~ ya existia, contrasena provisoria nueva : ' + alumno.email);
      } catch (err) {
        if (err.code !== 'auth/user-not-found') throw err;
        user = await auth.createUser({
          email: alumno.email,
          password,
          displayName: alumno.nombre || undefined,
          emailVerified: false,
          disabled: false
        });
        console.log('  + creado : ' + alumno.email);
      }

      // Preservar otros claims (ej. admin) y agregar student:true
      const claims = Object.assign({}, user.customClaims || {}, { student: true });
      await auth.setCustomUserClaims(user.uid, claims);

      // Invalida los refresh tokens viejos: si tenia sesion abierta, se cae.
      await auth.revokeRefreshTokens(user.uid);

      await db.collection('students').doc(user.uid).set({
        email: alumno.email,
        nombre: alumno.nombre || '',
        cohorte: 'vision-ai-2026-08',
        mustChangePassword: true,
        provisionalIssuedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      filas.push({ email: alumno.email, nombre: alumno.nombre, password, uid: user.uid });
    } catch (err) {
      console.error('  x ' + alumno.email + ' -> ' + (err && err.message ? err.message : err));
      errores.push({ email: alumno.email, error: err && err.message ? err.message : String(err) });
    }
  }

  if (filas.length) {
    const stamp = new Date().toISOString().slice(0, 10);
    const outPath = path.resolve(__dirname, 'credenciales-' + stamp + '.csv');
    const csv = ['email,nombre,password_provisoria']
      .concat(filas.map((f) => [f.email, f.nombre, f.password].map(csvEscape).join(',')))
      .join('\n') + '\n';
    fs.writeFileSync(outPath, csv, { mode: 0o600 });
    console.log('\n  Credenciales -> ' + outPath);
    console.log('  (contrasenas en claro: mandalas por canal privado y borra el archivo)');
  }

  console.log('\n  OK: ' + filas.length + '   Errores: ' + errores.length + '\n');
  if (errores.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
