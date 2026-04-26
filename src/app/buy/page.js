"use client";

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { buyProduct, fetchFinanceSummary, fetchProducts } from "@/lib/features/erpSlice";
import { useLanguage } from "@/lib/i18n/LanguageContext";

function formatTrackedId(item) {
  if (!item) return "";

  const idValue = item.id || "";
  const buyPrice = Number(item.buy_price || 0);

  return buyPrice > 0 ? `${idValue} (Rs ${buyPrice.toFixed(2)})` : idValue;
}

export default function BuyPage() {
  const dispatch = useDispatch();
  const { products, actionLoading, financeSummary } = useSelector((state) => state.erp);
  const { t } = useLanguage();

  const [selectedId, setSelectedId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [idsText, setIdsText] = useState("");
  const [price, setPrice] = useState("");
  const [paymentSource, setPaymentSource] = useState("credit");
  const [supplierName, setSupplierName] = useState("");

  useEffect(() => {
    dispatch(fetchProducts());
    dispatch(fetchFinanceSummary());
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
      .filter(Boolean)
      .map((idValue) => ({ id: idValue }));

    const payload = ids.length
      ? {
          ids,
          price: Number(price || selectedProduct?.default_price || 0),
          payment_source: paymentSource,
          supplier_name: paymentSource === "credit" ? supplierName.trim() : undefined,
        }
      : {
          quantity: Number(quantity),
          price: Number(price || selectedProduct?.default_price || 0),
          payment_source: paymentSource,
          supplier_name: paymentSource === "credit" ? supplierName.trim() : undefined,
        };

    await dispatch(buyProduct({ productId: selectedId, payload }));
    setQuantity("1");
    setIdsText("");
    setPrice("");
    setSupplierName("");
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <form onSubmit={onSubmit} className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg shadow-emerald-100/60">
        <h2 className="font-display text-2xl">{t("buy.title")}</h2>
        <p className="mt-1 text-sm text-slate-600">{t("buy.subtitle")}</p>

        <div className="mt-4 grid gap-3">
          <select className="input" value={selectedId} onChange={(e) => setSelectedId(e.target.value)} required>
            <option value="">{t("buy.selectProduct")}</option>
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
            placeholder={t("buy.quantityBulk")}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />

          <input
            className="input"
            placeholder={t("buy.idsTracked")}
            value={idsText}
            onChange={(e) => setIdsText(e.target.value)}
          />

          <input
            className="input"
            type="number"
            min="0"
            step="0.01"
            placeholder={t("buy.buyPrice")}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />

          <select className="input" value={paymentSource} onChange={(e) => setPaymentSource(e.target.value)}>
            <option value="credit">{t("buy.buyByCredit")}</option>
            <option value="balance">{t("buy.buyByBalance")}</option>
          </select>

          {paymentSource === "credit" ? (
            <input
              className="input"
              placeholder={t("buy.supplierRequired")}
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              required
            />
          ) : null}

          <p className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
            {t("buy.balanceCreditInfo", {
              balance: Number(financeSummary.balance || 0).toFixed(2),
              credit: Number(financeSummary.credit || 0).toFixed(2),
            })}
          </p>

          <button disabled={actionLoading} className="btn-primary" type="submit">
            {actionLoading ? t("buy.processing") : t("buy.addPurchase")}
          </button>
        </div>
      </form>

      <div className="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-lg shadow-slate-200/60">
        <h3 className="font-display text-xl">{t("buy.snapshotTitle")}</h3>
        {!selectedProduct ? (
          <p className="mt-3 text-sm text-slate-600">{t("buy.pickProduct")}</p>
        ) : (
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <p><strong>{t("buy.name")}:</strong> {selectedProduct.name}</p>
            <p><strong>{t("buy.currentStock")}:</strong> {selectedProduct.stock}</p>
            <p><strong>{t("buy.defaultPrice")}:</strong> Rs {Number(selectedProduct.default_price || 0).toFixed(2)}</p>
            <p>
              <strong>{t("common.ids")}:</strong>{" "}
              {selectedProduct.ids?.length
                ? selectedProduct.ids.map(formatTrackedId).filter(Boolean).join(", ")
                : t("buy.bulkItem")}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
