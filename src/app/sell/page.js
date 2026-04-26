"use client";

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProducts, sellProduct } from "@/lib/features/erpSlice";

export default function SellPage() {
  const dispatch = useDispatch();
  const { products, actionLoading } = useSelector((state) => state.erp);

  const [selectedId, setSelectedId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [itemId, setItemId] = useState("");
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

    const payload = itemId.trim()
      ? { item_id: itemId.trim(), price: Number(price || selectedProduct?.default_price || 0) }
      : { quantity: Number(quantity), price: Number(price || selectedProduct?.default_price || 0) };

    await dispatch(sellProduct({ productId: selectedId, payload }));
    setQuantity("1");
    setItemId("");
    setPrice("");
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <form onSubmit={onSubmit} className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg shadow-rose-100/60">
        <h2 className="font-display text-2xl">Sell Items</h2>
        <p className="mt-1 text-sm text-slate-600">Sell one ID for tracked products or quantity for bulk items.</p>

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
            placeholder="Item ID (tracked mode)"
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
          />

          <input
            className="input"
            type="number"
            min="0"
            step="0.01"
            placeholder="Sell price (optional)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />

          <button disabled={actionLoading} className="btn-primary" type="submit">
            {actionLoading ? "Processing..." : "Process Sale"}
          </button>
        </div>
      </form>

      <div className="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-lg shadow-slate-200/60">
        <h3 className="font-display text-xl">Sale Rules</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          <li>1. Selling with item ID validates that the ID exists.</li>
          <li>2. Selling by quantity checks stock and blocks negative values.</li>
          <li>3. Each sale creates both transaction and item report records.</li>
        </ul>

        {selectedProduct ? (
          <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
            <p><strong>Stock:</strong> {selectedProduct.stock}</p>
            <p>
              <strong>Tracked IDs:</strong>{" "}
              {selectedProduct.ids?.length
                ? selectedProduct.ids.map((item) => item?.id).filter(Boolean).join(", ")
                : "No IDs"}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
