"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  createFinanceEntry,
  fetchFinanceReports,
  fetchFinanceSummary,
} from "@/lib/features/erpSlice";

function asCurrency(value) {
  return `Rs ${Number(value || 0).toFixed(2)}`;
}

export default function BalancePage() {
  const dispatch = useDispatch();
  const { financeSummary, financeReports, actionLoading } = useSelector((state) => state.erp);

  const [range, setRange] = useState("all");
  const [accountFilter, setAccountFilter] = useState("");
  const [form, setForm] = useState({
    account_type: "balance",
    direction: "in",
    amount: "",
    note: "",
  });

  useEffect(() => {
    dispatch(fetchFinanceSummary());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchFinanceReports({ range, account: accountFilter }));
  }, [dispatch, range, accountFilter]);

  async function onSubmit(event) {
    event.preventDefault();

    await dispatch(
      createFinanceEntry({
        account_type: form.account_type,
        direction: form.direction,
        amount: Number(form.amount),
        note: form.note,
      })
    );

    setForm((prev) => ({ ...prev, amount: "", note: "" }));
    dispatch(fetchFinanceReports({ range, account: accountFilter }));
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-3xl border border-emerald-200 bg-white/90 p-4 shadow-lg shadow-emerald-100/60">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Balance</p>
          <p className="mt-2 font-display text-3xl text-emerald-700">{asCurrency(financeSummary.balance)}</p>
        </article>
        <article className="rounded-3xl border border-amber-200 bg-white/90 p-4 shadow-lg shadow-amber-100/60">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Credit</p>
          <p className="mt-2 font-display text-3xl text-amber-700">{asCurrency(financeSummary.credit)}</p>
        </article>
        <article className="rounded-3xl border border-fuchsia-200 bg-white/90 p-4 shadow-lg shadow-fuchsia-100/60">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Profit</p>
          <p className="mt-2 font-display text-3xl text-fuchsia-700">{asCurrency(financeSummary.profit)}</p>
        </article>
        <article className="rounded-3xl border border-indigo-200 bg-white/90 p-4 shadow-lg shadow-indigo-100/60">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Stock Value</p>
          <p className="mt-2 font-display text-3xl text-indigo-700">{asCurrency(financeSummary.stockValue)}</p>
        </article>
        <article className="rounded-3xl border border-cyan-200 bg-white/90 p-4 shadow-lg shadow-cyan-100/60">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Net Position (Balance + Stock - Credit)</p>
          <p className="mt-2 font-display text-3xl text-cyan-700">
            {asCurrency(
              Number(financeSummary.balance || 0) +
                Number(financeSummary.stockValue || 0) -
                Number(financeSummary.credit || 0)
            )}
          </p>
        </article>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        <form
          onSubmit={onSubmit}
          className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg shadow-slate-200/60"
        >
          <h2 className="font-display text-2xl">Add / Out Entry</h2>
          <p className="mt-1 text-sm text-slate-600">Record manual balance or credit movement.</p>

          <div className="mt-4 grid gap-3">
            <select
              className="input"
              value={form.account_type}
              onChange={(e) => setForm((prev) => ({ ...prev, account_type: e.target.value }))}
            >
              <option value="balance">Balance</option>
              <option value="credit">Credit</option>
            </select>

            <select
              className="input"
              value={form.direction}
              onChange={(e) => setForm((prev) => ({ ...prev, direction: e.target.value }))}
            >
              <option value="in">Add (In)</option>
              <option value="out">Out</option>
            </select>

            <input
              className="input"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Amount"
              value={form.amount}
              onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
              required
            />

            <input
              className="input"
              placeholder="Note (optional)"
              value={form.note}
              onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
            />

            <button type="submit" className="btn-primary" disabled={actionLoading}>
              {actionLoading ? "Saving..." : "Save Entry"}
            </button>
          </div>
        </form>

        <article className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg shadow-slate-200/60">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Filters</p>
              <h2 className="font-display text-2xl">Balance & Credit Reports</h2>
            </div>
            <select className="input max-w-[180px]" value={range} onChange={(e) => setRange(e.target.value)}>
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="7d">7 days</option>
              <option value="30d">30 days</option>
            </select>
            <select className="input max-w-[180px]" value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)}>
              <option value="">All accounts</option>
              <option value="balance">Balance</option>
              <option value="credit">Credit</option>
            </select>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.2em] text-slate-500">
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Account</th>
                  <th className="pb-3">Direction</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Source</th>
                  <th className="pb-3">Note</th>
                  <th className="pb-3">Balance After</th>
                  <th className="pb-3">Credit After</th>
                </tr>
              </thead>
              <tbody>
                {financeReports.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="py-3">{new Date(row.created_at).toLocaleString()}</td>
                    <td className="py-3 capitalize">{row.account_type}</td>
                    <td className="py-3 uppercase">{row.direction}</td>
                    <td className="py-3">{asCurrency(row.amount)}</td>
                    <td className="py-3">{row.source || "-"}</td>
                    <td className="py-3">{row.note || "-"}</td>
                    <td className="py-3">{asCurrency(row.balance_after)}</td>
                    <td className="py-3">{asCurrency(row.credit_after)}</td>
                  </tr>
                ))}
                {financeReports.length === 0 ? (
                  <tr>
                    <td className="py-4 text-slate-500" colSpan={8}>No balance/credit reports found.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  );
}
