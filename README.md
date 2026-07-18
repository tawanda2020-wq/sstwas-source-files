# SSTWAS - Self Service Till Web App System
### Complete Setup, Firebase, GitHub Hosting & QR Code Guide


## 2. Project Folder Overview

Before touching Firebase, understand what file does what:

```
sstwas/
├── index.html                 <- Landing page (role selector)
├── 404.html                   <- Custom not-found page
├── customer/
│   ├── index.html             <- Welcome screen
│   ├── scanner.html           <- QR camera screen
│   ├── cart.html              <- Cart review
│   ├── checkout.html          <- Payment selection + forms
│   ├── receipt.html           <- Digital receipt + download
│   └── css/customer.css
├── cashier/
│   ├── login.html             <- Cashier login
│   ├── dashboard.html         <- Live pending queue + history
│   └── css/cashier.css
├── admin/
│   ├── login.html             <- Admin login
│   ├── dashboard.html         <- Full back-office dashboard
│   └── css/admin.css
├── js/
│   ├── firebase-config.js     
│   ├── auth.js
│   ├── db.js
│   ├── cart.js
│   ├── scanner.js
│   ├── payment.js
│   ├── receipt.js
│   ├── cashier.js
│   └── admin.js
├── assets/
│   ├── logo.png               <- *to replace
│   └── icons/placeholder.png
├── database.rules.json        <- Firebase security rules
├── firebase.json
└── README.md
```


## 3. Step 1 - Create a Firebase Project
1. Open https://console.firebase.google.com in Chrome and sign in with your Google account.
2. Click the large **"Add project"** card.
3. **Project name:** Type something like `Self-Service-Till-App-2026`.
   Firebase auto-generates a Project ID like `self-service-till-app-2026`. **Needed later
4. Click **Continue**.
5. Click **Create project**.
6. Wait, then click **Continue**.

---
## 4. Step 2 - Enable Firebase Authentication
1. In the left sidebar click **Build > Authentication**.
2. Click the blue **"Get started"** button.
3. Click **Email/Password** from the provider list.
4. Toggle **Email/Password** to Enabled (blue). Leave "Email link / passwordless" OFF.
5. Click **Save**.
6. Go back to the provider list. Click **Anonymous**.
7. Toggle it to **Enabled**. Click **Save**.

Authentication is now configured. Email/Password handles Cashier and Admin logins. Anonymous gives customers a session ID so they can write transactions to the database without creating an account.

---
## 5. Step 3 - Create the Realtime Database
1. In the left sidebar click **Build > Realtime Database**.
2. Click **"Create Database"**.
3. **Choose a location** closest to your users:
4. On the security rules screen, select **"Start in locked mode"**. Click **Enable**.
   Will replace these rules in Step 5.
5. Your database URL appears at the top of the page. It looks like:
   ```
   https://self-service-till-app-2026-default-rtdb.firebaseio.com
   ```
   Need it for the config file.

---

## 6. Step 4 - Get Your Firebase Config & Wire It In
### 6a. Get the config object
1. In the Firebase Console, click the **gear icon** next to "Project Overview" (top-left).
2. Click **"Project settings"**.
3. Scroll down to **"Your apps"**.
4. Click the **Web icon `</>`** to register a web app.
5. App nickname: type `SSTWAS Web`. Do NOT tick "Also set up Firebase Hosting".
6. Click **"Register app"**.
7. Firebase shows a config block like this:

   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyCfySJ2zRf7r3X34BQcxRGP0Eh_lTKMsFI",
     authDomain: "self-service-till-app-2026.firebaseapp.com",
     databaseURL: "https://self-service-till-app-2026-default-rtdb.firebaseio.com",
     projectId: "self-service-till-app-2026",
     storageBucket: "self-service-till-app-2026.firebasestorage.app",
     messagingSenderId: "508605032179",
     appId: "1:508605032179:web:65ec0a32309d6c3ba03986"
   };
   ```
8. Copy all 7 lines inside the curly braces. Click **Continue to console**.
### 6b. Paste into the project
1. Open `js/firebase-config.js` in VS Code.
2. Find the placeholder block:

   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyCfySJ2zRf7r3X34BQcxRGP0Eh_lTKMsFI",
     authDomain: "self-service-till-app-2026.firebaseapp.com",
     databaseURL: "https://self-service-till-app-2026-default-rtdb.firebaseio.com",
     projectId: "self-service-till-app-2026",
     storageBucket: "self-service-till-app-2026.firebasestorage.app",
     messagingSenderId: "508605032179",
     appId: "1:508605032179:web:65ec0a32309d6c3ba03986"
   };
   ```

