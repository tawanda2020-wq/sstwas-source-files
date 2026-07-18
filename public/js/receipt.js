// receipt.js
// Renders a digital receipt into the #receipt-container DOM node and
// converts it to a downloadable PNG using html2canvas.

import { getSettings } from "./db.js";

function formatMoney(amount, currency = "$") {
  return `${currency}${Number(amount).toFixed(2)}`;
}

function formatDate(ts) {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

/**
 * Renders the receipt HTML into the given container element.
 * @param {object} transaction full transaction record from Firebase
 * @param {HTMLElement} container
 */
export async function renderReceipt(transaction, container) {
  const settings = await getSettings();
  const storeName = settings.storeName || "SSTWAS Store";
  const logoUrl = settings.logoUrl || "../assets/logo.png";
  const currency = settings.currencySymbol || "$";
  const footer = settings.receiptFooter || "Thank you for shopping with us!";

  const rows = (transaction.items || [])
    .map(
      (item) => `
      <tr>
        <td class="py-1">${item.name}</td>
        <td class="py-1 text-center">${item.qty}</td>
        <td class="py-1 text-right">${formatMoney(item.unitPrice, currency)}</td>
        <td class="py-1 text-right">${formatMoney(item.subtotal, currency)}</td>
      </tr>`
    )
    .join("");

  container.innerHTML = `
    <div id="receipt-print" class="bg-white p-6 rounded-2xl shadow-md max-w-sm mx-auto text-[13px] text-[#4A5568]">
      <div class="text-center mb-4">
        <img src="${logoUrl}" alt="${storeName}" class="h-10 mx-auto mb-2" onerror="this.style.display='none'" />
        <h2 class="text-lg font-bold text-[#1A73E8]">${storeName}</h2>
        <p class="text-xs">Digital Receipt</p>
      </div>
      <div class="border-t border-b border-dashed border-gray-300 py-2 mb-2 text-xs">
        <p><span class="font-semibold">Txn Ref:</span> ${transaction.paymentRef}</p>
        <p><span class="font-semibold">Date:</span> ${formatDate(transaction.confirmedAt || transaction.createdAt)}</p>
        <p><span class="font-semibold">Method:</span> ${transaction.paymentMethod}</p>
      </div>
      <table class="w-full text-xs mb-2">
        <thead>
          <tr class="border-b border-gray-200 font-semibold">
            <td class="py-1">Item</td>
            <td class="py-1 text-center">Qty</td>
            <td class="py-1 text-right">Price</td>
            <td class="py-1 text-right">Subtotal</td>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="border-t border-gray-300 pt-2 flex justify-between font-bold text-base text-[#1A73E8]">
        <span>Total</span>
        <span>${formatMoney(transaction.total, currency)}</span>
      </div>
      <p class="text-center text-[11px] text-gray-400 mt-4">${footer}</p>
    </div>
  `;
}

/**
 * Captures the rendered receipt node and triggers a PNG download.
 * Requires html2canvas to be loaded globally via CDN script tag.
 */
export async function downloadReceiptImage(filename = "receipt.png") {
  const node = document.getElementById("receipt-print");
  if (!node) return;
  // eslint-disable-next-line no-undef -- html2canvas is loaded globally via CDN script tag
  const canvas = await html2canvas(node, { scale: 2, backgroundColor: "#ffffff" });
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
