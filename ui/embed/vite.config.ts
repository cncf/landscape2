import path from 'path';
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

if (!process.env.SASS_SILENCE_DEPRECATIONS) {
  process.env.SASS_SILENCE_DEPRECATIONS = 'import,global-builtin,color-functions';
}

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
        includePaths: [
          path.resolve(__dirname, 'node_modules'),
          path.resolve(__dirname, '../webapp/node_modules'),
          path.resolve(__dirname, '../../node_modules'),
        ],
      },
    },
  },
});
