import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The dashboard talks to the backend through this proxy, so the browser
// only ever sees one origin. BACKEND_URL points it at another backend.
const backend = process.env.BACKEND_URL ?? 'http://localhost:4000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5180,
    strictPort: true,
    proxy: {
      '/api': backend,
      '/demo': backend,
      '/health': backend,
    },
  },
});
