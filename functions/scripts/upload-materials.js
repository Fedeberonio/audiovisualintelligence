#!/usr/bin/env node
/**
 * Sube los PDF personalizados a un Shared Drive y registra en Firestore el
 * enlace que corresponde a cada uid.
 *
 * Requisitos:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json
 *   AVI_SHARED_DRIVE_ID=<id del Shared Drive>
 *   AVI_DRIVE_ROOT_FOLDER_ID=<carpeta raiz administrada por el script>
 *
 * La cuenta de servicio debe ser Content manager de ese Shared Drive. Cada
 * alumno recibe permiso reader solamente sobre su propia carpeta. El script no
 * envia notificaciones salvo que se use --notify.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { applicationDefault, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { google } = require('googleapis');

const PROJECT_ID = 'audiovisual-intelligence';
const COHORT = 'vision-ai-2026-08';
const CLASES = ['clase-01', 'clase-02'];

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const notify = args.includes('--notify');
const includeTest = args.includes('--include-test');

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
  const lineas = fs.readFileSync(file, 'utf8').split(/\r?\n/).map((linea) => linea.trim()).filter(Boolean);
  if (!lineas.length) fail(file + ' esta vacio');
  const encabezado = parseCsvLine(lineas[0]).map((campo) => campo.toLowerCase());
  const iEmail = encabezado.indexOf('email');
  const iNombre = encabezado.indexOf('nombre');
  if (iEmail === -1 || iNombre === -1) fail('el CSV necesita columnas email,nombre');

  const vistos = new Set();
  return lineas.slice(1).map((linea, index) => {
    const cols = parseCsvLine(linea);
    const email = (cols[iEmail] || '').trim().toLowerCase();
    const nombre = (cols[iNombre] || '').trim();
    if (!email) return null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('email invalido en fila ' + (index + 2));
    if (vistos.has(email)) fail('email repetido: ' + email);
    vistos.add(email);
    return { email, nombre };
  }).filter(Boolean).filter((alumno) => includeTest || !alumno.email.endsWith('.test'));
}

function clavesDe(alumno) {
  return [
    normalizar(alumno.email),
    normalizar(alumno.email.split('@')[0]),
    normalizar(alumno.nombre)
  ].filter(Boolean);
}

function coincide(archivo, alumno) {
  const base = normalizar(path.basename(archivo, path.extname(archivo)));
  return clavesDe(alumno).some((clave) => base === clave || base.endsWith(clave));
}

// Un match ambiguo es un error: nunca arriesgar que el PDF nominal de una
// persona termine compartido con otra.
function emparejar(alumnos, carpeta) {
  if (!fs.existsSync(carpeta)) fail('no encuentro la carpeta ' + carpeta);
  const archivos = fs.readdirSync(carpeta).filter((file) => file.toLowerCase().endsWith('.pdf')).sort();
  const candidatos = new Map(alumnos.map((alumno) => [alumno.email, []]));
  const huerfanos = [];
  const ambiguos = [];

  for (const archivo of archivos) {
    const matches = alumnos.filter((alumno) => coincide(archivo, alumno));
    if (matches.length === 0) huerfanos.push(archivo);
    else if (matches.length > 1) ambiguos.push({ archivo, emails: matches.map((alumno) => alumno.email) });
    else candidatos.get(matches[0].email).push(archivo);
  }

  const pares = [];
  const faltantes = [];
  for (const alumno of alumnos) {
    const files = candidatos.get(alumno.email);
    if (files.length === 0) faltantes.push(alumno);
    else if (files.length > 1) ambiguos.push({ alumno: alumno.email, archivos: files });
    else pares.push({ alumno, archivo: path.join(carpeta, files[0]) });
  }
  return { pares, faltantes, huerfanos, ambiguos };
}

function q(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function encontrarUnico(drive, driveId, query, fields) {
  const response = await drive.files.list({
    corpora: 'drive',
    driveId,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
    q: query,
    fields: 'files(' + fields + ')',
    pageSize: 10
  });
  const files = response.data.files || [];
  if (files.length > 1) throw new Error('Drive devolvio mas de un objeto para: ' + query);
  return files[0] || null;
}

async function asegurarCarpeta(drive, driveId, rootFolderId, user, alumno) {
  const query = "trashed=false and mimeType='application/vnd.google-apps.folder'" +
    " and '" + q(rootFolderId) + "' in parents" +
    " and appProperties has { key='aviUid' and value='" + q(user.uid) + "' }" +
    " and appProperties has { key='aviCohort' and value='" + q(COHORT) + "' }";
  let folder = await encontrarUnico(drive, driveId, query, 'id,name,webViewLink');
  if (folder) return folder;

  const response = await drive.files.create({
    supportsAllDrives: true,
    requestBody: {
      name: (alumno.nombre || alumno.email) + ' — ' + user.uid.slice(0, 8),
      mimeType: 'application/vnd.google-apps.folder',
      parents: [rootFolderId],
      appProperties: { aviUid: user.uid, aviCohort: COHORT }
    },
    fields: 'id,name,webViewLink'
  });
  return response.data;
}

async function subirPdf(drive, driveId, folderId, user, clase, archivo) {
  const query = "trashed=false and '" + q(folderId) + "' in parents" +
    " and appProperties has { key='aviUid' and value='" + q(user.uid) + "' }" +
    " and appProperties has { key='aviClass' and value='" + q(clase) + "' }";
  const existente = await encontrarUnico(drive, driveId, query, 'id,name,webViewLink');
  const requestBody = {
    name: 'AVI-Vision-AI-' + clase + '.pdf',
    appProperties: { aviUid: user.uid, aviCohort: COHORT, aviClass: clase }
  };
  const media = { mimeType: 'application/pdf', body: fs.createReadStream(archivo) };

  if (existente) {
    const response = await drive.files.update({
      fileId: existente.id,
      supportsAllDrives: true,
      requestBody,
      media,
      fields: 'id,name,webViewLink'
    });
    return response.data;
  }

  const response = await drive.files.create({
    supportsAllDrives: true,
    requestBody: Object.assign({}, requestBody, { parents: [folderId] }),
    media,
    fields: 'id,name,webViewLink'
  });
  return response.data;
}

async function compartirCarpeta(drive, folderId, alumno) {
  const response = await drive.permissions.list({
    fileId: folderId,
    supportsAllDrives: true,
    fields: 'permissions(id,type,role,emailAddress,deleted)'
  });
  const existe = (response.data.permissions || []).some((permission) =>
    !permission.deleted && permission.type === 'user' &&
    String(permission.emailAddress || '').toLowerCase() === alumno.email
  );
  if (existe) return;

  await drive.permissions.create({
    fileId: folderId,
    supportsAllDrives: true,
    sendNotificationEmail: notify,
    emailMessage: notify ? 'Tus materiales personales de Vision AI ya estan disponibles.' : undefined,
    requestBody: { type: 'user', role: 'reader', emailAddress: alumno.email },
    fields: 'id'
  });
}

async function main() {
  const csvPath = path.resolve(__dirname, argValue('--csv') || 'students.csv');
  const alumnos = leerAlumnos(csvPath);
  const carpetas = {};
  for (const clase of CLASES) {
    const dir = argValue('--' + clase);
    if (dir) carpetas[clase] = path.resolve(process.cwd(), dir);
  }
  if (!Object.keys(carpetas).length) fail('indica --clase-01 <carpeta> y/o --clase-02 <carpeta>');

  const porAlumno = new Map(alumnos.map((alumno) => [alumno.email, { alumno, clases: {} }]));
  let invalido = false;
  for (const clase of Object.keys(carpetas)) {
    const resultado = emparejar(alumnos, carpetas[clase]);
    console.log('  ' + clase + ': ' + resultado.pares.length + '/' + alumnos.length + ' emparejados');
    resultado.faltantes.forEach((alumno) => console.error('    x sin PDF: ' + alumno.email));
    resultado.huerfanos.forEach((archivo) => console.error('    x PDF sin alumno: ' + archivo));
    resultado.ambiguos.forEach((item) => console.error('    x match ambiguo: ' + JSON.stringify(item)));
    if (resultado.faltantes.length || resultado.huerfanos.length || resultado.ambiguos.length) invalido = true;
    resultado.pares.forEach((par) => { porAlumno.get(par.alumno.email).clases[clase] = par.archivo; });
  }
  if (invalido) fail('el emparejamiento no es exacto; no se toca Drive');

  const plan = [...porAlumno.values()].filter((item) => Object.keys(item.clases).length);
  console.log('\n  Alumnos: ' + plan.length + '   Archivos: ' +
    plan.reduce((total, item) => total + Object.keys(item.clases).length, 0) +
    (dryRun ? '   [DRY RUN]' : '') + '\n');
  if (dryRun) {
    plan.forEach((item) => Object.entries(item.clases).forEach(([clase, archivo]) =>
      console.log('  ' + clase + '  ' + item.alumno.email + ' <- ' + path.basename(archivo))));
    console.log('\n  Dry run: no se subio ni compartio nada.\n');
    return;
  }

  const driveId = process.env.AVI_SHARED_DRIVE_ID;
  const rootFolderId = process.env.AVI_DRIVE_ROOT_FOLDER_ID;
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) fail('falta GOOGLE_APPLICATION_CREDENTIALS');
  if (!driveId || !rootFolderId) fail('faltan AVI_SHARED_DRIVE_ID y AVI_DRIVE_ROOT_FOLDER_ID');

  initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
  const auth = getAuth();
  const db = getFirestore();
  const googleAuth = new google.auth.GoogleAuth({ scopes: ['https://www.googleapis.com/auth/drive'] });
  const drive = google.drive({ version: 'v3', auth: googleAuth });

  let ok = 0;
  let errores = 0;
  for (const item of plan) {
    try {
      const user = await auth.getUserByEmail(item.alumno.email);
      if (!user.customClaims || user.customClaims.student !== true) {
        throw new Error('la cuenta no tiene el claim student:true');
      }
      const folder = await asegurarCarpeta(drive, driveId, rootFolderId, user, item.alumno);
      const materials = {};
      for (const [clase, archivo] of Object.entries(item.clases)) {
        const driveFile = await subirPdf(drive, driveId, folder.id, user, clase, archivo);
        if (!driveFile.webViewLink) throw new Error('Drive no devolvio webViewLink para ' + clase);
        materials[clase] = {
          url: driveFile.webViewLink,
          driveFileId: driveFile.id,
          title: clase === 'clase-01' ? 'El nuevo mapa audiovisual' : 'Herramientas y flujo de trabajo',
          updatedAt: new Date().toISOString()
        };
      }
      // El permiso se crea al final: nunca se notifica una carpeta incompleta.
      await compartirCarpeta(drive, folder.id, item.alumno);
      await db.collection('students').doc(user.uid).set({ materials }, { merge: true });
      ok += 1;
      console.log('  + listo: ' + item.alumno.email);
    } catch (err) {
      errores += 1;
      console.error('  x ' + item.alumno.email + ' -> ' + (err && err.message ? err.message : String(err)));
    }
  }

  console.log('\n  Alumnos listos: ' + ok + '   Errores: ' + errores + '\n');
  if (errores) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
