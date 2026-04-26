"use client";

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProducts, fetchReports } from "@/lib/features/erpSlice";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function ReportsPage() {
  const dispatch = useDispatch();
  const { products, reports } = useSelector((state) => state.erp);
  const { t } = useLanguage();
  const [productId, setProductId] = useState("");
  const [range, setRange] = useState("all");

  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchReports({ productId, range }));
  }, [dispatch, productId, range]);

  const grouped = useMemo(() => {
    const buy = reports.filter((r) => r.type === "buy");
    const sell = reports.filter((r) => r.type === "sell");
    return { buy, sell };
  }, [reports]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end gap-3 rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg shadow-cyan-100/70">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{t("reports.filters")}</p>
          <h2 className="font-display text-3xl">{t("reports.title")}</h2>
        </div>
        <select className="input max-w-[220px]" value={productId} onChange={(e) => setProductId(e.target.value)}>
          <option value="">{t("reports.allProducts")}</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
        <select className="input max-w-[180px]" value={range} onChange={(e) => setRange(e.target.value)}>
          <option value="all">{t("reports.allTime")}</option>
          <option value="today">{t("reports.today")}</option>
          <option value="7d">{t("reports.sevenDays")}</option>
          <option value="30d">{t("reports.thirtyDays")}</option>
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-3xl border border-emerald-100 bg-white/90 p-4 shadow-lg shadow-emerald-100/60">
          <h3 className="font-display text-2xl text-emerald-700">{t("reports.buyHistory")}</h3>
          <p className="text-sm text-slate-600">{grouped.buy.length} {t("reports.records")}</p>
        </article>
        <article className="rounded-3xl border border-rose-100 bg-white/90 p-4 shadow-lg shadow-rose-100/60">
          <h3 className="font-display text-2xl text-rose-700">{t("reports.sellHistory")}</h3>
          <p className="text-sm text-slate-600">{grouped.sell.length} {t("reports.records")}</p>
        </article>
      </div>

      <article className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg shadow-slate-200/60">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.2em] text-slate-500">
                <th className="pb-3">{t("common.date")}</th>
                <th className="pb-3">{t("common.product")}</th>
                <th className="pb-3">{t("common.type")}</th>
                <th className="pb-3">{t("reports.itemId")}</th>
                <th className="pb-3">{t("common.quantity")}</th>
                <th className="pb-3">{t("reports.buyPrice")}</th>
                <th className="pb-3">{t("reports.sellPrice")}</th>
                <th className="pb-3">{t("reports.profit")}</th>
                <th className="pb-3">{t("reports.remainingStock")}</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((row) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="py-3">{new Date(row.created_at).toLocaleString()}</td>
                  <td className="py-3">{row.product_name}</td>
                  <td className="py-3 capitalize">{row.type === "buy" ? t("common.buy") : t("common.sell")}</td>
                  <td className="py-3">{row.item_id || "-"}</td>
                  <td className="py-3">{row.quantity}</td>
                  <td className="py-3">Rs {Number(row.buy_price || 0).toFixed(2)}</td>
                  <td className="py-3">{row.sell_price == null ? "-" : `Rs ${Number(row.sell_price || 0).toFixed(2)}`}</td>
                  <td className="py-3 font-semibold">Rs {Number(row.profit || 0).toFixed(2)}</td>
                  <td className="py-3">{row.remaining_stock}</td>
                </tr>
              ))}
              {reports.length === 0 ? (
                <tr>
                  <td className="py-4 text-slate-500" colSpan={9}>{t("reports.noReports")}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
