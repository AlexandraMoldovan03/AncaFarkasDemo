// stripe-backend.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const app = express();

/* ----------------------------- CORS ----------------------------- */
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'https://www.anca-farkas-rusu.com',
      'https://stripe-backend-q89t.onrender.com', // domeniul Render (prod)
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  })
);

/* ----------------- Supabase client (pentru webhook) -------------- */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/* --------- Webhook Stripe (IMPORTANT: raw înainte de json) ------- */
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// acest endpoint e pentru Stripe (POST). Nu-l deschide în browser.
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('❌ Webhook error:', err.message);
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  // tratează plata finalizată
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    // Încearcă să obții emailul din mai multe locuri
    const email =
      session.metadata?.user_email ||
      session.customer_details?.email ||
      session.customer_email ||
      null;

    const toInsert = {
      stripe_session_id: session.id,
      email,
      amount: session.amount_total ?? null,       // în cenți
      status: session.payment_status ?? null,     // 'paid'
      video_id: session.metadata?.item_id ?? null,
      video_title: session.metadata?.item_name ?? null,
    };

    const { error } = await supabase.from('achizitii').insert([toInsert]);
    if (error) {
      console.error('❌ Supabase insert error:', error);
    } else {
      console.log('✅ Achiziție salvată în Supabase!', toInsert);
    }
  }

  return res.sendStatus(200);
});

/* ------------- După webhook, activează parserul JSON ------------- */
app.use(express.json());

/* -------------------------- Health check ------------------------- */
app.get('/health', (_req, res) => res.send('ok'));

/* --------- Creare sesiune de checkout (fără priceId) ------------- */
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { itemId, userEmail } = req.body;

    // catalog minimal (prețuri în cenți)
    const storeItems = new Map([
      [1, { name: 'Learn first course', amount: 1000 }], // 10 RON
      [2, { name: 'Learn second course', amount: 2000 }], // 20 RON
    ]);
    const item = storeItems.get(itemId);
    if (!item) return res.status(400).json({ error: 'Item not found' });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'ron',
            product_data: { name: item.name },
            unit_amount: item.amount,
          },
          quantity: 1,
        },
      ],
      customer_email: userEmail, // pentru chitanța Stripe și factură
      success_url: 'http://localhost:5173/success.html',
      cancel_url: 'http://localhost:5173/anulare.html',
      // info utilă pentru webhook
      metadata: {
        user_email: userEmail,
        item_id: String(itemId),
        item_name: item.name,
      },
    });

    return res.json({ url: session.url });
  } catch (error) {
    console.error('❌ Error creating checkout session:', error);
    return res.status(500).json({ error: 'Unable to create checkout session' });
  }
});

/* --------------------------- Start server ------------------------ */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
