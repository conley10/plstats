import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

function RadarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload;

  return (
    <div className="rounded-lg border border-border bg-panel px-4 py-3 shadow-xl">
      <p className="font-semibold text-white">{point?.metric}</p>
      <p className="mt-1 text-sm text-muted-light">
        Rating: <span className="font-bold text-white">{Math.round(point?.value || 0)}</span>
      </p>
    </div>
  );
}

export default function TeamRadarChart({ data }) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="rgba(148, 163, 184, 0.2)" />
          <PolarAngleAxis
            dataKey="metric"
            tick={{ fill: "#cbd5e1", fontSize: 12 }}
          />
          <Tooltip content={<RadarTooltip />} />
          <Radar
            dataKey="value"
            stroke="#38bdf8"
            fill="#38bdf8"
            fillOpacity={0.28}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
