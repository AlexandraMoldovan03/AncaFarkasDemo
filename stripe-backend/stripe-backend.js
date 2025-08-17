// require('dotenv').config();

// const express = require('express');
// const app = express();

// const cors = require('cors');
// app.use(cors({
//   origin: 'http://localhost:5173', // adaugă și domeniul Vercel când faci deploy
//   methods: ['GET', 'POST'],
//   credentials: true
// }));


// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// const { createClient } = require('@supabase/supabase-js');

// // 🧠 Supabase client config
// const supabase = createClient(
//   process.env.SUPABASE_URL,
//   process.env.SUPABASE_SERVICE_KEY
// );

// const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// // ✅ Webhook route
// app.post('/webhook', express.raw({ type: 'application/json' }), async (request, response) => {
//   const sig = request.headers['stripe-signature'];
//   let event;

//   try {
//     event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
//   } catch (err) {
//     console.error(`❌ Webhook error: ${err.message}`);
//     return response.status(400).send(`Webhook error: ${err.message}`);
//   }

//   if (event.type === 'checkout.session.completed') {
//     const session = event.data.object;

//     const email =
//       session.metadata?.user_email ||
//       session.customer_details?.email ||
//       session.customer_email || // fallback suplimentar
//       null;

//     const amount = session.amount_total ?? null;
//     const status = session.payment_status ?? null;
//     const sessionId = session.id;

//     // opțional: legăm achiziția de curs
//     const videoId = session.metadata?.video_id ?? null;
//     const videoTitle = session.metadata?.video_title ?? null;

//     const { error } = await supabase.from('achizitii').insert([
//       {
//         stripe_session_id: sessionId,
//         email,
//         amount,
//         status,
//         video_id: videoId,       // dacă ai coloane în tabel
//         video_title: videoTitle  // dacă ai coloane în tabel
//       }
//     ]);

//     if (error) {
//       console.error('❌ Supabase insert error:', error);
//     } else {
//       console.log('✅ Achiziție salvată în Supabase!');
//     }
//   }

//   response.status(200).end();
// });


// // ❗ Express JSON middleware după webhook
// app.use(express.json());

// const storeItems = new Map([
//   [1, { priceInCents: 1000, name: 'Learn first course' }],
//   [2, { priceInCents: 2000, name: 'Learn second course' }],
// ]);

// app.post('/create-checkout-session', async (req, res) => {
//   const { itemId, userEmail } = req.body;

//   const item = storeItems.get(itemId);
//   if (!item) {
//     return res.status(400).send({ error: "Item not found" });
//   }

//   try {
//     const session = await stripe.checkout.sessions.create({
//       payment_method_types: ['card'],
//       mode: 'payment',
//       customer_email: userEmail, // 👈 util & vizibil în Stripe
//       line_items: [
//         {
//           price_data: {
//             currency: 'ron',
//             product_data: { name: item.name },
//             unit_amount: item.priceInCents,
//           },
//           quantity: 1,
//         },
//       ],
//       metadata: {
//         user_email: userEmail,       // 👈 pentru webhook
//         video_id: String(itemId),    // 👈 păstrează id-ul cursului
//         video_title: item.name       // 👈 numele cursului
//       },
//       success_url: 'http://localhost:5173/succes.html',
//       cancel_url: 'http://localhost:5173/anulare.html',
//     });

//     res.json({ url: session.url });
//   } catch (error) {
//     console.error('Stripe session error:', error);
//     res.status(500).send('Internal Server Error');
//   }
// });

 

// app.listen(3000, () => console.log("🚀 Server running on port 3000"));



require('dotenv').config()
const express = require('express')
const cors = require('cors')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

const app = express()

// CORS – aici pui domeniile tale permise
// app.use(cors({
//   origin: ['http://localhost:5173', 'https://www.anca-farkas-rusu.com'],
//   methods: ['GET', 'POST'],
//   credentials: true
// }))

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://www.anca-farkas-rusu.com',
    'https://stripe-backend-q89t.onrender.com' // <- adăugat
  ],
  methods: ['GET','POST'],
  credentials: true
}));

// ✅ Webhook (important: înainte de express.json)
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']
  let event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret)
  } catch (err) {
    console.error('❌ Webhook error:', err.message)
    return res.status(400).send(`Webhook error: ${err.message}`)
  }

  // Procesăm tipul de eveniment
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    console.log('✅ Payment succeeded for session:', session.id)

    // Aici poți salva în baza de date (ex: Supabase)
    // TODO: adaugă cod pentru inserare în DB
  }

  res.sendStatus(200)
})

// După webhook folosim express.json() pentru restul rutelor
app.use(express.json())

// ✅ Ruta health check (test rapid dacă serverul merge)
app.get('/health', (_req, res) => res.send('ok'))

// ✅ Creare sesiune de checkout – variantă cu price_data (nu-ți trebuie priceId)
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { itemId, userEmail } = req.body;

    // Catalog simplu (cenți)
    const storeItems = new Map([
      [1, { name: 'Learn first course', amount: 1000 }], // 10 RON
      [2, { name: 'Learn second course', amount: 2000 }], // 20 RON
    ]);

    const item = storeItems.get(itemId);
    if (!item) {
      return res.status(400).json({ error: 'Item not found' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'ron',
            product_data: { name: item.name },
            unit_amount: item.amount, // cenți
          },
          quantity: 1,
        },
      ],
      // trimitem emailul din frontend (util pentru factură Stripe)
      customer_email: userEmail,
      // pentru test local – după plată te întoarce în Vite
      success_url: 'http://localhost:5173/success.html',
      cancel_url: 'http://localhost:5173/anulare.html',
      // dacă vrei să primești emailul și în webhook:
      metadata: { user_email: userEmail, item_id: String(itemId) },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('❌ Error creating checkout session:', error);
    res.status(500).json({ error: 'Unable to create checkout session' });
  }
});


// ✅ Pornire server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`))
