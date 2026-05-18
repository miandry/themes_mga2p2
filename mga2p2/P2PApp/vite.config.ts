import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  // Relative base: chunk URLs resolve from the real script URL (e.g.
  // /sites/mga2p2/themes/mga2p2/dist/assets/index.js), so the theme can live
  // under sites/*/themes/ or themes/custom/ without rebuilding for each path.
  base: './',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/index.js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) return 'assets/style.css';
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
});
