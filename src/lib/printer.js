// Lightweight QZ Tray wrapper for client-side printing
async function _getQz() {
  const mod = await import("qz-tray");
  return mod?.default || mod;
}

// DEV MODE: simple cert/sign handlers (replace with real cert/sign in production)
function _ensureDevSecurity(qz) {
  try {
    qz.security.setCertificatePromise(() => Promise.resolve());
    qz.security.setSignaturePromise(() => (toSign) => Promise.resolve({ signature: "" }));
  } catch (e) {
    // ignore if qz not ready for security overrides
  }
}

export async function connectPrinter() {
  const qz = await _getQz();
  _ensureDevSecurity(qz);

  if (!qz.websocket.isActive()) {
    await qz.websocket.connect();
  }
}

export async function getPrinter() {
  const qz = await _getQz();
  // Check for a runtime saved preferred printer in localStorage (if running in browser)
  let preferred = null;
  if (typeof window !== "undefined" && window.localStorage) {
    preferred = window.localStorage.getItem("POS_PRINTER_NAME") || null;
  }

  // Use configured printer name from env (exposed to browser via NEXT_PUBLIC_*) as fallback
  const configuredName = typeof process !== "undefined" && process.env && process.env.NEXT_PUBLIC_POS_PRINTER_NAME
    ? process.env.NEXT_PUBLIC_POS_PRINTER_NAME
    : null;

  const tryNames = [];
  if (preferred) tryNames.push(preferred);
  if (configuredName) tryNames.push(configuredName);
  tryNames.push("XP-80");

  try {
    for (const name of tryNames) {
      try {
        const found = await qz.printers.find(name);
        if (found) return found;
      } catch (e) {
        // ignore and try next
      }
    }

    // If all finds fail, return first available printer from list
    const list = await qz.printers.get();
    return list && list.length ? list[0] : null;
  } catch (e) {
    const list = await qz.printers.get();
    return list && list.length ? list[0] : null;
  }
}

export async function listPrinters() {
  const qz = await _getQz();
  try {
    return await qz.printers.get();
  } catch (e) {
    return [];
  }
}

export async function createConfigForPrinter(name) {
  const qz = await _getQz();
  return qz.configs.create(name);
}

export async function printRaw(config, data) {
  const qz = await _getQz();
  return qz.print(config, data);
}
