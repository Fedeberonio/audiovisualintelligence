#!/usr/bin/env node
/**
 * Cambia el email de un alumno conservando su cuenta, su uid y sus materiales.
 *
 * Un alumno puede usar el email que quiera: el permiso vive en la cuenta, no en
 * la direccion. Este script mueve la direccion y reacomoda todo lo que depende
 * de ella, que es mas de lo que parece:
 *
 *   1. el email en Firebase Auth;
 *   2. el email en students/{uid};
 *   3. el permiso de lectura de su carpeta de Drive: agrega el nuevo y saca el
 *      viejo. Sin este paso el alumno entra al aula y no ve nada.
 *
 * Los PDF no se vuelven a subir: siguen colgando del mismo uid.
 *
 * Uso:
 *   export GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json
 *   export AVI_SHARED_DRIVE_ID=<id>
 *   node change-email.js --from viejo@mail.com --to nuevo@mail.com --dry-run
 *   node change-email.js --from viejo@mail.com --to nuevo@mail.com
 *
 * Si el email nuevo no tiene cuenta de Google, Drive exige notificar al invitar.
 * En ese caso agrega --notify y al alumno le llega el aviso de Drive.
 */

'use strict';

const { applicationDefault, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const { google } = require('googleapis');

const PROJECT_ID = 'audiovisual-intelligence';
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const notify = args.includes('--notify');

function argValue(flag) {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : null;
}

function fail(message) {
  console.error('\n  ERROR: ' + message + '\n');
  process.exit(1);
}

const from = String(argValue('--from') || '').trim().toLowerCase();
const to = String(argValue('--to') || '').trim().toLowerCase();
const valido = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

async function main() {
  if (!valido(from) || !valido(to)) fail('uso: --from <email> --to <email>');
  if (from === to) fail('los dos emails son iguales');
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) fail('falta GOOGLE_APPLICATION_CREDENTIALS');

  initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
  const auth = getAuth();
  const db = getFirestore();

  let user;
  try {
    user = await auth.getUserByEmail(from);
  } catch (err) {
    fail(err.code === 'auth/user-not-found' ? 'no existe una cuenta con ' + from : err.message);
  }

  // Si el destino ya existe seria un choque de cuentas: mejor frenar.
  try {
    const ocupado = await auth.getUserByEmail(to);
    if (ocupado.uid !== user.uid) fail(to + ' ya esta en uso por otra cuenta (uid ' + ocupado.uid + ')');
  } catch (err) {
    if (err.code !== 'auth/user-not-found') throw err;
  }

  const doc = await db.collection('students').doc(user.uid).get();
  const materials = doc.exists ? (doc.data().materials || {}) : {};
  const carpetas = new Set();

  console.log('\n  uid       : ' + user.uid);
  console.log('  de        : ' + from);
  console.log('  a         : ' + to);
  console.log('  materiales: ' + Object.keys(materials).join(', ') + (dryRun ? '   [DRY RUN]' : '') + '\n');

  const driveId = process.env.AVI_SHARED_DRIVE_ID;
  let drive = null;
  if (driveId) {
    const gauth = new google.auth.GoogleAuth({ scopes: ['https://www.googleapis.com/auth/drive'] });
    drive = google.drive({ version: 'v3', auth: await gauth.getClient() });
    for (const clave of Object.keys(materials)) {
      const fileId = materials[clave].downloadDriveFileId || materials[clave].driveFileId;
      if (!fileId) continue;
      const f = await drive.files.get({ fileId, supportsAllDrives: true, fields: 'parents' }).then((r) => r.data);
      (f.parents || []).forEach((p) => carpetas.add(p));
    }
  } else {
    console.warn('  ! sin AVI_SHARED_DRIVE_ID: no se tocan los permisos de Drive\n');
  }

  if (dryRun) {
    console.log('  carpetas de Drive a recompartir: ' + ([...carpetas].join(', ') || 'ninguna'));
    console.log('\n  Dry run: no se cambio nada.\n');
    return;
  }

  await auth.updateUser(user.uid, { email: to, emailVerified: false });
  console.log('  + Auth actualizado');

  if (doc.exists) {
    await db.collection('students').doc(user.uid).set(
      { email: to, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
    console.log('  + students/' + user.uid + ' actualizado');
  }

  for (const folderId of carpetas) {
    const permisos = await drive.permissions.list({
      fileId: folderId, supportsAllDrives: true,
      fields: 'permissions(id,type,emailAddress,deleted)'
    }).then((r) => r.data.permissions || []);

    const yaEsta = permisos.some((p) => !p.deleted && p.type === 'user' &&
      String(p.emailAddress || '').toLowerCase() === to);
    if (!yaEsta) {
      await drive.permissions.create({
        fileId: folderId, supportsAllDrives: true,
        sendNotificationEmail: notify,
        emailMessage: notify ? 'Tus materiales de Visión AI ya están disponibles.' : undefined,
        requestBody: { type: 'user', role: 'reader', emailAddress: to },
        fields: 'id'
      });
      console.log('  + Drive: ' + to + ' con acceso a ' + folderId);
    }

    for (const p of permisos) {
      if (!p.deleted && p.type === 'user' && String(p.emailAddress || '').toLowerCase() === from) {
        await drive.permissions.delete({ fileId: folderId, permissionId: p.id, supportsAllDrives: true });
        console.log('  - Drive: ' + from + ' ya no accede a ' + folderId);
      }
    }
  }

  // Las sesiones abiertas con el email viejo dejan de valer.
  await auth.revokeRefreshTokens(user.uid);
  console.log('\n  Listo. El alumno activa con ' + to + ' desde login.html.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
