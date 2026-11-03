import { defineConfig } from 'vite';

// The site is published at the root of dreamdreams77.github.io.
export default defineConfig({
  base: '/',
  build: {
    assetsDir: 'assets',
    sourcemap: false,
  },
});
