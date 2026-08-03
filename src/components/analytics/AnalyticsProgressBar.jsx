export default function AnalyticsProgressBar({ label, value, detail }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white">{label}</p>
          {detail && (
            <p className="mt-1 text-xs text-muted">{detail}</p>
          )}
        </div>

        <span className="text-lg font-black tabular-nums text-white">
          {Math.round(safeValue)}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-black/30">
        <div
          className="h-full rounded-full bg-accent transition-all duration-700"
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}