3. Replace those 7 lines & Save the file (Ctrl+S).
   CRITICAL: The `databaseURL` field is the most important line. If it is missing or wrong, every database read and write will silently fail. 

---
## 7. Step 5 - Deploy the Security Rules
1. Open `database.rules.json` in VS Code. Select all (Ctrl+A) and copy (Ctrl+C).
2. Firebase Console > **Build > Realtime Database > Rules tab**.
3. The editor currently shows the locked rules:
   ```json
   { "rules": { ".read": false, ".write": false } }
   ```
4. Click inside the editor, select all, and paste your copied rules.
5. Click **Publish**. Confirm in the popup.

   What these rules enforce:
   - `/products` - anyone (customers with no login) can read. Only admins can write.
   - `/transactions` - any authenticated user can create a new one. Cashiers and admins can update status. Customers can read only their own.
   - `/users` - only admins can read/write all records. Each user can read their own.
   - `/settings` - anyone can read. Only admins can write.

---

## 8. Step 6 - Bootstrap Your First Admin Account
This is needed because the Admin Dashboard is where we create other user accounts, but we need an admin account to access the Admin Dashboard(one-time manual step)

### 6a. Create the Auth user
1. Firebase Console > **Authentication > Users tab**.
2. Click **"Add user"** (top right).
3. Enter an email and a strong password (8+ characters). Click **"Add user"**.
4. The user appears in the table. Copy the **User UID** from the UID column (it looks like `wX3kLmN8pQr...`).
------------------------------------------------------
**email:**    admin@sstwas.com
**password:** @admin2026
**User UID:** lcWIyzonLpWkboFKBibbP0WLjJQ2
------------------------------------------------------

### 6b. Create the database record
This links the Auth account to a role in the database.
1. Firebase Console > **Realtime Database > Data tab**.
2. Hover over the root node. Click the **"+" icon** that appears on the right side.
3. Name: `users` - Value: leave empty - press Enter.
4. Hover over the new `users` node. Click **"+"**.
5. Name: paste your User UID - Value: leave empty - press Enter.
6. Hover over the UID node. Click **"+"** three times to add these fields:

   | Name    | Value                         |
   |---------|-------------------------------|
   | `name ` | `Store Admin`                                    |
   | `email` | admin@sstwas.com(the email used in step 6a) | 
   | `role`  | `admin`                       |

   The finished database structure looks like:
   ```
   Self-Service-Till-App-2026(project name)
   └── users
       └── lcWIyzonLpWkboFKBibbP0WLjJQ2
           ├── email: "admin@sstwas.com"
           ├── name: "Store Admin"
           └── role: "admin"
   ```
7. That email(&password) is now used to log into `/admin/login.html`.

### 6c. Create cashier accounts (after deploying)
Once logged into Admin:
1. Sidebar > **Users** > fill in name, email, temporary password, Role = Cashier > **Create Account**.
This creates the Firebase Auth account AND the database record in one action.

---

## 9. Step 7 - Push to GitHub & Host on GitHub Pages
GitHub Pages serves project HTML/CSS/JS over HTTPS for free. HTTPS is required for the QR camera scanner to work on phones.

### 7a. Restructure the folder for GitHub Pages
GitHub Pages can only serve from the repo root `/` or a `/docs` folder — not from an arbitrary `/public` subfolder.
So to remove all files in the `public/` folder wrapping
After this, project root should look exactly like the structure shown in Section 2 above.

### 7b. Create a GitHub repository
1. Go to https://github.com/new
2. Repository name: (`sstwas-source-files`)
3. Set visibility to **Public** (required for free GitHub Pages).
5. Click **"Create repository"**.

### 7b. Enable GitHub Pages
1. On the GitHub repo page, click the **Settings** tab.
2. In the left sidebar, click **Pages**.

3. Under Source, set:
   - Branch: `main`
   - Folder: `/ (root)`

