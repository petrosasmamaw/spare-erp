"use client";

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import ProductCard from "@/components/ProductCard";
import { clearError, createProduct, fetchProducts } from "@/lib/features/erpSlice";

const defaultImage = "https://picsum.photos/seed/spare-store/900/600";

export default function StorePage() {
  const dispatch = useDispatch();
  const { products, loading, actionLoading, error } = useSelector((state) => state.erp);

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
      .filter(Boolean);

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

  return (
    <section className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1.4fr]">
        <form
          onSubmit={onSubmit}
          className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg shadow-amber-100/40"
        >
          <h2 className="font-display text-2xl">Add Product</h2>
          <p className="mt-1 text-sm text-slate-600">Create tracked or bulk products from one form.</p>

          <div className="mt-4 grid gap-3">
            <input
              className="input"
              placeholder="Product name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
            <input
              className="input"
              placeholder="Category"
              value={form.category}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              required
            />
            <input
              className="input"
              placeholder="Stock (optional when IDs are set)"
              type="number"
              min="0"
              value={form.stock}
              onChange={(e) => setForm((prev) => ({ ...prev, stock: e.target.value }))}
            />
            <input
              className="input"
              placeholder="Default price"
              type="number"
              min="0"
              step="0.01"
              value={form.default_price}
              onChange={(e) => setForm((prev) => ({ ...prev, default_price: e.target.value }))}
              required
            />
            <input
              className="input"
              placeholder="IDs (comma separated, optional)"
              value={form.idsText}
              onChange={(e) => setForm((prev) => ({ ...prev, idsText: e.target.value }))}
            />
            <input
              className="input"
              placeholder="Image URL"
              value={form.image_url}
              onChange={(e) => setForm((prev) => ({ ...prev, image_url: e.target.value }))}
            />
            <button className="btn-primary" disabled={actionLoading} type="submit">
              {actionLoading ? "Saving..." : "Create Product"}
            </button>
          </div>
        </form>

        <div className="rounded-3xl border border-white/80 bg-white/70 p-5 shadow-lg shadow-slate-200/60">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl">Product Inventory</h2>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input max-w-xs"
              placeholder="Search by name/category"
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
                  Close
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {loading ? <p className="text-sm text-slate-600">Loading products...</p> : null}
            {!loading && filteredProducts.length === 0 ? (
              <p className="text-sm text-slate-600">No products found.</p>
            ) : null}
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
