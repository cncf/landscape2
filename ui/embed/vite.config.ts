import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

// Packages the common source shares with this app, resolved from this app so
// the bundle carries a single copy of each (one Solid runtime).
const SHARED_DEPENDENCIES = ['solid-js', 'solid-js/web', 'solid-styled-components', 'goober', 'lodash'];

export default defineConfig({
  base: '',
  build: {
    rollupOptions: {
      input: {
        app: './embed.html',
      },
      output: {
        entryFileNames: 'assets/embed.[hash].js',
        chunkFileNames: 'assets/embed.[hash].js',
      },
    },
  },
  plugins: [solid()],
  resolve: {
    dedupe: SHARED_DEPENDENCIES,
  },
});
