"use client";

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import ProductCard from "@/components/ProductCard";
import { clearError, createProduct, deleteProduct, fetchProducts } from "@/lib/features/erpSlice";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const defaultImage = "https://picsum.photos/seed/spare-store/900/600";

export default function StorePage() {
  const dispatch = useDispatch();
  const { products, loading, actionLoading, error } = useSelector((state) => state.erp);
  const { t } = useLanguage();

  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    category: "",
    stock: "",
    default_price: "",
    idsText: "",
    image_url: defaultImage,
  });

  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const key = search.toLowerCase();
    return products.filter(
      (item) => item.name.toLowerCase().includes(key) || item.category.toLowerCase().includes(key)
    );
  }, [products, search]);

  async function onSubmit(event) {
    event.preventDefault();

    const ids = form.idsText
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((idValue) => ({ id: idValue }));

    await dispatch(
      createProduct({
        name: form.name,
        category: form.category,
        stock: form.stock ? Number(form.stock) : undefined,
        default_price: Number(form.default_price || 0),
        ids,
        image_url: form.image_url || defaultImage,
      })
    );

    setForm({
      name: "",
      category: "",
      stock: "",
      default_price: "",
      idsText: "",
      image_url: defaultImage,
    });
  }

  async function handleDelete(product) {
    const confirmed = window.confirm(t("store.deleteConfirm", { name: product.name }));
    if (!confirmed) {
      return;
    }

    await dispatch(deleteProduct(product.id));
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1.4fr]">
        <form
          onSubmit={onSubmit}
          className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg shadow-amber-100/40"
        >
          <h2 className="font-display text-2xl">{t("store.addProduct")}</h2>
          <p className="mt-1 text-sm text-slate-600">{t("store.subtitle")}</p>

          <div className="mt-4 grid gap-3">
            <input
              className="input"
              placeholder={t("store.productName")}
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
            <input
              className="input"
              placeholder={t("store.category")}
              value={form.category}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              required
            />
            <input
              className="input"
              placeholder={t("store.stockOptional")}
              type="number"
              min="0"
              value={form.stock}
              onChange={(e) => setForm((prev) => ({ ...prev, stock: e.target.value }))}
            />
            <input
              className="input"
              placeholder={t("store.defaultPrice")}
              type="number"
              min="0"
              step="0.01"
              value={form.default_price}
              onChange={(e) => setForm((prev) => ({ ...prev, default_price: e.target.value }))}
              required
            />
            <input
              className="input"
              placeholder={t("store.idsInput")}
              value={form.idsText}
              onChange={(e) => setForm((prev) => ({ ...prev, idsText: e.target.value }))}
            />
            <input
              className="input"
              placeholder={t("store.imageUrl")}
              value={form.image_url}
              onChange={(e) => setForm((prev) => ({ ...prev, image_url: e.target.value }))}
            />
            <button className="btn-primary" disabled={actionLoading} type="submit">
              {actionLoading ? t("store.saving") : t("store.createProduct")}
            </button>
          </div>
        </form>

        <div className="rounded-3xl border border-white/80 bg-white/70 p-5 shadow-lg shadow-slate-200/60">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl">{t("store.inventory")}</h2>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input max-w-xs"
              placeholder={t("store.search")}
            />
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              <div className="flex items-center justify-between gap-2">
                <span>{error}</span>
                <button
                  type="button"
                  className="rounded-full bg-white px-3 py-1 text-xs font-semibold"
                  onClick={() => dispatch(clearError())}
                >
                  {t("common.close")}
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {loading ? <p className="text-sm text-slate-600">{t("store.loadingProducts")}</p> : null}
            {!loading && filteredProducts.length === 0 ? (
              <p className="text-sm text-slate-600">{t("store.noProducts")}</p>
            ) : null}
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onDelete={handleDelete}
                deleting={actionLoading}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
