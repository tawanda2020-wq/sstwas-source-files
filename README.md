# SSTWAS - Self Service Till Web App System

A mobile-first, serverless self-checkout system: 
-Customer App (QR scan + simulated payment), 
-Cashier Dashboard (pending cash queue), & 
-Admin Dashboard (product/inventory/analytics/users) 
-All sharing one Firebase Realtime Database.

---

## 1. Prerequisites
- A free [Firebase](https://console.firebase.google.com) account
- [Node.js](https://nodejs.org) installed (only needed for the Firebase CLI / local emulator)
- A modern browser with camera access (Chrome recommended for QR scanning)

No build step, no npm install for the app itself - just vanilla HTML/CSS/JS loaded via CDN.

---

## 2. Firebase Project Setup
1. Go to the [Firebase Console](https://console.firebase.google.com) > **Add project** > name it (e.g. `Self-Service-Till-App-2026`).
2. In the project, enable:
   - **Build > Realtime Database** > Create database → start in **locked mode** (rules are provided in `database.rules.json`).
   - **Build > Authentication > Sign-in method** > enable **Email/Password** & **Anonymous**.
   - **Build > Hosting** > click "Get started" (to deploy via CLI later).
3. Go to **Project Settings → General → Your apps → Web (</>)** → register an app → copy the `firebaseConfig` object shown.

### Paste your config

Open `public/js/firebase-config.js` and replace the placeholder values:

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

Also update `.firebaserc` with your real project id:

```json
{ "projects": { "default": "YOUR_PROJECT_ID" } }
```

---

## 3. Create Your First Admin Account

Since the Admin Dashboard is needed to create *more* users, bootstrap the very first admin manually:

1. Firebase Console → **Authentication → Users → Add user** → enter an email + password.
2. Copy the generated **User UID**.
3. Firebase Console → **Realtime Database → Data** → add this node manually:

```
users
  └── <paste-the-uid-here>
        ├── name: "Store Admin"
        ├── email: "admin@example.com"
        └── role: "admin"
```

You can now log in at `/admin/login.html` with that email/password. From there, use **Users** panel to create cashier accounts properly (it writes both the Auth account and the `/users` record for you).

---

## 4. Seed Some Products (optional but recommended)

Easiest path: log into the Admin Dashboard → **Products → + Add Product** → fill in name/category/price/stock/image URL → Save. The app automatically sets the product's `qrCode` field to its own Firebase key — that's exactly what gets encoded into the QR image, so scanning it resolves straight to `/products/<id>`.

Then go to **QR Generator** → pick the product → **Download PNG** → print and stick it on the shelf/sample product for testing.

---

## 5. Apply Database Security Rules

Rules matching section 4.2 of the design spec (customers read-only on products, write-only-create on transactions; cashiers read/update transactions; admins full access) are in `database.rules.json` at the project root.

Deploy them with the Firebase CLI (see step 6) or paste the file's contents directly into **Realtime Database → Rules** in the console and click **Publish**.

---

## 6. Run It Locally

No bundler needed — but opening `index.html` directly via `file://` will break ES module imports and camera permissions. Serve it locally instead:

```bash
# Option A — Firebase CLI (recommended, matches production hosting behaviour)
npm install -g firebase-tools
firebase login
cd sstwas
firebase init        # select Hosting + Realtime Database, point public dir to "public"
firebase emulators:start --only hosting
# → open http://localhost:5000

# Option B — any static server
npx serve public
# → open http://localhost:3000
```

Camera access for QR scanning requires either `localhost` or HTTPS — both are satisfied above.

---

## 7. Deploy to Production

```bash
firebase deploy --only hosting,database
```

Your three apps will be live at:
- `https://YOUR_PROJECT_ID.web.app/` — role selector
- `https://YOUR_PROJECT_ID.web.app/customer/` — customer app
- `https://YOUR_PROJECT_ID.web.app/cashier/login.html`
- `https://YOUR_PROJECT_ID.web.app/admin/login.html`

---

## 8. Testing the Full Flow

1. **Customer**: open `/customer/`, tap **Start Shopping**, scan a product's QR (or use Chrome DevTools' camera override with a test image), add to cart, checkout.
2. **EcoCash/Card**: any valid-format input works (card number must pass the Luhn check — e.g. `4539 1488 0343 6467` is a valid test number). Payment auto-confirms after a 2s simulated delay.
3. **Cash**: generates a `PAY-YYYY-NNNNN` reference. Open the **Cashier Dashboard** in another tab/device, find it in the Pending queue, click **Confirm Payment** — the customer's screen updates instantly and redirects to their receipt.
4. **Admin**: watch the Products/Inventory panels update in real time as stock decrements, and check **Reports** for the live pie/bar charts.

---

## 9. Project Structure

```
sstwas/
├── public/                  ← Firebase Hosting root
│   ├── index.html           ← Role selector
│   ├── customer/             ← Customer-facing app (5 screens)
│   ├── cashier/               ← Cashier login + dashboard
│   ├── admin/                  ← Admin login + dashboard
│   ├── js/                      ← Shared logic modules (see section 8.2 of spec)
│   ├── assets/
│   └── 404.html
├── firebase.json
├── .firebaserc
├── database.rules.json
└── README.md
```

---

## 10. Notes & Limitations (by design — this is a demo prototype)

- All payments are **simulated**. No real payment gateway (Paynow, EcoCash API, card processor) is integrated, per the spec.
- No card/PIN data is ever written to Firebase or stored anywhere — fields are cleared from the DOM immediately on submit.
- Cart lives in `sessionStorage`, so it clears when the browser tab closes.
- This is a prototype: for a real production deployment you'd want stricter Firebase rules (e.g. rate-limiting transaction writes), server-side validation via Cloud Functions, and a real payment gateway integration.
