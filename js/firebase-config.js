// firebase-config.js
// Initialises the Firebase App once and exports shared `db` (Realtime Database)
// and `auth` instances. Every other module imports from here so there is a
// single source of truth for the Firebase connection.

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getDatabase
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// Project's config (Firebase Console > Project
// Settings > General > Your apps > SDK setup and configuration).

// Exported so admin.js can spin up a secondary app for user creation
// without disturbing the currently signed-in admin session.
export const firebaseConfig = {
  apiKey: "AIzaSyCfySJ2zRf7r3X34BQcxRGP0Eh_lTKMsFI",
  authDomain: "self-service-till-app-2026.firebaseapp.com",
  databaseURL: "https://self-service-till-app-2026-default-rtdb.firebaseio.com",
  projectId: "self-service-till-app-2026",
  storageBucket: "self-service-till-app-2026.firebasestorage.app",
  messagingSenderId: "508605032179",
  appId: "1:508605032179:web:65ec0a32309d6c3ba03986"
};

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);
export const auth = getAuth(app);
// Keep the admin session alive across page refreshes and tab reopens.
// browserLocalPersistence stores the session in localStorage (survives
// tab close and page reload - clears only on explicit signOut()).
setPersistence(auth, browserLocalPersistence).catch(console.error);
