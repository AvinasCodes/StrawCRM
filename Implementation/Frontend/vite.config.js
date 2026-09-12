import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { spawn } from 'child_process';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Vite plugin to automatically start the FastAPI backend simultaneously
 * whenever the frontend dev server is started.
 */
function autoBackendPlugin() {
  let backendProc = null;

  function isBackendUp() {
    return new Promise((resolve) => {
      const req = http.get('http://127.0.0.1:8000/docs', (res) => {
        resolve(res.statusCode < 500);
      });
      req.on('error', () => resolve(false));
      req.setTimeout(800, () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  return {
    name: 'auto-backend-starter',
    async configureServer(server) {
      const alreadyUp = await isBackendUp();
      if (alreadyUp) {
        console.log('\x1b[32m[StrawCRM] ✓ FastAPI Backend is already running on http://127.0.0.1:8000\x1b[0m');
        return;
      }

      const backendDir = path.resolve(__dirname, '../Backend');
      console.log('\x1b[36m[StrawCRM] 🚀 Starting FastAPI Backend simultaneously on http://127.0.0.1:8000...\x1b[0m');

      const isWin = process.platform === 'win32';
      const pythonCmd = isWin ? 'python' : 'python3';

      backendProc = spawn(pythonCmd, ['-m', 'uvicorn', 'app.main:app', '--reload', '--port', '8000'], {
        cwd: backendDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: isWin,
      });

      backendProc.stdout.on('data', (d) => {
        const text = d.toString().trim();
        if (text) console.log(`\x1b[34m[Backend]\x1b[0m ${text}`);
      });

      backendProc.stderr.on('data', (d) => {
        const text = d.toString().trim();
        if (text) console.log(`\x1b[33m[Backend]\x1b[0m ${text}`);
      });

      backendProc.on('error', (err) => {
        console.warn('\x1b[31m[StrawCRM] Failed to start backend:\x1b[0m', err.message);
      });

      const cleanup = () => {
        if (backendProc && !backendProc.killed) {
          console.log('\x1b[33m[StrawCRM] Stopping backend process...\x1b[0m');
          if (isWin) {
            spawn('taskkill', ['/pid', backendProc.pid.toString(), '/f', '/t']);
          } else {
            backendProc.kill('SIGTERM');
          }
        }
      };

      process.on('exit', cleanup);
      process.on('SIGINT', () => {
        cleanup();
        process.exit(0);
      });
      process.on('SIGTERM', () => {
        cleanup();
        process.exit(0);
      });
      server.httpServer?.on('close', cleanup);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), autoBackendPlugin()],
  server: {
    port: 5173,
    host: true,
  },
});
