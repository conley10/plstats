import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  Flame,
  Loader2,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Link } from "react-router-dom";

import { getTeams } from "../api/teamsApi";

function clamp(value, minimum = 0, maximum = 100) {
  return Math.min(Math.max(Number(value) || 0, minimum), maximum);
}

function formatGoalDifference(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) return "—";

  return number > 0 ? `+${number}` : String(number);
}

function calculateRatings(team, leagueMaximums) {
  const played = Math.max(Number(team.played || 0), 1);
  const goalsForPerGame = Number(team.goalsFor || 0) / played;
  const goalsAgainstPerGame = Number(team.goalsAgainst || 0) / played;
  const pointsPerGame = Number(team.points || 0) / played;
  const winRate = Number(team.won || 0) / played;

  const attack = clamp(
    (goalsForPerGame / Math.max(leagueMaximums.goalsForPerGame, 1)) * 100,
  );

  const defence = clamp(
    100 -
      (goalsAgainstPerGame /
        Math.max(leagueMaximums.goalsAgainstPerGame, 1)) *
        80,
  );

  const results = clamp((pointsPerGame / 3) * 100);
  const winning = clamp(winRate * 100);

  const overall = Math.round(
    attack * 0.32 +
      defence * 0.28 +
      results * 0.25 +
      winning * 0.15,
  );

  return {
    attack: Math.round(attack),
    defence: Math.round(defence),
    overall,
    goalsForPerGame,
    goalsAgainstPerGame,
    pointsPerGame,
  };
}

function getZone(position, totalTeams) {
  if (position <= 4) {
    return {
      label: "Champions League",
      className: "border-l-sky-400",
    };
  }

  if (position === 5) {
    return {
      label: "Europa League",
      className: "border-l-emerald-400",
    };
  }

  if (position === 6) {
    return {
      label: "Conference League",
      className: "border-l-yellow-400",
    };
  }

  if (position > totalTeams - 3) {
    return {
      label: "Relegation",
      className: "border-l-red-400",
    };
  }

  return {
    label: "Premier League",
    className: "border-l-transparent",
  };
}

function FormBadge({ result }) {
  const styles = {
    W: "border-green-500/30 bg-green-500/15 text-green-300",
    D: "border-yellow-500/30 bg-yellow-500/15 text-yellow-200",
    L: "border-red-500/30 bg-red-500/15 text-red-300",
  };

  return (
    <span
      className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-black ${
        styles[result] || "border-border bg-black/20 text-muted"
      }`}
    >
      {result}
    </span>
  );
}

function RatingPill({ value, label }) {
  return (
    <div className="min-w-20">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          {label}
        </span>

        <span className="text-xs font-black text-white">{value}</span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-black/25">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${clamp(value)}%` }}
        />
      </div>
    </div>
  );
}

function LeaderCard({
  eyebrow,
  title,
  value,
  description,
  icon: Icon,
  team,
}) {
  return (
    <article className="rounded-2xl border border-border bg-panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            {eyebrow}
          </p>

          <h3 className="mt-2 text-xl font-black text-white">
            {title}
          </h3>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-black/20">
          <Icon size={20} className="text-accent" />
        </div>
      </div>

      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-3xl font-black text-white">{value}</p>

          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>

        {team?.crest && (
          <img
            src={team.crest}
            alt={team.name}
            className="h-12 w-12 object-contain"
          />
        )}
      </div>
    </article>
  );
}

