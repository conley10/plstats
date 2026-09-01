import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  ChartNoAxesCombined,
  CircleDot,
  RefreshCw,
  Shield,
  Trophy,
} from "lucide-react";

import { getHomeData } from "../api/homeApi";
import PlayerCard from "../components/ui/PlayerCard";
import MiniLeaderboard from "../components/ui/MiniLeaderboard";

function formatFixtureDate(dateString) {
  if (!dateString) return "Date unavailable";

  return new Intl.DateTimeFormat("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function getTeamName(team) {
  return team?.name || team?.team || "Unknown team";
}

function getTeamCrest(team) {
  return team?.crest || team?.logo || null;
}

function getScoreValue(score, side) {
  if (!score) return null;

  const directValue = score[side];
  if (directValue !== null && directValue !== undefined) return directValue;

  const fullTimeValue = score.fullTime?.[side];
  if (fullTimeValue !== null && fullTimeValue !== undefined) return fullTimeValue;

  return null;
}

function getPositionStyle(position, totalTeams) {
  if (position === 1) {
    return {
      marker: "bg-warning",
      badge: "border-warning/30 bg-warning/10 text-warning",
    };
  }

  if (position <= 4) {
    return {
      marker: "bg-accent",
      badge: "border-accent/30 bg-accent-soft text-accent",
    };
  }

  if (position === 5 || position === 6) {
    return {
      marker: "bg-violet-400",
      badge: "border-violet-400/30 bg-violet-400/10 text-violet-300",
    };
  }

  if (totalTeams && position > totalTeams - 3) {
    return {
      marker: "bg-danger",
      badge: "border-danger/30 bg-danger/10 text-danger",
    };
  }

  return {
    marker: "bg-transparent",
    badge: "border-transparent bg-transparent text-muted",
  };
}

function calculateSeasonSummary({
  leagueTable,
  allFinishedMatches,
  upcomingFixtures,
  season,
}) {
  const completedMatches = allFinishedMatches.length;

  const totalGoals = allFinishedMatches.reduce((total, result) => {
    const home = Number(
      getScoreValue(result.score, "home") || 0,
    );

    const away = Number(
      getScoreValue(result.score, "away") || 0,
    );

    return total + home + away;
  }, 0);

  const champion = leagueTable[0] || null;

  return {
    seasonLabel:
      season?.label ||
      season?.name ||
      "2026/27",

    champion,
    completedMatches,
    totalGoals,

    averageGoals:
      completedMatches > 0
        ? (totalGoals / completedMatches).toFixed(2)
        : null,

    teamCount: leagueTable.length,
    upcomingCount: upcomingFixtures.length,
    goalsArePartial: false,
  };
}

function StatCard({ icon: Icon, label, value, description }) {
  return (
    <article className="panel panel-hover group p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="section-label">{label}</p>
          <p className="mt-3 font-display text-4xl font-extrabold tabular-nums text-white">
            {value}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent/20 bg-accent-soft text-accent transition-transform duration-200 group-hover:-translate-y-0.5">
          <Icon size={20} />
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-muted">{description}</p>
    </article>
  );
}

function SeasonHero({ summary }) {
  const leader = summary.champion;

  return (
    <section className="panel overflow-hidden">
      <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.35fr_0.65fr] lg:items-center lg:p-10">
        <div>
          <p className="text-sm font-semibold text-muted-light">
            Premier League {summary.seasonLabel}
          </p>

          <h1 className="mt-5 max-w-3xl font-display text-4xl font-extrabold leading-[0.95] text-white sm:text-5xl lg:text-6xl">
            The season is underway.
            <span className="block text-muted-light">
              Follow every match as it happens.
            </span>
          </h1>

          <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-light sm:text-white">
            Track the latest standings, fixtures, results and player rankings
            throughout the {summary.seasonLabel} Premier League season.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/table" className="primary-button">
              View league table
              <ArrowRight size={16} />
            </Link>

            <Link to="/players/rankings" className="secondary-button">
              Player rankings
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-black/10 p-5 sm:p-6">
          <p className="section-label">League leaders</p>

          {leader ? (
            <div className="mt-5 flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                {leader.crest ? (
                  <img
                    src={leader.crest}
                    alt={`${leader.team} crest`}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Trophy size={34} className="text-warning" />
                )}
              </div>

              <div className="min-w-0">
                <p className="truncate font-display text-3xl font-extrabold text-white">
                  {leader.team}
                </p>

                <p className="mt-1 text-sm text-muted">
                  1st place · {leader.points ?? "—"} points
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-5 text-sm leading-6 text-muted">
              League standings will appear here when table data is available.
            </p>
          )}

          <div className="mt-6 border-t border-white/10 pt-5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-surface-light p-2 text-muted-light">
                <ChartNoAxesCombined size={16} />
              </div>

              <div>
                <p className="text-sm font-semibold text-white">
                  Season tracking
                </p>

                <p className="mt-1 text-xs leading-5 text-muted">
                  PLSTATS updates with current standings, results, fixtures and
                  player statistics throughout the season.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LeagueTable({ teams }) {
  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
        <div>
          <p className="section-label mb-1">Standings</p>
          <h2 className="text-lg font-bold text-white">League Table</h2>
        </div>

        <Link
          to="/table"
          className="text-sm font-semibold text-accent transition-colors hover:text-accent-hover"
        >
          Full table →
        </Link>
      </div>

      {teams.length === 0 ? (
        <div className="p-6 text-sm text-muted">
          League table data is currently unavailable.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[580px]">
            <thead>
              <tr className="bg-white/[0.015] text-left text-xs uppercase tracking-[0.06em] text-muted">
                <th className="px-4 py-3 font-semibold sm:px-5">#</th>
                <th className="px-4 py-3 font-semibold">Team</th>
                <th className="px-4 py-3 text-right font-semibold">P</th>
                <th className="px-4 py-3 text-right font-semibold">GD</th>
                <th className="px-4 py-3 text-right font-semibold sm:pr-5">PTS</th>
              </tr>
            </thead>

            <tbody>
              {teams.map((team) => {
                const position = Number(team.position);
                const style = getPositionStyle(position, teams.length);
                const goalDifference = Number(team.goalDifference || 0);

                return (
                  <tr
                    key={team.id || team.team}
                    className="group border-t border-border transition-colors hover:bg-white/[0.03]"
                  >
                    <td className="relative px-4 py-3 text-sm sm:px-5">
                      <span
                        className={`absolute bottom-2 left-0 top-2 w-1 rounded-r-full ${style.marker}`}
                      />
                      <span
                        className={`inline-flex h-7 min-w-7 items-center justify-center rounded-md border px-1.5 text-xs font-bold tabular-nums ${style.badge}`}
                      >
                        {team.position}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <Link
                        to={`/teams/${team.id}`}
                        className="flex items-center gap-3 text-sm font-semibold text-white transition-colors group-hover:text-accent"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.035] p-1">
                          {team.crest ? (
                            <img
                              src={team.crest}
                              alt=""
                              className="h-6 w-6 object-contain"
                            />
                          ) : (
                            <Shield size={16} className="text-muted" />
                          )}
                        </div>

                        <span>{team.team}</span>
                      </Link>
                    </td>

                    <td className="px-4 py-3 text-right text-sm tabular-nums text-muted-light">
                      {team.played}
                    </td>

                    <td
                      className={`px-4 py-3 text-right text-sm font-semibold tabular-nums ${
                        goalDifference > 0
                          ? "text-success"
                          : goalDifference < 0
                            ? "text-danger"
                            : "text-muted-light"
                      }`}
                    >
                      {goalDifference > 0 ? "+" : ""}
                      {goalDifference}
                    </td>

                    <td className="px-4 py-3 text-right font-display text-lg font-extrabold tabular-nums text-white sm:pr-5">
                      {team.points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function TeamIdentity({ team, align = "left" }) {
  return (
    <div
      className={`flex min-w-0 flex-1 items-center gap-3 ${
        align === "right" ? "flex-row-reverse text-right" : ""
      }`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.035] p-2">
        {getTeamCrest(team) ? (
          <img
            src={getTeamCrest(team)}
            alt=""
            className="h-full w-full object-contain"
          />
        ) : (
          <Shield size={18} className="text-muted" />
        )}
      </div>

      <span className="truncate text-sm font-semibold text-white">
        {getTeamName(team)}
      </span>
    </div>
  );
}

function FixturesPanel({ fixtures }) {
  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
        <div>
          <p className="section-label mb-1">Schedule</p>
          <h2 className="text-lg font-bold text-white">Upcoming Fixtures</h2>
        </div>

        <Link
          to="/fixtures"
          className="text-sm font-semibold text-accent hover:text-accent-hover"
        >
          View all →
        </Link>
      </div>

      {fixtures.length === 0 ? (
        <div className="p-6 sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-accent/20 bg-accent-soft text-accent">
            <CalendarDays size={22} />
          </div>

          <h3 className="mt-5 text-lg font-bold text-white">
            Waiting for the new schedule
          </h3>

          <p className="mt-2 max-w-lg text-sm leading-6 text-muted">
            The next Premier League fixtures will appear here as soon as the
            new-season schedule is available.
          </p>

          <Link
            to="/fixtures"
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:text-accent-hover"
          >
            Browse completed matches
            <ArrowRight size={15} />
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {fixtures.map((fixture) => (
            <Link
              key={fixture.id}
              to={`/fixtures/${fixture.id}`}
              className="block px-4 py-4 transition-colors hover:bg-white/[0.025] sm:px-5"
            >
              <div className="mb-4 flex items-center justify-between gap-4 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays size={13} />
                  {formatFixtureDate(fixture.utcDate)}
                </span>

                {fixture.matchday && (
                  <span className="rounded-md bg-surface-light px-2 py-1 font-semibold text-muted-light">
                    MD {fixture.matchday}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <TeamIdentity team={fixture.homeTeam} align="right" />

                <span className="shrink-0 rounded-lg border border-border bg-black/15 px-3 py-2 font-display text-lg font-extrabold text-muted-light">
                  VS
                </span>

                <TeamIdentity team={fixture.awayTeam} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function ResultsPanel({ results }) {
  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
        <div>
          <p className="section-label mb-1">Completed matches</p>
          <h2 className="text-lg font-bold text-white">Recent Results</h2>
        </div>

        <Link
          to="/fixtures"
          className="text-sm font-semibold text-accent hover:text-accent-hover"
        >
          View all →
        </Link>
      </div>

      {results.length === 0 ? (
        <div className="p-6 text-sm text-muted">
          No recent Premier League results were found.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {results.map((result) => {
            const homeScore = getScoreValue(result.score, "home");
            const awayScore = getScoreValue(result.score, "away");

            return (
              <Link
                key={result.id}
                to={`/fixtures/${result.id}`}
                className="block px-4 py-4 transition-colors hover:bg-white/[0.025] sm:px-5"
              >
                <div className="mb-4 flex items-center justify-between gap-4 text-xs text-muted">
                  <span>{formatFixtureDate(result.utcDate)}</span>
                  <span className="rounded-md bg-success/10 px-2 py-1 font-semibold uppercase tracking-wide text-success">
                    Full time
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <TeamIdentity team={result.homeTeam} align="right" />

                  <div className="flex shrink-0 items-center gap-2 rounded-lg border border-border bg-black/20 px-3 py-2 font-display text-2xl font-extrabold tabular-nums text-white">
                    <span>{homeScore ?? "—"}</span>
                    <span className="text-muted">-</span>
                    <span>{awayScore ?? "—"}</span>
                  </div>

                  <TeamIdentity team={result.awayTeam} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

function EmptyPlayerData({ title, message }) {
  return (
    <section className="panel p-5">
      <h2 className="text-base font-bold text-white">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-muted">{message}</p>
    </section>
  );
}

export default function HomePage() {
  const [homeData, setHomeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadHomeData() {
    try {
      setLoading(true);
      setError("");
      const data = await getHomeData();
      setHomeData(data);
    } catch (requestError) {
      console.error("Unable to load homepage data:", requestError);
      setError(
        "Unable to load Premier League data. Make sure the Express server is running on port 3001.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignoreResponse = false;

    async function requestHomeData() {
      try {
        setLoading(true);
        setError("");
        const data = await getHomeData();

        if (!ignoreResponse) setHomeData(data);
      } catch (requestError) {
        console.error("Unable to load homepage data:", requestError);

        if (!ignoreResponse) {
          setError(
            "Unable to load Premier League data. Make sure the Express server is running on port 3001.",
          );
        }
      } finally {
        if (!ignoreResponse) setLoading(false);
      }
    }

    requestHomeData();

    return () => {
      ignoreResponse = true;
    };
  }, []);

  const {
    leagueTable = [],
    upcomingFixtures = [],
    recentResults = [],
    allFinishedMatches = [],
    topPerformers = [],
    topScorers = [],
    topAssists = [],
    season = null,
  } = homeData || {};

  const seasonSummary = useMemo(
    () =>
      calculateSeasonSummary({
        leagueTable,
        allFinishedMatches,
        upcomingFixtures,
        season,
      }),
    [leagueTable, allFinishedMatches, upcomingFixtures, season],
  );

  if (loading) {
    return (
      <main className="page-container">
        <div className="panel flex min-h-52 items-center justify-center p-8">
          <div className="text-center">
            <RefreshCw size={24} className="mx-auto animate-spin text-accent" />
            <p className="mt-4 text-sm text-muted">
              Loading Premier League data...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page-container">
        <div className="panel border-danger/40 p-8">
          <p className="section-label mb-3 text-danger">Connection error</p>
          <h1 className="text-xl font-bold text-white">
            Premier League data could not be loaded
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{error}</p>

          <button
            type="button"
            className="primary-button mt-6"
            onClick={loadHomeData}
          >
            <RefreshCw size={16} />
            Try again
          </button>
        </div>
      </main>
    );
  }

  const statCards = [
    {
      icon: CircleDot,
      label: "Completed matches",
      value: seasonSummary.completedMatches || "—",
      description: "Calculated from the final league table.",
    },
    seasonSummary.totalGoals > 0
      ? {
          icon: ChartNoAxesCombined,
          label: seasonSummary.goalsArePartial ? "Goals in recent results" : "Total goals",
          value: seasonSummary.totalGoals,
          description: seasonSummary.goalsArePartial
            ? "Based on the recent results currently returned by the API."
            : "Combined goals scored across the league table.",
        }
      : {
          icon: Shield,
          label: "Premier League teams",
          value: seasonSummary.teamCount || "—",
          description: "Clubs currently included in the standings.",
        },
    seasonSummary.averageGoals
      ? {
          icon: ChartNoAxesCombined,
          label: "Goals per match",
          value: seasonSummary.averageGoals,
          description: seasonSummary.goalsArePartial
            ? "Average across the recent results shown below."
            : "Season scoring average across completed matches.",
        }
      : {
          icon: Trophy,
          label: "Leader points",
          value: seasonSummary.champion?.points ?? "—",
          description: "Points recorded by the first-place team.",
        },
    {
      icon: CalendarDays,
      label: "Upcoming fixtures",
      value: seasonSummary.upcomingCount,
      description: seasonSummary.upcomingCount
        ? "Matches currently available in the schedule."
        : "The new-season schedule has not been loaded yet.",
    },
  ];

  return (
    <main className="page-container animate-fade-in">
      <SeasonHero summary={seasonSummary} />

      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </section>

      <section className="mt-6 grid items-start gap-5 xl:grid-cols-[1.45fr_0.75fr]">
        <LeagueTable teams={leagueTable} />

        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-1">
          {topScorers.length > 0 ? (
            <MiniLeaderboard
              title="Top Scorers"
              subtitle="Leading goal scorers"
              valueLabel="Goals"
              players={topScorers}
              viewAllTo="/players/rankings?sort=goals"
            />
          ) : (
            <EmptyPlayerData
              title="Top Scorers"
              message="Top scorer data is not available from the Home API yet."
            />
          )}

          {topAssists.length > 0 ? (
            <MiniLeaderboard
              title="Top Assists"
              subtitle="Leading chance creators"
              valueLabel="Assists"
              players={topAssists}
              viewAllTo="/players/rankings?sort=assists"
            />
          ) : (
            <EmptyPlayerData
              title="Top Assists"
              message="Assist data will appear when the player statistics source is connected."
            />
          )}
        </div>
      </section>

      <section className="mt-5 grid items-start gap-5 lg:grid-cols-2">
        <FixturesPanel fixtures={upcomingFixtures} />
        <ResultsPanel results={recentResults} />
      </section>
    </main>
  );
}