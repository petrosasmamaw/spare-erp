"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  createFinanceEntry,
  fetchFinanceReports,
  fetchFinanceSummary,
  fetchSupplierCredits,
  paySupplierCredit,
} from "@/lib/features/erpSlice";
import { useLanguage } from "@/lib/i18n/LanguageContext";

function asCurrency(value) {
  return `Rs ${Number(value || 0).toFixed(2)}`;
}

export default function BalancePage() {
  const dispatch = useDispatch();
  const { financeSummary, financeReports, supplierCredits, actionLoading } = useSelector((state) => state.erp);
  const { t } = useLanguage();

  const [range, setRange] = useState("all");
  const [accountFilter, setAccountFilter] = useState("");
  const [showSupplierCredits, setShowSupplierCredits] = useState(false);
  const [payAmounts, setPayAmounts] = useState({});
  const [form, setForm] = useState({
    account_type: "balance",
    direction: "in",
    amount: "",
    supplier_name: "",
    note: "",
  });

  useEffect(() => {
    dispatch(fetchFinanceSummary());
    dispatch(fetchSupplierCredits());
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
        supplier_name: form.account_type === "credit" ? form.supplier_name.trim() : undefined,
        note: form.note,
      })
    );

    setForm((prev) => ({ ...prev, amount: "", supplier_name: "", note: "" }));
    dispatch(fetchFinanceReports({ range, account: accountFilter }));
  }

  async function onPayCredit(supplierName) {
    const amount = Number(payAmounts[supplierName] || 0);

    if (amount <= 0) {
      return;
    }

    await dispatch(
      paySupplierCredit({
        supplier_name: supplierName,
        amount,
        note: t("balance.payCreditNote", { supplier: supplierName }),
      })
    );

    setPayAmounts((prev) => ({ ...prev, [supplierName]: "" }));
    dispatch(fetchFinanceReports({ range, account: accountFilter }));
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-3xl border border-emerald-200 bg-white/90 p-4 shadow-lg shadow-emerald-100/60">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{t("common.balance")}</p>
          <p className="mt-2 font-display text-3xl text-emerald-700">{asCurrency(financeSummary.balance)}</p>
        </article>
        <article
          className="cursor-pointer rounded-3xl border border-amber-200 bg-white/90 p-4 shadow-lg shadow-amber-100/60"
          onClick={() => setShowSupplierCredits((prev) => !prev)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setShowSupplierCredits((prev) => !prev);
            }
          }}
        >
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{t("common.credit")}</p>
          <p className="mt-2 font-display text-3xl text-amber-700">{asCurrency(financeSummary.credit)}</p>
          <p className="mt-2 text-xs text-slate-500">{t("balance.creditHint")}</p>
        </article>
        <article className="rounded-3xl border border-fuchsia-200 bg-white/90 p-4 shadow-lg shadow-fuchsia-100/60">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{t("dashboard.profit")}</p>
          <p className="mt-2 font-display text-3xl text-fuchsia-700">{asCurrency(financeSummary.profit)}</p>
        </article>
        <article className="rounded-3xl border border-indigo-200 bg-white/90 p-4 shadow-lg shadow-indigo-100/60">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{t("balance.stockValue")}</p>
          <p className="mt-2 font-display text-3xl text-indigo-700">{asCurrency(financeSummary.stockValue)}</p>
        </article>
        <article className="rounded-3xl border border-cyan-200 bg-white/90 p-4 shadow-lg shadow-cyan-100/60">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{t("balance.netPosition")}</p>
          <p className="mt-2 font-display text-3xl text-cyan-700">
            {asCurrency(
              Number(financeSummary.balance || 0) +
                Number(financeSummary.stockValue || 0) -
                Number(financeSummary.credit || 0)
            )}
          </p>
        </article>
      </div>

      {showSupplierCredits ? (
        <article className="rounded-3xl border border-amber-200 bg-white/90 p-5 shadow-lg shadow-amber-100/60">
          <h2 className="font-display text-2xl">{t("balance.supplierCreditList")}</h2>
          <p className="mt-1 text-sm text-slate-600">{t("balance.supplierCreditHint")}</p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.2em] text-slate-500">
                  <th className="pb-3">{t("balance.supplier")}</th>
                  <th className="pb-3">{t("balance.outstandingCredit")}</th>
                  <th className="pb-3">{t("balance.payAmount")}</th>
                  <th className="pb-3">{t("balance.action")}</th>
                </tr>
              </thead>
              <tbody>
                {supplierCredits.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="py-3 font-medium">{row.supplier_name}</td>
                    <td className="py-3">{asCurrency(row.amount)}</td>
                    <td className="py-3">
                      <input
                        className="input max-w-[180px]"
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder={t("common.amount")}
                        value={payAmounts[row.supplier_name] || ""}
                        onChange={(e) =>
                          setPayAmounts((prev) => ({
                            ...prev,
                            [row.supplier_name]: e.target.value,
                          }))
                        }
                      />
                    </td>
                    <td className="py-3">
                      <button
                        type="button"
                        className="rounded-xl bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-200"
                        onClick={() => onPayCredit(row.supplier_name)}
                        disabled={actionLoading}
                      >
                        {actionLoading ? t("balance.paying") : t("balance.payCredit")}
                      </button>
                    </td>
                  </tr>
                ))}
                {supplierCredits.length === 0 ? (
                  <tr>
                    <td className="py-4 text-slate-500" colSpan={4}>{t("balance.noOutstanding")}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        <form
          onSubmit={onSubmit}
          className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg shadow-slate-200/60"
        >
          <h2 className="font-display text-2xl">{t("balance.addOutEntry")}</h2>
          <p className="mt-1 text-sm text-slate-600">{t("balance.addOutSubtitle")}</p>

          <div className="mt-4 grid gap-3">
            <select
              className="input"
              value={form.account_type}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  account_type: e.target.value,
                  supplier_name: e.target.value === "credit" ? prev.supplier_name : "",
                }))
              }
            >
              <option value="balance">{t("common.balance")}</option>
              <option value="credit">{t("common.credit")}</option>
            </select>

            <select
              className="input"
              value={form.direction}
              onChange={(e) => setForm((prev) => ({ ...prev, direction: e.target.value }))}
            >
              <option value="in">{t("balance.addIn")}</option>
              <option value="out">{t("balance.out")}</option>
            </select>

            <input
              className="input"
              type="number"
              min="0.01"
              step="0.01"
              placeholder={t("common.amount")}
              value={form.amount}
              onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
              required
            />

            {form.account_type === "credit" ? (
              <input
                className="input"
                placeholder={t("balance.supplierName")}
                value={form.supplier_name}
                onChange={(e) => setForm((prev) => ({ ...prev, supplier_name: e.target.value }))}
                required
              />
            ) : null}

            <input
              className="input"
              placeholder={t("balance.noteOptional")}
              value={form.note}
              onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
            />

            <button type="submit" className="btn-primary" disabled={actionLoading}>
              {actionLoading ? t("balance.saving") : t("balance.saveEntry")}
            </button>
          </div>
        </form>

        <article className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg shadow-slate-200/60">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{t("balance.filters")}</p>
              <h2 className="font-display text-2xl">{t("balance.reportsTitle")}</h2>
            </div>
            <select className="input max-w-[180px]" value={range} onChange={(e) => setRange(e.target.value)}>
              <option value="all">{t("reports.allTime")}</option>
              <option value="today">{t("reports.today")}</option>
              <option value="7d">{t("reports.sevenDays")}</option>
              <option value="30d">{t("reports.thirtyDays")}</option>
            </select>
            <select className="input max-w-[180px]" value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)}>
              <option value="">{t("common.allAccounts")}</option>
              <option value="balance">{t("common.balance")}</option>
              <option value="credit">{t("common.credit")}</option>
            </select>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.2em] text-slate-500">
                  <th className="pb-3">{t("common.ethiopianDate")}</th>
                  <th className="pb-3">{t("balance.account")}</th>
                  <th className="pb-3">{t("balance.direction")}</th>
                  <th className="pb-3">{t("common.amount")}</th>
                  <th className="pb-3">{t("balance.supplier")}</th>
                  <th className="pb-3">{t("common.source")}</th>
                  <th className="pb-3">{t("common.note")}</th>
                  <th className="pb-3">{t("balance.balanceAfter")}</th>
                  <th className="pb-3">{t("balance.creditAfter")}</th>
                </tr>
              </thead>
              <tbody>
                {financeReports.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="py-3">{row.ethiopian_date || "-"}</td>
                    <td className="py-3 capitalize">{row.account_type === "balance" ? t("balance.accountBalance") : t("balance.accountCredit")}</td>
                    <td className="py-3 uppercase">{row.direction === "in" ? t("common.in") : t("common.out")}</td>
                    <td className="py-3">{asCurrency(row.amount)}</td>
                    <td className="py-3">{row.supplier_name || "-"}</td>
                    <td className="py-3">{row.source || "-"}</td>
                    <td className="py-3">{row.note || "-"}</td>
                    <td className="py-3">{asCurrency(row.balance_after)}</td>
                    <td className="py-3">{asCurrency(row.credit_after)}</td>
                  </tr>
                ))}
                {financeReports.length === 0 ? (
                  <tr>
                    <td className="py-4 text-slate-500" colSpan={9}>{t("balance.noReports")}</td>
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
