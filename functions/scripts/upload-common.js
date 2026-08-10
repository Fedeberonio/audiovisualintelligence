#!/usr/bin/env node
/**
 * Sube un PDF de lectura comun al Shared Drive y lo registra en
 * class_materials/{id}. Sirve para material que no es nominal: lo ve cualquier
 * cuenta con rol (alumno, docente o admin) y nadie sin sesion.
 *
 * Se usa para sacar del sitio publico archivos que hoy cualquiera puede abrir
 * por URL directa.
 *
 * Uso:
 *   export GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json
 *   export AVI_SHARED_DRIVE_ID=<id>
 *   export AVI_DRIVE_ROOT_FOLDER_ID=<id>
 *   node upload-common.js --id presentacion-general --titulo "Guía Visión A.I." --pdf ../../media/archivo.pdf
 *
 * Subir no alcanza: en un Shared Drive el archivo solo lo ven sus miembros, y
 * los alumnos no lo son. Por eso se comparte como lector con cada cuenta de
 * students.csv. Sin este paso el aula muestra el material como no disponible.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { applicationDefault, initializeApp } = require('firebase-admin/app');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const { google } = require('googleapis');

const PROJECT_ID = 'audiovisual-intelligence';
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

function argValue(flag) {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : null;
}
function fail(m) { console.error('\n  ERROR: ' + m + '\n'); process.exit(1); }

async function main() {
  const id = argValue('--id');
  const titulo = argValue('--titulo');
  const pdf = argValue('--pdf');
  if (!id || !titulo || !pdf) fail('uso: --id <id> --titulo <texto> --pdf <ruta>');

  const origen = path.resolve(process.cwd(), pdf);
  if (!fs.existsSync(origen)) fail('no encuentro ' + origen);

  const driveId = process.env.AVI_SHARED_DRIVE_ID;
  const rootFolderId = process.env.AVI_DRIVE_ROOT_FOLDER_ID;
  if (!driveId || !rootFolderId) fail('faltan AVI_SHARED_DRIVE_ID y AVI_DRIVE_ROOT_FOLDER_ID');
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) fail('falta GOOGLE_APPLICATION_CREDENTIALS');

  console.log('\n  id     : ' + id);
  console.log('  titulo : ' + titulo);
  console.log('  archivo: ' + origen + '  (' + Math.round(fs.statSync(origen).size / 1024) + ' KB)' +
    (dryRun ? '   [DRY RUN]' : '') + '\n');
  if (dryRun) { console.log('  Dry run: no se subio nada.\n'); return; }

  initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
  const db = getFirestore();
  const gauth = new google.auth.GoogleAuth({ scopes: ['https://www.googleapis.com/auth/drive'] });
  const drive = google.drive({ version: 'v3', auth: await gauth.getClient() });

  const nombre = 'AVI-' + id + '.pdf';
  const query = "trashed=false and '" + rootFolderId.replace(/'/g, "\\'") + "' in parents" +
    " and appProperties has { key='aviCommon' and value='" + id.replace(/'/g, "\\'") + "' }";
  const existentes = await drive.files.list({
    corpora: 'drive', driveId, includeItemsFromAllDrives: true, supportsAllDrives: true,
    q: query, fields: 'files(id,name)', pageSize: 5
  }).then((r) => r.data.files || []);
  if (existentes.length > 1) fail('hay mas de un archivo comun con id ' + id);

  const requestBody = { name: nombre, appProperties: { aviCommon: id } };
  const media = { mimeType: 'application/pdf', body: fs.createReadStream(origen) };
  const fields = 'id,name,webViewLink';

  const archivo = existentes.length
    ? await drive.files.update({ fileId: existentes[0].id, supportsAllDrives: true, requestBody, media, fields })
      .then((r) => r.data)
    : await drive.files.create({
      supportsAllDrives: true,
      requestBody: Object.assign({}, requestBody, { parents: [rootFolderId] }),
      media, fields
    }).then((r) => r.data);

  await db.collection('class_materials').doc(id).set({
    title: titulo,
    driveFileId: archivo.id,
    viewUrl: 'https://drive.google.com/file/d/' + archivo.id + '/view',
    previewUrl: 'https://drive.google.com/file/d/' + archivo.id + '/preview',
    downloadUrl: 'https://drive.google.com/uc?export=download&id=' + archivo.id,
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  console.log('  + Drive : ' + archivo.id);
  console.log('  + class_materials/' + id);

  // Compartir como lector con cada alumno del CSV.
  const csvPath = path.resolve(__dirname, argValue('--csv') || 'students.csv');
  if (!fs.existsSync(csvPath)) {
    console.warn('\n  ! no encuentro ' + csvPath + ': nadie va a poder abrirlo\n');
    return;
  }
  const emails = fs.readFileSync(csvPath, 'utf8').split(/\r?\n/).slice(1)
    .map((l) => (l.split(',')[0] || '').trim().toLowerCase())
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && !e.endsWith('.test'));

  const previos = await drive.permissions.list({
    fileId: archivo.id, supportsAllDrives: true,
    fields: 'permissions(type,emailAddress,deleted)'
  }).then((r) => r.data.permissions || []);
  const yaTienen = new Set(previos.filter((p) => !p.deleted && p.type === 'user')
    .map((p) => String(p.emailAddress || '').toLowerCase()));

  let ok = 0;
  const fallaron = [];
  for (const email of emails) {
    if (yaTienen.has(email)) { ok += 1; continue; }
    try {
      await drive.permissions.create({
        fileId: archivo.id, supportsAllDrives: true, sendNotificationEmail: false,
        requestBody: { type: 'user', role: 'reader', emailAddress: email }, fields: 'id'
      });
      ok += 1;
    } catch (err) {
      fallaron.push(email + ' -> ' + (err.message || err));
    }
  }
  console.log('  + compartido con ' + ok + ' de ' + emails.length + ' alumnos');
  fallaron.forEach((f) => console.error('    x ' + f));

  console.log('\n  Solo lo abre una sesion con rol. Ya podes borrar el archivo del repo.\n');
}

main().catch((err) => { console.error(err); process.exit(1); });
