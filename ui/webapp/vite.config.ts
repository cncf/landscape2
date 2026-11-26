import path from 'node:path';
import { fileURLToPath } from 'node:url';

import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { defineConfig, loadEnv } from 'vite';
import { ViteEjsPlugin } from 'vite-plugin-ejs';
import solid from 'vite-plugin-solid';

const projectDir = fileURLToPath(new URL('.', import.meta.url));
const bootstrapDir = path.resolve(projectDir, 'node_modules/bootstrap');
const CSS_HREF_PATTERN = /<link rel="stylesheet" crossorigin href="(.*?)">/;
const DEVELOPMENT_PROXY_PATHS = ['/static/data', '/static/docs', '/static/images', '/static/logos'];
// Packages the common source shares with this app, resolved from this app so
// the bundle carries a single copy of each (one Solid runtime).
const SHARED_DEPENDENCIES = [
  'solid-js',
  'solid-js/web',
  'solid-styled-components',
  'goober',
  '@solid-primitives/resize-observer',
  'lodash',
];

export default defineConfig(({ mode }) => ({
  base: '', // Default '/', static path
  plugins: [
    ViteEjsPlugin(),
    solid(),
    {
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
          ];
        } else {
          return html;
        }
      },
    },
  ],
  preview: {
    port: 8000,
  },
  server: getDevelopmentServerConfig(mode),
  resolve: {
    alias: { bootstrap: bootstrapDir },
    dedupe: SHARED_DEPENDENCIES,
  },
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ['color-functions', 'global-builtin', 'if-function', 'import'],
      },
    },
  },
}));

/** Extracts the generated stylesheet URL from rendered HTML. */
const getCSSHref = (html: string) => {
  const match = CSS_HREF_PATTERN.exec(html);
  if (!isNull(match)) {
    return match[1];
  } else {
    return undefined;
  }
};

/** Creates an opt-in dev proxy for datasets and their generated assets. */
const getDevelopmentServerConfig = (mode: string) => {
  const proxyTarget = loadEnv(mode, process.cwd(), '').VITE_PROXY_TARGET;
  if (!proxyTarget) {
    return undefined;
  }

  const targetUrl = new URL(proxyTarget);
  const targetBasePath = targetUrl.pathname.replace(/\/+$/, '');
  const rewritePath = (requestPath: string) => `${targetBasePath}${requestPath.replace(/^\/static/, '')}`;

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
