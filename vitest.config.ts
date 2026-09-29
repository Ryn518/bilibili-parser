import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node'
  },
  resolve: {
    alias: [
      { find: '@/lib/server', replacement: path.resolve(__dirname, 'backend') },
      { find: '@/components', replacement: path.resolve(__dirname, 'frontend/components') },
      { find: '@/hooks', replacement: path.resolve(__dirname, 'frontend/hooks') },
      { find: '@/lib', replacement: path.resolve(__dirname, 'frontend/lib') },
      { find: '@', replacement: path.resolve(__dirname, '.') }
    ]
  }
});
