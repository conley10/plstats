import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownAZ,
  ArrowUpDown,
  Loader2,
  Search,
  Shield,
  Trophy,
  BarChart3,
  GitCompareArrows,
  TableProperties,
} from "lucide-react";
import { Link } from "react-router-dom";

import { getTeams } from "../api/teamsApi";

function FormBadge({ result }) {
  const styles = {
    W: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
    D: "border-yellow-500/30 bg-yellow-500/15 text-yellow-200",
    L: "border-red-500/30 bg-red-500/15 text-red-300",
  };

  return (
    <span
      className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-black ${
        styles[result] ||
        "border-border bg-black/20 text-muted"
      }`}
    >
      {result}
    </span>
  );
}

function formatGoalDifference(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) return "—";
  if (number > 0) return `+${number}`;

  return String(number);
}

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [season, setSeason] = useState("");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("position");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadTeams() {
      try {
        setLoading(true);
        setError("");

        const data = await getTeams();

        if (!cancelled) {
          setTeams(data.teams || []);
          setSeason(data.season || "");
        }
      } catch (requestError) {
        console.error(
          "Unable to load teams:",
          requestError,
        );

        if (!cancelled) {
          setError(
            "Unable to load Premier League teams.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTeams();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleTeams = useMemo(() => {
    const searchValue = query.trim().toLowerCase();

    const filtered = teams.filter((team) => {
      if (!searchValue) return true;

      return [team.name, team.shortName, team.tla]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(searchValue);
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }

      if (sortBy === "points") {
        return b.points - a.points;
      }

      if (sortBy === "goals") {
        return b.goalsFor - a.goalsFor;
      }

      if (sortBy === "goalDifference") {
        return b.goalDifference - a.goalDifference;
      }

      return a.position - b.position;
    });
  }, [teams, query, sortBy]);

  if (loading) {
    return (
      <main className="page-container">
        <section className="panel flex min-h-64 items-center justify-center">
          <div className="text-center">
            <Loader2
              size={30}
              className="mx-auto animate-spin text-accent"
            />

            <p className="mt-4 text-sm text-muted">
              Loading Premier League clubs...
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page-container">
        <section className="panel p-8">
          <h1 className="text-xl font-bold text-white">
            Teams could not be loaded
          </h1>

          <p className="mt-3 text-muted">{error}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-container">
      <section className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
          Premier League clubs
        </p>

        <h1 className="page-heading mt-2">
          Teams
        </h1>

        <p className="mt-3 max-w-2xl leading-7 text-muted-light">
          Explore every Premier League club, their current
          position, record, goal difference and recent form.
        </p>
      </section>

      <section className="mb-8 grid gap-5 md:grid-cols-3">

  <Link
    to="/teams/stats"
    className="group relative overflow-hidden rounded-2xl border border-border bg-panel p-6 transition-all duration-300 hover:-translate-y-1 hover:border-accent/60"
  >
    <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-accent/10 blur-3xl" />

    <div className="relative">
      <BarChart3
        size={34}
        className="text-accent transition-transform group-hover:scale-110"
      />

      <h2 className="mt-5 text-xl font-black text-white">
        Team Statistics
      </h2>

      <p className="mt-2 text-sm leading-6 text-muted">
        Explore attacking rankings, defensive records,
        efficiency, recent form and detailed analytics.
      </p>

      <p className="mt-5 text-sm font-semibold text-accent">
        View Analytics →
      </p>
    </div>
  </Link>

  <Link
    to="/teams/compare"
    className="group relative overflow-hidden rounded-2xl border border-border bg-panel p-6 transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/50"
  >
    <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-blue-500/10 blur-3xl" />

    <div className="relative">
      <GitCompareArrows
        size={34}
        className="text-blue-400 transition-transform group-hover:scale-110"
      />

      <h2 className="mt-5 text-xl font-black text-white">
        Compare Teams
      </h2>

      <p className="mt-2 text-sm leading-6 text-muted">
        Compare any two Premier League clubs side by side
        across every major statistic.
      </p>

      <p className="mt-5 text-sm font-semibold text-blue-400">
        Coming Soon →
      </p>
    </div>
  </Link>

  <Link
    to="/table"
    className="group relative overflow-hidden rounded-2xl border border-border bg-panel p-6 transition-all duration-300 hover:-translate-y-1 hover:border-yellow-500/50"
  >
    <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-yellow-500/10 blur-3xl" />

    <div className="relative">
      <TableProperties
        size={34}
        className="text-yellow-400 transition-transform group-hover:scale-110"
      />

      <h2 className="mt-5 text-xl font-black text-white">
        League Table
      </h2>

      <p className="mt-2 text-sm leading-6 text-muted">
        View the complete Premier League standings,
        positions, points and goal difference.
      </p>

      <p className="mt-5 text-sm font-semibold text-yellow-400">
        View Table →
      </p>
    </div>
  </Link>

</section>

      <section className="panel mb-6 p-5">
        <div className="grid gap-4 md:grid-cols-[1fr_220px]">
          <label className="flex items-center gap-3 rounded-xl border border-border bg-black/20 px-4">
            <Search size={18} className="text-muted" />

            <input
              type="search"
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="Search clubs..."
              className="w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-muted"
            />
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-border bg-black/20 px-4">
            <ArrowUpDown size={18} className="text-muted" />

            <select
              value={sortBy}
              onChange={(event) =>
                setSortBy(event.target.value)
              }
              className="w-full bg-transparent py-3 text-sm text-white outline-none"
            >
              <option value="position">
                League position
              </option>
              <option value="points">Most points</option>
              <option value="goals">
                Most goals scored
              </option>
              <option value="goalDifference">
                Best goal difference
              </option>
              <option value="name">
                Club name
              </option>
            </select>
          </label>
        </div>
      </section>

      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="panel p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Clubs
          </p>
          <p className="mt-2 text-3xl font-black text-white">
            {teams.length}
          </p>
        </article>

        <article className="panel p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Season
          </p>
          <p className="mt-2 text-3xl font-black text-white">
            {season || "Current"}
          </p>
        </article>

        <article className="panel p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            League leaders
          </p>
          <p className="mt-2 truncate text-xl font-black text-white">
            {teams[0]?.name || "—"}
          </p>
        </article>

        <article className="panel p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Top points
          </p>
          <p className="mt-2 text-3xl font-black text-white">
            {teams[0]?.points ?? "—"}
          </p>
        </article>
      </section>

      <section className="grid gap-4">
        {visibleTeams.map((team) => (
          <Link
            key={team.id}
            to={`/teams/${team.id}`}
            className="group grid gap-5 rounded-2xl border border-border bg-panel p-5 transition-all hover:-translate-y-0.5 hover:border-accent/50 lg:grid-cols-[64px_1fr_auto]"
          >
            <div className="flex items-center gap-4 lg:contents">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border bg-black/20 text-xl font-black text-white">
                {team.position}
              </div>

              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-black/20">
                  {team.crest ? (
                    <img
                      src={team.crest}
                      alt={team.name}
                      className="h-11 w-11 object-contain"
                    />
                  ) : (
                    <Shield
                      size={24}
                      className="text-muted"
                    />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-xl font-black text-white transition-colors group-hover:text-accent">
                      {team.name}
                    </h2>

                    {team.position === 1 && (
                      <Trophy
                        size={17}
                        className="shrink-0 text-accent"
                      />
                    )}
                  </div>

                  <p className="mt-1 text-sm text-muted">
                    {team.played} played · {team.won} wins ·{" "}
                    {team.drawn} draws · {team.lost} losses
                  </p>

                  <div className="mt-3 flex items-center gap-2">
                    <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-muted">
                      Form
                    </span>

                    {team.recentForm?.length ? (
                      team.recentForm.map((result, index) => (
                        <FormBadge
                          key={`${team.id}-${index}`}
                          result={result}
                        />
                      ))
                    ) : (
                      <span className="text-sm text-muted">
                        No form available
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 lg:min-w-[390px]">
              <div className="rounded-xl border border-border bg-black/15 px-3 py-3 text-center">
                <p className="text-xs uppercase tracking-wider text-muted">
                  GF
                </p>
                <p className="mt-1 text-lg font-black text-white">
                  {team.goalsFor}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-black/15 px-3 py-3 text-center">
                <p className="text-xs uppercase tracking-wider text-muted">
                  GA
                </p>
                <p className="mt-1 text-lg font-black text-white">
                  {team.goalsAgainst}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-black/15 px-3 py-3 text-center">
                <p className="text-xs uppercase tracking-wider text-muted">
                  GD
                </p>
                <p className="mt-1 text-lg font-black text-white">
                  {formatGoalDifference(
                    team.goalDifference,
                  )}
                </p>
              </div>

              <div className="rounded-xl border border-accent/30 bg-accent-soft px-3 py-3 text-center">
                <p className="text-xs uppercase tracking-wider text-accent">
                  PTS
                </p>
                <p className="mt-1 text-lg font-black text-white">
                  {team.points}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </section>

      {visibleTeams.length === 0 && (
        <section className="panel mt-6 p-8 text-center">
          <ArrowDownAZ
            size={28}
            className="mx-auto text-muted"
          />

          <h2 className="mt-4 text-lg font-bold text-white">
            No clubs found
          </h2>

          <p className="mt-2 text-sm text-muted">
            Try a different search term.
          </p>
        </section>
      )}
    </main>
  );
}