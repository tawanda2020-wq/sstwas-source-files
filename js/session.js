// session.js
// Tracks the customer's live shopping session in Firebase so Admin can show
// "shopper sessions on the floor" in real time (separate from completed
// transactions), and raises loss-prevention flags from signals the browser
// can actually observe: items removed shortly after being added ("voids"),
// a burst of voids in a short window, and items added via search instead
// of a camera scan.

import { db } from "./firebase-config.js";
import {
  ref,
  set,
  update,
  push
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

const SESSION_KEY = "sstwas_session_id";
const VOID_WINDOW_MS = 90000; // "3 voids in 90s" style burst detection

let addedAtByProduct = {};
let recentVoidTimestamps = [];

/** Returns (and lazily creates) this tab's shopping session id. */
export function getSessionId() {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function shortLabel(id) {
  return "Guest " + id.slice(-4).toUpperCase();
}

function getStartedAt(id) {
  const key = `sstwas_session_started_${id}`;
  let startedAt = sessionStorage.getItem(key);
  if (!startedAt) {
    startedAt = String(Date.now());
    sessionStorage.setItem(key, startedAt);
  }
  return Number(startedAt);
}

/** Call whenever the cart changes — pushes a snapshot of the live basket. */
export function syncSession(cartItems, total, status = "active") {
  const id = getSessionId();
  const itemCount = cartItems.reduce((s, i) => s + i.qty, 0);
  return update(ref(db, `sessions/${id}`), {
    id,
    label: shortLabel(id),
    items: cartItems.map((i) => ({ productId: i.productId, name: i.name, qty: i.qty })),
    itemCount,
    total: Math.round(total * 100) / 100,
    status,
    startedAt: getStartedAt(id),
    updatedAt: Date.now()
  });
}

/** Moves the session to a new lifecycle status (checkout / paid / flagged). */
export function markSessionStatus(status, extra = {}) {
  return update(ref(db, `sessions/${getSessionId()}`), {
    status,
    updatedAt: Date.now(),
    ...extra
  });
}

function createFlag({ reason, productName, detail, severity }) {
  const sessionId = getSessionId();
  const flagRef = push(ref(db, "flags"));
  return set(flagRef, {
    id: flagRef.key,
    sessionId,
    basketLabel: shortLabel(sessionId),
    productName,
    reason,
    detail,
    severity,
    status: "open",
    createdAt: Date.now()
  });
}

/**
 * Call when an item is added to the cart. Items added via the search grid
 * instead of a camera scan are flagged low-severity for staff awareness —
 * they're still legitimate, just not camera-verified.
 */
export function recordAddition(productId, name, viaScan = true) {
  addedAtByProduct[productId] = Date.now();
  if (!viaScan) {
    return createFlag({
      reason: "manual_entry",
      productName: name,
      detail: "Added via search, not camera-scanned",
      severity: "low"
    });
  }
}

/**
 * Call when an item is removed from the cart (or its qty drops to 0).
 * Flags a quick void (removed soon after being added) and escalates to a
 * high-severity flag — and flags the whole session — on a burst of voids.
 */
export async function recordRemoval(productId, name) {
  const now = Date.now();
  const addedAt = addedAtByProduct[productId];

  recentVoidTimestamps.push(now);
  recentVoidTimestamps = recentVoidTimestamps.filter((t) => now - t < VOID_WINDOW_MS);

  if (recentVoidTimestamps.length >= 3) {
    await createFlag({
      reason: "voided",
      productName: name,
      detail: `${recentVoidTimestamps.length} voids in ${Math.round(VOID_WINDOW_MS / 1000)}s`,
      severity: "high"
    });
    await markSessionStatus("flagged");
  } else if (addedAt && now - addedAt < VOID_WINDOW_MS) {
    await createFlag({
      reason: "voided",
      productName: name,
      detail: "Item removed shortly after scanning",
      severity: "medium"
    });
  }
}
