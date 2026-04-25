import Image from "next/image";

const fallbackImage = "https://picsum.photos/seed/spare-erp/900/600";

export default function ProductCard({ product }) {
  const tracked = Array.isArray(product.ids) && product.ids.length > 0;

  return (
    <article className="group overflow-hidden rounded-3xl border border-white/70 bg-white/90 shadow-md shadow-slate-200/70">
      <div className="relative h-44 w-full overflow-hidden">
        <Image
          src={product.image_url || fallbackImage}
          alt={product.name}
          fill
          className="object-cover transition duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-white">
          <p className="text-xs uppercase tracking-[0.2em]">{product.category}</p>
          <h3 className="font-display text-2xl leading-tight">{product.name}</h3>
        </div>
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Stock</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-900">{product.stock}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Default Price</span>
          <span className="font-semibold text-slate-900">Rs {Number(product.default_price || 0).toFixed(2)}</span>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Mode</p>
          <p className="text-sm font-medium text-slate-800">{tracked ? "Tracked by IDs" : "Bulk quantity"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">IDs</p>
          <p className="max-h-16 overflow-auto text-sm text-slate-700">
            {tracked ? product.ids.join(", ") : "No item IDs for this product"}
          </p>
        </div>
      </div>
    </article>
  );
}
