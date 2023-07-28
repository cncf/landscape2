import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import { ViteEjsPlugin } from 'vite-plugin-ejs';

export default defineConfig(() => {
  return {
    base: '', // Default '/', static path
    plugins: [
      ViteEjsPlugin(),
      react()
    ],
    preview: {
      port: 8000
    }
  };
});
