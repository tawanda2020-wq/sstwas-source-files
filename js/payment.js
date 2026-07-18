// payment.js
// Simulated payment flows only - no real payment gateway is integrated.
// Implements the exact rules from the design notes: 2s artificial delay,
// Luhn check for cards, no sensitive data ever persisted.

import { createTransaction, decrementStock } from "./db.js";
import { getCartForTransaction, getTotal, clearCart } from "./cart.js";

/** Generates a human-readable payment reference: PAY-YYYY-NNNNN */
export function generatePaymentRef() {
  const year = new Date().getFullYear();
  const random = Math.floor(10000 + Math.random() * 90000); // 5 digits
  return `PAY-${year}-${random}`;
}

/** Luhn algorithm check for card-number realism (client-side only). */
export function isValidCardNumber(cardNumber) {
  const digits = cardNumber.replace(/\s+/g, "");
  if (!/^\d{16}$/.test(digits)) return false;
  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

function simulatedDelay(ms = 2000) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Submits an "online" payment (EcoCash or Bank Card). Writes a PAID
 * transaction immediately after the simulated delay; no credentials are
 * ever sent to Firebase.
 * @param {"ECOCASH"|"CARD"} method
 * @returns {Promise<{txnId: string, paymentRef: string}>}
 */
export async function submitOnlinePayment(method) {
  await simulatedDelay();

  const items = getCartForTransaction();
  const total = Math.round(getTotal() * 100) / 100;
  const paymentRef = generatePaymentRef();
  const now = Date.now();

  const txnId = await createTransaction({
    paymentRef,
    status: "PAID",
    paymentMethod: method,
    items,
    total,
    createdAt: now,
    confirmedAt: now
  });

  await Promise.all(items.map((i) => decrementStock(i.productId, i.qty)));
  clearCart();

  return { txnId, paymentRef };
}

/**
 * Submits a cash payment: writes a PENDING transaction with a payment
 * reference the customer shows the cashier. Stock is only decremented once
 * the cashier confirms (see cashier.js / confirmPayment).
 * @returns {Promise<{txnId: string, paymentRef: string}>}
 */
export async function submitCashPayment() {
  const items = getCartForTransaction();
  const total = Math.round(getTotal() * 100) / 100;
  const paymentRef = generatePaymentRef();

  const txnId = await createTransaction({
    paymentRef,
    status: "PENDING",
    paymentMethod: "CASH",
    items,
    total,
    createdAt: Date.now()
  });

  // Cart is intentionally NOT cleared yet - only once payment is confirmed,
  // so the customer's pending-payment screen still has the cart context.
  return { txnId, paymentRef };
}
