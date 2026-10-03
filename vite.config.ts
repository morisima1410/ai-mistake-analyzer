import { defineConfig } from 'vite';
import { resolve } from 'path';
import { spawn } from 'child_process';
import type { IncomingMessage, ServerResponse } from 'http';

function executeCliApi(payload: Record<string, unknown>): Promise<{ status: number; data: unknown }> {
  return new Promise((resolvePromise) => {
    const scriptPath = resolve(process.cwd(), 'backend', 'cli_api.py');
    const proc = spawn('python3', [scriptPath, JSON.stringify(payload)], {
      cwd: process.cwd(),
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

function handleApiRequest(req: IncomingMessage, res: ServerResponse): boolean {
  const url = req.url || '';
  if (!url.startsWith('/api')) {
    return false;
  }

  const cleanUrl = url.split('?')[0];
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : '';

  if (cleanUrl === '/api/health') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ status: 'healthy', ml_model_trained: true }));
    return true;
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
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
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
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ detail: `Route ${method} ${cleanUrl} not found` }));
      return;
    }

    const { status, data } = await executeCliApi(payload);
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');

    if (cleanUrl === '/api/history' && method === 'GET') {
      const output = Array.isArray(data) ? data : ((data as any)?.data || []);
      res.end(JSON.stringify(output));
      return;
    }

    res.end(JSON.stringify(data));
  });

  return true;
}

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  preview: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [
    {
      name: 'mistake-analyzer-backend',
      configureServer(server) {
        // Rewrite page extensions if omitted e.g. /dashboard -> /dashboard.html
        server.middlewares.use((req, res, next) => {
          const rawUrl = req.url || '';
          const pathOnly = rawUrl.split('?')[0].replace(/^\//, '').replace(/\/$/, '');
          const knownPages = ['dashboard', 'analyze', 'history', 'contact', 'profile', 'about', 'login', 'register'];
          if (knownPages.includes(pathOnly)) {
            req.url = `/${pathOnly}.html${rawUrl.includes('?') ? '?' + rawUrl.split('?')[1] : ''}`;
          }
          next();
        });

        // Handle API calls
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.startsWith('/api')) {
            handleApiRequest(req, res);
          } else {
            next();
          }
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.startsWith('/api')) {
            handleApiRequest(req, res);
          } else {
            next();
          }
        });
      },
    },
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about.html'),
        analyze: resolve(__dirname, 'analyze.html'),
        contact: resolve(__dirname, 'contact.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        history: resolve(__dirname, 'history.html'),
        login: resolve(__dirname, 'login.html'),
        profile: resolve(__dirname, 'profile.html'),
        register: resolve(__dirname, 'register.html'),
      },
    },
  },
});
