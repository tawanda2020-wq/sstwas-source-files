// admin.js
// Drives the Admin Dashboard: product CRUD, QR code generation, inventory
// control, transaction analytics (Chart.js), and user management.

import {
  subscribeProducts,
  addProduct as dbAddProduct,
  editProduct as dbEditProduct,
  deleteProduct as dbDeleteProduct,
  getAllTransactions,
  getAllUsers,
  setUserRecord,
  subscribeSessions,
  subscribeFlags,
  updateFlagStatus
} from "./db.js";
import {
  createUserWithEmailAndPassword,
  getAuth
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { auth, firebaseConfig } from "./firebase-config.js";

/* --------------------------- Products -------------------------------- */

export function loadProducts(onUpdate) {
  return subscribeProducts(onUpdate);
}

export function addProduct(data) {
  return dbAddProduct(data);
}

export function editProduct(id, data) {
  return dbEditProduct(id, data);
}

export function deleteProduct(id) {
  return dbDeleteProduct(id);
}

export function toggleActive(id, currentActive) {
  return dbEditProduct(id, { active: !currentActive });
}

export function renderProductTable(products, tbodyEl, { onEdit, onDelete, onToggle, onGenerateQR }) {
  if (products.length === 0) {
    tbodyEl.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-gray-400">No products yet - add your first one.</td></tr>`;
    return;
  }
  tbodyEl.innerHTML = products
    .map((p) => {
      const stockClass = p.stock > 10 ? "text-[#16A34A]" : p.stock > 0 ? "text-[#D97706]" : "text-[#DC2626]";
      return `
        <tr class="border-b hover:bg-gray-50">
          <td class="py-2 px-3">${p.name}</td>
          <td class="py-2 px-3">${p.category || "-"}</td>
          <td class="py-2 px-3 text-right">$${Number(p.price).toFixed(2)}</td>
          <td class="py-2 px-3 text-right font-semibold ${stockClass}">${p.stock}</td>
          <td class="py-2 px-3 text-center">
            <span class="px-2 py-0.5 rounded-full text-xs font-semibold ${p.active ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-gray-200 text-gray-500"}">
              ${p.active ? "Active" : "Inactive"}
            </span>
          </td>
          <td class="py-2 px-3 text-center space-x-2 whitespace-nowrap">
            <button data-action="qr" data-id="${p.id}" class="text-[#155EEF] text-xs font-semibold">QR</button>
            <button data-action="edit" data-id="${p.id}" class="text-[#155EEF] text-xs font-semibold">Edit</button>
            <button data-action="toggle" data-id="${p.id}" data-active="${p.active}" class="text-[#D97706] text-xs font-semibold">${p.active ? "Disable" : "Enable"}</button>
            <button data-action="delete" data-id="${p.id}" class="text-[#DC2626] text-xs font-semibold">Delete</button>
          </td>
        </tr>`;
    })
    .join("");

  tbodyEl.querySelectorAll("button[data-action]").forEach((btn) => {
    const id = btn.dataset.id;
    btn.addEventListener("click", () => {
      switch (btn.dataset.action) {
        case "qr":
          onGenerateQR(id);
          break;
        case "edit":
          onEdit(id);
          break;
        case "delete":
          onDelete(id);
          break;
        case "toggle":
          onToggle(id, btn.dataset.active === "true");
          break;
      }
    });
  });
}

/* ------------------------- QR Code Generation -------------------------- */

/**
 * Renders a QR code for a product id into the given container using the
 * globally-loaded QRCode.js library. The QR value IS the product's Firebase
 * key, so scanning it resolves directly to /products/<productId>.
 */
export function generateQR(productId, containerEl) {
  containerEl.innerHTML = "";
  // eslint-disable-next-line no-undef -- QRCode is loaded globally via CDN script tag
  new QRCode(containerEl, {
    text: productId,
    width: 200,
    height: 200,
    colorDark: "#0A1F42",
    colorLight: "#FFFFFF"
  });
}

/** Downloads the canvas/img rendered by generateQR() as a PNG file. */
export function downloadQR(containerEl, filename = "product-qr.png") {
  const img = containerEl.querySelector("img") || containerEl.querySelector("canvas");
  const link = document.createElement("a");
  link.download = filename;
  link.href = img.tagName === "CANVAS" ? img.toDataURL("image/png") : img.src;
  link.click();
}

/* ----------------------------- Analytics -------------------------------- */

/** Loads all transactions and pre-aggregates figures used by the charts. */
export async function loadAnalytics() {
  const txns = await getAllTransactions();
  const paid = txns.filter((t) => t.status === "PAID");

  const byMethod = paid.reduce((acc, t) => {
    acc[t.paymentMethod] = (acc[t.paymentMethod] || 0) + t.total;
    return acc;
  }, {});

  const byDay = paid.reduce((acc, t) => {
    const day = new Date(t.confirmedAt || t.createdAt).toLocaleDateString();
    acc[day] = (acc[day] || 0) + t.total;
    return acc;
  }, {});

  const productCounts = {};
  paid.forEach((t) =>
    (t.items || []).forEach((i) => {
      productCounts[i.name] = (productCounts[i.name] || 0) + i.qty;
    })
  );
  const topProducts = Object.entries(productCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return { txns, paid, byMethod, byDay, topProducts };
}

/** Renders payment-method pie chart + revenue-over-time bar chart. */
export function renderCharts(data, pieCanvasEl, barCanvasEl) {
  // eslint-disable-next-line no-undef -- Chart is loaded globally via CDN script tag
  new Chart(pieCanvasEl, {
    type: "pie",
    data: {
      labels: Object.keys(data.byMethod),
      datasets: [
        {
          data: Object.values(data.byMethod),
          backgroundColor: ["#155EEF", "#16A34A", "#D97706"]
        }
      ]
    }
  });

  // eslint-disable-next-line no-undef -- Chart is loaded globally via CDN script tag
  new Chart(barCanvasEl, {
    type: "bar",
    data: {
      labels: Object.keys(data.byDay),
      datasets: [
        {
          label: "Revenue",
          data: Object.values(data.byDay),
          backgroundColor: "#155EEF"
        }
      ]
    },
    options: { scales: { y: { beginAtZero: true } } }
  });
}

/** Exports an array of transaction objects to a downloadable CSV file. */
export function exportTransactionsToCSV(txns, filename = "transactions.csv") {
  const header = ["Payment Ref", "Status", "Method", "Total", "Date"];
  const rows = txns.map((t) => [
    t.paymentRef,
    t.status,
    t.paymentMethod,
    t.total,
    new Date(t.createdAt).toISOString()
  ]);
  const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

/* ------------------------- Shopper Sessions -------------------------- */

export function loadSessions(onUpdate) {
  return subscribeSessions(onUpdate);
}

/** Basket-level stats for the Shopper Sessions stat strip. */
export function computeSessionStats(sessions) {
  const active = sessions.filter((s) => s.status === "active").length;
  const flagged = sessions.filter((s) => s.status === "flagged").length;
  const checkout = sessions.filter((s) => s.status === "checkout").length;
  const live = sessions.filter((s) => s.status !== "paid");
  const avgBasket = live.length
    ? live.reduce((sum, s) => sum + (s.total || 0), 0) / live.length
    : 0;
  return { active, flagged, checkout, avgBasket, liveCount: live.length };
}

const SESSION_STATUS_LABEL = {
  active: "active",
  checkout: "checkout",
  flagged: "flagged",
  paid: "paid"
};

export function renderSessionsTable(sessions, tbodyEl, filter = "all") {
  const filtered = filter === "all" ? sessions : sessions.filter((s) => s.status === filter);

  if (filtered.length === 0) {
    tbodyEl.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-gray-400">No shopper sessions ${filter === "all" ? "yet" : "in this view"}.</td></tr>`;
    return;
  }

  tbodyEl.innerHTML = filtered
    .map((s) => {
      const summary = (s.items || []).map((i) => `${i.name} x${i.qty}`).join(" · ") || "Empty basket";
      const started = s.startedAt ? new Date(s.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-";
      const status = SESSION_STATUS_LABEL[s.status] || s.status || "active";
      const rowClass = s.status === "flagged" ? "flagged-row" : "";
      const statusIcon = s.status === "flagged" ? "ph-warning" : s.status === "paid" ? "ph-check-circle" : "ph-circle";
      return `
        <tr class="border-b ${rowClass}" data-session-id="${s.id}">
          <td class="py-2.5 px-3 font-semibold text-[#0A1F42]">#${s.id.slice(-4).toUpperCase()}</td>
          <td class="py-2.5 px-3">${s.label || "Guest"}</td>
          <td class="py-2.5 px-3 text-gray-500 max-w-xs truncate" title="${summary}">${s.itemCount || 0} · ${summary}</td>
          <td class="py-2.5 px-3 text-right font-semibold">$${(s.total || 0).toFixed(2)}</td>
          <td class="py-2.5 px-3 text-center">${started}</td>
          <td class="py-2.5 px-3 text-center status-${s.status || "active"} font-semibold">
            <i class="ph-bold ${statusIcon} icon-xs align-[-1px] mr-1"></i>${status}
          </td>
        </tr>`;
    })
    .join("");
}

export function exportSessionsToCSV(sessions, filename = "shopper-sessions.csv") {
  const header = ["Basket", "Shopper", "Items", "Total", "Status", "Started"];
  const rows = sessions.map((s) => [
    s.id,
    s.label || "",
    (s.items || []).map((i) => `${i.name} x${i.qty}`).join(" | "),
    (s.total || 0).toFixed(2),
    s.status,
    s.startedAt ? new Date(s.startedAt).toISOString() : ""
  ]);
  const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

/* --------------------------- Flagged Scans ---------------------------- */

export function loadFlags(onUpdate) {
  return subscribeFlags(onUpdate);
}

export function computeFlagStats(flags) {
  const open = flags.filter((f) => f.status === "open");
  const highSeverity = open.filter((f) => f.severity === "high").length;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const resolvedToday = flags.filter(
    (f) => f.status !== "open" && f.resolvedAt && f.resolvedAt >= startOfDay.getTime()
  ).length;
  return { open: open.length, highSeverity, resolvedToday };
}

const REASON_LABEL = {
  voided: "voided",
  manual_entry: "skipped scan",
  skipped_scan: "skipped scan"
};

export function renderFlagsList(flags, containerEl, { onReview, onDismiss }) {
  const open = flags.filter((f) => f.status === "open");

  if (open.length === 0) {
    containerEl.innerHTML = `<div class="card p-8 text-center text-gray-400 text-sm">No open flags — the floor is clean right now.</div>`;
    return;
  }

  containerEl.innerHTML = open
    .map((f) => {
      const time = f.createdAt ? new Date(f.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
      return `
        <div class="card card-hover p-4 flex items-center justify-between gap-4 flex-wrap animate-fade-up" data-flag-id="${f.id}">
          <div class="min-w-0 flex items-center gap-3">
            <span class="icon-circle w-9 h-9 severity-${f.severity || "low"} shrink-0"><i class="ph-duotone ph-flag icon-sm"></i></span>
            <div>
              <p class="font-semibold text-[#0A1F42] text-sm">${f.productName || "Unknown item"}</p>
              <p class="text-xs text-gray-400 truncate">${f.detail || ""}</p>
            </div>
          </div>
          <div class="text-xs text-gray-400 whitespace-nowrap">${f.basketLabel || ""} · ${time}</div>
          <span class="severity-${f.severity || "low"} text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">${REASON_LABEL[f.reason] || f.reason}</span>
          <div class="flex gap-2 ml-auto">
            <button class="review-btn btn-grad text-xs font-semibold px-3 py-1.5 flex items-center gap-1" data-id="${f.id}"><i class="ph-bold ph-check icon-xs"></i>Review</button>
            <button class="dismiss-btn bg-gray-100 text-xs font-semibold px-3 py-1.5 rounded-full text-gray-600 flex items-center gap-1" data-id="${f.id}"><i class="ph-bold ph-x icon-xs"></i>Dismiss</button>
          </div>
        </div>`;
    })
    .join("");

  containerEl.querySelectorAll(".review-btn").forEach((btn) =>
    btn.addEventListener("click", () => onReview(btn.dataset.id))
  );
  containerEl.querySelectorAll(".dismiss-btn").forEach((btn) =>
    btn.addEventListener("click", () => onDismiss(btn.dataset.id))
  );
}

export function reviewFlag(flagId) {
  return updateFlagStatus(flagId, "reviewed");
}

export function dismissFlag(flagId) {
  return updateFlagStatus(flagId, "dismissed");
}

/* ---------------------------- User Management ---------------------------- */

export async function loadUsers() {
  return getAllUsers();
}

/** Creates a Firebase Auth account + matching /users/<uid> record. */
export async function addCashierAccount(name, email, password, role = "cashier") {
  const secondaryAppName = "sstwas-user-creator";
  const secondaryApp = getApps().find(a => a.name === secondaryAppName)
    || initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    await setUserRecord(cred.user.uid, { name, email, role });
    await secondaryAuth.signOut();
    return cred.user.uid;

  } catch (err) {
    // Always sign the secondary app out so it never blocks future attempts
    try { await secondaryAuth.signOut(); } catch (_) {}

    if (err.code === "auth/email-already-in-use") {
      // The Firebase Auth account already exists (likely from a previous
      // failed attempt). The /users database record is probably missing.
      // Throw a clear message telling the admin what to do.
      throw new Error(
        `The email "${email}" already has a Firebase Auth account - ` +
        `it was likely created during a previous attempt but the database record was never saved. ` +
        `\n\nTo fix this:\n` +
        `1. Go to Firebase Console -> Authentication -> Users\n` +
        `2. Find "${email}" and copy its UID\n` +
        `3. Go to Realtime Database -> Data -> users -> add the UID node manually\n` +
        `4. Add fields: name, email, role\n\n` +
        `OR delete the account in Firebase Console and try creating it again here.`
      );
    }

    // Re-throw any other errors unchanged
    throw err;
  }
}