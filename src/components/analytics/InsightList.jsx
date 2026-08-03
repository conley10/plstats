import { AlertTriangle, CheckCircle2 } from "lucide-react";

export default function InsightList({ title, items, type = "strength" }) {
  const isStrength = type === "strength";
  const Icon = isStrength ? CheckCircle2 : AlertTriangle;

  return (
    <article className="rounded-2xl border border-border bg-panel p-6">
      <h3 className="text-lg font-black text-white">{title}</h3>

      <div className="mt-5 space-y-4">
        {items.length ? (
          items.map((item) => (
            <div key={item} className="flex items-start gap-3">
              <Icon
                size={18}
                className={isStrength ? "mt-0.5 text-green-400" : "mt-0.5 text-yellow-300"}
              />
              <p className="text-sm leading-6 text-muted-light">{item}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted">Not enough data is available yet.</p>
        )}
      </div>
    </article>
  );
}