export default function LeagueTablePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState("table");

  useEffect(() => {
    let cancelled = false;

    async function loadTable() {
      try {
        setLoading(true);
        setError("");

        const response = await getTeams();

        if (!cancelled) {
          setData(response);
        }
      } catch (requestError) {
        console.error("Unable to load league table:", requestError);

        if (!cancelled) {
          setError("Unable to load the Premier League table.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTable();

    return () => {
      cancelled = true;
    };
  }, []);

const teams = useMemo(
  () => data?.teams || [],
  [data],
);

  const analyticsTeams = useMemo(() => {
    if (!teams.length) return [];

    const maximums = {
      goalsForPerGame: Math.max(
        ...teams.map(
          (team) =>
            Number(team.goalsFor || 0) /
            Math.max(Number(team.played || 0), 1),
        ),
      ),
      goalsAgainstPerGame: Math.max(
        ...teams.map(
          (team) =>
            Number(team.goalsAgainst || 0) /
            Math.max(Number(team.played || 0), 1),
        ),
      ),
    };

    return teams.map((team) => ({
      ...team,
      ratings: calculateRatings(team, maximums),
    }));
  }, [teams]);

  const tableTeams = useMemo(() => {
    if (view === "power") {
      return [...analyticsTeams].sort(
        (a, b) =>
          b.ratings.overall - a.ratings.overall ||
          b.points - a.points,
      );
    }

    if (view === "attack") {
      return [...analyticsTeams].sort(
        (a, b) =>
          b.ratings.attack - a.ratings.attack ||
          b.goalsFor - a.goalsFor,
      );
    }

    if (view === "defence") {
      return [...analyticsTeams].sort(
        (a, b) =>
          b.ratings.defence - a.ratings.defence ||
          a.goalsAgainst - b.goalsAgainst,
      );
    }

    return [...analyticsTeams].sort(
      (a, b) => a.position - b.position,
    );
  }, [analyticsTeams, view]);

  const bestAttack = useMemo(
    () =>
      [...analyticsTeams].sort(
        (a, b) => b.goalsFor - a.goalsFor,
      )[0] || null,
    [analyticsTeams],
  );

  const bestDefence = useMemo(
    () =>
      [...analyticsTeams].sort(
        (a, b) => a.goalsAgainst - b.goalsAgainst,
      )[0] || null,
    [analyticsTeams],
  );

  const bestForm = useMemo(
    () =>
      [...analyticsTeams].sort((a, b) => {
        const scoreForm = (form = []) =>
          form.reduce((total, result) => {
            if (result === "W") return total + 3;
            if (result === "D") return total + 1;
            return total;
          }, 0);

        return scoreForm(b.recentForm) - scoreForm(a.recentForm);
      })[0] || null,
    [analyticsTeams],
  );

  const powerLeader = useMemo(
    () =>
      [...analyticsTeams].sort(
        (a, b) => b.ratings.overall - a.ratings.overall,
      )[0] || null,
    [analyticsTeams],
  );

  if (loading) {
    return (
      <main className="page-container">
        <section className="panel flex min-h-80 items-center justify-center">
          <div className="text-center">
            <Loader2
              size={34}
              className="mx-auto animate-spin text-accent"
            />

            <p className="mt-4 text-sm text-muted">
              Loading Premier League table...
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
            League table could not be loaded
          </h1>

          <p className="mt-3 text-muted">{error}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-container">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-panel p-6 md:p-8">
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              League dashboard
            </p>

            <h1 className="page-heading mt-2">
              Premier League Table
            </h1>

            <p className="mt-3 max-w-2xl leading-7 text-muted-light">
              Explore the current standings, form, qualification
              zones and position-adjusted team strength ratings.
            </p>
          </div>

          {analyticsTeams[0] && (
            <div className="min-w-72 rounded-2xl border border-accent/30 bg-accent-soft p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                Current leaders
              </p>

              <div className="mt-3 flex items-center justify-between gap-5">
                <div>
                  <p className="text-2xl font-black text-white">
                    {analyticsTeams[0].name}
                  </p>

                  <p className="mt-1 text-sm text-muted-light">
                    {analyticsTeams[0].points} points
                  </p>
                </div>

                {analyticsTeams[0].crest && (
                  <img
                    src={analyticsTeams[0].crest}
                    alt={analyticsTeams[0].name}
                    className="h-14 w-14 object-contain"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <LeaderCard
          eyebrow="Best attack"
          title={bestAttack?.name || "—"}
          value={bestAttack?.goalsFor ?? "—"}
          description="League goals scored"
          icon={Flame}
          team={bestAttack}
        />

        <LeaderCard
          eyebrow="Best defence"
          title={bestDefence?.name || "—"}
          value={bestDefence?.goalsAgainst ?? "—"}
          description="League goals conceded"
          icon={ShieldCheck}
          team={bestDefence}
        />

        <LeaderCard
          eyebrow="Best form"
          title={bestForm?.name || "—"}
          value={
            bestForm?.recentForm?.length
              ? bestForm.recentForm.join("")
              : "—"
          }
          description="Last five league matches"
          icon={Sparkles}
          team={bestForm}
        />

        <LeaderCard
          eyebrow="Power leader"
          title={powerLeader?.name || "—"}
          value={powerLeader?.ratings.overall ?? "—"}
          description="Overall team rating"
          icon={Trophy}
          team={powerLeader}
        />
      </section>

      <section className="panel mt-8 overflow-hidden">
        <div className="border-b border-border p-6">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                Standings
              </p>

              <h2 className="mt-2 text-2xl font-black text-white">
                League rankings
              </h2>

              <p className="mt-1 text-sm text-muted">
                Switch between the official table and analytics-based
                rankings.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                ["table", "Official table"],
                ["power", "Power rankings"],
                ["attack", "Attack"],
                ["defence", "Defence"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setView(value)}
                  className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                    view === value
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-border text-muted-light hover:border-accent/50 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-left text-sm">
            <thead className="border-b border-border bg-black/10 text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-5 py-4">Rank</th>
                <th className="px-5 py-4">Team</th>
                <th className="px-5 py-4 text-center">Form</th>
                <th className="px-5 py-4 text-right">P</th>
                <th className="px-5 py-4 text-right">W</th>
                <th className="px-5 py-4 text-right">D</th>
                <th className="px-5 py-4 text-right">L</th>
                <th className="px-5 py-4 text-right">GF</th>
                <th className="px-5 py-4 text-right">GA</th>
                <th className="px-5 py-4 text-right">GD</th>
                <th className="px-5 py-4 text-right">Pts</th>
                <th className="px-5 py-4">Ratings</th>
                <th className="px-5 py-4 text-right">Profile</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {tableTeams.map((team, index) => {
                const displayedRank =
                  view === "table" ? team.position : index + 1;

                const zone = getZone(
                  team.position,
                  analyticsTeams.length,
                );

                return (
                  <tr
                    key={team.id}
                    className={`border-l-4 transition-colors hover:bg-white/[0.03] ${zone.className}`}
                    title={zone.label}
                  >
                    <td className="px-5 py-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-black/20 font-black text-white">
                        {displayedRank}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <Link
                        to={`/teams/${team.id}`}
                        className="group flex items-center gap-3"
                      >
                        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-black/20">
                          {team.crest ? (
                            <img
                              src={team.crest}
                              alt={team.name}
                              className="h-8 w-8 object-contain"
                            />
                          ) : null}
                        </div>

                        <div>
                          <p className="font-bold text-white transition-colors group-hover:text-accent">
                            {team.shortName || team.name}
                          </p>

                          <p className="mt-1 text-xs text-muted">
                            {zone.label}
                          </p>
                        </div>
                      </Link>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-center gap-1.5">
                        {(team.recentForm || []).length ? (
                          team.recentForm.map((result, formIndex) => (
                            <FormBadge
                              key={`${team.id}-${result}-${formIndex}`}
                              result={result}
                            />
                          ))
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-right text-muted-light">
                      {team.played}
                    </td>

                    <td className="px-5 py-4 text-right text-muted-light">
                      {team.won}
                    </td>

                    <td className="px-5 py-4 text-right text-muted-light">
                      {team.drawn}
                    </td>

                    <td className="px-5 py-4 text-right text-muted-light">
                      {team.lost}
                    </td>

                    <td className="px-5 py-4 text-right text-muted-light">
                      {team.goalsFor}
                    </td>

                    <td className="px-5 py-4 text-right text-muted-light">
                      {team.goalsAgainst}
                    </td>

                    <td className="px-5 py-4 text-right font-semibold text-white">
                      {formatGoalDifference(team.goalDifference)}
                    </td>

                    <td className="px-5 py-4 text-right text-xl font-black text-white">
                      {team.points}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex gap-4">
                        <RatingPill
                          label="ATT"
                          value={team.ratings.attack}
                        />

                        <RatingPill
                          label="DEF"
                          value={team.ratings.defence}
                        />

                        <RatingPill
                          label="OVR"
                          value={team.ratings.overall}
                        />
                      </div>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Link
                        to={`/teams/${team.id}`}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-accent transition-colors hover:text-white"
                      >
                        View team
                        <ArrowUpRight size={15} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <article className="panel p-6">
          <div className="flex items-center gap-3">
            <BarChart3 size={22} className="text-accent" />

            <div>
              <h2 className="text-xl font-black text-white">
                League insights
              </h2>

              <p className="text-sm text-muted">
                Quick takeaways from the current table.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-black/10 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                Strongest attack
              </p>

              <p className="mt-2 text-lg font-black text-white">
                {bestAttack?.name || "—"}
              </p>

              <p className="mt-2 text-sm leading-6 text-muted-light">
                {bestAttack
                  ? `${bestAttack.name} lead the league with ${bestAttack.goalsFor} goals, averaging ${bestAttack.ratings.goalsForPerGame.toFixed(2)} per match.`
                  : "Attack data is unavailable."}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-black/10 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                Strongest defence
              </p>

              <p className="mt-2 text-lg font-black text-white">
                {bestDefence?.name || "—"}
              </p>

              <p className="mt-2 text-sm leading-6 text-muted-light">
                {bestDefence
                  ? `${bestDefence.name} have conceded only ${bestDefence.goalsAgainst} goals, an average of ${bestDefence.ratings.goalsAgainstPerGame.toFixed(2)} per match.`
                  : "Defensive data is unavailable."}
              </p>
            </div>
          </div>
        </article>

        <article className="panel p-6">
          <h2 className="text-xl font-black text-white">
            Qualification key
          </h2>

          <p className="mt-1 text-sm text-muted">
            Colours indicate the current league-position zones.
          </p>

          <div className="mt-6 space-y-4">
            {[
              ["bg-sky-400", "Champions League"],
              ["bg-emerald-400", "Europa League"],
              ["bg-yellow-400", "Conference League"],
              ["bg-white/20", "Premier League"],
              ["bg-red-400", "Relegation"],
            ].map(([colour, label]) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-xl border border-border bg-black/10 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`h-3 w-3 rounded-full ${colour}`}
                  />

                  <span className="font-semibold text-white">
                    {label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}