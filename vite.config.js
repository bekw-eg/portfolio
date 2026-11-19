import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // относительные пути — работает и на GitHub Pages, и в подпапке
  build: { chunkSizeWarningLimit: 700 },
});
