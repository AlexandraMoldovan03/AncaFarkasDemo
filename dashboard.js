// /dashboard.js
// /dashboard.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Folosește clientul creat în HTML; dacă nu există, creează fallback (aceleași credențiale)
const supabase = window.supabaseClient ?? createClient(
  'https://gxavdytkcukxnvonasur.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4YXZkeXRrY3VreG52b25hc3VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NzUzOTgsImV4cCI6MjA2OTQ1MTM5OH0.n2vXj6iziz3896EpzhjOotTuveqd7GjIhgAuExCOLW8',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);

supabase.auth.onAuthStateChange((_event, session) => {
  if (!session) location.href = '/auth.html';
});


const API_BASE = 'https://stripe-backend-q89t.onrender.com'

// ---------- utilitare ----------
const fmtRON  = v => (v / 100).toFixed(2) + ' RON'
const fmtDate = iso => new Date(iso).toLocaleString('ro-RO')
const isPaid  = s => ['paid','succeeded'].includes(String(s).toLowerCase())
const esc = (s='') => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))
const short = (s='', n=220) => s.length>n ? s.slice(0,n-1)+'…' : s
const extFromPath = (p='') => (p.split('?')[0].split('#')[0].match(/\.([a-z0-9]+)$/i)||[])[1]?.toLowerCase() || ''
const canOpenInline = (type, path='') => {
  const t = String(type||'').toLowerCase()
  const e = extFromPath(path)
  if (t.includes('pdf')  || e === 'pdf') return true
  if (t.includes('video')|| ['mp4','webm','mov'].includes(e)) return true
  return false
}

// ---------- modal helper (înlocuiește alert) ----------
const showPopup = (title='Mesaj', message='', variant='primary') => {
  const modalEl = document.getElementById('appModal')
  // fallback în caz că nu e markup-ul pus
  if (!modalEl || typeof bootstrap === 'undefined') { window.alert(message); return }

  const ttl = document.getElementById('appModalTitle')
  const body = document.getElementById('appModalBody')
  const okBtn = document.getElementById('appModalOk')

  ttl.textContent = title
  body.textContent = message
  okBtn.className = `btn btn-${['success','danger','warning','primary','secondary','info'].includes(variant)?variant:'primary'}`

  showPopup._inst ??= new bootstrap.Modal(modalEl)
  showPopup._inst.show()
}

