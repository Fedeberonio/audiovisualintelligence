#!/usr/bin/env node
/** Prueba el preview privado con tokens reales de alumno y equipo AVI. */

'use strict';

const fs = require('fs');
const { cert, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const PROJECT_ID = 'audiovisual-intelligence';
const API_KEY = 'AIzaSyCJgl5GvD6Qv-Lg-xwee46R6b8Bk-0eh24';

async function idToken(uid) {
  const customToken = await getAuth().createCustomToken(uid);
  const response = await fetch(
    'https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=' + API_KEY,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true })
    }
  );
  if (!response.ok) throw new Error('no pude canjear el token: HTTP ' + response.status);
  return (await response.json()).idToken;
}

async function status(documentPath, token) {
  const url = 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID +
    '/databases/(default)/documents/' + documentPath;
  const response = await fetch(url, {
    headers: token ? { authorization: 'Bearer ' + token } : {}
  });
  return response.status;
}

async function main() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error('falta GOOGLE_APPLICATION_CREDENTIALS');
  }
  const serviceAccount = JSON.parse(
    fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8')
  );
  initializeApp({ credential: cert(serviceAccount), projectId: PROJECT_ID });
  const auth = getAuth();
  const [student, fede, academy, cindy] = await Promise.all([
    auth.getUserByEmail('fberon@gmail.com'),
    auth.getUserByEmail('fede@audiovisualintelligence.ai'),
    auth.getUserByEmail('academy@audiovisualintelligence.ai'),
    auth.getUserByEmail('cindytoribiocruz@gmail.com')
  ]);
  const [studentToken, fedeToken, academyToken, cindyToken] = await Promise.all([
    idToken(student.uid),
    idToken(fede.uid),
    idToken(academy.uid),
    idToken(cindy.uid)
  ]);

  const checks = {
    unauthenticatedCommon: await status('class_materials/clase-02'),
    studentCommon: await status('class_materials/clase-02', studentToken),
    studentOwnProfile: await status('students/' + student.uid, studentToken),
    studentFedeProfile: await status('students/' + fede.uid, studentToken),
    fedeCommon: await status('class_materials/clase-02', fedeToken),
    fedeStudentProfile: await status('students/' + student.uid, fedeToken),
    academyCommon: await status('class_materials/clase-02', academyToken),
    academyStudentProfile: await status('students/' + student.uid, academyToken),
    cindyCommon: await status('class_materials/clase-02', cindyToken)
  };
  const expected = {
    unauthenticatedCommon: 403,
    studentCommon: 403,
    studentOwnProfile: 403,
    studentFedeProfile: 403,
    fedeCommon: 200,
    fedeStudentProfile: 403,
    academyCommon: 200,
    academyStudentProfile: 403,
    cindyCommon: 200
  };
  const ok = Object.keys(expected).every((key) => checks[key] === expected[key]);
  console.log(JSON.stringify({ ok, checks, expected }, null, 2));
  if (!ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message || String(error));
  process.exit(1);
});
