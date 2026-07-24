import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { ViteEjsPlugin } from 'vite-plugin-ejs';
import solid from 'vite-plugin-solid';

const projectDir = fileURLToPath(new URL('.', import.meta.url));
const scssIncludePaths = [
  path.resolve(projectDir, 'node_modules'),
  path.resolve(projectDir, '../webapp/node_modules'),
  path.resolve(projectDir, '../../node_modules'),
].filter((p) => fs.existsSync(p));

const bootstrapDir = [
  path.resolve(projectDir, 'node_modules/bootstrap'),
  path.resolve(projectDir, '../webapp/node_modules/bootstrap'),
  path.resolve(projectDir, '../../node_modules/bootstrap'),
].find((candidate) => fs.existsSync(candidate));

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
    dedupe: ['solid-js', 'solid-js/web'],
    ...(bootstrapDir ? { alias: { bootstrap: bootstrapDir } } : {}),
  },
  css: {
    preprocessorOptions: {
      scss: {
        includePaths: scssIncludePaths,
        silenceDeprecations: ['color-functions', 'global-builtin', 'if-function', 'import'],
      },
    },
  },
});
