import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, ChildProcess } from 'child_process';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const PYTHON_PORT = 8000;

let pythonProcess: ChildProcess | null = null;

function startPythonBackend() {
  console.log(`[Bridge] Starting Python FastAPI backend on port ${PYTHON_PORT}...`);
  pythonProcess = spawn('python3', [
    '-m',
    'uvicorn',
    'backend.main:app',
    '--host',
    '127.0.0.1',
    '--port',
    PYTHON_PORT.toString(),
  ], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: PYTHON_PORT.toString(),
    },
  });

  pythonProcess.on('error', (err) => {
    console.error('[Bridge] Failed to start Python backend:', err);
  });

  pythonProcess.on('exit', (code, signal) => {
    console.log(`[Bridge] Python backend exited with code ${code}, signal ${signal}`);
  });
}

// Start FastAPI
startPythonBackend();

// Ensure child process is killed on exit
process.on('exit', () => {
  if (pythonProcess) pythonProcess.kill();
});
process.on('SIGINT', () => {
  if (pythonProcess) pythonProcess.kill();
  process.exit();
});
process.on('SIGTERM', () => {
  if (pythonProcess) pythonProcess.kill();
  process.exit();
});

// Proxy /api/* requests to FastAPI backend
app.use('/api', (req, res) => {
  const options: http.RequestOptions = {
    hostname: '127.0.0.1',
    port: PYTHON_PORT,
    path: `/api${req.url}`,
    method: req.method,
    headers: {
      ...req.headers,
      host: `127.0.0.1:${PYTHON_PORT}`,
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error('[Bridge] Proxy error:', err.message);
    if (!res.headersSent) {
      res.status(503).json({
        detail: 'FastAPI backend is starting up or temporarily unavailable. Please retry in a few moments.',
      });
    }
  });

  req.pipe(proxyReq, { end: true });
});

// Serve static frontend assets
const frontendDir = path.join(__dirname, 'frontend');

app.use('/css', express.static(path.join(frontendDir, 'css')));
app.use('/js', express.static(path.join(frontendDir, 'js')));
app.use(express.static(frontendDir));

// Route handlers
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

app.get('/history', (req, res) => {
  res.sendFile(path.join(frontendDir, 'history.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(frontendDir, 'dashboard.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[AI Mistake Analyzer] Dev server running on http://0.0.0.0:${PORT}`);
});
