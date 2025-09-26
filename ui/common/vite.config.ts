import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

if (!process.env.SASS_SILENCE_DEPRECATIONS) {
  process.env.SASS_SILENCE_DEPRECATIONS = 'import,global-builtin,color-functions';
}

export default defineConfig({
  plugins: [solid()],
});
