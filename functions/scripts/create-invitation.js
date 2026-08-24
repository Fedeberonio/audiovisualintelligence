#!/usr/bin/env node
/**
 * Prepara una invitación permanente al Hub AVI.
 *
 * Uso:
 *   node create-invitation.js --email persona@example.com --name "Nombre" --type m2-practica --dry-run
 *   node create-invitation.js --email persona@example.com --name "Nombre" --type m2-practica
 *
 * No envía mensajes. El resultado local contiene un código, una URL de
 * invitación y, si la cuenta es nueva, un enlace temporal de activación.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { applicationDefault, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');

const PROJECT_ID = 'audiovisual-intelligence';
const PUBLIC_ORIGIN = 'https://audiovisualintelligence.ai';
const args = process.argv.slice(2);

function argValue(flag) {
  const index = args.indexOf(flag);
  return index !== -1 && args[index + 1] && !args[index + 1].startsWith('--') ? args[index + 1] : null;
}

function fail(message) {
  console.error('\n  ERROR: ' + message + '\n');
  process.exit(1);
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function randomPassword() {
  return crypto.randomBytes(32).toString('base64url');
}

function createCode() {
  return crypto.randomBytes(24).toString('base64url');
}

async function main() {
  const email = String(argValue('--email') || '').trim().toLowerCase();
  const name = String(argValue('--name') || '').trim();
  const type = String(argValue('--type') || 'hub').trim().toLowerCase();
  const dryRun = args.includes('--dry-run');
  const resetExisting = args.includes('--reset-existing');

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('indicá un --email válido');
  if (!name) fail('indicá un --name');
  if (!/^[a-z0-9][a-z0-9-]{1,60}$/.test(type)) fail('--type debe usar minúsculas, números y guiones');

  const code = createCode();
  const invitationUrl = PUBLIC_ORIGIN + '/invitacion.html?code=' + encodeURIComponent(code);
  console.log('\n  Proyecto    : ' + PROJECT_ID);
  console.log('  Persona     : ' + name);
  console.log('  Email       : ' + email);
  console.log('  Invitación  : ' + type + (dryRun ? '   [DRY RUN]' : ''));
  console.log('  Código      : ' + code);
  console.log('  URL privada : ' + invitationUrl + '\n');

  if (dryRun) {
    console.log('  Dry run: no se creó cuenta, claim, perfil ni invitación.\n');
    return;
  }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.FIREBASE_CONFIG) {
    fail('falta GOOGLE_APPLICATION_CREDENTIALS apuntando al serviceAccount.json');
  }

  initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
  const auth = getAuth();
  const db = getFirestore();
  let user;
  let created = false;
  try {
    user = await auth.getUserByEmail(email);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
    user = await auth.createUser({
      email,
      password: randomPassword(),
      displayName: name,
      emailVerified: false,
      disabled: false
    });
    created = true;
  }

  const claims = Object.assign({}, user.customClaims || {}, { member: true });
  const batch = db.batch();
  batch.set(db.collection('hub_members').doc(user.uid), {
    email,
    nombre: name,
    active: true,
    updatedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp()
  }, { merge: true });
  // Este documento se puede consultar por su token, por eso nunca lleva PII.
  batch.set(db.collection('invitations').doc(code), {
    active: false,
    destination: 'hub.html',
    type,
    version: 1,
    createdAt: FieldValue.serverTimestamp()
  });
  await batch.commit();
  await auth.setCustomUserClaims(user.uid, claims);
  await auth.revokeRefreshTokens(user.uid);
  // Sólo se habilita el código después de que el claim de Hub existe. Si la
  // operación anterior falla, la invitación queda inactiva en vez de prometer
  // una entrada que todavía no puede abrirse.
  await db.collection('invitations').doc(code).update({ active: true });

  let activationLink = '';
  if (created || resetExisting) {
    activationLink = await auth.generatePasswordResetLink(email, { url: invitationUrl });
  }
  const output = [
    'email=' + email,
    'nombre=' + name,
    'tipo=' + type,
    'codigo=' + code,
    'url_invitacion=' + invitationUrl,
    'enlace_activacion=' + activationLink
  ].join('\n') + '\n';
  const outputPath = path.resolve(__dirname, 'invitacion-' + stamp() + '.txt');
  fs.writeFileSync(outputPath, output, { mode: 0o600 });

  console.log('  + perfil privado y código creados para uid ' + user.uid);
  console.log(created ? '  + cuenta creada; enlace de activación incluido' : '  = cuenta existente; contraseña sin cambios');
  console.log('  + salida privada: ' + outputPath);
  console.log('  No se envió ningún mensaje. Compartí el resultado sólo por el canal institucional que definas.\n');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
