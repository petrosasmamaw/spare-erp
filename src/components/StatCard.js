export default function StatCard({ label, value, accent = "from-amber-400 to-orange-500" }) {
  return (
    <article className="relative overflow-hidden rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg shadow-slate-200/70">
      <div className={`absolute right-0 top-0 h-28 w-28 -translate-y-1/2 translate-x-1/3 rounded-full bg-gradient-to-br ${accent} opacity-35`} />
      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
    </article>
  );
}
