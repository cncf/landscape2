import fs from 'node:fs';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import { ViteEjsPlugin } from 'vite-plugin-ejs';
import solid from 'vite-plugin-solid';

if (!process.env.SASS_SILENCE_DEPRECATIONS) {
  process.env.SASS_SILENCE_DEPRECATIONS = 'import,global-builtin,color-functions';
}

const projectDir = fileURLToPath(new URL('.', import.meta.url));
const scssIncludePaths = [
  path.resolve(projectDir, 'node_modules'),
  path.resolve(projectDir, '../../node_modules'),
].filter((p) => fs.existsSync(p));

const bootstrapDir = [
  path.resolve(projectDir, 'node_modules/bootstrap'),
  path.resolve(projectDir, '../../node_modules/bootstrap'),
].find((candidate) => fs.existsSync(candidate));

const regex = /<link rel="stylesheet" crossorigin href="(.*?)">/g;
const DEVELOPMENT_PROXY_PATHS = [
  '/static/data',
  '/static/docs',
  '/static/images',
  '/static/logos',
];

export default defineConfig(({ mode }) => ({
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
    port: 8000,
  },
  server: getDevelopmentServerConfig(mode),
  resolve: {
    dedupe: [
      "lodash",
      "moment",
      "solid-js",
      "solid-js/web"
    ],
    ...(bootstrapDir ? { alias: { bootstrap: bootstrapDir } } : {}),
  },
  css: {
    preprocessorOptions: {
      scss: {
        includePaths: scssIncludePaths,
      },
    },
  },
}));

/** Creates an opt-in dev proxy for datasets and their generated assets. */
const getDevelopmentServerConfig = (mode: string) => {
  const proxyTarget = loadEnv(mode, process.cwd(), '').VITE_PROXY_TARGET;
  if (!proxyTarget) {
    return undefined;
  }

  const targetUrl = new URL(proxyTarget);
  const targetBasePath = targetUrl.pathname.replace(/\/+$/, '');
  const rewritePath = (requestPath: string) =>
    `${targetBasePath}${requestPath.replace(/^\/static/, '')}`;

  return {
    proxy: Object.fromEntries(
      DEVELOPMENT_PROXY_PATHS.map((path) => [
        path,
        {
          target: targetUrl.origin,
          changeOrigin: true,
          rewrite: rewritePath,
        },
      ])
    ),
  };
};

const getCSSHref = (str: string) => {
  const match = regex.exec(str);
  if (!isNull(match)) {
    return match[1];
  } else {
    return undefined;
  }
};
