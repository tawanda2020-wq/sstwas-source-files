# SSTWAS - Self Service Till Web App System
### Complete Setup, Firebase, GitHub Hosting & QR Code Guide


## 2. Project Folder Overview

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
│   ├── session.js             <- Live shopper session tracking + loss-prevention flags
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

