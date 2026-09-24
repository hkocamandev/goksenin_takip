import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { cspPlugin } from './vite.csp';

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), cspPlugin()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    // Tarih kayması hatalarını yakalamak için testler UTC-8'de koşar.
    env: { TZ: 'America/Los_Angeles' },
  },
});
