import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { gilgalProjectBridge } from './scripts/project-bridge.ts';

export default defineConfig({
  plugins: [react(), gilgalProjectBridge()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
