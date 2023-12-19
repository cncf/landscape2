import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig({
  base: '/embed',
  build: {
    rollupOptions: {
      input: {
        app: './embed.html',
      },
    },
  },
  plugins: [solid()],
});
