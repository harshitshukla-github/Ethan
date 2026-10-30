import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In development the API runs as a separate process. Proxying it keeps the browser on
    // one origin, so the session cookie works exactly as it does in production.
    proxy: {
      '/api': 'http://127.0.0.1:4000',
    },
  },
});
