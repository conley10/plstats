export default function RatingCard({ rating, label = "Overall rating", description }) {
  const safeRating = Math.max(0, Math.min(100, Number(rating) || 0));

  return (
    <article className="relative overflow-hidden rounded-2xl border border-accent/30 bg-accent-soft p-6">
      <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-accent/15 blur-3xl" />

      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          {label}
        </p>

        <div className="mt-4 flex items-end gap-2">
          <span className="text-6xl font-black tabular-nums text-white">
            {Math.round(safeRating)}
          </span>
          <span className="pb-2 text-lg font-bold text-muted">/100</span>
        </div>

        {description && (
          <p className="mt-4 max-w-sm text-sm leading-6 text-muted-light">
            {description}
          </p>
        )}
      </div>
    </article>
  );
}
