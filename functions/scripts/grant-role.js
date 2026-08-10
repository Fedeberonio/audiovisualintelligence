#!/usr/bin/env node
/**
 * Asigna un rol seguro de acceso AVI mediante custom claims de Firebase.
 *
 * Uso:
 *   node grant-role.js --email academy@audiovisualintelligence.ai --role teacher --dry-run
 *   node grant-role.js --email academy@audiovisualintelligence.ai --role teacher --create
 *
 * --create crea la cuenta si no existe, con una clave aleatoria que no se
 * entrega, y guarda un enlace de activacion temporal en un archivo 0600.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { applicationDefault, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const PROJECT_ID = 'audiovisual-intelligence';
const ROLES = new Set(['student', 'teacher', 'admin']);
const args = process.argv.slice(2);

function argValue(flag) {
  const index = args.indexOf(flag);
  return index !== -1 && args[index + 1] && !args[index + 1].startsWith('--')
    ? args[index + 1]
    : null;
}

function fail(message) {
  console.error('\n  ERROR: ' + message + '\n');
  process.exit(1);
}

function randomPassword() {
  return crypto.randomBytes(32).toString('base64url');
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function main() {
  const email = String(argValue('--email') || '').trim().toLowerCase();
  const role = String(argValue('--role') || '').trim().toLowerCase();
  const displayName = String(argValue('--name') || '').trim();
  const dryRun = args.includes('--dry-run');
  const create = args.includes('--create');

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('indica un --email valido');
  if (!ROLES.has(role)) fail('--role debe ser student, teacher o admin');

  console.log('\n  Proyecto: ' + PROJECT_ID);
  console.log('  Email   : ' + email);
  console.log('  Rol     : ' + role + (dryRun ? '   [DRY RUN]' : ''));
  console.log('  Crear   : ' + (create ? 'SI, solo si no existe' : 'NO') + '\n');
  if (dryRun) return;

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.FIREBASE_CONFIG) {
    fail('falta GOOGLE_APPLICATION_CREDENTIALS apuntando al serviceAccount.json');
  }

  initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
  const auth = getAuth();
  let user;
  let created = false;

  try {
    user = await auth.getUserByEmail(email);
  } catch (err) {
    if (err.code !== 'auth/user-not-found') throw err;
    if (!create) fail('la cuenta no existe; revisa el email o usa --create');
    user = await auth.createUser({
      email,
      password: randomPassword(),
      displayName: displayName || undefined,
      emailVerified: false,
      disabled: false
    });
    created = true;
  }

  const claims = Object.assign({}, user.customClaims || {}, { [role]: true });
  await auth.setCustomUserClaims(user.uid, claims);
  await auth.revokeRefreshTokens(user.uid);

  console.log('  + rol asignado a uid ' + user.uid);
  if (created) {
    const link = await auth.generatePasswordResetLink(email);
    const outPath = path.resolve(__dirname, 'activacion-' + role + '-' + stamp() + '.txt');
    fs.writeFileSync(outPath, email + '\n' + link + '\n', { mode: 0o600 });
    console.log('  + cuenta creada');
    console.log('  + enlace de activacion guardado en ' + outPath);
  } else {
    console.log('  = cuenta existente; contraseña y email sin cambios');
  }
  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
