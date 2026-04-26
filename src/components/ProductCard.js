import Image from "next/image";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const fallbackImage = "https://picsum.photos/seed/spare-erp/900/600";

function formatId(item) {
  if (!item) return "";

  const idValue = item.id || "";
  const buyPrice = Number(item.buy_price || 0);

  return buyPrice > 0 ? `${idValue} (Rs ${buyPrice.toFixed(2)})` : idValue;
}

export default function ProductCard({ product, onDelete, deleting = false }) {
  const tracked = Array.isArray(product.ids) && product.ids.length > 0;
  const { t } = useLanguage();

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
          <span className="text-slate-600">{t("productCard.stock")}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-900">{product.stock}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">{t("productCard.defaultPrice")}</span>
          <span className="font-semibold text-slate-900">Rs {Number(product.default_price || 0).toFixed(2)}</span>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{t("productCard.mode")}</p>
          <p className="text-sm font-medium text-slate-800">{tracked ? t("productCard.trackedByIds") : t("productCard.bulkQuantity")}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{t("common.ids")}</p>
          <p className="max-h-16 overflow-auto text-sm text-slate-700">
            {tracked
              ? product.ids.map(formatId).filter(Boolean).join(", ")
              : t("productCard.noIds")}
          </p>
        </div>
        <button
          type="button"
          className="w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => onDelete?.(product)}
          disabled={deleting}
        >
          {deleting ? t("productCard.deleting") : t("productCard.deleteProduct")}
        </button>
      </div>
    </article>
  );
}
