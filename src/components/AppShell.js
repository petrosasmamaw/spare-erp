"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { signOut, useSession } from "@/lib/auth-client";

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const { data: session } = useSession();

  const links = [
    { href: "/dashboard", label: t("nav.dashboard") },
    { href: "/store", label: t("nav.store") },
    { href: "/buy", label: t("nav.buy") },
    { href: "/sell", label: t("nav.sell") },
    { href: "/balance", label: t("nav.balance") },
    { href: "/reports", label: t("nav.reports") },
  ];

  const isActive = (href) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[radial-gradient(circle_at_10%_10%,_#ffecc7_0%,_#f6fbff_40%,_#e8f1ff_100%)] text-slate-900">
      <div className="pointer-events-none absolute left-[-80px] top-[-120px] h-64 w-64 rounded-full bg-amber-300/35 blur-3xl" />
      <div className="pointer-events-none absolute right-[-40px] top-[140px] h-56 w-56 rounded-full bg-cyan-300/25 blur-3xl" />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 md:px-8 md:py-6">
        <header className="sticky top-3 z-30 rounded-3xl border border-white/70 bg-white/70 p-4 shadow-xl shadow-cyan-950/10 backdrop-blur-xl md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[linear-gradient(140deg,#0f766e,#0369a1)] text-lg font-extrabold text-white shadow-lg shadow-cyan-900/20">
                S
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">{t("nav.appName")}</p>
                <h1 className="font-display text-2xl leading-tight text-slate-900 md:text-3xl">{t("nav.panelTitle")}</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {session ? (
                <button
                  type="button"
                  className="hidden rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 shadow-sm md:inline-flex"
                  onClick={handleSignOut}
                >
                  Logout
                </button>
              ) : (
                <Link
                  href="/login"
                  className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm md:inline-flex"
                >
                  Login
                </Link>
              )}

              <button
                type="button"
                className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm md:inline-flex"
                onClick={() => setLanguage((prev) => (prev === "en" ? "amh" : "en"))}
                aria-label={t("nav.language")}
              >
                {language === "en" ? t("nav.amharic") : t("nav.english")}
              </button>

              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm md:hidden"
                onClick={() => setMenuOpen((prev) => !prev)}
              >
                {menuOpen ? t("nav.close") : t("nav.menu")}
              </button>
            </div>
          </div>

          <p className="mt-3 hidden max-w-2xl text-sm text-slate-600 md:block">
            {t("nav.panelSubtitle")}
          </p>

          <nav className={`mt-4 ${menuOpen ? "block" : "hidden"} md:block`}>
            <div className="mb-3 md:hidden">
              {session ? (
                <button
                  type="button"
                  className="mr-2 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 shadow-sm"
                  onClick={handleSignOut}
                >
                  Logout
                </button>
              ) : (
                <Link
                  href="/login"
                  className="mr-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm"
                >
                  Login
                </Link>
              )}

              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm"
                onClick={() => setLanguage((prev) => (prev === "en" ? "amh" : "en"))}
                aria-label={t("nav.language")}
              >
                {language === "en" ? t("nav.amharic") : t("nav.english")}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 md:gap-2.5">
            {links.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-[linear-gradient(135deg,#0f766e,#0284c7)] text-white shadow-md shadow-cyan-900/25"
                      : "bg-white text-slate-700 ring-1 ring-slate-200 hover:-translate-y-[1px] hover:bg-amber-50"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            </div>
          </nav>
        </header>

        <main className="pb-8">{children}</main>
      </div>
    </div>
  );
}
