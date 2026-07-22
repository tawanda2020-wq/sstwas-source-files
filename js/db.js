// db.js
// Thin wrapper around Firebase Realtime Database reads/writes/listeners.
// Every interface (customer/cashier/admin) talks to Firebase exclusively
// through these functions, keeping the data-access layer in one place.

import { db } from "./firebase-config.js";
import {
  ref,
  get,
  set,
  update,
  push,
  onValue,
  query,
  orderByChild,
  equalTo,
  runTransaction
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

/* ---------------------------- Products ---------------------------- */

/** One-time read of a single product by its Firebase key (the QR value). */
export async function getProduct(productId) {
  const snap = await get(ref(db, `products/${productId}`));
  return snap.exists() ? { id: productId, ...snap.val() } : null;
}

/** One-time read of all products (used by Admin's product table). */
export async function getAllProducts() {
  const snap = await get(ref(db, "products"));
  if (!snap.exists()) return [];
  const val = snap.val();
  return Object.keys(val).map((id) => ({ id, ...val[id] }));
}

/** Live subscription to the full product list (Admin/Customer). */
export function subscribeProducts(callback) {
  return onValue(ref(db, "products"), (snap) => {
    const val = snap.val() || {};
    callback(Object.keys(val).map((id) => ({ id, ...val[id] })));
  });
}

/** Creates a new product. Returns the generated Firebase key. */
export async function addProduct(data) {
  const newRef = push(ref(db, "products"));
  await set(newRef, { ...data, active: data.active ?? true });
  return newRef.key;
}

/** Patches fields on an existing product (partial update). */
export function editProduct(productId, data) {
  return update(ref(db, `products/${productId}`), data);
}

/** Hard-deletes a product. */
export function deleteProduct(productId) {
  return set(ref(db, `products/${productId}`), null);
}

/**
 * Atomically decrements stock for an item, never going below zero.
 * Used after a transaction is marked PAID.
 */
export function decrementStock(productId, qty) {
  return runTransaction(ref(db, `products/${productId}/stock`), (current) => {
    const stock = typeof current === "number" ? current : 0;
    return Math.max(0, stock - qty);
  });
}

/* -------------------------- Transactions --------------------------- */

/**
 * Creates a transaction record.
 * @param {object} data { paymentRef, status, paymentMethod, items, total, createdAt }
 * @returns {Promise<string>} the generated transaction id
 */
export async function createTransaction(data) {
  const newRef = push(ref(db, "transactions"));
  await set(newRef, { id: newRef.key, ...data });
  return newRef.key;
}

/** Updates a transaction's status (PENDING -> PAID, or -> CANCELLED). */
export function updateTransactionStatus(txnId, status, extra = {}) {
  return update(ref(db, `transactions/${txnId}`), {
    status,
    ...extra
  });
}

/** Live subscription to a single transaction (Customer waits on this). */
export function subscribeToTransaction(txnId, callback) {
  return onValue(ref(db, `transactions/${txnId}`), (snap) => {
    callback(snap.exists() ? snap.val() : null);
  });
}

/** Live subscription to all PENDING transactions (Cashier queue). */
export function subscribePendingTransactions(callback) {
  const q = query(ref(db, "transactions"), orderByChild("status"), equalTo("PENDING"));
  return onValue(q, (snap) => {
    const val = snap.val() || {};
    const list = Object.keys(val).map((id) => ({ id, ...val[id] }));
    list.sort((a, b) => a.createdAt - b.createdAt);
    callback(list);
  });
}

/** One-time read of every transaction (Admin reports / Cashier history). */
export async function getAllTransactions() {
  const snap = await get(ref(db, "transactions"));
  if (!snap.exists()) return [];
  const val = snap.val();
  return Object.keys(val).map((id) => ({ id, ...val[id] }));
}

export function subscribeAllTransactions(callback) {
  return onValue(ref(db, "transactions"), (snap) => {
    const val = snap.val() || {};
    const list = Object.keys(val).map((id) => ({ id, ...val[id] }));
    callback(list);
  });
}

/** Finds a transaction by its human-readable payment reference (cashier search). */
export async function findTransactionByRef(paymentRef) {
  const q = query(ref(db, "transactions"), orderByChild("paymentRef"), equalTo(paymentRef));
  const snap = await get(q);
  if (!snap.exists()) return null;
  const val = snap.val();
  const id = Object.keys(val)[0];
  return { id, ...val[id] };
}

/* ----------------------------- Users -------------------------------- */

export async function getAllUsers() {
  const snap = await get(ref(db, "users"));
  if (!snap.exists()) return [];
  const val = snap.val();
  return Object.keys(val).map((uid) => ({ uid, ...val[uid] }));
}

export function setUserRecord(uid, data) {
  return set(ref(db, `users/${uid}`), data);
}

/* ---------------------------- Settings ------------------------------ */

export async function getSettings() {
  const snap = await get(ref(db, "settings"));
  return snap.exists() ? snap.val() : {};
}

export function subscribeSettings(callback) {
  return onValue(ref(db, "settings"), (snap) => callback(snap.val() || {}));
}

export function updateSettings(data) {
  return update(ref(db, "settings"), data);
}

/** Deletes ALL transactions from the database. Admin-only, irreversible. */
export function clearAllTransactions() {
  return set(ref(db, "transactions"), null);
}