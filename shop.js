// import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// const supabase = createClient(
//   'https://gxavdytkcukxnvonasur.supabase.co',
//   'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4YXZkeXRrY3VreG52b25hc3VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NzUzOTgsImV4cCI6MjA2OTQ1MTM5OH0.n2vXj6iziz3896EpzhjOotTuveqd7GjIhgAuExCOLW8'
// )
// const API_BASE = 'https://stripe-backend-q89t.onrender.com'

// const money = c => (c / 100).toFixed(2) + ' RON'

// const hello = document.getElementById('hello')
// const btnAuth = document.getElementById('toAuth')
// const btnLogout = document.getElementById('logout')
// const guestEmail = document.getElementById('guestEmail')
// const productsDiv = document.getElementById('products')

// // status auth
// const { data: { user } } = await supabase.auth.getUser()
// if (user) {
//   hello.textContent = `Salut, ${user.email}`
//   btnLogout.style.display = 'inline-block'
//   btnAuth.style.display = 'none'
// } else {
//   hello.textContent = 'Ești invitat(ă)'
//   btnLogout.style.display = 'none'
//   btnAuth.style.display = 'inline-block'
// }
// btnAuth.onclick = () => location.href = '/auth.html'
// btnLogout.onclick = async () => { await supabase.auth.signOut(); location.reload() }

// // lista produse
// const { data: prods, error } = await supabase
//   .from('products')
//   .select('id, name, amount_cents')
//   .eq('active', true)
//   .order('id')

// if (error) {
//   productsDiv.innerHTML = `<p>Eroare: ${error.message}</p>`
// } else if (!prods || prods.length === 0) {
//   productsDiv.innerHTML = '<p>Niciun curs disponibil.</p>'
// } else {
//   productsDiv.innerHTML = prods.map(p => `
//     <div style="border:1px solid #ddd; padding:12px; margin:8px 0; border-radius:8px;">
//       <div><strong>${p.name}</strong></div>
//       <div>${money(p.amount_cents)}</div>
//       <button class="buy" data-id="${p.id}">Cumpără</button>
//     </div>
//   `).join('')
// }

// // cumpărare
// productsDiv.addEventListener('click', async (e) => {
//   const btn = e.target.closest('.buy')
//   if (!btn) return
//   btn.disabled = true; btn.textContent = 'Se deschide...'
//   try {
//     let email = null

//     // 1) dacă ești logat(ă), folosește emailul contului
//     const { data: u } = await supabase.auth.getUser()
//     if (u?.user?.email) {
//       email = u.user.email
//     } else {
//       // 2) altfel, ia din câmpul de invitat
//       email = (guestEmail.value || '').trim()
//       if (!email) { alert('Introdu un email pentru livrarea PDF-ului.'); return }
//     }

//     const itemId = btn.getAttribute('data-id')
//     const resp = await fetch(`${API_BASE}/create-checkout-session`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ itemId, userEmail: email })
//     })
//     const js = await resp.json()
//     if (!resp.ok || !js.url) { alert(js.error || 'Eroare la checkout'); return }

//     location.href = js.url
//   } catch (err) {
//     console.error(err)
//     alert('Eroare rețea.')
//   } finally {
//     btn.disabled = false; btn.textContent = 'Cumpără'
//   }
// })
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  'https://gxavdytkcukxnvonasur.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4YXZkeXRrY3VreG52b25hc3VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NzUzOTgsImV4cCI6MjA2OTQ1MTM5OH0.n2vXj6iziz3896EpzhjOotTuveqd7GjIhgAuExCOLW8'
)

const API_BASE = 'https://stripe-backend-q89t.onrender.com'
const money = c => (c / 100).toFixed(2) + ' RON'

document.getElementById('year').textContent = new Date().getFullYear()

// auth status
const authStatus = document.getElementById('authStatus')
const guestBox = document.getElementById('guestBox')
const guestEmail = document.getElementById('guestEmail')

const { data: { user } } = await supabase.auth.getUser()
if (user?.email) {
  authStatus.textContent = `Ești logat(ă) ca: ${user.email}`
  guestBox.hidden = true
} else {
  authStatus.textContent = 'Cumperi ca invitat(ă) sau autentifică-te din meniu.'
  guestBox.hidden = false
}

// produse
const wrap = document.getElementById('products')
const { data: prods, error } = await supabase
  .from('products')
  .select('id, name, amount_cents, description, image_url')
  .eq('active', true)
  .order('id')

