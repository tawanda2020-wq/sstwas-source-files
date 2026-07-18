// cashier.js
// Drives the Cashier Dashboard: pending queue, transaction detail modal,
// confirm/cancel actions, and payment-reference search.

import {
  subscribePendingTransactions,
  updateTransactionStatus,
  decrementStock,
  findTransactionByRef,
  getAllTransactions
} from "./db.js";
import { auth } from "./firebase-config.js";

let pendingCache = [];

/** Renders the live pending-payments table into the given <tbody>. */
export function renderPendingTable(txns, tbodyEl, onRowClick) {
  pendingCache = txns;
  if (txns.length === 0) {
    tbodyEl.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-gray-400">No pending payments right now.</td></tr>`;
    return;
  }
  tbodyEl.innerHTML = txns
    .map((t) => {
      const elapsedMin = Math.floor((Date.now() - t.createdAt) / 60000);
      return `
        <tr class="border-b hover:bg-amber-50 cursor-pointer transition" data-txn-id="${t.id}">
          <td class="py-2 px-3 font-semibold text-[#1A73E8]">${t.paymentRef}</td>
          <td class="py-2 px-3 text-center">${(t.items || []).length}</td>
          <td class="py-2 px-3 text-right font-bold">$${t.total.toFixed(2)}</td>
          <td class="py-2 px-3 text-center">${elapsedMin}m ago</td>
          <td class="py-2 px-3 text-center">
            <button class="confirm-btn bg-[#00C853] text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-90" data-txn-id="${t.id}">
              Confirm Payment
            </button>
          </td>
        </tr>`;
    })
    .join("");

  tbodyEl.querySelectorAll("tr[data-txn-id]").forEach((row) => {
    row.addEventListener("click", (e) => {
      if (e.target.closest(".confirm-btn")) return; // handled separately
      onRowClick(row.dataset.txnId);
    });
  });
}

/** Subscribes to the pending queue and wires it to a render callback. */
export function onLoad(onUpdate) {
  return subscribePendingTransactions((txns) => {
    onUpdate(txns);
  });
}

/** Looks up a single cached pending transaction by id (for the modal). */
export function getCachedTransaction(txnId) {
  return pendingCache.find((t) => t.id === txnId) || null;
}

/**
 * Confirms a PENDING cash transaction: marks PAID, decrements stock for
 * every line item, stamps confirmedAt + cashierId.
 */
export async function confirmPayment(txnId, items) {
  const cashierId = auth.currentUser ? auth.currentUser.uid : "unknown";
  await updateTransactionStatus(txnId, "PAID", {
    confirmedAt: Date.now(),
    cashierId
  });
  await Promise.all(items.map((i) => decrementStock(i.productId, i.qty)));
}

/** Cancels a PENDING transaction (customer abandoned, no stock change). */
export function cancelTransaction(txnId) {
  return updateTransactionStatus(txnId, "CANCELLED", { cancelledAt: Date.now() });
}

/** Finds a pending/any transaction by its human-readable payment reference. */
export function searchByRef(ref) {
  return findTransactionByRef(ref.trim());
}

/** Returns today's PAID transactions for the Sales History table. */
export async function getTodaysSales() {
  const all = await getAllTransactions();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  return all.filter(
    (t) => t.status === "PAID" && (t.confirmedAt || t.createdAt) >= startOfDay.getTime()
  );
}
