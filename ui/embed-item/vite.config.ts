import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';
import { ViteEjsPlugin } from 'vite-plugin-ejs';
import solid from 'vite-plugin-solid';

const projectDir = fileURLToPath(new URL('.', import.meta.url));
const bootstrapDir = path.resolve(projectDir, 'node_modules/bootstrap');

// Packages the common source shares with this app, resolved from this app so
// the bundle carries a single copy of each (one Solid runtime).
const SHARED_DEPENDENCIES = [
  'solid-js',
  'solid-js/web',
  'solid-styled-components',
  'goober',
  '@solid-primitives/resize-observer',
  'lodash',
];

export default defineConfig({
  base: '',
  build: {
    rollupOptions: {
      input: {
        app: './embed-item.html',
      },
      output: {
        entryFileNames: 'assets/embed-item.[hash].js',
        chunkFileNames: 'assets/embed-item.[hash].js',
        assetFileNames: (info) => {
          const name = info.name === 'app.css' ? 'embed-item' : info.name;
          return `assets/${name}.[hash].[ext]`;
        },
      },
    },
  },
  plugins: [ViteEjsPlugin(), solid()],
  resolve: {
    alias: { bootstrap: bootstrapDir },
    dedupe: SHARED_DEPENDENCIES,
  },
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ['color-functions', 'global-builtin', 'if-function', 'import'],
      },
    },
  },
});
