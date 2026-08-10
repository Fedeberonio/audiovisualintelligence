#!/usr/bin/env node
/** Genera un enlace temporal de restablecimiento sin enviar email. */

'use strict';

const fs = require('fs');
const path = require('path');
const { applicationDefault, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const PROJECT_ID = 'audiovisual-intelligence';
const email = String(process.argv[2] || '').trim().toLowerCase();

async function main() {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Uso: node generate-reset-link.js <email>');
  }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error('falta GOOGLE_APPLICATION_CREDENTIALS');
  }
  initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
  await getAuth().getUserByEmail(email);
  const link = await getAuth().generatePasswordResetLink(email);
  const file = path.resolve(__dirname, 'restablecer-' + Date.now() + '.txt');
  fs.writeFileSync(file, link + '\n', { mode: 0o600 });
  console.log(file);
}

main().catch((error) => {
  console.error(error.message || String(error));
  process.exit(1);
});
