#!/usr/bin/env node
/** Publica solo firestore.rules mediante Firebase Rules API. */

'use strict';

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const PROJECT_ID = 'audiovisual-intelligence';
const PROJECT = 'projects/' + PROJECT_ID;
const RELEASE = PROJECT + '/releases/cloud.firestore';

async function main() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error('falta GOOGLE_APPLICATION_CREDENTIALS');
  }
  const rulesPath = path.resolve(__dirname, '..', '..', 'firestore.rules');
  const content = fs.readFileSync(rulesPath, 'utf8');
  const auth = new google.auth.GoogleAuth({
    scopes: [
      'https://www.googleapis.com/auth/cloud-platform',
      'https://www.googleapis.com/auth/firebase'
    ]
  });
  const api = google.firebaserules({ version: 'v1', auth });

  const before = await api.projects.releases.get({ name: RELEASE });
  const ruleset = await api.projects.rulesets.create({
    name: PROJECT,
    requestBody: {
      source: { files: [{ name: 'firestore.rules', content }] }
    }
  });
  if (!ruleset.data.name) throw new Error('la API no devolvio el nuevo ruleset');

  const updated = await api.projects.releases.patch({
    name: RELEASE,
    requestBody: {
      release: { name: RELEASE, rulesetName: ruleset.data.name },
      updateMask: 'rulesetName'
    }
  });
  if (updated.data.rulesetName !== ruleset.data.name) {
    throw new Error('la release no quedo asociada al ruleset nuevo');
  }

  console.log(JSON.stringify({
    release: RELEASE,
    previousRuleset: before.data.rulesetName,
    currentRuleset: updated.data.rulesetName,
    containsClassMaterialsRule: content.includes('match /class_materials/{classId}')
  }, null, 2));
}

main().catch((error) => {
  const detail = error && error.response && error.response.data;
  console.error(detail ? JSON.stringify(detail) : (error.message || String(error)));
  process.exit(1);
});
