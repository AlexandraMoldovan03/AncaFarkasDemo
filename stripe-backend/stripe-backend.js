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



/* -------------------- CORS -------------------- */

const corsOptions = {
  origin(origin, cb) {
    // permite localhost, orice *.vercel.app și domeniile tale
    if (!origin) return cb(null, true); // curl/health etc.
    try {
      const u = new URL(origin);
      const host = u.hostname;
      const ok =
        origin === 'http://localhost:5173' ||
        host.endsWith('.vercel.app') ||
        host === 'www.anca-farkas-rusu.com' ||
        host === 'anca-farkas.ro' 
      return cb(null, ok);
    } catch {
      return cb(null, false);
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  // mai simplu: lasă cors să reflecte header-ele cerute de browser
  allowedHeaders: undefined, // (reflectă Access-Control-Request-Headers)
  maxAge: 86400,
  credentials: false, // folosești Bearer, nu cookie-uri
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
// (opțional) pentru cache corect când Origin diferă
app.use((req, res, next) => { res.header('Vary', 'Origin'); next(); });





async function fetchJSON(url, opts = {}, { timeoutMs = 15000, retries = 1 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort('timeout'), timeoutMs);
  try {
    const resp = await fetch(url, { ...opts, signal: ctrl.signal, mode: 'cors', cache: 'no-store' });
    clearTimeout(t);
    return resp;
  } catch (e) {
    clearTimeout(t);
    if (retries > 0) {
      try { await fetch(`${API_BASE}/healthz`, { mode:'cors' }); } catch {}
      return fetchJSON(url, opts, { timeoutMs, retries: retries - 1 });
    }
    throw e;
  }
}


/* ------------- Supabase server client ---------- */
// ATENȚIE: service key DOAR pe backend!
const supa = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

/* ----------------- Resend --------------------- */
const resend = new Resend(process.env.RESEND_API_KEY)

/* ---------- Email templates (Anca Farkas-Rusu) ---------- */
function emailText({ productName='materialul tău', link, ttlHours=24 }) {
  return [
    `Mulțumesc pentru încredere!`,
    ``,
    `Poți descărca ${productName} de aici (link valabil ${ttlHours}h):`,
    link,
    ``,
    `Dacă linkul expiră, îl poți regenera oricând din contul tău, în Dashboard.`,
    ``,
    `Cu drag,`,
    `Anca Farkas-Rusu`,
    (process.env.BRAND_SITE_URL || '')
  ].join('\n');
}

function emailHtml({ productName='materialul tău', intro='Mulțumesc pentru încredere!', link, ttlHours=24 }) {
  const fromName  = process.env.SEND_FROM_NAME  || 'Anca Farkas-Rusu';
  const siteUrl   = process.env.BRAND_SITE_URL  || 'https://www.anca-farkas-rusu.com';
  const logoUrl   = process.env.BRAND_LOGO_URL  || 'https://anca-farkas-test-cty6.vercel.app/logo1.jpg';
  const support   = process.env.BRAND_SUPPORT_EMAIL || 'contact@anca-farkas-rusu.com';

  return `
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(productName)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f7fb;">
    <table width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center" style="padding:28px 16px;">
          <table width="100%" style="max-width:640px;background:#ffffff;border-radius:16px;box-shadow:0 12px 35px rgba(0,0,0,.08);overflow:hidden;">
            <tr>
              <td align="center" style="background:#0b0f0c;padding:18px 20px;">
                ${logoUrl ? `<img src="${logoUrl}" alt="${escapeHtml(fromName)}" width="52" height="52" style="display:block;border-radius:10px;">` : ''}
                <div style="font:600 16px/1.3 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#f1f5f9;margin-top:10px;">
                  ${escapeHtml(fromName)}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 24px 6px 24px;font:400 15px/1.6 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#17202a;">
                <h1 style="margin:0 0 10px 0;font:700 22px/1.3 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0b0f0c;">
                  ${escapeHtml(productName)}
                </h1>
                <p style="margin:0 0 18px 0;">${escapeHtml(intro)}</p>
                <p style="margin:0 0 22px 0;">Apasă pe butonul de mai jos pentru a descărca materialul. Linkul rămâne activ <strong>${ttlHours} ore</strong>.</p>
                <table cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center" bgcolor="#1f7a4f" style="border-radius:10px;">
                      <a href="${link}" target="_blank" rel="noopener"
                         style="display:inline-block;padding:12px 20px;font:600 15px system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#ffffff;text-decoration:none;">
                        Descarcă acum
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:18px 0 0 0;font-size:13px;color:#6b7280;">
                  Dacă butonul nu funcționează, copiază linkul în browser:<br>
                  <a href="${link}" target="_blank" rel="noopener" style="color:#0ea5e9;word-break:break-all;">${link}</a>
                </p>
                <hr style="border:none;border-top:1px solid #e9eef3;margin:24px 0;">
                <p style="margin:0 0 8px 0;">Dacă linkul expiră, îl poți regenera din <a href="${siteUrl}" target="_blank" style="color:#0ea5e9;">Dashboard</a>.</p>
                ${support ? `<p style="margin:0;color:#6b7280;font-size:13px;">Întrebări? Scrie-mi la <a href="mailto:${support}" style="color:#0ea5e9;">${support}</a>.</p>` : ''}
                <p style="margin:18px 0 0 0;">Cu drag,<br><strong>${escapeHtml(fromName)}</strong></p>
              </td>
            </tr>
            <tr>
              <td align="center" style="background:#f3f5f8;padding:14px 20px;color:#6b7280;font:400 12px system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
                © ${new Date().getFullYear()} ${escapeHtml(fromName)} — Toate drepturile rezervate
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`;
}

function escapeHtml(s=''){ 
  return String(s).replace(/[&<>"']/g, m=>({ 
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' 
  }[m])); 
}

// --- TTL helper: citește corect din ENV și limitează între 1 și 7 zile ---
function getTtlFromEnv(defaultSeconds = 86400) {
  const raw = Number(process.env.DOWNLOAD_LINK_TTL_SECONDS);
  // 1 ≤ expiresIn ≤ 604800 (max 7 zile, conform supabase)
  if (Number.isFinite(raw) && raw >= 1) return Math.min(Math.floor(raw), 604800);
  return defaultSeconds;
}

/////////////////////////// debug optional
function logTtl(where, ttl){
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[TTL] ${where}:`, ttl);
  }
}

////////////////////////////////
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
    // const ttl = Number(process.env.DOWNLOAD_LINK_TTL_SECONDS || 86400)
    const ttl = getTtlFromEnv(86400);
    console.log('[TTL] webhook:', ttl); // temporar, ca să vezi în Render Logs


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
let prodRow = null;
let bucket = 'product-files';
let filePath = 'curs-1.pdf';

if (itemId) {
  const { data, error: pErr } = await supa
    .from('products')
    .select('file_path, file_bucket, name')   // adaugă și name
    .eq('id', String(itemId))
    .eq('active', true)
    .maybeSingle();

  if (pErr) console.error('❌ products query error:', pErr);
  prodRow = data || null;
  if (prodRow?.file_path)   filePath = prodRow.file_path;
  if (prodRow?.file_bucket) bucket  = prodRow.file_bucket;
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
      //const ttl = Number(process.env.DOWNLOAD_LINK_TTL_SECONDS || 86400) // default 24h
      // const ttl = Number(process.env.DOWNLOAD_LINK_TTL_SECONDS || 86400)
const ttl = getTtlFromEnv(86400);
console.log('[TTL] resend-download:', ttl); // temporar, ca să vezi în Render Logs

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
          if (email && signed?.signedUrl) {
  //const ttlHours = Math.floor((Number(process.env.DOWNLOAD_LINK_TTL_SECONDS || 86400)) / 3600);
  //const productName = prod?.name || 'Cursul tău';
  const ttlHours = Math.floor(ttl / 3600);
const productName = prod?.name || 'Cursul tău';

  await resend.emails.send({
    from: `${process.env.SEND_FROM_NAME || 'Anca Farkas-Rusu'} <${process.env.SEND_FROM_EMAIL || 'orders@mail.anca-farkas-rusu.com'}>`,
    to: email,
    subject: `Acces la ${productName} — link de descărcare`,
    text: emailText({ productName, link: signed.signedUrl, ttlHours }),
    html: emailHtml({
      productName,
      link: signed.signedUrl,
      ttlHours,
      intro: 'Mulțumesc pentru încredere! Îți doresc o experiență plăcută și inspirație pe tot parcursul învățării.'
    })
  });
}

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
app.get('/healthz', (_req, res) => res.status(200).send('ok'));


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
  process.env.SUCCESS_URL || new URL('/success.html', FRONTEND_URL).href;

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

    //const ttl = Number(process.env.DOWNLOAD_LINK_TTL_SECONDS || 86400) // 24h
    const ttl = getTtlFromEnv(86400);
logTtl?.('resend-download', ttl); // opțional, doar pt debug

    const { data: signed, error: sErr } = await supa
      .storage
      .from(bucket)
      .createSignedUrl(pathToSign, ttl)

    if (sErr) return res.status(500).json({ error: 'Sign error: ' + sErr.message })

   // const ttlHours = Math.floor((Number(process.env.DOWNLOAD_LINK_TTL_SECONDS || 86400)) / 3600);
//const productName = prod?.name || 'materialul tău';
const ttlHours = Math.floor(ttl / 3600);
const productName = prod?.name || 'materialul tău';

await resend.emails.send({
  from: `${process.env.SEND_FROM_NAME || 'Anca Farkas-Rusu'} <${process.env.SEND_FROM_EMAIL || 'orders@mail.anca-farkas-rusu.com'}>`,
  to: user.email,
  subject: `Link de descărcare — ${productName}`,
  text: emailText({ productName, link: signed.signedUrl, ttlHours }),
  html: emailHtml({
    productName,
    link: signed.signedUrl,
    ttlHours,
    intro: 'Regenerez linkul tău de descărcare. Spor la studiu și inspirație!'
  })
});


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









