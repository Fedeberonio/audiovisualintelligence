#!/usr/bin/env node
/**
 * Crea las cuentas de alumnos de Vision AI sin distribuir contrasenas.
 *
 * Por cada fila de students.csv (email,nombre):
 *   1. crea el usuario con una clave aleatoria que nunca se entrega;
 *   2. agrega el custom claim { student: true };
 *   3. crea/actualiza students/{uid} en Firestore;
 *   4. genera un enlace de activacion/restablecimiento de Firebase.
 *
 * El CSV de salida contiene enlaces sensibles y temporales. Esta ignorado por
 * git, se crea con permisos 0600 y debe enviarse por un canal privado.
 *
 * Uso:
 *   node create-students.js --dry-run
 *   node create-students.js
 *   node create-students.js --reset-existing   # solo si se quiere resetear
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { applicationDefault, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');

const PROJECT_ID = 'audiovisual-intelligence';
const COHORT = 'vision-ai-2026-08';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const resetExisting = args.includes('--reset-existing');
const includeTest = args.includes('--include-test');
const csvArg = args.find((arg) => !arg.startsWith('--')) || 'students.csv';
const inputPath = path.resolve(__dirname, csvArg);

function fail(message) {
  console.error('\n  ERROR: ' + message + '\n');
  process.exit(1);
}

function generarPasswordNoEntregada() {
  return crypto.randomBytes(32).toString('base64url');
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
  const lineas = fs.readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter(Boolean);
  if (!lineas.length) fail(file + ' esta vacio');

  const encabezado = parseCsvLine(lineas[0]).map((campo) => campo.toLowerCase());
  const iEmail = encabezado.indexOf('email');
  const iNombre = encabezado.indexOf('nombre');
  if (iEmail === -1) fail('el CSV necesita una columna "email"');

  const alumnos = [];
  const vistos = new Set();
  for (let i = 1; i < lineas.length; i += 1) {
    const cols = parseCsvLine(lineas[i]);
    const email = (cols[iEmail] || '').trim().toLowerCase();
    const nombre = iNombre === -1 ? '' : (cols[iNombre] || '').trim();
    if (!email) continue;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      fail('email invalido en la fila ' + (i + 1));
    }
    if (vistos.has(email)) fail('email repetido: ' + email);
    vistos.add(email);
    alumnos.push({ email, nombre });
  }
  if (!alumnos.length) fail('no hay alumnos validos en ' + file);
  return alumnos;
}

function csvEscape(value) {
  const text = String(value == null ? '' : value);
  return /[",\n]/.test(text) ? '"' + text.replaceAll('"', '""') + '"' : text;
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function main() {
  const alumnos = leerAlumnos(inputPath)
    .filter((alumno) => includeTest || !alumno.email.endsWith('.test'));
  if (!alumnos.length) fail('no hay alumnos para procesar; usa --include-test si el CSV es de prueba');
  console.log('\n  Proyecto : ' + PROJECT_ID);
  console.log('  Entrada  : ' + inputPath);
  console.log('  Alumnos  : ' + alumnos.length + (dryRun ? '   [DRY RUN]' : ''));
  console.log('  Existentes: ' + (resetExisting ? 'RESETEAR' : 'NO TOCAR') + '\n');

  if (dryRun) {
    alumnos.forEach((alumno) => console.log('  - ' + alumno.email + (alumno.nombre ? '  (' + alumno.nombre + ')' : '')));
    console.log('\n  Dry run: no se creo ni modifico nada.\n');
    return;
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.FIREBASE_CONFIG) {
    fail('falta GOOGLE_APPLICATION_CREDENTIALS apuntando al serviceAccount.json');
  }

  initializeApp({
    credential: applicationDefault(),
    projectId: PROJECT_ID
  });
  const auth = getAuth();
  const db = getFirestore();

  const activaciones = [];
  const omitidos = [];
  const errores = [];

  for (const alumno of alumnos) {
    try {
      let user;
      let existente = false;
      try {
        user = await auth.getUserByEmail(alumno.email);
        existente = true;
      } catch (err) {
        if (err.code !== 'auth/user-not-found') throw err;
      }

      if (existente && !resetExisting) {
        console.warn('  = ya existe, sin cambios: ' + alumno.email);
        omitidos.push(alumno.email);
        continue;
      }

      const password = generarPasswordNoEntregada();
      if (existente) {
        user = await auth.updateUser(user.uid, {
          password,
          displayName: alumno.nombre || user.displayName || undefined
        });
        console.log('  ~ cuenta existente preparada para reactivacion: ' + alumno.email);
      } else {
        user = await auth.createUser({
          email: alumno.email,
          password,
          displayName: alumno.nombre || undefined,
          emailVerified: false,
          disabled: false
        });
        console.log('  + cuenta creada: ' + alumno.email);
      }

      const previousCohorts = (user.customClaims && user.customClaims.cohorts) || {};
      const claims = Object.assign({}, user.customClaims || {}, {
        student: true,
        cohorts: Object.assign({}, previousCohorts, { [COHORT]: true })
      });

      // Primero el perfil, luego el permiso. Si Firestore falla, la cuenta no
      // queda habilitada a medias.
      await db.collection('students').doc(user.uid).set({
        email: alumno.email,
        nombre: alumno.nombre || '',
        cohorte: COHORT,
        active: true,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      await auth.setCustomUserClaims(user.uid, claims);
      await auth.revokeRefreshTokens(user.uid);

      const link = await auth.generatePasswordResetLink(alumno.email);
      activaciones.push({ email: alumno.email, nombre: alumno.nombre, link });
    } catch (err) {
      const message = err && err.message ? err.message : String(err);
      console.error('  x ' + alumno.email + ' -> ' + message);
      errores.push({ email: alumno.email, error: message });
    }
  }

  if (activaciones.length) {
    const outPath = path.resolve(__dirname, 'activaciones-' + stamp() + '.csv');
    const csv = ['email,nombre,enlace_activacion']
      .concat(activaciones.map((fila) => [fila.email, fila.nombre, fila.link].map(csvEscape).join(',')))
      .join('\n') + '\n';
    fs.writeFileSync(outPath, csv, { mode: 0o600 });
    console.log('\n  Enlaces de activacion -> ' + outPath);
    console.log('  Son sensibles y temporales: compartilos por canal privado y luego borralos.');
  }

  console.log('\n  Preparados: ' + activaciones.length +
    '   Omitidos: ' + omitidos.length + '   Errores: ' + errores.length + '\n');
  if (omitidos.length || errores.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
