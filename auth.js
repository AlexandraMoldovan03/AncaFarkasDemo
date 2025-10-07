// auth.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  'https://gxavdytkcukxnvonasur.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4YXZkeXRrY3VreG52b25hc3VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NzUzOTgsImV4cCI6MjA2OTQ1MTM5OH0.n2vXj6iziz3896EpzhjOotTuveqd7GjIhgAuExCOLW8'
)

/* ---------- Popup frumos (Bootstrap Modal) ---------- */
function showPopup({ title = 'Info', message = '', okText = 'OK' } = {}) {
  // creează modalul în DOM
  const id = 'appModal-' + Math.random().toString(36).slice(2)
  const html = `
  <div class="modal fade" id="${id}" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">${title}</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Închide"></button>
        </div>
        <div class="modal-body"><p class="mb-0">${message}</p></div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" data-bs-dismiss="modal">${okText}</button>
        </div>
      </div>
    </div>
  </div>`
  const wrap = document.createElement('div')
  wrap.innerHTML = html.trim()
  document.body.appendChild(wrap.firstElementChild)

  // pornește modalul și curăță după închidere
  const el = document.getElementById(id)
  const modal = new bootstrap.Modal(el, { backdrop: 'static' })
  return new Promise(resolve => {
    el.addEventListener('hidden.bs.modal', () => { el.remove(); resolve() }, { once: true })
    modal.show()
  })
}
// expune pentru alte scripturi din pagină (resetare parolă)
window.showPopup = showPopup

/* ---------- Mesaje de eroare prietenoase ---------- */
function prettyAuthError(err) {
  const t = String(err?.message || '').toLowerCase()
  if (t.includes('invalid login credentials')) return 'Email sau parolă incorecte.'
  if (t.includes('email not confirmed'))       return 'Confirma-ți emailul înainte de logare.'
  if (t.includes('user already registered') || t.includes('already exists')) return 'Există deja un cont cu acest email.'
  if (t.includes('password should be at least')) return 'Parola trebuie să aibă cel puțin 6 caractere.'
  if (err?.status === 429 || t.includes('rate')) return 'Prea multe încercări. Reîncearcă peste câteva minute.'
  return err?.message || 'A apărut o eroare. Te rog încearcă din nou.'
}

/* ---------- Export: Register & Login cu popup-uri ---------- */
export async function registerUser() {
  const email = (document.getElementById('email').value || '').trim()
  const password = document.getElementById('password').value || ''

  if (!email || !password) {
    await showPopup({ title: 'Eroare', message: 'Completează email și parolă.' })
    return
  }

  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) {
    await showPopup({ title: 'Eroare la înregistrare', message: prettyAuthError(error) })
    return
  }

  // în funcție de setări, poate cere confirmare pe email
  const msg = data?.session
    ? 'Cont creat și autentificat cu succes!'
    : 'Cont creat! Ți-am trimis un email pentru confirmare. Verifică inbox/spam.'
  await showPopup({ title: 'Succes', message: msg })
}

export async function loginUser() {
  const email = (document.getElementById('email').value || '').trim()
  const password = document.getElementById('password').value || ''

  if (!email || !password) {
    await showPopup({ title: 'Eroare', message: 'Completează email și parolă.' })
    return
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    await showPopup({ title: 'Eroare la autentificare', message: prettyAuthError(error) })
    return
  }

  await showPopup({ title: 'Autentificare reușită', message: 'Te redirecționez către Dashboard.' })
  // dacă vrei altă rută, schimbă aici
  location.href = '/dashboard.html'
}
