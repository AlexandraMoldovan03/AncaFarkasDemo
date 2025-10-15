// stripe-backend/stripe-backend.js
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const { Resend } = require('resend')
const { createClient } = require('@supabase/supabase-js')
const rateLimit = require('express-rate-limit')
const crypto = require('crypto')
const app = express()


/* ---- Root & health ---- */
app.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'stripe-backend',
    version: '1.0.0'
  });
});

app.get('/health', (_req, res) => res.send('OK'));


/* -------------------- CORS -------------------- */
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://www.anca-farkas-rusu.com'
  ],
  methods: ['GET', 'POST'],
  credentials: true
}))

/* ------------- Supabase server client ---------- */
// ATENȚIE: service key DOAR pe backend!
const supa = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

/* ----------------- Resend --------------------- */
const resend = new Resend(process.env.RESEND_API_KEY)



/* -------------- Stripe webhook ---------------- */
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET



/* ------ Rate limit pe trimiterea parolei ------ */
const sendTempPwdLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minut
  max: 3,              // max 3 cereri/minut/ip
  standardHeaders: true,
  legacyHeaders: false
})

function genTempPassword() {
  const len = Number(process.env.TEMP_PASSWORD_LENGTH || 10)
  const alphabet = process.env.TEMP_PASSWORD_ALPHABET || 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  let out = ''
  const bytes = crypto.randomBytes(len)
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length]
  return out
}

/* ------ Admin GoTrue REST (căutare user + update parolă) ------ */
async function findUserByEmail(email) {
  const url = `${process.env.SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`
  const r = await fetch(url, {
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
    }
  })
  const body = await r.text().catch(()=>'')
  if (!r.ok) {
    console.error('findUserByEmail FAILED', r.status, body)
    throw new Error('Nu am putut căuta utilizatorul.')
  }
  const data = body ? JSON.parse(body) : null
  const user = Array.isArray(data?.users) ? data.users.find(u => u.email?.toLowerCase() === email.toLowerCase()) : data
  return user || null
}


// ⤵️ folosește clientul "supa" creat cu SERVICE KEY
async function updateUserPassword(userId, newPassword) {
  const { data, error } = await supa.auth.admin.updateUserById(userId, {
    password: newPassword
  })
  if (error) {
    console.error('updateUserById error:', error) // vezi logul în Render
    throw new Error(error.message || 'Nu am putut seta parola temporară.')
  }
  return data
}










// IMPORTANT: raw body DOAR pe ruta webhook
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']
  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret)
  } catch (err) {
    console.error('❌ Webhook error:', err.message)
    return res.status(400).send(`Webhook error: ${err.message}`)
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object

    // email din mai multe surse
    const email =
      session.metadata?.user_email ||
      session.customer_details?.email ||
      session.customer_email || null

    const amount = session.amount_total ?? null
    const status = session.payment_status ?? null
    const sessionId = session.id
    const itemId = session.metadata?.item_id ?? null

    // // Map produs -> fișier PDF din Storage (pentru început)
    // // (Mai târziu: tabel "products" în DB)
    // const itemToFile = new Map([
    //   ['1', 'curs1.pdf'],
    //   ['2', 'curs2.pdf'],
    // ])
    // const filePath = itemToFile.get(String(itemId)) || 'curs-1.pdf'


    // Ia file_path din products
  // ACUM: ia și file_bucket
let bucket = 'product-files'
let filePath = 'curs-1.pdf'

if (itemId) {
  const { data: prod, error: pErr } = await supa
    .from('products')
    .select('file_path, file_bucket')
    .eq('id', String(itemId))
    .eq('active', true)
    .maybeSingle()

  if (pErr) console.error('❌ products query error:', pErr)
  if (prod?.file_path)  filePath = prod.file_path
  if (prod?.file_bucket) bucket  = prod.file_bucket   // ← AICI decidem bucketul corect
}








    // 1) salvăm achiziția (inclusiv file_path)
    const { error: insErr } = await supa
      .from('purchases')
      .insert([{
        stripe_session_id: sessionId,
        user_email: email,
        status: status,
        amount: amount,
        item_id: String(itemId),
        file_path: filePath
      }])

    if (insErr) {
      console.error('❌ Supabase insert error:', insErr)
    } else {
      console.log('✅ Purchase salvată:', { sessionId, email, itemId, amount, status, filePath })
    }

    // 2) generăm un link semnat (expirabil) pentru PDF — pt. email
    try {
      const ttl = Number(process.env.DOWNLOAD_LINK_TTL_SECONDS || 86400) // default 24h
      // ACUM:
      const { data: signed, error: signErr } = await supa
        .storage
        .from(bucket)
        .createSignedUrl(filePath, ttl)
            

      if (signErr) {
        console.error('❌ Create signed URL error:', signErr)
      } else if (email) {
        // 3) trimitem email cu linkul (pentru test: onboarding@resend.dev)
        try {
          await resend.emails.send({
            from: 'Prof&Coach ANCA <orders@mail.anca-farkas-rusu.com>',

            to: email,
            subject: 'Accesul tău la curs (PDF)',
            html: `
              <p>Mulțumim pentru achiziție!</p>
              <p>Poți descărca PDF-ul de aici (link valabil ${Math.floor(ttl/3600)}h):</p>
              <p><a href="${signed.signedUrl}" target="_blank" rel="noreferrer">Descarcă PDF</a></p>
              <p>Dacă expiră, îl poți descărca și din cont, în Dashboard.</p>
            `
          })
          console.log('📧 Email trimis către', email)
        } catch (mailErr) {
          console.error('❌ Email error:', mailErr)
        }
      }
    } catch (e) {
      console.error('❌ Signed URL/email catch:', e)
    }
  }

  res.sendStatus(200)
})

