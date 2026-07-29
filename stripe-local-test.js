// Lokale test — precies het verzoek dat Stripe support vroeg te testen.
// Zet je ECHTE sandbox-testsleutel (sk_test_...) in een environment variable
// voordat je dit script draait, NOOIT hardcoded in dit bestand — dat is
// precies wat GitHub's push protection net blokkeerde.
//
// Windows (cmd), eenmalig per terminalvenster:
//   set STRIPE_SECRET_KEY=sk_test_...
//   node stripe-local-test.js
//
// PowerShell:
//   $env:STRIPE_SECRET_KEY = "sk_test_..."
//   node stripe-local-test.js
//
// De vorige sleutel heeft even hardcoded in dit bestand gestaan (en dus in je
// lokale git-historie) — roteer die in Stripe's dashboard voor de zekerheid,
// ook al is hij nooit succesvol naar GitHub gepusht.

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY is niet gezet. Zie de comment bovenaan dit bestand.');
  process.exit(1);
}

const res = await fetch('https://api.stripe.com/v1/balance', {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  },
});

const raw = await res.text();
console.log('status:', res.status);
console.log('headers:', [...res.headers.entries()]);
console.log('body:', raw);
