import { defineConfig } from 'vite';

// GitHub Pages serves this project beneath /Wildfrontier-/.
export default defineConfig({
  base: '/Wildfrontier-/',
  build: {
    assetsDir: 'assets',
    sourcemap: false,
  },
});