;(async () => {
  try {
    // --- auth ---
    const { data:{ user } } = await supabase.auth.getUser()
    if (!user) { location.href = '/auth.html'; return }
    document.getElementById('userEmail').textContent = user.email

    // --- admin gate ---
try {
  const { data: adminRows, error: adminErr } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .limit(1);

  if (!adminErr && adminRows?.length) {
    // e admin -> arată butonul
    document.getElementById('nav-admin')?.classList.remove('d-none');
  }
} catch (e) {
  console.warn('admin check failed:', e);
}




    const list = document.getElementById('courses')
    list.innerHTML = '' // curățăm skeleton-urile

    // --- 1) achiziții ---
    const { data: purchases, error } = await supabase
      .from('purchases')
      .select('item_id, status, amount, created_at')
      .eq('user_email', user.email)
      .order('created_at', { ascending: false })

    if (error) {
      list.innerHTML = `<li>Eroare la încărcare: ${esc(error.message ?? '')}</li>`
      return
    }
    if (!purchases?.length) {
      list.innerHTML = '<li>Nu ai achiziționat niciun curs.</li>'
      return
    }

    // --- 2) produse aferente ---
    const ids = [...new Set(purchases.map(p => String(p.item_id)).filter(Boolean))]
    const { data: prodRows, error: prodErr } = await supabase
      .from('products')
      .select('id, name, description, image_url, file_path, type')
      .in('id', ids)
    if (prodErr) console.warn('products err', prodErr)

    const prodById = Object.fromEntries((prodRows ?? []).map(r => [String(r.id), r]))

    // --- 3) randare ---
    list.innerHTML = purchases.map(p => {
      const prod = prodById[String(p.item_id)] || {}
      const title = esc(prod.name ?? `Produs #${p.item_id}`)
      const desc  = esc(short(prod.description ?? '', 260))
      const cover = esc(prod.image_url ?? '')
      const when  = fmtDate(p.created_at)
      const price = fmtRON(p.amount ?? 0)
      const paid  = isPaid(p.status)
      const viewable = canOpenInline(prod.type, prod.file_path || prod.image_url)

      return `
        <li class="course">
          ${cover ? `<img class="img" src="${cover}" alt="${title}">` : ''}
          <div class="meta">
            <div class="title">
              <strong>${title}</strong>
              <span class="badge ${paid ? 'bg-success' : 'bg-secondary'} ms-2">${esc(p.status)}</span>
            </div>
            <small class="text-muted">${price} • ${esc(when)}</small>
          </div>
          ${desc ? `<p class="desc">${desc}</p>` : ''}
          <div class="actions">
            ${paid && viewable ? `<button class="open btn btn-sm btn-primary" data-item="${p.item_id}">Deschide</button>` : ''}
            ${paid ? `<button class="email btn btn-sm btn-outline-secondary" data-item="${p.item_id}">Trimite link de descărcare pe email</button>` : `<span class="text-muted">Plata nu e finalizată.</span>`}
          </div>
        </li>
      `
    }).join('')

    // --- 4) acțiuni ---
    list.addEventListener('click', async (ev) => {
      const btn = ev.target.closest('button')
      if (!btn) return

      const { data:{ session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        showPopup('Autentificare necesară', 'Trebuie să fii logat(ă).', 'warning')
        location.href = '/auth.html'
        return
      }
      const itemId = btn.getAttribute('data-item')

      // 4.a — Deschide (vizualizare în browser)
      if (btn.classList.contains('open')) {
        try {
          btn.disabled = true; btn.textContent = 'Se deschide...'
          const resp = await fetch(`${API_BASE}/download?itemId=${encodeURIComponent(itemId)}&purpose=view`, {
            headers: { Authorization: `Bearer ${session.access_token}` }
          })
          const js = await resp.json().catch(()=>({}))
          if (!resp.ok || !js?.url) throw new Error(js?.error || 'Nu am putut genera linkul.')
          let url = js.inlineUrl || js.url
          try { const u = new URL(url); u.searchParams.delete('download'); url = u.toString() } catch {}
          window.open(url, '_blank', 'noopener')
        } catch (e) {
         notify({ title:'Nu am putut deschide fișierul', message: e?.message || 'Eroare necunoscută.', variant:'danger' });

        } finally {
          btn.disabled = false; btn.textContent = 'Deschide'
        }
        return
      }

      // 4.b — Trimite link pe email (descărcare)
      if (btn.classList.contains('email')) {
        try {
          btn.disabled = true; btn.textContent = 'Se trimite...'
          const resp = await fetch(`${API_BASE}/resend-download`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ itemId })
          })
          const js = await resp.json().catch(()=>({}))
          if (!resp.ok || !js?.ok) throw new Error(js?.error || 'Nu am putut trimite emailul.')
          notify({ title: 'Gata!', message: 'Ți-am trimis emailul cu linkul de descărcare.', variant: 'success' });

        } catch (e) {
         notify({ title: 'Eroare', message: e?.message || 'Eroare la trimiterea emailului.', variant: 'danger' });

        } finally {
          btn.disabled = false; btn.textContent = 'Trimite link de descărcare pe email'
        }
      }
    })
  } catch (e) {
    console.error('dashboard fatal', e)
    const list = document.getElementById('courses')
    if (list) list.innerHTML = `<li>Eroare: ${esc(e.message ?? e)}</li>`
  }
})()




function fixOffset(){
    const nav = document.querySelector('.navbar.fixed-top');
    document.querySelectorAll('.with-navbar').forEach(el=>{
      el.style.paddingTop = (nav ? nav.offsetHeight + 16 : 96) + 'px';
    });
  }
  window.addEventListener('load', fixOffset);
  window.addEventListener('resize', fixOffset);




