import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
        output: {
            entryFileNames: "minibuffer-find-file.js",

            // Prevent vendor.js being created
            manualChunks: undefined,
            // chunkFileNames: "zzz-[name].js",
            // this got rid of the hash on style.css
            assetFileNames: "assets/[name].[ext]",
        },
    },
    // Prevent vendor.css being created
    cssCodeSplit: false,
},

  plugins: [
    react(
    ),
  ]
});
