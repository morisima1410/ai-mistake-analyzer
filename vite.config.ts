import path from 'path';
import { execFileSync } from 'child_process';
import { defineConfig, Plugin } from 'vite';

function callCliApi(payload: any): any {
  try {
    const output = execFileSync(
      'python3',
      [path.resolve(__dirname, 'backend', 'cli_api.py'), JSON.stringify(payload)],
      {
        cwd: __dirname,
        env: { ...process.env, PYTHONPATH: __dirname },
        timeout: 25000,
        encoding: 'utf-8',
      }
    );
    // Extract JSON line from output (in case there are stdout logs)
    const lines = output.trim().split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.startsWith('{') && line.endsWith('}')) {
        return JSON.parse(line);
      }
    }
    return { status: 500, detail: 'Failed to parse CLI API response' };
  } catch (err: any) {
    console.error('[Vite Backend Bridge] Execution error:', err.message);
    return { status: 500, detail: err.message || 'Backend execution failed' };
  }
}

function aiMistakeAnalyzerBackendPlugin(): Plugin {
  return {
    name: 'ai-mistake-analyzer-backend',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';

        // Clean URL rewrites
        const cleanRoutes: Record<string, string> = {
          '/register': '/register.html',
          '/login': '/login.html',
          '/dashboard': '/dashboard.html',
          '/analyze': '/analyze.html',
          '/history': '/history.html',
          '/profile': '/profile.html',
          '/contact': '/contact.html',
          '/about': '/about.html',
        };

        if (cleanRoutes[url]) {
          req.url = cleanRoutes[url];
          return next();
        }

        if (!url.startsWith('/api')) {
          return next();
        }

        const method = req.method || 'GET';

        // Extract token from Bearer header or Cookie
        let token = '';
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7).trim();
        } else if (req.headers.cookie) {
          const cookieMatch = req.headers.cookie.match(/session_token=([^;]+)/);
          if (cookieMatch) token = cookieMatch[1];
        }

        const getBody = async (): Promise<any> => {
          return new Promise((resolve) => {
            let bodyStr = '';
            req.on('data', chunk => { bodyStr += chunk; });
            req.on('end', () => {
              try {
                resolve(bodyStr ? JSON.parse(bodyStr) : {});
              } catch (_) {
                resolve({});
              }
            });
            req.on('error', () => resolve({}));
          });
        };

        // 1. Health
        if (url === '/api/health') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            status: 'healthy',
            classes: [
              'Calculation Mistake',
              'Careless Mistake',
              'Conceptual Mistake',
              'Incomplete Answer',
              'No Mistake',
              'Syntax Mistake',
              'Wrong Method',
            ],
          }));
          return;
        }

        // 2. Register
        if (url === '/api/auth/register' && method === 'POST') {
          const body = await getBody();
          const result = callCliApi({ action: 'register', ...body });
          res.statusCode = result.status || 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
          return;
        }

        // 3. Login
        if (url === '/api/auth/login' && method === 'POST') {
          const body = await getBody();
          const result = callCliApi({ action: 'login', ...body });
          res.statusCode = result.status || 200;
          if (result.token) {
            res.setHeader('Set-Cookie', `session_token=${result.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);
          }
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
          return;
        }

        // 4. Logout
        if (url === '/api/auth/logout' && method === 'POST') {
          const result = callCliApi({ action: 'logout', token });
          res.setHeader('Set-Cookie', `session_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly`);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
          return;
        }

        // 5. Auth Me
        if (url === '/api/auth/me' && method === 'GET') {
          const result = callCliApi({ action: 'me', token });
          res.statusCode = result.status || 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
          return;
        }

        // 6. Dashboard
        if (url === '/api/dashboard' && method === 'GET') {
          const result = callCliApi({ action: 'dashboard', token });
          res.statusCode = result.status || 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
          return;
        }

        // 7. Analyze
        if (url === '/api/analyze' && method === 'POST') {
          const body = await getBody();
          const result = callCliApi({ action: 'analyze', token, ...body });
          res.statusCode = result.status || 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
          return;
        }

        // 8. History Item Delete
        const historyDeleteMatch = url.match(/^\/api\/history\/(\d+)$/);
        if (historyDeleteMatch && method === 'DELETE') {
          const itemId = parseInt(historyDeleteMatch[1], 10);
          const result = callCliApi({ action: 'delete_history_item', token, item_id: itemId });
          res.statusCode = result.status || 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
          return;
        }

        // 9. History All Delete
        if (url === '/api/history' && method === 'DELETE') {
          const result = callCliApi({ action: 'clear_history', token });
          res.statusCode = result.status || 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
          return;
        }

        // 10. History Get
        if (url === '/api/history' && method === 'GET') {
          const result = callCliApi({ action: 'history', token });
          res.statusCode = result.status || 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result.data || []));
          return;
        }

        // 11. Profile
        if (url === '/api/profile') {
          const body = method === 'PUT' ? await getBody() : {};
          const result = callCliApi({ action: 'profile', method, token, ...body });
          res.statusCode = result.status || 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
          return;
        }

        // 12. Contact
        if (url === '/api/contact' && method === 'POST') {
          const body = await getBody();
          const result = callCliApi({ action: 'contact', ...body });
          res.statusCode = result.status || 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [aiMistakeAnalyzerBackendPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
