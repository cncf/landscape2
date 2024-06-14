import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { defineConfig } from 'vite'
import { ViteEjsPlugin } from 'vite-plugin-ejs';
import solid from 'vite-plugin-solid'

const regex = /<link rel="stylesheet" crossorigin href="(.*?)">/g;

function getCSSHref(str: string) {
  const match = regex.exec(str);
  if (!isNull(match)) {
    return match[1];
  } else {
    return undefined;
  }
}

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
  plugins: [ViteEjsPlugin(), solid(), {
    name: 'inject-css-preload',
    transformIndexHtml(html) {
      const assetHref = getCSSHref(html);
      if (!isUndefined(assetHref)) {
        return [
          {
            tag: 'link',
            attrs: { rel: 'preload', href: assetHref, as: 'style', crossorigin: true },
            injectTo: 'head-prepend',
          },
        ]
      } else {
        return html;
      }
    },
  }],
  preview: {
    port: 8000
  },
  resolve: {
    dedupe: [
      "lodash",
      "moment",
      "solid-js",
      "solid-js/web"
    ]
  },
})
