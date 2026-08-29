import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const failures = [];
const ignored = new Set(
  spawnSync('git', ['ls-files', '--others', '--ignored', '--exclude-standard'], { encoding: 'utf8' })
    .stdout.split('\n').filter(Boolean)
);
const htmlFiles = readdirSync(root).filter((name) => extname(name) === '.html' && !ignored.has(name));
const jsFiles = readdirSync(resolve(root, 'assets')).filter((name) => extname(name) === '.js');
const dataFiles = readdirSync(resolve(root, 'data'));
const jsonFiles = dataFiles.filter((name) => extname(name) === '.json');

// data/ es público: sólo puede contener contenido versionado en JSON.
for (const name of dataFiles) {
  if (extname(name) !== '.json') failures.push(`Archivo no permitido en data/: ${name}`);
}

for (const name of jsonFiles) {
  try { JSON.parse(readFileSync(resolve(root, 'data', name), 'utf8')); }
  catch (error) { failures.push(`JSON inválido: data/${name} (${error.message})`); }
}

for (const name of jsFiles) {
  const result = spawnSync(process.execPath, ['--check', resolve(root, 'assets', name)], { encoding: 'utf8' });
  if (result.status !== 0) failures.push(`JavaScript inválido: assets/${name}\n${result.stderr.trim()}`);
}

for (const name of htmlFiles) {
  const source = readFileSync(resolve(root, name), 'utf8');
  const references = source.matchAll(/(?:href|src)=["']([^"'#?]+)(?:[?#][^"']*)?["']/g);
  for (const match of references) {
    const target = match[1];
    if (/^(?:https?:|mailto:|data:|javascript:|\/)/.test(target)) continue;
    if (!existsSync(resolve(root, dirname(name), target))) failures.push(`Referencia inexistente: ${name} -> ${target}`);
  }
}

const holdingPages = htmlFiles.filter((name) =>
  readFileSync(resolve(root, name), 'utf8').includes('data-site-mode="holding"')
);
const holdingMode = holdingPages.length === htmlFiles.length;

if (holdingPages.length && !holdingMode) {
  failures.push('Modo temporal incompleto: todas las páginas HTML deben usar el mismo estado.');
}

// Mientras el sitio está en placeholder, el acceso es solo con las cuentas
// registradas: todo salvo la portada lleva guard de interfaz. Decisión del
// 2026-08-19; al relanzar (fase B) el catálogo vuelve a la lista pública.
if (holdingMode) {
  const holdingCssPath = resolve(root, 'assets', 'site-hold.css');
  if (!existsSync(holdingCssPath)) {
    failures.push('Falta la hoja de estilo del placeholder temporal.');
  } else {
    const holdingCss = readFileSync(holdingCssPath, 'utf8');
    if (/@keyframes|\banimation\s*:|\btransition\s*:/i.test(holdingCss)) {
      failures.push('El placeholder temporal no puede incluir movimiento.');
    }
  }

  for (const name of htmlFiles) {
    const source = readFileSync(resolve(root, name), 'utf8');
    if (!source.includes('assets/site-hold.css')) failures.push(`Falta estilo temporal: ${name}`);
    if (!source.includes('name="robots" content="noindex, nofollow, noarchive, nosnippet"')) {
      failures.push(`Falta noindex temporal: ${name}`);
    }
    if (!source.includes('id="site-hold-title"')) failures.push(`Falta título temporal: ${name}`);
    if (/<(?:script|video|audio|form)\b/i.test(source)) {
      failures.push(`El placeholder debe ser estático: ${name}`);
    }
  }

  const robots = readFileSync(resolve(root, 'robots.txt'), 'utf8');
  if (!/^Allow:\s*\/\s*$/m.test(robots) || /^Disallow:\s*\/\s*$/m.test(robots)) {
    failures.push('robots.txt debe permitir el rastreo para que los buscadores reciban el noindex temporal.');
  }

  const sitemap = readFileSync(resolve(root, 'sitemap.xml'), 'utf8');
  if (/<url>/i.test(sitemap)) failures.push('El sitemap temporal no debe listar páginas.');
} else {
  for (const name of ['aula.html', 'hub.html', 'plataforma.html', 'talleres.html', 'taller.html', 'avi-vision.html']) {
    const source = readFileSync(resolve(root, name), 'utf8');
    if (!source.includes('assets/gate.js')) failures.push(`Falta gate de interfaz: ${name}`);
  }

  // Las superficies públicas nunca deben quedar protegidas por error.
  for (const name of ['index.html', 'invitacion.html']) {
    const source = readFileSync(resolve(root, name), 'utf8');
    if (source.includes('assets/gate.js')) failures.push(`Página pública protegida por error: ${name}`);
  }
}

// El código de invitación es sólo una referencia opaca: ninguna página o dato
// público debe contener teléfonos personales ni valores de invitaciones reales.
const personalWhatsApp = /wa\.me|api\.whatsapp\.com|\+1\s*829\s*748\s*2341/i;
for (const name of [...htmlFiles, ...jsFiles.map((name) => `assets/${name}`), ...jsonFiles.map((name) => `data/${name}`)]) {
  const file = resolve(root, name);
  const source = readFileSync(file, 'utf8');
  if (personalWhatsApp.test(source)) failures.push(`Contacto personal no permitido en ${name}`);
}

// Ningún JSON público puede filtrar enlaces privados ni identificadores de reproducción.
// Se revisan los valores, no los nombres de campo: `meeting_url: null` es un contrato válido.
const privateValue = /drive\.google\.com|docs\.google\.com|meet\.google\.com|zoom\.us|providerAssetId/i;
const privateKey = /^(meeting_url|recording_url|recordingPath|storagePath|providerAssetId)$/i;

function scanValues(node, name, path = '') {
  if (node === null || node === undefined) return;
  if (typeof node === 'string') {
    if (privateValue.test(node)) failures.push(`Enlace privado en data/${name} (${path}): ${node}`);
    return;
  }
  if (Array.isArray(node)) return node.forEach((item, i) => scanValues(item, name, `${path}[${i}]`));
  if (typeof node !== 'object') return;
  for (const [key, value] of Object.entries(node)) {
    const here = path ? `${path}.${key}` : key;
    if (privateKey.test(key) && value) failures.push(`Campo privado con valor en data/${name} (${here})`);
    scanValues(value, name, here);
  }
}

for (const name of jsonFiles) {
  try { scanValues(JSON.parse(readFileSync(resolve(root, 'data', name), 'utf8')), name); }
  catch { /* el JSON inválido ya se reportó arriba */ }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`AVI check OK: ${htmlFiles.length} HTML, ${jsFiles.length} JS y ${jsonFiles.length} JSON.`);
