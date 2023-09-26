import { defineConfig } from 'vite'
import { ViteEjsPlugin } from 'vite-plugin-ejs';
import solid from 'vite-plugin-solid'

export default defineConfig({
  base: '', // Default '/', static path
  build: {
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ['apexcharts'],
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          apexcharts: 'Apexcharts',
        },
      },
    },
  },
  plugins: [ViteEjsPlugin(), solid()],
  preview: {
    port: 8000
  }
})
