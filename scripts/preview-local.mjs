import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, normalize, resolve, sep } from 'node:path';

const root = process.cwd();
const host = '127.0.0.1';
const port = Number(process.env.PORT || 4173);
const mime = {
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.woff2': 'font/woff2'
};

function localPath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0] || '/');
  const requested = decoded === '/' ? '/index.html' : decoded;
  const candidate = resolve(root, '.' + normalize(requested));
  if (candidate !== root && !candidate.startsWith(root + sep)) return null;
  if (candidate.split(sep).some((part) => part.startsWith('.')) || candidate.includes(sep + 'node_modules' + sep)) return null;
  return candidate;
}

createServer((request, response) => {
  const file = localPath(request.url || '/');
  if (!file || !existsSync(file) || !statSync(file).isFile()) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end('No encontrado');
    return;
  }
  response.writeHead(200, {
    'Content-Type': mime[extname(file).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  createReadStream(file).pipe(response);
}).listen(port, host, () => {
  console.log('AVI preview local: http://' + host + ':' + port + '/');
  console.log('Hub demo local:   http://' + host + ':' + port + '/invitacion.html?code=AVI-LOCAL-DEMO-2026');
  console.log('Ctrl+C para detener. Este servidor no publica ni escribe en Firebase.');
});
