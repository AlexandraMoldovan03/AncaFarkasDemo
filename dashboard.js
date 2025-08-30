// dashboard.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  'https://gxavdytkcukxnvonasur.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4YXZkeXRrY3VreG52b25hc3VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NzUzOTgsImV4cCI6MjA2OTQ1MTM5OH0.n2vXj6iziz3896EpzhjOotTuveqd7GjIhgAuExCOLW8' // PUBLIC ANON
)

;(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    location.href = '/auth.html'
    return
  }

  document.getElementById('userEmail').textContent = user.email

  // const { data, error } = await supabase
  //   .from('purchases')
  //   .select('item_id, status, amount, created_at')
  //   .eq('user_email', user.email)
  //   .order('created_at', { ascending: false })
  // 1) ia products active (public SELECT)
const { data: prods, error: prodsErr } = await supabase
  .from('products')
  .select('id, name')
  .eq('active', true)

  const nameById = Object.fromEntries((prods ?? []).map(p => [String(p.id), p.name]))

  // 2) ia achizițiile user-ului
const { data, error } = await supabase
  .from('purchases')
  .select('item_id, status, amount, created_at')
  .eq('user_email', user.email)
  .order('created_at', { ascending: false })

const list = document.getElementById('courses')


if (error) {
  console.error(error)
  list.innerHTML = '<li>Eroare la încărcare.</li>'
  return
}

  if (!data || data.length === 0) {
    document.getElementById('courses').innerHTML = '<li>Nu ai achiziționat niciun curs.</li>'
    return
  }


// 3) randare listă + buton „Descarcă PDF”
list.innerHTML = data.map(p => {
  const when = fmtDate(p.created_at)
  const price = fmtRON(p.amount ?? 0)
  const canDownload = isPaid(p.status)
  const productName = nameById[String(p.item_id)] ?? '—'
  return `
    <li>
      Curs #${p.item_id} (${productName}) — ${p.status} — ${price} — <small>${when}</small>
      ${canDownload ? ` <button class="dl" data-item="${p.item_id}">Descarcă PDF</button>` : ''}
    </li>
  `
}).join('')




  document.getElementById('courses').innerHTML = data.map(p => {
    const ron = (p.amount / 100).toFixed(2)
    const when = new Date(p.created_at).toLocaleString('ro-RO')
    return `<li>Curs #${p.item_id} — ${p.status} — ${ron} RON — <small>${when}</small></li>`
  }).join('')
})()

// logout global pentru butonul din HTML
window.logout = async () => {
  await supabase.auth.signOut()
  location.href = '/auth.html'
}
