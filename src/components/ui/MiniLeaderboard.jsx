import { ArrowRight, Shield } from "lucide-react";
import { Link } from "react-router-dom";

function getPlayerValue(player) {
  return Number(player.value ?? player.goals ?? player.assists ?? 0);
}

function getTeamName(player) {
  return player.team?.name || player.team || "Unknown team";
}

function getTeamCrest(player) {
  return (
    player.team?.crest ||
    player.teamCrest ||
    player.crest ||
    null
  );
}

export default function MiniLeaderboard({
  title,
  subtitle,
  valueLabel = "",
  players = [],
  viewAllTo,
}) {
  const leaderValue = Math.max(...players.map(getPlayerValue), 1);

  return (
    <section className="panel overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div>
          {subtitle && <p className="section-label mb-1">{subtitle}</p>}
          <h2 className="text-lg font-bold text-white">{title}</h2>
        </div>

        {viewAllTo && (
          <Link
            to={viewAllTo}
            className="mt-1 text-sm font-semibold text-accent transition-colors hover:text-accent-hover"
          >
            View all →
          </Link>
        )}
      </div>

      {players.length === 0 ? (
        <p className="p-5 text-sm text-muted">No data available.</p>
      ) : (
        <div>
          {players.map((player, index) => {
            const value = getPlayerValue(player);
            const percentage = Math.max((value / leaderValue) * 100, 4);
            const playerContent = (
              <>
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-black tabular-nums ${
                      index === 0
                        ? "bg-accent text-black"
                        : "bg-surface-light text-muted-light"
                    }`}
                  >
                    {index + 1}
                  </span>

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.035] p-2">
                    {getTeamCrest(player) ? (
                      <img
                        src={getTeamCrest(player)}
                        alt=""
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <Shield size={17} className="text-muted" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white transition-colors group-hover:text-accent">
                      {player.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {getTeamName(player)}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="font-display text-2xl font-extrabold tabular-nums text-white">
                      {value}
                    </span>
                    {valueLabel && (
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                        {valueLabel}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.055]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      index === 0 ? "bg-accent" : "bg-accent/45"
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </>
            );

            return player.id ? (
              <Link
                key={`${title}-${player.id}`}
                to={`/players/${player.id}`}
                className="group block border-b border-border px-5 py-4 transition-colors last:border-b-0 hover:bg-white/[0.025]"
              >
                {playerContent}
              </Link>
            ) : (
              <div
                key={`${title}-${player.name}-${index}`}
                className="group border-b border-border px-5 py-4 last:border-b-0"
              >
                {playerContent}
              </div>
            );
          })}
        </div>
      )}

      {viewAllTo && players.length > 0 && (
        <Link
          to={viewAllTo}
          className="flex items-center justify-center gap-2 border-t border-border px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted-light transition-colors hover:bg-white/[0.025] hover:text-accent"
        >
          Explore full rankings
          <ArrowRight size={14} />
        </Link>
      )}
    </section>
  );
}