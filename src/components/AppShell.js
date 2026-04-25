"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/store", label: "Store" },
  { href: "/buy", label: "Buy" },
  { href: "/sell", label: "Sell" },
  { href: "/reports", label: "Item Reports" },
];

export default function AppShell({ children }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#fff6d6_0%,_#f3fbff_45%,_#eef5ff_100%)] text-slate-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-8">
        <header className="rounded-3xl border border-white/70 bg-white/75 p-5 shadow-lg shadow-amber-100/40 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Spare ERP</p>
              <h1 className="font-display text-3xl leading-tight text-slate-900">Inventory Intelligence Panel</h1>
            </div>
            <p className="max-w-md text-sm text-slate-600">
              Real-time stock, transaction history, and item-level reports for tracked and bulk products.
            </p>
          </div>
          <nav className="mt-5 flex flex-wrap gap-2">
            {links.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-slate-900 text-white shadow-md shadow-slate-900/25"
                      : "bg-white text-slate-700 hover:bg-amber-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="pb-8">{children}</main>
      </div>
    </div>
  );
}
