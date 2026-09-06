import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 5188);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.md': 'text/markdown' };
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const target = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    const relative = target.slice(root.length);
    if (!target.startsWith(root) || relative.split(sep).some(part => part.startsWith('.')) || !['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    const data = await readFile(target);
    res.writeHead(200, { 'Content-Type': (types[extname(target)] || 'application/octet-stream') + (['.html', '.js', '.css', '.json', '.md'].includes(extname(target)) ? '; charset=utf-8' : ''), 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found');
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Flowstate is running at http://localhost:${port}`));
