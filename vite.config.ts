import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/leenfrisbee/',
  test: {
    include: ['scripts/**/*.test.mjs', 'src/**/*.test.ts'],
  },
});
