// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        auth: 'auth.html',
        galerie: 'galerie.html',
        shop: 'shop.html',
        // adaugă aici orice alt .html pe care vrei să-l servești
        admin: 'admin.html',
        anulare: 'anulare.html',
        confidentialitatecookie: 'confidentialitate-cookie.html',
        contact: 'contact.html',
        dashboard: 'dashboard.html',
        reset: 'reset.html',
        retur: 'retur.html',
        shopCategory: 'shop-category.html',
        success: 'success.html',
        termeni: 'termeni.html',
        updatePassword: 'update-password.html'



      }
    }
  }
});
