import { defineConfig } from 'vite';
import { ViteEjsPlugin } from 'vite-plugin-ejs';
import solid from 'vite-plugin-solid';

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
  },
});