if (error) {
  wrap.innerHTML = `<p>Eroare: ${error.message}</p>`
} else if (!prods || prods.length === 0) {
  wrap.innerHTML = '<p>Niciun curs disponibil momentan.</p>'
} else {
  wrap.innerHTML = prods.map(p => `
  <article class="card">
    ${p.image_url ? `<img class="card-img" src="${p.image_url}" alt="${p.name}" loading="lazy">` : ''}
    <h3>${p.name}</h3>
    ${p.description ? `
      <p class="desc" id="desc-${p.id}">${p.description}</p>
      <button class="more" data-target="desc-${p.id}" aria-expanded="false">Mai mult</button>
    ` : ''}
    <div class="price">${money(p.amount_cents)}</div>
    <button class="button buy" data-id="${p.id}">Cumpără</button>
  </article>
`).join('')


// 1) setează raportul real al imaginii ca să se vadă complet (contain)
document.querySelectorAll('#products .card-img').forEach(img => {
  const fit = () => {
    if (img.naturalWidth && img.naturalHeight) {
      img.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`
      img.style.objectFit = 'contain'
    }
  }
  if (img.complete) fit()
  else img.addEventListener('load', fit, { once: true })
})

// 2) arată butonul „Mai mult” doar dacă există trunchiere
requestAnimationFrame(() => {
  document.querySelectorAll('#products .desc').forEach(desc => {
    const moreBtn = desc.nextElementSibling?.classList.contains('more')
      ? desc.nextElementSibling
      : null
    if (!moreBtn) return
    const isClamped = desc.scrollHeight > desc.clientHeight + 1
    if (!isClamped) moreBtn.remove()
  })
})



}

// buy handler
wrap.addEventListener('click', async (e) => {
  const btn = e.target.closest('.buy')
  if (!btn) return
  const itemId = btn.getAttribute('data-id')

  // email: user logat sau invitat
  let email = user?.email ?? (guestEmail.value || '').trim()
  if (!email) { alert('Introdu un email pentru livrarea PDF-ului.'); return }

  try {
    btn.disabled = true; btn.textContent = 'Se deschide...'
    const resp = await fetch(`${API_BASE}/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, userEmail: email })
    })
    const js = await resp.json().catch(() => ({}))
    if (!resp.ok || !js?.url) {
      console.error(js); alert(js?.error || 'Eroare la checkout'); return
    }
    location.href = js.url
  } catch (e2) {
    console.error(e2); alert('Eroare rețea.')
  } finally {
    btn.disabled = false; btn.textContent = 'Cumpără'
  }
})



  // 2) arată butonul „Mai mult” doar dacă există trunchiere
  requestAnimationFrame(() => {
    document.querySelectorAll('#products .desc').forEach(desc => {
      const btn = desc.nextElementSibling?.classList.contains('more') ? desc.nextElementSibling : null
      if (!btn) return
      const isClamped = desc.scrollHeight > desc.clientHeight + 1
      if (!isClamped) btn.remove()
    })
  })


// ——— Event delegation: „Mai mult” + „Cumpără” ———
wrap.addEventListener('click', async (e) => {
  // toggle descriere
  const moreBtn = e.target.closest('.more')
  if (moreBtn) {
    const id = moreBtn.getAttribute('data-target')
    const p  = document.getElementById(id)
    if (p) {
      const expanded = p.classList.toggle('expanded')
      moreBtn.textContent = expanded ? 'Mai puțin' : 'Mai mult'
      moreBtn.setAttribute('aria-expanded', String(expanded))
    }
    return
  }

  // checkout
  const btn = e.target.closest('.buy')
  if (!btn) return

  const itemId = btn.getAttribute('data-id')
  let email = user?.email ?? (guestEmail.value || '').trim()
  if (!email) { alert('Introdu un email pentru livrarea PDF-ului.'); return }

  try {
    btn.disabled = true; btn.textContent = 'Se deschide...'
    const resp = await fetch(`${API_BASE}/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, userEmail: email })
    })
    const js = await resp.json().catch(() => ({}))
    if (!resp.ok || !js?.url) {
      console.error(js); alert(js?.error || 'Eroare la checkout'); return
    }
    location.href = js.url
  } catch (e2) {
    console.error(e2); alert('Eroare rețea.')
  } finally {
    btn.disabled = false; btn.textContent = 'Cumpără'
  }
})