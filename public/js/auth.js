// auth.js
// Authentication helpers shared by Cashier and Admin (email + password) and
// the Customer app (anonymous session). Reads the current user's role from
// /users/<uid>/role to support route-guarding on dashboards.

import { auth, db } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  signInAnonymously,
  onAuthStateChanged,
  signOut as fbSignOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  ref,
  get
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

/**
 * Signs in a staff member (cashier or admin) with email/password.
 * @returns {Promise<import("firebase/auth").UserCredential>}
 */
export function signInStaff(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

/** Starts an anonymous session for a customer (no credentials needed). */
export function signInCustomer() {
  return signInAnonymously(auth);
}

/** Signs the current user out. */
export function signOut() {
  return fbSignOut(auth);
}

/**
 * Reads the role ("cashier" | "admin") for a given uid from /users/<uid>.
 * @param {string} uid
 * @returns {Promise<string|null>}
 */
export async function getUserRole(uid) {
  const snap = await get(ref(db, `users/${uid}`));
  return snap.exists() ? snap.val().role : null;
}

/**
 * Route guard for a staff page. Redirects to `loginPage` if the user is not
 * authenticated, or does not hold one of the allowed roles.
 * @param {string[]} allowedRoles e.g. ["cashier"] or ["admin"]
 * @param {string} loginPage relative path to redirect unauthenticated users
 * @returns {Promise<{uid: string, role: string}>}
 */
export function requireRole(allowedRoles, loginPage = "login.html") {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = loginPage;
        return reject(new Error("Not authenticated"));
      }
      const role = await getUserRole(user.uid);
      if (!role || !allowedRoles.includes(role)) {
        window.location.href = loginPage;
        return reject(new Error("Not authorised"));
      }
      resolve({ uid: user.uid, role });
    });
  });
}
