import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpDown,
  Goal,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getTeams } from "../api/teamsApi";

function formatGoalDifference(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return number > 0 ? `+${number}` : String(number);
}

function formatDecimal(value, digits = 2) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return number.toFixed(digits);
}

function getPointsPerGame(team) {
  if (!team?.played) {
    return 0;
  }

  return Number(team.points || 0) / Number(team.played);
}

function getWinPercentage(team) {
  if (!team?.played) {
    return 0;
  }

  return (
    (Number(team.won || 0) / Number(team.played)) *
    100
  );
}

function getFormPoints(team) {
  return (team.recentForm || []).reduce(
    (total, result) => {
      if (result === "W") {
        return total + 3;
      }

      if (result === "D") {
        return total + 1;
      }

      return total;
    },
    0,
  );
}

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

function TeamCrest({ team, size = "normal" }) {
  const containerSize =
    size === "large"
      ? "h-16 w-16"
      : "h-10 w-10";

  const imageSize =
    size === "large"
      ? "h-12 w-12"
      : "h-8 w-8";

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-black/20 ${containerSize}`}
    >
      {team?.crest ? (
        <img
          src={team.crest}
          alt={team.name}
          className={`${imageSize} object-contain`}
        />
      ) : (
        <Trophy size={20} className="text-muted" />
      )}
    </div>
  );
}

function LeaderCard({
  eyebrow,
  title,
  team,
  value,
  description,
  icon: Icon,
}) {
  return (
    <Link
      to={`/teams/${team?.id}`}
      className="group relative overflow-hidden rounded-2xl border border-border bg-panel p-5 transition-colors hover:border-accent/50"
    >
      <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              {eyebrow}
            </p>

            <h3 className="mt-2 text-lg font-black text-white">
              {title}
            </h3>
          </div>

          <Icon
            size={22}
            className="text-muted transition-colors group-hover:text-accent"
          />
        </div>

        <div className="mt-6 flex items-center gap-4">
          <TeamCrest team={team} size="large" />

          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-white">
              {team?.shortName || team?.name || "Unavailable"}
            </p>

            <p className="mt-1 text-3xl font-black tabular-nums text-accent">
              {value}
            </p>

            <p className="mt-1 text-xs uppercase tracking-wider text-muted">
              {description}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

function RankingTable({
  title,
  description,
  teams,
  valueLabel,
  getValue,
  formatValue = (value) => value,
}) {
  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-border p-5">
        <h2 className="text-xl font-black text-white">
          {title}
        </h2>

        <p className="mt-1 text-sm text-muted">
          {description}
        </p>
      </div>

      <div className="divide-y divide-border">
        {teams.slice(0, 5).map((team, index) => (
          <Link
            key={team.id}
            to={`/teams/${team.id}`}
            className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-white/[0.03]"
          >
            <div className="flex min-w-0 items-center gap-4">
              <span className="w-5 text-sm font-black text-muted">
                {index + 1}
              </span>

              <TeamCrest team={team} />

              <div className="min-w-0">
                <p className="truncate font-semibold text-white">
                  {team.shortName || team.name}
                </p>

                <p className="mt-1 text-xs text-muted">
                  {team.played} matches played
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xl font-black text-white">
                {formatValue(getValue(team))}
              </p>

              <p className="text-xs uppercase tracking-wider text-muted">
                {valueLabel}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function DashboardTooltip({
  active,
  payload,
  label,
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border bg-panel px-4 py-3 shadow-2xl">
      <p className="mb-2 font-semibold text-white">
        {label}
      </p>

      {payload.map((entry) => (
        <p
          key={entry.dataKey}
          className="text-sm text-muted-light"
        >
          {entry.name}:{" "}
          <span className="font-semibold text-white">
            {entry.value}
          </span>
        </p>
      ))}
    </div>
  );
}

export default function TeamStatsPage() {
  const [teams, setTeams] = useState([]);
  const [season, setSeason] = useState("");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] =
    useState("position");
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
          "Unable to load team statistics:",
          requestError,
        );

        if (!cancelled) {
          setError(
            "Unable to load Premier League team statistics.",
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

  const sortedTeams = useMemo(() => {
    return [...teams].sort(
      (a, b) => a.position - b.position,
    );
  }, [teams]);

  const leaders = useMemo(() => {
    if (!teams.length) {
      return {};
    }

    const bestAttack = [...teams].sort(
      (a, b) => b.goalsFor - a.goalsFor,
    )[0];

    const bestDefence = [...teams].sort(
      (a, b) =>
        a.goalsAgainst - b.goalsAgainst,
    )[0];

    const bestGoalDifference = [...teams].sort(
      (a, b) =>
        b.goalDifference - a.goalDifference,
    )[0];

    const mostWins = [...teams].sort(
      (a, b) => b.won - a.won,
    )[0];

    const bestForm = [...teams].sort(
      (a, b) =>
        getFormPoints(b) - getFormPoints(a),
    )[0];

    const bestPointsPerGame = [...teams].sort(
      (a, b) =>
        getPointsPerGame(b) -
        getPointsPerGame(a),
    )[0];

    return {
      bestAttack,
      bestDefence,
      bestGoalDifference,
      mostWins,
      bestForm,
      bestPointsPerGame,
    };
  }, [teams]);

  const attackRanking = useMemo(
    () =>
      [...teams].sort(
        (a, b) => b.goalsFor - a.goalsFor,
      ),
    [teams],
  );

  const defenceRanking = useMemo(
    () =>
      [...teams].sort(
        (a, b) =>
          a.goalsAgainst - b.goalsAgainst,
      ),
    [teams],
  );

  const formRanking = useMemo(
    () =>
      [...teams].sort(
        (a, b) =>
          getFormPoints(b) - getFormPoints(a),
      ),
    [teams],
  );

  const efficiencyRanking = useMemo(
    () =>
      [...teams].sort(
        (a, b) =>
          getPointsPerGame(b) -
          getPointsPerGame(a),
      ),
    [teams],
  );

  const chartData = useMemo(() => {
    return sortedTeams.slice(0, 10).map((team) => ({
      name: team.tla || team.shortName,
      goalsFor: team.goalsFor,
      goalsAgainst: team.goalsAgainst,
      points: team.points,
    }));
  }, [sortedTeams]);

  const visibleTeams = useMemo(() => {
    const searchValue =
      query.trim().toLowerCase();

    const filtered = teams.filter((team) => {
      if (!searchValue) {
        return true;
      }

      return [
        team.name,
        team.shortName,
        team.tla,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(searchValue);
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "points") {
        return b.points - a.points;
      }

      if (sortBy === "goalsFor") {
        return b.goalsFor - a.goalsFor;
      }

      if (sortBy === "goalsAgainst") {
        return (
          a.goalsAgainst - b.goalsAgainst
        );
      }

      if (sortBy === "goalDifference") {
        return (
          b.goalDifference - a.goalDifference
        );
      }

      if (sortBy === "winPercentage") {
        return (
          getWinPercentage(b) -
          getWinPercentage(a)
        );
      }

      if (sortBy === "form") {
        return (
          getFormPoints(b) -
          getFormPoints(a)
        );
      }

      return a.position - b.position;
    });
  }, [teams, query, sortBy]);

  if (loading) {
    return (
      <main className="page-container">
        <section className="panel flex min-h-72 items-center justify-center">
          <div className="text-center">
            <Loader2
              size={34}
              className="mx-auto animate-spin text-accent"
            />

            <p className="mt-4 text-sm text-muted">
              Loading Premier League analytics...
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
            Statistics could not be loaded
          </h1>

          <p className="mt-3 text-muted">
            {error}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-container">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-panel p-6 md:p-8">
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
            Premier League analytics
          </p>

          <h1 className="mt-2 text-4xl font-black text-white md:text-5xl">
            Team Statistics
          </h1>

          <p className="mt-4 max-w-3xl leading-7 text-muted-light">
            Explore club rankings, attacking
            performance, defensive records, recent
            form and season efficiency across the
            Premier League.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="rounded-lg border border-border bg-black/20 px-4 py-2 text-sm text-muted-light">
              Season {season || "Current"}
            </span>

            <span className="rounded-lg border border-border bg-black/20 px-4 py-2 text-sm text-muted-light">
              {teams.length} clubs
            </span>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            League leaders
          </p>

          <h2 className="mt-2 text-2xl font-black text-white">
            Best-performing clubs
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <LeaderCard
            eyebrow="Attacking leader"
            title="Best Attack"
            team={leaders.bestAttack}
            value={
              leaders.bestAttack?.goalsFor ?? "—"
            }
            description="Goals scored"
            icon={Goal}
          />

          <LeaderCard
            eyebrow="Defensive leader"
            title="Best Defence"
            team={leaders.bestDefence}
            value={
              leaders.bestDefence?.goalsAgainst ??
              "—"
            }
            description="Goals conceded"
            icon={ShieldCheck}
          />

          <LeaderCard
            eyebrow="League performance"
            title="Most Wins"
            team={leaders.mostWins}
            value={leaders.mostWins?.won ?? "—"}
            description="League victories"
            icon={Trophy}
          />

          <LeaderCard
            eyebrow="Overall balance"
            title="Best Goal Difference"
            team={leaders.bestGoalDifference}
            value={formatGoalDifference(
              leaders.bestGoalDifference
                ?.goalDifference,
            )}
            description="Goal difference"
            icon={Target}
          />

          <LeaderCard
            eyebrow="Recent momentum"
            title="Best Form"
            team={leaders.bestForm}
            value={
              leaders.bestForm
                ? `${getFormPoints(
                    leaders.bestForm,
                  )}/15`
                : "—"
            }
            description="Points from last five"
            icon={Activity}
          />

          <LeaderCard
            eyebrow="Season efficiency"
            title="Best Points Rate"
            team={leaders.bestPointsPerGame}
            value={
              leaders.bestPointsPerGame
                ? formatDecimal(
                    getPointsPerGame(
                      leaders.bestPointsPerGame,
                    ),
                  )
                : "—"
            }
            description="Points per match"
            icon={Sparkles}
          />
        </div>
      </section>

      <section className="panel mt-8 p-5 md:p-6">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Top-half comparison
          </p>

          <h2 className="mt-2 text-2xl font-black text-white">
            Goals scored vs goals conceded
          </h2>

          <p className="mt-1 text-sm text-muted">
            The current top ten teams ordered by
            league position.
          </p>
        </div>

        <div className="h-[430px]">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(148, 163, 184, 0.14)"
              />

              <XAxis
                dataKey="name"
                tick={{ fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                tick={{ fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip
                content={<DashboardTooltip />}
              />

              <Legend />

              <Bar
                dataKey="goalsFor"
                name="Goals scored"
                fill="#38bdf8"
                radius={[5, 5, 0, 0]}
              />

              <Bar
                dataKey="goalsAgainst"
                name="Goals conceded"
                fill="#f59e0b"
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <RankingTable
          title="Attacking Rankings"
          description="Clubs with the most league goals."
          teams={attackRanking}
          valueLabel="Goals"
          getValue={(team) => team.goalsFor}
        />

        <RankingTable
          title="Defensive Rankings"
          description="Clubs conceding the fewest goals."
          teams={defenceRanking}
          valueLabel="Conceded"
          getValue={(team) =>
            team.goalsAgainst
          }
        />

        <RankingTable
          title="Recent Form"
          description="Points collected across the last five matches."
          teams={formRanking}
          valueLabel="Form points"
          getValue={getFormPoints}
          formatValue={(value) =>
            `${value}/15`
          }
        />

        <RankingTable
          title="Points Efficiency"
          description="Average league points earned per match."
          teams={efficiencyRanking}
          valueLabel="Points per game"
          getValue={getPointsPerGame}
          formatValue={(value) =>
            formatDecimal(value)
          }
        />
      </section>

      <section className="panel mt-8 overflow-hidden">
        <div className="border-b border-border p-5 md:p-6">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                Complete league data
              </p>

              <h2 className="mt-2 text-2xl font-black text-white">
                Club Rankings
              </h2>

              <p className="mt-1 text-sm text-muted">
                Search and sort all Premier League
                teams.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-[260px_220px]">
              <label className="flex items-center gap-3 rounded-xl border border-border bg-black/20 px-4">
                <Search
                  size={17}
                  className="text-muted"
                />

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
                <ArrowUpDown
                  size={17}
                  className="text-muted"
                />

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

                  <option value="points">
                    Points
                  </option>

                  <option value="goalsFor">
                    Goals scored
                  </option>

                  <option value="goalsAgainst">
                    Best defence
                  </option>

                  <option value="goalDifference">
                    Goal difference
                  </option>

                  <option value="winPercentage">
                    Win percentage
                  </option>

                  <option value="form">
                    Recent form
                  </option>
                </select>
              </label>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-black/10 text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-5 py-4">
                  Position
                </th>

                <th className="px-5 py-4">
                  Club
                </th>

                <th className="px-5 py-4 text-right">
                  Played
                </th>

                <th className="px-5 py-4 text-right">
                  Wins
                </th>

                <th className="px-5 py-4 text-right">
                  Goals
                </th>

                <th className="px-5 py-4 text-right">
                  Conceded
                </th>

                <th className="px-5 py-4 text-right">
                  GD
                </th>

                <th className="px-5 py-4 text-right">
                  Points
                </th>

                <th className="px-5 py-4">
                  Form
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {visibleTeams.map((team) => (
                <tr
                  key={team.id}
                  className="transition-colors hover:bg-white/[0.03]"
                >
                  <td className="px-5 py-4">
                    <span className="font-black text-white">
                      {team.position}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <Link
                      to={`/teams/${team.id}`}
                      className="flex min-w-48 items-center gap-3"
                    >
                      <TeamCrest team={team} />

                      <div>
                        <p className="font-semibold text-white transition-colors hover:text-accent">
                          {team.shortName ||
                            team.name}
                        </p>

                        <p className="mt-1 text-xs text-muted">
                          {team.tla}
                        </p>
                      </div>
                    </Link>
                  </td>

                  <td className="px-5 py-4 text-right text-muted-light">
                    {team.played}
                  </td>

                  <td className="px-5 py-4 text-right text-muted-light">
                    {team.won}
                  </td>

                  <td className="px-5 py-4 text-right font-semibold text-white">
                    {team.goalsFor}
                  </td>

                  <td className="px-5 py-4 text-right text-muted-light">
                    {team.goalsAgainst}
                  </td>

                  <td className="px-5 py-4 text-right font-semibold text-white">
                    {formatGoalDifference(
                      team.goalDifference,
                    )}
                  </td>

                  <td className="px-5 py-4 text-right text-lg font-black text-accent">
                    {team.points}
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex gap-1.5">
                      {(team.recentForm || []).map(
                        (result, index) => (
                          <FormBadge
                            key={`${team.id}-${result}-${index}`}
                            result={result}
                          />
                        ),
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {visibleTeams.length === 0 && (
          <div className="p-10 text-center">
            <Search
              size={30}
              className="mx-auto text-muted"
            />

            <h3 className="mt-4 font-bold text-white">
              No clubs found
            </h3>

            <p className="mt-2 text-sm text-muted">
              Try searching for another club.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}