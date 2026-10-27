import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
        // The underlying TCP socket can close mid-write (tab closed, HMR
        // reload, or the backend dropping the connection on restart) and
        // Vite's ws-proxy re-throws that as an uncaught 'error' event on
        // both the proxy and the raw socket. Without these listeners it's
        // just noisy console spam on every reload/reconnect; with a real
        // backend outage the actual signal is still visible in your server
        // logs, so it's safe to swallow it here.
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.warn('[vite] socket.io proxy error (ignored):', err.message);
          });
          proxy.on('proxyReqWs', (proxyReq, req, socket) => {
            socket.on('error', (err) => {
              console.warn('[vite] socket.io ws socket error (ignored):', err.message);
            });
          });
        },
      },
    },
  },
});
