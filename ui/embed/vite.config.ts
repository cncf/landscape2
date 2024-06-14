import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

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
});
