import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// De repo-root, afgeleid van dit bestand: tests/ ligt er één map onder.
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html' };
export function serve(port, pages) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    if (pages[url.pathname]) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(pages[url.pathname]);
    }
    try {
      const body = await readFile(path.join(ROOT, url.pathname));
      res.writeHead(200, { 'content-type': TYPES[path.extname(url.pathname)] || 'application/octet-stream' });
      res.end(body);
    } catch { res.writeHead(404); res.end('nope'); }
  }).listen(port);
}
