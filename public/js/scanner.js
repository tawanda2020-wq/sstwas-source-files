// scanner.js
// Thin wrapper around the Html5-QRCode library (loaded via CDN in
// scanner.html). Keeps camera lifecycle management in one place so screens
// don't leak open camera streams when navigating away.

let html5QrCode = null;

/**
 * Starts the camera and begins decoding QR codes.
 * @param {string} elementId DOM id of the container div for the viewfinder
 * @param {(decodedText: string) => void} onSuccess called once per successful scan
 * @param {(errorMessage: string) => void} [onError] called on decode errors (noisy, optional)
 */
export async function startScanner(elementId, onSuccess, onError) {
  // eslint-disable-next-line no-undef -- Html5Qrcode is loaded globally via CDN script tag
  html5QrCode = new Html5Qrcode(elementId);

  const config = { fps: 10, qrbox: { width: 250, height: 250 } };

  let scanning = false;

  await html5QrCode.start(
    { facingMode: "environment" },
    config,
    (decodedText) => {
      if (scanning) return; // debounce: ignore rapid repeat fires for same frame burst
      scanning = true;
      onSuccess(decodedText);
      // Allow the caller to decide when to resume (e.g. after showing the
      // product card and the user taps "Scan Next Item").
      setTimeout(() => {
        scanning = false;
      }, 1500);
    },
    (errorMessage) => {
      if (onError) onError(errorMessage);
    }
  );
}

/** Toggles the device torch/flashlight if supported by the camera. */
export async function toggleTorch(on) {
  if (!html5QrCode) return;
  try {
    await html5QrCode.applyVideoConstraints({
      advanced: [{ torch: on }]
    });
  } catch (err) {
    console.warn("Torch not supported on this device:", err);
  }
}

/** Stops the camera stream and releases resources. Call on screen exit. */
export async function stopScanner() {
  if (!html5QrCode) return;
  try {
    await html5QrCode.stop();
    html5QrCode.clear();
  } catch (err) {
    console.warn("Scanner already stopped:", err);
  } finally {
    html5QrCode = null;
  }
}
