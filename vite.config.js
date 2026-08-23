import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // 👇 permite top-level await la build
  build: {
    target: 'esnext',
    outDir: 'dist',
    rollupOptions: {
      input: {
        index:   resolve(__dirname, 'index.html'),
        auth:    resolve(__dirname, 'auth.html'),
        galerie: resolve(__dirname, 'galerie.html'),
        shop:    resolve(__dirname, 'shop.html'),
        anulare: resolve(__dirname, 'anulare.html'),
        succes:  resolve(__dirname, 'success.html'),
        confidentialitatecookie: resolve(__dirname, 'confidentialitate-cookie.html'),
        contact:  resolve(__dirname, 'contact.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        reset:    resolve(__dirname, 'reset.html'),
        retur:    resolve(__dirname, 'retur.html'),
        'shop-category': resolve(__dirname, 'shop-category.html'),
        termeni:  resolve(__dirname, 'termeni.html'),
        'update-password': resolve(__dirname, 'update-password.html'),
        admin:       resolve(__dirname, 'admin.html'),
        'admin-stats': resolve(__dirname, 'admin-stats.html'),
      }
    }
  },
  // (opțional) și pentru esbuild:
  esbuild: { target: 'esnext' },
});
