// firebase-config.js
// Initialises the Firebase App once and exports shared `db` (Realtime Database)
// and `auth` instances. Every other module imports from here so there is a
// single source of truth for the Firebase connection.

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getDatabase
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import {
  getAuth
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// Project's config (Firebase Console > Project
// Settings > General > Your apps > SDK setup and configuration).
const firebaseConfig = {
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
