/// <reference types="vitest" />
import { defineConfig } from 'vite';

// Relative base so the same build works on GitHub Pages (/iggyuoso/) and locally.
// Routing is hash-based, so no server rewrites are needed.
export default defineConfig({
  base: './',
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
