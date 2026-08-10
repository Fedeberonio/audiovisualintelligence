#!/usr/bin/env node
/** Verifica la separacion entre lectura comun y descarga nominal. */

'use strict';

const { applicationDefault, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { google } = require('googleapis');

const PROJECT_ID = 'audiovisual-intelligence';
const email = String(process.argv[2] || '').trim().toLowerCase();
const clase = String(process.argv[3] || 'clase-02').trim();

if (!email) {
  console.error('Uso: node verify-materials.js <email> [clase-02]');
  process.exit(1);
}

async function permissions(drive, fileId) {
  const response = await drive.permissions.list({
    fileId,
    supportsAllDrives: true,
    fields: 'permissions(type,role,emailAddress,deleted)'
  });
  return response.data.permissions || [];
}

async function main() {
  initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
  const auth = getAuth();
  const db = getFirestore();
  const googleAuth = new google.auth.GoogleAuth({ scopes: ['https://www.googleapis.com/auth/drive.readonly'] });
  const drive = google.drive({ version: 'v3', auth: googleAuth });

  const user = await auth.getUserByEmail(email);
  const [studentSnap, classSnap] = await Promise.all([
    db.collection('students').doc(user.uid).get(),
    db.collection('class_materials').doc(clase).get()
  ]);
  if (!studentSnap.exists || !classSnap.exists) throw new Error('faltan documentos en Firestore');

  const privateMaterial = (studentSnap.data().materials || {})[clase];
  const commonMaterial = classSnap.data();
  if (!privateMaterial || !commonMaterial) throw new Error('faltan materiales de la clase');

  const [commonFile, privateFile, commonPermissions, privatePermissions] = await Promise.all([
    drive.files.get({
      fileId: commonMaterial.driveFileId,
      supportsAllDrives: true,
      fields: 'id,name,downloadRestrictions,webViewLink'
    }),
    drive.files.get({
      fileId: privateMaterial.downloadDriveFileId || privateMaterial.driveFileId,
      supportsAllDrives: true,
      fields: 'id,name,webViewLink'
    }),
    permissions(drive, commonMaterial.driveFileId),
    permissions(drive, privateMaterial.downloadDriveFileId || privateMaterial.driveFileId)
  ]);

  function hasReader(list) {
    return list.some((item) => !item.deleted && item.role === 'reader' &&
      String(item.emailAddress || '').toLowerCase() === email);
  }

  const restriction = commonFile.data.downloadRestrictions &&
    commonFile.data.downloadRestrictions.itemDownloadRestriction;
  console.log(JSON.stringify({
    email,
    uid: user.uid,
    claims: {
      student: Boolean(user.customClaims && user.customClaims.student),
      teacher: Boolean(user.customClaims && user.customClaims.teacher),
      admin: Boolean(user.customClaims && user.customClaims.admin)
    },
    online: {
      fileName: commonFile.data.name,
      urlMatches: commonMaterial.viewUrl === commonFile.data.webViewLink,
      restrictedForReaders: Boolean(restriction && restriction.restrictedForReaders),
      readerAssigned: hasReader(commonPermissions)
    },
    download: {
      fileName: privateFile.data.name,
      urlIsDirectDownload: String(privateMaterial.downloadUrl || '').startsWith('https://drive.google.com/uc?export=download&id='),
      readerAssigned: hasReader(privatePermissions)
    }
  }, null, 2));
}

main().catch((error) => {
  console.error(error && error.message ? error.message : String(error));
  process.exit(1);
});