4. Click **Save**.
5. After about 60 seconds, GitHub shows:
   ```
   Site is live at https://tawanda2020-wq.github.io/sstwas-source-files/
   ```

Project live URLs will be:
- Landing page:  `https://tawanda2020-wq.github.io/sstwas-source-files/sstwas/`
- Customer app:  `https://tawanda2020-wq.github.io/sstwas-source-files/customer/`
- Cashier login: `https://tawanda2020-wq.github.io/sstwas-source-files/cashier/login.html`
- Admin login:   `https://tawanda2020-wq.github.io/sstwas-source-files/admin/login.html`

### 7e. Add GitHub Pages domain to Firebase Auth
Without this step, every login attempt on the live site fails with "auth/unauthorized-domain".
1. Firebase Console > **Authentication > Settings tab**.
2. Scroll to **"Authorised domains"**.
3. Click **"Add domain"**.
4. Type: `https://tawanda2020-wq.github.io`
5. Click **Add**.

GitHub Pages auto-deploys within 30-60 seconds. Hard-refresh the browser (Ctrl+Shift+R) to see the changes.

---
## 10. Step 8 - Add Products & Generate QR Codes
### 8a. Add a product
1. Open `https://tawanda2020-wq.github.io/sstwas-source-files/admin/login.html` and log in.

2. Sidebar -> **Products** -> **"+ Add Product"**.

3. Fill in the form:
   | Field        | Example              | Notes                                 |
   |--------------|----------------------|---------------------------------------|
   | Product name | `Full Cream Milk 1L` | Shown to the customer on scan         |
   | Category     | `Dairy`              | Used for filtering                    |
   | Price        | `1.50`               | Numbers only                          |
   | Stock        | `48`                 | Decrements automatically on each sale |
   | Unit         | `each`               | Or `kg`, `pack`, `bottle`             |
   | Image URL    | `https://...`        | Any public image URL, or leave blank  |

4. Click **Save**.
   The product is now in Firebase under `/products/<auto-generated-key>`. The system sets the product's `qrCode` field equal to its own Firebase key. That key is exactly what gets encoded into the QR image.

### 8b. Generate and download the QR code
1. Sidebar > **QR Generator**.

2. Select the product from the dropdown.

3. The QR code renders automatically on screen.

4. Click **"Download PNG"**.

5. Repeat for every product.

### 8c. Print and attach

- Print each QR PNG at roughly 5cm x 5cm.
- Attach to the physical product or shelf price tag.
- Before sticking permanently, test the printed QR by opening the Customer app on a phone and scanning it.

### 8d. Important rules about QR codes and product keys

- The QR value IS the product's Firebase key (e.g. `-NxAbc123`). When scanned, the app queries `/products/-NxAbc123` in Firebase.
- Never manually change a product's Firebase key after printing its QR — the printed code will break.
- If you delete and re-add a product, a new key is generated and you must reprint the QR.
- If you only edit a product's name, price, or stock, the QR code is unaffected.

---

## 11. Step 9 — Test the Full System End-to-End

Open the live site across two devices or browser tabs. Use Chrome DevTools mobile emulation (F12 → phone icon) for the customer side if you do not have a second device handy.

### Test A — EcoCash payment

1. Customer: open the customer app → Start Shopping → scan a product QR → add to cart → Checkout → EcoCash → enter any 10-digit phone number (e.g. `0771234567`) and any 4-digit PIN → tap Pay.

2. A 2-second spinner appears, then the receipt screen loads.

3. Admin: check Inventory — stock for that product should have decreased. Check Reports — the transaction appears.

### Test B — Bank Card payment

1. Same flow, select Bank Card.

2. Use this Luhn-valid test card number: `4539 1488 0343 6467`
   - Expiry: any future date e.g. `12/28`
   - CVV: any 3 digits e.g. `123`
   - Name: anything

3. Confirms after ~2 seconds.

### Test C — Cash payment (tests real-time sync between customer and cashier)

1. Device 1 (Customer): checkout → select Cash → a Payment Reference like `PAY-2026-72841` appears with a spinning indicator.

2. Device 2 or Tab (Cashier): log in at `cashier/login.html` → the `PAY-2026-72841` row appears in the Pending Queue within 1–2 seconds (no page refresh).

