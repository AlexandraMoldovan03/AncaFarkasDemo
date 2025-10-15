// vite.config.js
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        auth: resolve(__dirname, 'auth.html'),
        galerie: resolve(__dirname, 'galerie.html'),
        shop: resolve(__dirname, 'shop.html'),
        anulare: resolve(__dirname, 'anulare.html'),
        success: resolve(__dirname, 'success.html'), // ← asigură-te că chiar există
        confidentialitatecookie: resolve(__dirname, 'confidentialitate-cookie.html'),
        contact: resolve(__dirname, 'contact.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        reset: resolve(__dirname, 'reset.html'),
        retur: resolve(__dirname, 'retur.html'),
        'shop-category': resolve(__dirname, 'shop-category.html'),
        termeni: resolve(__dirname, 'termeni.html'),
        'update-password': resolve(__dirname, 'update-password.html'),
        admin: resolve(__dirname, 'admin.html'),
      }
    }
  }
});
