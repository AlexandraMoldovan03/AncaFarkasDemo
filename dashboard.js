// dashboard.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  'https://gxavdytkcukxnvonasur.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4YXZkeXRrY3VreG52b25hc3VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NzUzOTgsImV4cCI6MjA2OTQ1MTM5OH0.n2vXj6iziz3896EpzhjOotTuveqd7GjIhgAuExCOLW8'
)

const API_BASE = 'https://stripe-backend-q89t.onrender.com' // schimbă dacă e alt URL

const fmtRON = v => (v / 100).toFixed(2) + ' RON'
const fmtDate = iso => new Date(iso).toLocaleString('ro-RO')
const isPaid = s => ['paid', 'succeeded'].includes(String(s).toLowerCase())

;(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { location.href = '/auth.html'; return }
  document.getElementById('userEmail').textContent = user.email

  // 1) ia produse (nume pentru afișare), public SELECT
  const { data: prods, error: prodsErr } = await supabase
    .from('products')
    .select('id, name')
    .eq('active', true)
  if (prodsErr) console.warn('products err', prodsErr)
  const nameById = Object.fromEntries((prods ?? []).map(p => [String(p.id), p.name]))

  // 2) ia achizițiile tale
  const { data, error } = await supabase
    .from('purchases')
    .select('item_id, status, amount, created_at')
    .eq('user_email', user.email)
    .order('created_at', { ascending: false })

  const list = document.getElementById('courses')

  if (error) {
    console.error('purchases error:', error)
    list.innerHTML = `<li>Eroare la încărcare: ${error.message ?? ''}</li>`
    return
  }
  if (!data || data.length === 0) {
    list.innerHTML = '<li>Nu ai achiziționat niciun curs.</li>'
    return
  }

  list.innerHTML = data.map(p => {
    const when = fmtDate(p.created_at)
    const price = fmtRON(p.amount ?? 0)
    const canDownload = isPaid(p.status)
    const productName = nameById[String(p.item_id)] ?? '—'
    return `
      <li>
        <div>
          <strong>Curs #${p.item_id}</strong> (${productName}) — ${p.status} — ${price} — <small>${when}</small>
        </div>
        <div style="margin-top:6px;">
          ${canDownload ? `
            <button class="dl" data-item="${p.item_id}">Descarcă PDF</button>
            <button class="email" data-item="${p.item_id}">Trimite pe email</button>
          ` : ''}
        </div>
      </li>
    `
  }).join('')

  // 3) Event delegation pentru butoane
  list.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('button')
    if (!btn) return

    // ia tokenul curent
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) { alert('Trebuie să fii logat(ă).'); location.href = '/auth.html'; return }

    const itemId = btn.getAttribute('data-item')

    if (btn.classList.contains('dl')) {
      try {
        btn.disabled = true; btn.textContent = 'Se generează...'
        const resp = await fetch(`${API_BASE}/download?itemId=${encodeURIComponent(itemId)}`, {
          headers: { Authorization: `Bearer ${session.access_token}` }
        })
        const js = await resp.json().catch(() => ({}))
        if (!resp.ok || !js?.url) throw new Error(js?.error || 'Nu am putut genera linkul.')
        window.open(js.url, '_blank')
      } catch (e) {
        alert(e.message || 'Eroare la descărcare.')
      } finally {
        btn.disabled = false; btn.textContent = 'Descarcă PDF'
      }
    }

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
        const js = await resp.json().catch(() => ({}))
        if (!resp.ok || !js?.ok) throw new Error(js?.error || 'Nu am putut trimite emailul.')
        alert('Ți-am trimis din nou emailul cu linkul de descărcare.')
      } catch (e) {
        alert(e.message || 'Eroare la trimiterea emailului.')
      } finally {
        btn.disabled = false; btn.textContent = 'Trimite pe email'
      }
    }
  })
})()

window.logout = async () => {
  await supabase.auth.signOut()
  location.href = '/auth.html'
}
