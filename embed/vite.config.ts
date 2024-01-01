import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import { viteStaticCopy } from 'vite-plugin-static-copy';


export default defineConfig({
  base: '/embed',
  build: {
    rollupOptions: {
      input: {
        app: './embed.html',
      },
    },
  },
  plugins: [solid(),
    viteStaticCopy({
      targets: [
        {
          src: './src/assets/js/iframeResizer.contentWindow-v4.3.9.min.js',
          dest: 'assets'
        }
      ]
    })
  ]
});