// DUPĂ webhook putem folosi JSON global
app.use(express.json())

/* --------- Parolă temporară via email --------- */
/* POST /api/auth/send-temp-password  { email }   */
app.post('/api/auth/send-temp-password', sendTempPwdLimiter, async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: 'Email invalid.' });
    }

    // find user by email (GoTrue REST)
    const findUrl = `${process.env.SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`;
    const rFind = await fetch(findUrl, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      },
    });
    const findText = await rFind.text();
    if (!rFind.ok) {
      console.error('findUser error:', rFind.status, findText);
      return res.status(500).json({ message: `Nu am putut căuta utilizatorul (${rFind.status}).` });
    }
    const parsed = (() => { try { return JSON.parse(findText) } catch { return {} } })();
    const user = Array.isArray(parsed?.users)
      ? parsed.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
      : (Array.isArray(parsed) ? parsed.find(u => u.email?.toLowerCase() === email.toLowerCase()) : parsed);
    if (!user?.id) return res.status(404).json({ message: 'Nu există cont cu acest email.' });

    // set temp password via Admin SDK
    const tempPwd = genTempPassword();
    const upd = await supa.auth.admin.updateUserById(user.id, { password: tempPwd });
    if (upd.error) {
      console.error('updateUserById error:', upd.error);
      return res.status(500).json({ message: upd.error.message || 'Nu am putut seta parola temporară.' });
    }

    // send email
    const fromName  = process.env.SEND_FROM_NAME  || 'Education with Style';
    const fromEmail = process.env.SEND_FROM_EMAIL || 'onboarding@resend.dev';
    let mailError = null;
    try {
      await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: email,
        subject: 'Parola ta temporară',
        html: `
          <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif">
            <h2>Salut!</h2>
            <p>Parola ta temporară este:</p>
            <p style="font-size:20px;font-weight:700;letter-spacing:.5px;background:#f7f7f9;padding:12px 16px;border-radius:10px;display:inline-block;">
              ${tempPwd}
            </p>
            <p>Autentifică-te cu emailul și această parolă, apoi o poți schimba din Dashboard.</p>
          </div>
        `,
      });
    } catch (e) {
      console.error('Resend send error:', e);
      mailError = e?.message || 'Nu am putut trimite emailul.';
    }

    return res.json({ ok: true, mailError });
  } catch (e) {
    console.error('send-temp-password fatal:', e);
    return res.status(500).json({ message: e?.message || 'Eroare internă.' });
  }
});





/* ----------------- Healthcheck ---------------- */
app.get('/health', (_req, res) => res.send('ok'))

/* ------ Create Checkout Session (din DB `products`) -------- */
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { itemId, userEmail } = req.body
    if (!itemId)   return res.status(400).json({ error: 'Missing itemId' })
    if (!userEmail) return res.status(400).json({ error: 'Missing userEmail' })

    // Citește produsul din DB
    const { data: prod, error: pErr } = await supa
      .from('products')
      .select('name, amount_cents, stripe_price_id, active')
      .eq('id', String(itemId))
      .eq('active', true)
      .maybeSingle()

    if (pErr) {
      console.error('❌ products query error:', pErr)
      return res.status(500).json({ error: 'DB error' })
    }
    if (!prod) return res.status(404).json({ error: 'Product not found' })

    // === URL-urile de redirect Stripe (JS corect) ====================
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const successURL =
  process.env.SUCCESS_URL || new URL('/succes.html', FRONTEND_URL).href;

