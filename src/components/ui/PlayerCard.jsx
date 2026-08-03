import { Link } from "react-router-dom";

export default function PlayerCard({ player }) {
  return (
    <Link
      to={`/players/${player.id}`}
      className="panel panel-hover block p-4"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-light">
          {player.photoUrl ? (
            <img
              src={player.photoUrl}
              alt={player.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="font-display text-sm font-bold text-muted-light">
              {player.name
                ?.split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)}
            </span>
          )}
        </div>

        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-white">
            {player.name}
          </h3>

          <p className="truncate text-xs text-muted">
            {player.team}
          </p>
        </div>
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <p className="stat-number text-3xl">
          {player.goals ?? player.value ?? 0}
        </p>

        <p className="mt-1 text-xs text-muted">
          Goals this season
        </p>
      </div>
    </Link>
  );
}