import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

if (!process.env.SASS_SILENCE_DEPRECATIONS) {
  process.env.SASS_SILENCE_DEPRECATIONS = 'import,global-builtin,color-functions';
}

const projectDir = fileURLToPath(new URL('.', import.meta.url));
const scssIncludePaths = [
  path.resolve(projectDir, 'node_modules'),
  path.resolve(projectDir, '../webapp/node_modules'),
  path.resolve(projectDir, '../../node_modules'),
].filter((p) => fs.existsSync(p));

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
  css: {
    preprocessorOptions: {
      scss: {
        includePaths: scssIncludePaths,
      },
    },
  },
});