const cancelURL  =
  process.env.CANCEL_URL  || new URL('/anulare.html', FRONTEND_URL).href;



    // Linie Stripe: preferă price din Stripe dacă există; altfel price_data din DB
    const lineItems = prod.stripe_price_id
      ? [{ price: prod.stripe_price_id, quantity: 1 }]
      : [{
          price_data: {
            currency: 'ron',
            product_data: { name: prod.name },
            unit_amount: prod.amount_cents
          },
          quantity: 1
        }]

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      customer_email: userEmail,
      success_url: successURL,
      cancel_url: cancelURL,
      metadata: { user_email: userEmail, item_id: String(itemId) }
    })

    return res.json({ url: session.url })
  } catch (error) {
    console.error('❌ Error creating checkout session:', error)
    return res.status(500).json({ error: 'Unable to create checkout session' })
  }
})

/* ------------- Endpoint DOWNLOAD (Bearer) ------------- */
/* Frontend:
   const { data: { session } } = await supabase.auth.getSession()
   fetch(`${API_BASE}/download?itemId=1`, {
     headers: { Authorization: `Bearer ${session?.access_token}` }
   })
*/
app.get('/download', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json({ error: 'No token' })

    // validează userul
    const { data: { user }, error: uErr } = await supa.auth.getUser(token)
    if (uErr || !user) return res.status(401).json({ error: 'Invalid user' })

    const { itemId } = req.query
    if (!itemId) return res.status(400).json({ error: 'Missing itemId' })

    // ultima achiziție a acestui item
    const { data: purch, error: qErr } = await supa
      .from('purchases')
      .select('file_path')
      .eq('user_email', user.email)
      .eq('item_id', String(itemId))
      .order('created_at', { ascending: false })
      .limit(1)

    if (qErr) return res.status(500).json({ error: 'DB error' })
    if (!purch?.length) return res.status(403).json({ error: 'Not purchased' })

    const filePath = purch[0].file_path

    // află bucketul corect din products
    const { data: prod, error: prodErr } = await supa
      .from('products')
      .select('file_bucket, file_path')
      .eq('id', String(itemId))
      .maybeSingle()

    const bucket = prod?.file_bucket || 'product-files'
    const pathToSign = prod?.file_path || filePath
    const ttl = 60 * 10 // 10 minute pentru dashboard

    const { data: signed, error: sErr } = await supa
      .storage
      .from(bucket)
      .createSignedUrl(pathToSign, ttl)

    if (sErr) return res.status(500).json({ error: 'Sign error: ' + sErr.message })
    return res.json({ url: signed.signedUrl })
  } catch (e) {
    console.error('❌ /download error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})



app.post('/resend-download', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json({ error: 'No token' })

    const { data: { user }, error: uErr } = await supa.auth.getUser(token)
    if (uErr || !user) return res.status(401).json({ error: 'Invalid user' })

    const { itemId } = req.body || {}
    if (!itemId) return res.status(400).json({ error: 'Missing itemId' })

    // ultima achiziție pt. item
    const { data: purch, error: qErr } = await supa
      .from('purchases')
      .select('file_path')
      .eq('user_email', user.email)
      .eq('item_id', String(itemId))
      .order('created_at', { ascending: false })
      .limit(1)

    if (qErr) return res.status(500).json({ error: 'DB error' })
    if (!purch?.length) return res.status(403).json({ error: 'Not purchased' })

    const filePath = purch[0].file_path

    // ia bucketul din products
    const { data: prod, error: prodErr } = await supa
      .from('products')
      .select('file_bucket, file_path, name')
      .eq('id', String(itemId))
      .maybeSingle()

    const bucket = prod?.file_bucket || 'product-files'
    const pathToSign = prod?.file_path || filePath

    const ttl = Number(process.env.DOWNLOAD_LINK_TTL_SECONDS || 86400) // 24h
    const { data: signed, error: sErr } = await supa
      .storage
      .from(bucket)
      .createSignedUrl(pathToSign, ttl)

    if (sErr) return res.status(500).json({ error: 'Sign error: ' + sErr.message })

    await resend.emails.send({
      from: 'Acme <onboarding@resend.dev>',
      to: user.email,
      subject: `Link de descărcare — ${prod?.name || 'material'}`,
      html: `
        <p>Iată linkul tău de descărcare (valabil ${Math.floor(ttl/3600)}h):</p>
        <p><a href="${signed.signedUrl}" target="_blank" rel="noreferrer">Descarcă</a></p>
      `
    })

    return res.json({ ok: true })
  } catch (e) {
    console.error('❌ /resend-download error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})


/* ---- 404 pentru rute inexistente (non-API) ---- */
app.use((req, res, next) => {
  if (req.method === 'GET') {
    return res.status(404).json({ error: 'Not found' });
  }
  next();
});

/* ---- handler global de erori ---- */
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});




/* ----------------- Start server ---------------- */
const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`))









