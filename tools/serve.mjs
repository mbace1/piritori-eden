import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const requestedPort = Number.parseInt(process.env.PIRITORI_PORT ?? '8080', 10);
const port = Number.isInteger(requestedPort) && requestedPort > 0 ? requestedPort : 8080;

const mime = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
]);

createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url ?? '/', 'http://localhost');
    const decoded = decodeURIComponent(requestUrl.pathname);
    let target = resolve(root, `.${decoded}`);
    if (target !== root && !target.startsWith(`${root}${sep}`)) {
      response.writeHead(403).end('Forbidden');
      return;
    }

    const details = await stat(target);
    if (details.isDirectory()) target = resolve(target, 'index.html');
    const body = await readFile(target);
    response.writeHead(200, {
      'Content-Type': mime.get(extname(target).toLowerCase()) ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    response.end(body);
  } catch {
    response.writeHead(404, {'Content-Type': 'text/plain; charset=utf-8'});
    response.end('Not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Piritori → Eden: http://localhost:${port}/piritori/`);
});