3. Cashier: click **"Confirm Payment"** on the row → Transaction Detail modal opens.

4. Click **"Confirm & Mark as Paid"**.

5. Device 1 (Customer): the screen automatically transitions to the Receipt screen within 1–2 seconds. No refresh needed.

6. Customer taps **"Download Receipt"** to save the PNG image.

---

## 12. Running Locally (Optional)

Opening index.html directly via file:// breaks ES module imports and camera permissions. Use a local server instead.

### Option A — VS Code Live Server (easiest)

1. Install the **Live Server** extension in VS Code (by Ritwick Dey).
2. Right-click `index.html` in the Explorer panel → **"Open with Live Server"**.
3. Opens at `http://127.0.0.1:5500/`. Camera works on localhost.

### Option B — Python (if Python is installed)

```bash
cd path/to/sstwas
python -m http.server 5500
# Open http://localhost:5500 in Chrome
```

### Option C — Node.js

```bash
npx serve .
# Opens http://localhost:3000
```

Camera and QR scanning only work on `localhost` or `https://`. Never use `file://` for testing.

---

## 13. Troubleshooting

**"Firebase: Error (auth/unauthorized-domain)"**
Your GitHub Pages domain is not authorised in Firebase.
Fix: Firebase Console → Authentication → Settings → Authorised domains → Add `YOUR-USERNAME.github.io`

---

**Blank screen with Firebase errors in the browser console**
Your `js/firebase-config.js` still has placeholder values.
Fix: Go back to Step 4 and paste your real Firebase config.

---

**"PERMISSION_DENIED" in the browser console**
The security rules are blocking a read or write.
Most common cause: the `/users/<uid>/role` field is missing or misspelled.
Fix: Firebase Console → Realtime Database → Data → check that `users/<uid>/role` is exactly `"admin"` or `"cashier"` (lowercase, no spaces).

---

**QR scanner camera does not open**
You are not on HTTPS or localhost.
Fix: Test on the live GitHub Pages URL (https://), or use VS Code Live Server locally. Never test via file://.
On iPhone: Settings → Safari → Camera → Allow.
On Android: tap the camera icon in the Chrome address bar → Allow.

---

**Scanned QR shows "Product not recognised"**
The printed QR encodes the wrong value.
Fix: Admin Dashboard → QR Generator → select the product → Download PNG again. Only use QR codes generated by this admin panel.

---

**Stock does not decrease after a payment**
The `decrementStock` function is failing.
Fix: Check the browser console on the checkout or receipt page for errors. Confirm the security rules in Firebase match `database.rules.json` exactly and that you clicked Publish.

---

**Cashier confirmation does not reach the customer screen in real time**
The Firebase `onValue` listener on the customer checkout page is not firing.
Fix: Hard-refresh the customer checkout screen, then start a new cash payment. Also check the browser console for Firebase connection errors.

---

**Git push fails with authentication error**
GitHub no longer accepts your password over HTTPS.
Fix: Create a Personal Access Token at GitHub → Settings → Developer settings → Personal access tokens → Generate new token → tick `repo` → copy and use it as your password when Git prompts.

---

**Customer cart disappears unexpectedly**
The cart is stored in sessionStorage, which clears when the browser tab is closed.
This is by design for privacy. If a customer closes the tab mid-shop, they start fresh.

---

## 14. Quick Reference

### Live URLs after deployment

| Page | URL |
|------|-----|
| Landing / Role selector | `https://YOUR-USERNAME.github.io/sstwas/` |
| Customer App | `https://YOUR-USERNAME.github.io/sstwas/customer/` |
| Cashier Login | `https://YOUR-USERNAME.github.io/sstwas/cashier/login.html` |
| Admin Login | `https://YOUR-USERNAME.github.io/sstwas/admin/login.html` |
| Firebase Console | `https://console.firebase.google.com/project/YOUR-PROJECT-ID` |

### Push an update to the live site

```bash
git add .
git commit -m "What you changed"
git push
```

GitHub Pages deploys automatically. Refresh after 60 seconds.

### Add a new product (ongoing workflow)

1. Admin Dashboard → Products → Add Product → fill form → Save
2. Admin Dashboard → QR Generator → select product → Download PNG
3. Print PNG, attach to product/shelf
4. Test with phone camera before using in production
