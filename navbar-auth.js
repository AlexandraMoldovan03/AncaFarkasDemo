// navbar-auth.js — gestionează auth items în navbar pe TOATE paginile
// Folosit ca <script type="module" src="/navbar-auth.js"></script>

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Reutilizează clientul dacă a fost creat deja de pagina curentă (ex: dashboard.html)
const _supa = window.supabaseClient ?? createClient(
  'https://gxavdytkcukxnvonasur.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4YXZkeXRrY3VreG52b25hc3VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NzUzOTgsImV4cCI6MjA2OTQ1MTM5OH0.n2vXj6iziz3896EpzhjOotTuveqd7GjIhgAuExCOLW8'
)

;(async () => {
  try {
    const { data: { user } } = await _supa.auth.getUser()

    // Găsim elementele din navbar
    const elAuth  = document.getElementById('nav-auth')?.parentElement   // <li> Login
    const elDash  = document.getElementById('nav-dash')?.parentElement   // <li> Contul meu
    const elAdmin = document.getElementById('nav-admin')?.parentElement  // <li> Admin
    const elEmail = document.getElementById('navEmail')?.parentElement   // <li> email span
    const elOut   = document.getElementById('btnLogout')?.parentElement  // <li> Logout
    const navEmailEl = document.getElementById('navEmail')

    if (user) {
      // Logat: ascundem Login, arătăm restul
      elAuth?.classList.add('d-none')
      elDash?.classList.remove('d-none')
      elEmail?.classList.remove('d-none')
      elOut?.classList.remove('d-none')
      if (navEmailEl) navEmailEl.textContent = user.email

      // Verificăm dacă e admin
      const { data: rows } = await _supa
        .from('admins')
        .select('user_id')
        .eq('user_id', user.id)
        .limit(1)
      if (rows?.length) elAdmin?.classList.remove('d-none')

      // Logout
      document.getElementById('btnLogout')?.addEventListener('click', async () => {
        await _supa.auth.signOut()
        location.href = '/auth.html'
      })
    } else {
      // Nelogat: arătăm Login, ascundem restul
      elAuth?.classList.remove('d-none')
      elDash?.classList.add('d-none')
      elAdmin?.classList.add('d-none')
      elEmail?.classList.add('d-none')
      elOut?.classList.add('d-none')
    }
  } catch (e) {
    console.warn('navbar-auth:', e)
  }
})()
