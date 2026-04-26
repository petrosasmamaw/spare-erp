"use client";

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProducts, sellProduct } from "@/lib/features/erpSlice";
import { useLanguage } from "@/lib/i18n/LanguageContext";

function formatTrackedId(item) {
  if (!item) return "";

  const idValue = item.id || "";
  const buyPrice = Number(item.buy_price || 0);

  return buyPrice > 0 ? `${idValue} (Cost Rs ${buyPrice.toFixed(2)})` : idValue;
}

export default function SellPage() {
  const dispatch = useDispatch();
  const { products, actionLoading } = useSelector((state) => state.erp);
  const { t } = useLanguage();

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

    const idList = itemId
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    const payload = idList.length
      ? { item_ids: idList, price: Number(price || selectedProduct?.default_price || 0) }
      : { quantity: Number(quantity), price: Number(price || selectedProduct?.default_price || 0) };

    await dispatch(sellProduct({ productId: selectedId, payload }));
    setQuantity("1");
    setItemId("");
    setPrice("");
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <form onSubmit={onSubmit} className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg shadow-rose-100/60">
        <h2 className="font-display text-2xl">{t("sell.title")}</h2>
        <p className="mt-1 text-sm text-slate-600">{t("sell.subtitle")}</p>

        <div className="mt-4 grid gap-3">
          <select className="input" value={selectedId} onChange={(e) => setSelectedId(e.target.value)} required>
            <option value="">{t("sell.selectProduct")}</option>
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
            placeholder={t("sell.quantityBulk")}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />

          <input
            className="input"
            placeholder={t("sell.idsTracked")}
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
          />

          <input
            className="input"
            type="number"
            min="0"
            step="0.01"
            placeholder={t("sell.sellPrice")}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />

          <button disabled={actionLoading} className="btn-primary" type="submit">
            {actionLoading ? t("sell.processing") : t("sell.processSale")}
          </button>
        </div>
      </form>

      <div className="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-lg shadow-slate-200/60">
        <h3 className="font-display text-xl">{t("sell.rulesTitle")}</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          <li>{t("sell.rule1")}</li>
          <li>{t("sell.rule2")}</li>
          <li>{t("sell.rule3")}</li>
        </ul>

        {selectedProduct ? (
          <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
            <p><strong>{t("common.stock")}:</strong> {selectedProduct.stock}</p>
            <p>
              <strong>{t("sell.trackedIds")}:</strong>{" "}
              {selectedProduct.ids?.length
                ? selectedProduct.ids.map(formatTrackedId).filter(Boolean).join(", ")
                : t("sell.noIds")}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
