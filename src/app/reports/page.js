"use client";

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProducts, fetchReports } from "@/lib/features/erpSlice";

export default function ReportsPage() {
  const dispatch = useDispatch();
  const { products, reports } = useSelector((state) => state.erp);
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
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Filters</p>
          <h2 className="font-display text-3xl">Item Reports</h2>
        </div>
        <select className="input max-w-[220px]" value={productId} onChange={(e) => setProductId(e.target.value)}>
          <option value="">All products</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
        <select className="input max-w-[180px]" value={range} onChange={(e) => setRange(e.target.value)}>
          <option value="all">All time</option>
          <option value="today">Today</option>
          <option value="7d">7 days</option>
          <option value="30d">30 days</option>
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-3xl border border-emerald-100 bg-white/90 p-4 shadow-lg shadow-emerald-100/60">
          <h3 className="font-display text-2xl text-emerald-700">Buy History</h3>
          <p className="text-sm text-slate-600">{grouped.buy.length} records</p>
        </article>
        <article className="rounded-3xl border border-rose-100 bg-white/90 p-4 shadow-lg shadow-rose-100/60">
          <h3 className="font-display text-2xl text-rose-700">Sell History</h3>
          <p className="text-sm text-slate-600">{grouped.sell.length} records</p>
        </article>
      </div>

      <article className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg shadow-slate-200/60">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.2em] text-slate-500">
                <th className="pb-3">Date</th>
                <th className="pb-3">Product</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Item ID</th>
                <th className="pb-3">Quantity</th>
                <th className="pb-3">Buy Price</th>
                <th className="pb-3">Sell Price</th>
                <th className="pb-3">Profit</th>
                <th className="pb-3">Remaining Stock</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((row) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="py-3">{new Date(row.created_at).toLocaleString()}</td>
                  <td className="py-3">{row.product_name}</td>
                  <td className="py-3 capitalize">{row.type}</td>
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
                  <td className="py-4 text-slate-500" colSpan={9}>No reports found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
