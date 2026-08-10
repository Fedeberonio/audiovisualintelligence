#!/usr/bin/env node
/** Prueba las reglas desplegadas con tokens reales de alumno y docente. */

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
  const [student, teacher] = await Promise.all([
    auth.getUserByEmail('fberon@gmail.com'),
    auth.getUserByEmail('academy@audiovisualintelligence.ai')
  ]);
  const [studentToken, teacherToken] = await Promise.all([
    idToken(student.uid),
    idToken(teacher.uid)
  ]);

  const checks = {
    unauthenticatedCommon: await status('class_materials/clase-02'),
    studentCommon: await status('class_materials/clase-02', studentToken),
    studentOwnProfile: await status('students/' + student.uid, studentToken),
    studentTeacherProfile: await status('students/' + teacher.uid, studentToken),
    teacherCommon: await status('class_materials/clase-02', teacherToken),
    teacherStudentProfile: await status('students/' + student.uid, teacherToken)
  };
  const expected = {
    unauthenticatedCommon: 403,
    studentCommon: 200,
    studentOwnProfile: 200,
    studentTeacherProfile: 403,
    teacherCommon: 200,
    teacherStudentProfile: 403
  };
  const ok = Object.keys(expected).every((key) => checks[key] === expected[key]);
  console.log(JSON.stringify({ ok, checks, expected }, null, 2));
  if (!ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message || String(error));
  process.exit(1);
});
