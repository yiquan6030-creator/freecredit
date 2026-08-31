import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    minify: 'terser',
    sourcemap: false
  }
});
