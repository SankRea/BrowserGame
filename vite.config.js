import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  // Relative URLs support both username.github.io and repository subpaths.
  base: './',
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  build: {
    outDir: 'dist',
    rolldownOptions: {
      input: {
        home: fileURLToPath(new URL('./index.html', import.meta.url)),
        sudoku: fileURLToPath(new URL('./pages/sudoku.html', import.meta.url)),
        dino: fileURLToPath(new URL('./pages/dino.html', import.meta.url)),
      },
    },
  },
});
