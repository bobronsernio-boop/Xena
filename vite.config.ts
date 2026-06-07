import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/fetch': 'http://localhost:3000',
      '/proxy': 'http://localhost:3000',
      '/gateway': 'http://localhost:3000',
      '/api': 'http://localhost:3000',
      '/view': 'http://localhost:3000',
      '/sw.js': 'http://localhost:3000',
    }
  }
});
