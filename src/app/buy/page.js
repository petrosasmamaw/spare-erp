"use client";

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { buyProduct, fetchProducts } from "@/lib/features/erpSlice";

export default function BuyPage() {
  const dispatch = useDispatch();
  const { products, actionLoading } = useSelector((state) => state.erp);

  const [selectedId, setSelectedId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [idsText, setIdsText] = useState("");
  const [price, setPrice] = useState("");

  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  const selectedProduct = useMemo(
    () => products.find((item) => String(item.id) === String(selectedId)),
    [products, selectedId]
  );

  async function onSubmit(event) {
    event.preventDefault();
    if (!selectedId) return;

    const ids = idsText
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    const payload = ids.length
      ? { ids, price: Number(price || selectedProduct?.default_price || 0) }
      : { quantity: Number(quantity), price: Number(price || selectedProduct?.default_price || 0) };

    await dispatch(buyProduct({ productId: selectedId, payload }));
    setQuantity("1");
    setIdsText("");
    setPrice("");
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <form onSubmit={onSubmit} className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg shadow-emerald-100/60">
        <h2 className="font-display text-2xl">Purchase / Add Stock</h2>
        <p className="mt-1 text-sm text-slate-600">Use IDs for tracked items or quantity for bulk items.</p>

        <div className="mt-4 grid gap-3">
          <select className="input" value={selectedId} onChange={(e) => setSelectedId(e.target.value)} required>
            <option value="">Select product</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.category})
              </option>
            ))}
          </select>

          <input
            className="input"
            type="number"
            min="1"
            placeholder="Quantity (bulk mode)"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />

          <input
            className="input"
            placeholder="IDs (comma separated for tracked mode)"
            value={idsText}
            onChange={(e) => setIdsText(e.target.value)}
          />

          <input
            className="input"
            type="number"
            min="0"
            step="0.01"
            placeholder="Buy price (optional)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />

          <button disabled={actionLoading} className="btn-primary" type="submit">
            {actionLoading ? "Processing..." : "Add Purchase"}
          </button>
        </div>
      </form>

      <div className="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-lg shadow-slate-200/60">
        <h3 className="font-display text-xl">Selected Product Snapshot</h3>
        {!selectedProduct ? (
          <p className="mt-3 text-sm text-slate-600">Pick a product to view stock and ID details.</p>
        ) : (
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <p><strong>Name:</strong> {selectedProduct.name}</p>
            <p><strong>Current stock:</strong> {selectedProduct.stock}</p>
            <p><strong>Default price:</strong> Rs {Number(selectedProduct.default_price || 0).toFixed(2)}</p>
            <p><strong>IDs:</strong> {selectedProduct.ids?.length ? selectedProduct.ids.join(", ") : "Bulk item"}</p>
          </div>
        )}
      </div>
    </section>
  );
}
