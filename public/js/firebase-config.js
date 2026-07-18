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

// TODO: Replace with your own project's config (Firebase Console > Project
// Settings > General > Your apps > SDK setup and configuration).
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);
export const auth = getAuth(app);
