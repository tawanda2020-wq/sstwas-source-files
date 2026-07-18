// cart.js
// Manages the customer's shopping cart in sessionStorage so it survives
// navigation between screens but clears when the browser tab is closed.

const CART_KEY = "sstwas_cart";

function readCart() {
  try {
    return JSON.parse(sessionStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

function writeCart(items) {
  sessionStorage.setItem(CART_KEY, JSON.stringify(items));
}

/**
 * Adds a product to the cart, or increments quantity if it already exists.
 * @param {{id:string,name:string,price:number}} product
 * @param {number} qty
 */
export function addItem(product, qty) {
  const items = readCart();
  const existing = items.find((i) => i.productId === product.id);
  if (existing) {
    existing.qty += qty;
  } else {
    items.push({
      productId: product.id,
      name: product.name,
      unitPrice: product.price,
      qty
    });
  }
  writeCart(items);
  return items;
}

/** Removes a line item entirely by productId. */
export function removeItem(productId) {
  const items = readCart().filter((i) => i.productId !== productId);
  writeCart(items);
  return items;
}

/** Updates the quantity for a line item; removes it if qty <= 0. */
export function updateQty(productId, qty) {
  let items = readCart();
  if (qty <= 0) {
    items = items.filter((i) => i.productId !== productId);
  } else {
    const item = items.find((i) => i.productId === productId);
    if (item) item.qty = qty;
  }
  writeCart(items);
  return items;
}

/** Returns the current cart items array. */
export function getCart() {
  return readCart();
}

/** Empties the cart (called after a successful PAID transaction). */
export function clearCart() {
  sessionStorage.removeItem(CART_KEY);
}

/** Returns the cart total, each line subtotal rounded to 2dp. */
export function getTotal() {
  return readCart().reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
}

/** Returns cart items shaped for a transaction record (adds subtotal). */
export function getCartForTransaction() {
  return readCart().map((i) => ({
    productId: i.productId,
    name: i.name,
    qty: i.qty,
    unitPrice: i.unitPrice,
    subtotal: Math.round(i.qty * i.unitPrice * 100) / 100
  }));
}
