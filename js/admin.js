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
  setUserRecord
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
      const stockClass = p.stock > 10 ? "text-[#00C853]" : p.stock > 0 ? "text-[#FF8F00]" : "text-[#D32F2F]";
      return `
        <tr class="border-b hover:bg-gray-50">
          <td class="py-2 px-3">${p.name}</td>
          <td class="py-2 px-3">${p.category || "-"}</td>
          <td class="py-2 px-3 text-right">$${Number(p.price).toFixed(2)}</td>
          <td class="py-2 px-3 text-right font-semibold ${stockClass}">${p.stock}</td>
          <td class="py-2 px-3 text-center">
            <span class="px-2 py-0.5 rounded-full text-xs font-semibold ${p.active ? "bg-green-100 text-[#00C853]" : "bg-gray-200 text-gray-500"}">
              ${p.active ? "Active" : "Inactive"}
            </span>
          </td>
          <td class="py-2 px-3 text-center space-x-2 whitespace-nowrap">
            <button data-action="qr" data-id="${p.id}" class="text-[#1A73E8] text-xs font-semibold">QR</button>
            <button data-action="edit" data-id="${p.id}" class="text-[#1A73E8] text-xs font-semibold">Edit</button>
            <button data-action="toggle" data-id="${p.id}" data-active="${p.active}" class="text-[#FF8F00] text-xs font-semibold">${p.active ? "Disable" : "Enable"}</button>
            <button data-action="delete" data-id="${p.id}" class="text-[#D32F2F] text-xs font-semibold">Delete</button>
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
    colorDark: "#0D1B2A",
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
          backgroundColor: ["#1A73E8", "#00C853", "#FF8F00"]
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
          backgroundColor: "#1A73E8"
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