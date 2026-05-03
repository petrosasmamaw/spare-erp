"use client";

import { useState } from "react";

export default function PrinterDebug() {
  const [printers, setPrinters] = useState([]);
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState("");

  async function list() {
    setStatus("Connecting to QZ Tray...");
    try {
      const { connectPrinter, listPrinters } = await import("@/lib/printer");
      await connectPrinter();
      const p = await listPrinters();
      setPrinters(p || []);
      setStatus(`Found ${p ? p.length : 0} printers`);
    } catch (e) {
      console.error(e);
      setStatus("Failed to list printers: " + (e.message || e));
    }
  }

  function savePreferred() {
    try {
      if (!selected) return setStatus("Select a printer first");
      window.localStorage.setItem("POS_PRINTER_NAME", selected);
      setStatus(`Saved preferred printer: ${selected}`);
    } catch (e) {
      setStatus("Failed to save preferred printer");
    }
  }

  async function testPrint() {
    setStatus("Sending test print...");
    try {
      const { connectPrinter, createConfigForPrinter, printRaw, listPrinters } = await import("@/lib/printer");
      const { generateReceipt } = await import("@/lib/receipt");
      await connectPrinter();
      let name = selected;
      if (!name) {
        const envName = typeof process !== "undefined" && process.env && process.env.NEXT_PUBLIC_POS_PRINTER_NAME
          ? process.env.NEXT_PUBLIC_POS_PRINTER_NAME
          : null;
        name = envName || (await listPrinters())[0];
      }
      if (!name) throw new Error("No printer selected or available");
      const cfg = await createConfigForPrinter(name);
      const data = generateReceipt({ items: [{ name: "Test Item", qty: 1, price: 0 }], total: 0 });
      await printRaw(cfg, data);
      setStatus("Test print sent");
    } catch (e) {
      console.error(e);
      setStatus("Test print failed: " + (e.message || e));
    }
  }

  return (
    <div style={{ marginTop: 16, padding: 12, borderTop: "1px solid #eee" }}>
      <h4 style={{ margin: 0 }}>Printer Debug</h4>
      <div style={{ marginTop: 8 }}>
        <button className="btn-secondary" onClick={list} style={{ marginRight: 8 }}>
          List Printers
        </button>
        <button className="btn-secondary" onClick={testPrint}>
          Send Test Print
        </button>
      </div>

      <div style={{ marginTop: 8 }}>
        <select value={selected} onChange={(e) => setSelected(e.target.value)} style={{ minWidth: 260 }}>
          <option value="">-- select printer --</option>
          {printers.map((p) => (
            <option key={String(p)} value={String(p)}>
              {String(p)}
            </option>
          ))}
        </select>
        <button className="btn-secondary" onClick={savePreferred} style={{ marginLeft: 8 }}>
          Save Preferred
        </button>
      </div>

      <div style={{ marginTop: 8, color: "#444" }}>{status}</div>
    </div>
  );
}
