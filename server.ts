import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function executeCliApi(payload: Record<string, unknown>): Promise<{ status: number; data: unknown }> {
  return new Promise((resolvePromise) => {
    const scriptPath = path.resolve(__dirname, 'backend', 'cli_api.py');
    const proc = spawn('python3', [scriptPath, JSON.stringify(payload)], {
      cwd: __dirname,
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('error', (err) => {
      resolvePromise({
        status: 500,
        data: { detail: `Backend execution error: ${err.message}` },
      });
    });

    proc.on('close', (code) => {
      const output = stdout.trim();
      if (!output) {
        resolvePromise({
          status: 500,
          data: { detail: stderr.trim() || 'Backend returned empty response' },
        });
        return;
      }
      try {
        const jsonStart = Math.min(
          output.indexOf('{') !== -1 ? output.indexOf('{') : Infinity,
          output.indexOf('[') !== -1 ? output.indexOf('[') : Infinity,
        );
        const jsonEnd = Math.max(output.lastIndexOf('}'), output.lastIndexOf(']'));
        const jsonString =
          jsonStart !== Infinity && jsonEnd !== -1 && jsonEnd >= jsonStart
            ? output.substring(jsonStart, jsonEnd + 1)
            : output;

        const parsed = JSON.parse(jsonString);
        const status = Array.isArray(parsed)
          ? 200
          : typeof parsed.status === 'number'
          ? parsed.status
          : code === 0
          ? 200
          : 500;
        resolvePromise({ status, data: parsed });
      } catch (err) {
        resolvePromise({
          status: 500,
          data: { detail: `Backend response parsing error: ${output}` },
        });
      }
    });

    proc.on('error', (err) => {
      resolvePromise({
        status: 500,
        data: { detail: `Failed to execute Python CLI bridge: ${err.message}` },
      });
    });
  });
}

const server = http.createServer((req, res) => {
  const url = req.url || '/';
  const cleanUrl = url.split('?')[0];

  // API handling
  if (cleanUrl.startsWith('/api')) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : '';

    if (cleanUrl === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'healthy', ml_model_trained: true }));
      return;
    }

    let bodyStr = '';
    req.on('data', (chunk) => {
      bodyStr += chunk.toString();
    });

    req.on('end', async () => {
      let body: Record<string, unknown> = {};
      if (bodyStr.trim()) {
        try {
          body = JSON.parse(bodyStr);
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ detail: 'Invalid JSON request body' }));
          return;
        }
      }

      let payload: Record<string, unknown> | null = null;
      const method = (req.method || 'GET').toUpperCase();

      const historyIdMatch = cleanUrl.match(/^\/api\/history\/(\d+)$/);
      if (historyIdMatch && method === 'DELETE') {
        payload = {
          action: 'delete_history_item',
          token,
          item_id: parseInt(historyIdMatch[1], 10),
        };
      } else if (cleanUrl === '/api/history' && method === 'DELETE') {
        payload = { action: 'clear_history', token };
      } else if (cleanUrl === '/api/history' && method === 'GET') {
        payload = { action: 'history', token };
      } else if (cleanUrl === '/api/auth/register' && method === 'POST') {
        payload = { action: 'register', ...body };
      } else if (cleanUrl === '/api/auth/login' && method === 'POST') {
        payload = { action: 'login', ...body };
      } else if (cleanUrl === '/api/auth/logout' && method === 'POST') {
        payload = { action: 'logout', token };
      } else if (cleanUrl === '/api/auth/me' && method === 'GET') {
        payload = { action: 'me', token };
      } else if (cleanUrl === '/api/dashboard' && method === 'GET') {
        payload = { action: 'dashboard', token };
      } else if (cleanUrl === '/api/analyze' && method === 'POST') {
        payload = { action: 'analyze', token, ...body };
      } else if (cleanUrl === '/api/profile') {
        payload = { action: 'profile', token, method, ...body };
      } else if (cleanUrl === '/api/contact' && method === 'POST') {
        payload = { action: 'contact', ...body };
      }

      if (!payload) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ detail: `Route ${method} ${cleanUrl} not found` }));
        return;
      }

      const { status, data } = await executeCliApi(payload);
      res.writeHead(status, { 'Content-Type': 'application/json' });

      if (cleanUrl === '/api/history' && method === 'GET') {
        const output = Array.isArray(data) ? data : ((data as any)?.data || []);
        res.end(JSON.stringify(output));
        return;
      }

      res.end(JSON.stringify(data));
    });
    return;
  }

  // Static File Serving: Check dist first (production bundle), then root
  let filePath = path.join(__dirname, 'dist', cleanUrl === '/' ? 'index.html' : cleanUrl);
  if (!fs.existsSync(filePath) && fs.existsSync(`${filePath}.html`)) {
    filePath = `${filePath}.html`;
  }

  // Fallback to root files
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, cleanUrl === '/' ? 'index.html' : cleanUrl);
    if (!fs.existsSync(filePath) && fs.existsSync(`${filePath}.html`)) {
      filePath = `${filePath}.html`;
    }
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});
