"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import StatCard from "@/components/StatCard";
import { fetchDashboard, fetchTransactions } from "@/lib/features/erpSlice";

function asCurrency(value) {
  return `Rs ${Number(value || 0).toFixed(2)}`;
}

export default function DashboardPage() {
  const dispatch = useDispatch();
  const { dashboard, transactions } = useSelector((state) => state.erp);
  const [range, setRange] = useState("all");

  useEffect(() => {
    dispatch(fetchDashboard(range));
    dispatch(fetchTransactions(range));
  }, [dispatch, range]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-3xl">Financial Dashboard</h2>
        <select className="input max-w-[180px]" value={range} onChange={(e) => setRange(e.target.value)}>
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Sales" value={asCurrency(dashboard.totalSales)} accent="from-teal-400 to-cyan-500" />
        <StatCard label="Total Purchases" value={asCurrency(dashboard.totalPurchases)} accent="from-amber-400 to-orange-500" />
        <StatCard label="Profit" value={asCurrency(dashboard.profit)} accent="from-fuchsia-400 to-pink-500" />
        <StatCard label="Current Stock" value={dashboard.currentStock} accent="from-indigo-400 to-blue-500" />
      </div>

      <article className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg shadow-slate-200/60">
        <h3 className="font-display text-2xl">Recent Transactions</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.2em] text-slate-500">
                <th className="pb-3">Date</th>
                <th className="pb-3">Product</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((row) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="py-3">{new Date(row.created_at).toLocaleString()}</td>
                  <td className="py-3">{row.product_name}</td>
                  <td className="py-3 capitalize">{row.type}</td>
                  <td className="py-3 font-semibold">{asCurrency(row.amount)}</td>
                </tr>
              ))}
              {transactions.length === 0 ? (
                <tr>
                  <td className="py-4 text-slate-500" colSpan={4}>No transactions yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
