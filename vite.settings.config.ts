import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'src/settings',
  base: './',
  build: {
    outDir: '../../dist/settings',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        settings: resolve(__dirname, 'src/settings/index.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].[hash].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
    target: 'chrome100',
    minify: 'terser',
    sourcemap: process.env.NODE_ENV === 'development',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/settings'),
      '@core': resolve(__dirname, 'src/core'),
      '@premium': resolve(__dirname, 'src/premium'),
    },
  },
  // Development server configuration
  server: {
    port: 5173,
    open: '/index.html',
  },
});
