"use client";

import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { sellProduct } from "@/lib/features/erpSlice";

export default function SellReceiptModal({ open, onClose, selectedProduct, payload }) {
  const dispatch = useDispatch();
  const [step, setStep] = useState(1);
  const [qzStatus, setQzStatus] = useState("Not connected");
  const [connected, setConnected] = useState(false);
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setQzStatus("Not connected");
      setPrinters([]);
      setSelectedPrinter("");
      setProcessing(false);
      setError(null);
      setConnected(false);
    }
    if (open) {
      // attempt to auto-connect to QZ Tray shortly after opening
      const t = setTimeout(() => {
        handleConnect();
      }, 700);

      return () => clearTimeout(t);
    }
  }, [open]);

  if (!open) return null;

  async function handleConnect() {
    setQzStatus("Connecting to QZ Tray...");
    setError(null);
    try {
      const { connectPrinter, listPrinters } = await import("@/lib/printer");
      await connectPrinter();
      setQzStatus("Connected to QZ Tray");
      setConnected(true);
      const p = await listPrinters();
      setPrinters(p || []);
      if (p && p.length) setSelectedPrinter(p[0]);
    } catch (e) {
      console.error(e);
      setQzStatus("Connection failed: " + (e.message || e));
      setError(e);
      setConnected(false);
    }
  }

  async function handleProcessSale() {
    setProcessing(true);
    setError(null);

    try {
      // 1. save sale
      await dispatch(sellProduct({ productId: String(selectedProduct?.id), payload })).unwrap();

      // 2. print via QZ using selectedPrinter (must be chosen and connected)
      if (!connected) throw new Error("Not connected to QZ Tray");
      if (!selectedPrinter) throw new Error("No printer selected");

      const { createConfigForPrinter, printRaw } = await import("@/lib/printer");
      const { generateReceipt } = await import("@/lib/receipt");

      const config = await createConfigForPrinter(selectedPrinter);
      const qty = payload.quantity || (payload.item_ids ? payload.item_ids.length : 1);
      const priceVal = Number(payload.price || 0);
      const order = {
        items: [
          {
            name: selectedProduct?.name || "Item",
            qty,
            price: priceVal,
          },
        ],
        total: qty * priceVal,
      };

      const data = generateReceipt(order);
      await printRaw(config, data);

      setStep(4);
    } catch (e) {
      console.error(e);
      setError(e.message || e);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 520, background: "#fff", borderRadius: 8, padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Sell with Receipt</h3>

        <div>
          <h4>Print Info</h4>
          <div><strong>Item:</strong> {selectedProduct?.name}</div>
          <div><strong>Qty:</strong> {payload?.quantity || (payload?.item_ids ? payload.item_ids.length : 1)}</div>
          <div><strong>Price:</strong> {Number(payload?.price || selectedProduct?.default_price || 0).toFixed(2)}</div>
        </div>

        <div style={{ marginTop: 12 }}>
          <h4>QZ Tray Connection</h4>
          <div>{qzStatus}</div>
          <div style={{ marginTop: 8 }}>
            <button className="btn-secondary" onClick={handleConnect} disabled={connected}>Connect to QZ Tray</button>
          </div>
          {error && <div style={{ color: "#b00020", marginTop: 8 }}>Error: {String(error)}</div>}
        </div>

        <div style={{ marginTop: 12 }}>
          <h4>Select Printer</h4>
          <div style={{ marginBottom: 8 }}>
            <select value={selectedPrinter} onChange={(e) => setSelectedPrinter(e.target.value)} style={{ minWidth: 360 }}>
              <option value="">-- select printer --</option>
              {printers.map((p) => (
                <option key={String(p)} value={String(p)}>{String(p)}</option>
              ))}
            </select>
          </div>
          <div>
            <button className="btn-primary" onClick={handleProcessSale} disabled={processing || !connected || !selectedPrinter}>{processing ? "Processing..." : "Process Sale & Print"}</button>
            <button className="btn-secondary" onClick={onClose} style={{ marginLeft: 8 }}>Cancel</button>
          </div>
          {step === 4 && (
            <div style={{ marginTop: 12 }}>
              <div>Sale processed and receipt sent to printer.</div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
