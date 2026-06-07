import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/fetch': 'http://localhost:3000',
      '/sw': 'http://localhost:3000',
      '/rev': 'http://localhost:3000',
      '/bin': 'http://localhost:3000',
      '/api': 'http://localhost:3000',
      '/view': 'http://localhost:3000',
      '/xena-sw.js': 'http://localhost:3000',
      '/tiktok': 'http://localhost:3000',
    }
  }
});
