import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxies /api/claude/... → https://api.anthropic.com/...
      // Keeps the API key off the public network and avoids CORS issues.
      '/api/claude': {
        target:       'https://api.anthropic.com',
        changeOrigin: true,
        rewrite:      path => path.replace(/^\/api\/claude/, ''),
      },
    },
  },
});
