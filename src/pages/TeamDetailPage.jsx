import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  Goal,
  Loader2,
  MapPin,
  Search,
  Shield,
  Swords,
  Trophy,
  UserRound,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { getTeam } from "../api/teamsApi";
import AnalyticsProgressBar from "../components/analytics/AnalyticsProgressBar";
import InsightList from "../components/analytics/InsightList";
import RatingCard from "../components/analytics/RatingCard";
import TeamRadarChart from "../components/analytics/TeamRadarChart";

function StatCard({ label, value, description }) {
  return (
    <article className="rounded-xl border border-border bg-panel p-5">
      <p className="text-3xl font-black tabular-nums text-white">
        {value}
      </p>

      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted">
        {label}
      </p>

      {description && (
        <p className="mt-2 text-sm text-muted-light">
          {description}
        </p>
      )}
    </article>
  );
}

function FormBadge({ result }) {
  const styles = {
    W: "border-green-500/30 bg-green-500/15 text-green-300",
    D: "border-yellow-500/30 bg-yellow-500/15 text-yellow-200",
    L: "border-red-500/30 bg-red-500/15 text-red-300",
  };

  return (
    <span
      className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-black ${
        styles[result] ||
        "border-border bg-black/20 text-muted"
      }`}
    >
      {result}
    </span>
  );
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateValue));
}

function formatTime(dateValue) {
  if (!dateValue) {
    return "";
  }

  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateValue));
}

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) {
    return null;
  }

  const birthDate = new Date(dateOfBirth);
  const today = new Date();

  let age =
    today.getFullYear() - birthDate.getFullYear();

  const monthDifference =
    today.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 &&
      today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age;
}

function formatGoalDifference(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return number > 0 ? `+${number}` : String(number);
}

function clampRating(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

function getFormPoints(form = []) {
  return form.reduce((total, result) => {
    if (result === "W") return total + 3;
    if (result === "D") return total + 1;
    return total;
  }, 0);
}

function TeamLogo({ team, size = "normal" }) {
  const dimensions =
    size === "large"
      ? "h-24 w-24 md:h-32 md:w-32"
      : "h-10 w-10";

  const imageDimensions =
    size === "large"
      ? "h-20 w-20 md:h-28 md:w-28"
      : "h-8 w-8";

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-black/20 ${dimensions}`}
    >
      {team?.crest ? (
        <img
          src={team.crest}
          alt={team.name}
          className={`${imageDimensions} object-contain`}
        />
      ) : (
        <Shield
          size={size === "large" ? 40 : 20}
          className="text-muted"
        />
      )}
    </div>
  );
}

function MatchCard({ match, selectedTeamId, result }) {
  const homeScore = match.score?.fullTime?.home;
  const awayScore = match.score?.fullTime?.away;

  const hasScore =
    homeScore !== null &&
    homeScore !== undefined &&
    awayScore !== null &&
    awayScore !== undefined;

  const resultStyles = {
    W: "border-green-500/30 bg-green-500/5",
    D: "border-yellow-500/30 bg-yellow-500/5",
    L: "border-red-500/30 bg-red-500/5",
  };

  return (
    <Link
      to={`/fixtures/${match.id}`}
      className={`block rounded-xl border p-4 transition-colors hover:border-accent/50 ${
        result
          ? resultStyles[result]
          : "border-border bg-black/10"
      }`}
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white">
            {formatDate(match.utcDate)}
          </p>

          <p className="mt-1 text-xs text-muted">
            {formatTime(match.utcDate)}
            {match.matchday
              ? ` · Matchday ${match.matchday}`
              : ""}
          </p>
        </div>

        {result && <FormBadge result={result} />}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <TeamLogo team={match.homeTeam} />

            <span
              className={`truncate text-sm ${
                Number(match.homeTeam?.id) ===
                Number(selectedTeamId)
                  ? "font-bold text-white"
                  : "text-muted-light"
              }`}
            >
              {match.homeTeam?.shortName ||
                match.homeTeam?.name}
            </span>
          </div>

          <span className="text-lg font-black text-white">
            {hasScore ? homeScore : "—"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <TeamLogo team={match.awayTeam} />

            <span
              className={`truncate text-sm ${
                Number(match.awayTeam?.id) ===
                Number(selectedTeamId)
                  ? "font-bold text-white"
                  : "text-muted-light"
              }`}
            >
              {match.awayTeam?.shortName ||
                match.awayTeam?.name}
            </span>
          </div>

          <span className="text-lg font-black text-white">
            {hasScore ? awayScore : "—"}
          </span>
        </div>
      </div>
    </Link>
  );
}

function PlayerHighlight({
  title,
  player,
  statLabel,
  statValue,
}) {
  if (!player) {
    return (
      <article className="rounded-xl border border-border bg-panel p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          {title}
        </p>

        <p className="mt-4 text-sm text-muted">
          No player data available.
        </p>
      </article>
    );
  }

  return (
    <Link
      to={`/players/${player.id}`}
      className="group rounded-xl border border-border bg-panel p-5 transition-colors hover:border-accent/50"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-accent">
        {title}
      </p>

      <h3 className="mt-3 text-xl font-black text-white transition-colors group-hover:text-accent">
        {player.name}
      </h3>

      <p className="mt-1 text-sm text-muted-light">
        {player.position || "Player"}
      </p>

      <div className="mt-5 flex items-end justify-between">
        <div>
          <p className="text-3xl font-black text-white">
            {statValue}
          </p>

          <p className="text-xs uppercase tracking-wider text-muted">
            {statLabel}
          </p>
        </div>

        <Goal
          size={24}
          className="text-muted transition-colors group-hover:text-accent"
        />
      </div>
    </Link>
  );
}

export default function TeamDetailPage() {
  const { teamId } = useParams();

  const [data, setData] = useState(null);
  const [squadSearch, setSquadSearch] = useState("");
  const [positionFilter, setPositionFilter] =
    useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadTeam() {
      try {
        setLoading(true);
        setError("");

        const teamData = await getTeam(teamId);

        if (!cancelled) {
          setData(teamData);
        }
      } catch (requestError) {
        console.error(
          "Unable to load team:",
          requestError,
        );

        if (!cancelled) {
          setError(
            "Unable to load the selected team.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTeam();

    return () => {
      cancelled = true;
    };
  }, [teamId]);

  const team = data?.team;
  const standing = data?.standing;
const squad = useMemo(
  () => team?.squad || [],
  [team],
);

const recentForm = useMemo(
  () => data?.recentForm || [],
  [data],
);

const recentResults = useMemo(
  () => data?.recentResults || [],
  [data],
);

const upcomingFixtures = useMemo(
  () => data?.upcomingFixtures || [],
  [data],
);

  const positionOptions = useMemo(() => {
    const positions = squad
      .map((player) => player.position)
      .filter(Boolean);

    return [
      "All",
      ...new Set(positions),
    ];
  }, [squad]);

  const visibleSquad = useMemo(() => {
    const searchValue =
      squadSearch.trim().toLowerCase();

    return squad
      .filter((player) => {
        const matchesSearch =
          !searchValue ||
          [
            player.name,
            player.position,
            player.nationality,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(searchValue);

        const matchesPosition =
          positionFilter === "All" ||
          player.position === positionFilter;

        return matchesSearch && matchesPosition;
      })
      .sort((a, b) => {
        const positionComparison =
          String(a.position).localeCompare(
            String(b.position),
          );

        if (positionComparison !== 0) {
          return positionComparison;
        }

        return a.name.localeCompare(b.name);
      });
  }, [squad, squadSearch, positionFilter]);

  const analytics = useMemo(() => {
    const played = Number(standing?.played || 0);
    const goalsFor = Number(standing?.goalsFor || 0);
    const goalsAgainst = Number(standing?.goalsAgainst || 0);
    const points = Number(standing?.points || 0);
    const position = Number(standing?.position || 20);
    const wins = Number(standing?.won || 0);
    const formPoints = getFormPoints(recentForm);

    const goalsPerGame = played ? goalsFor / played : 0;
    const concededPerGame = played ? goalsAgainst / played : 0;
    const pointsPerGame = played ? points / played : 0;
    const winRate = played ? wins / played : 0;

    const attack = clampRating((goalsPerGame / 2.5) * 100);
    const defence = clampRating(100 - (concededPerGame / 2) * 100);
    const results = clampRating((pointsPerGame / 3) * 100);
    const form = clampRating((formPoints / Math.max(recentForm.length * 3, 1)) * 100);
    const leaguePosition = clampRating(((21 - position) / 20) * 100);
    const squadDepth = clampRating((squad.length / 30) * 100);

    const overall = clampRating(
      attack * 0.22 +
        defence * 0.22 +
        results * 0.22 +
        form * 0.16 +
        leaguePosition * 0.12 +
        squadDepth * 0.06,
    );

    const strengths = [];
    const weaknesses = [];

    if (attack >= 72) strengths.push(`Strong attacking output at ${goalsPerGame.toFixed(2)} goals per match.`);
    else if (attack < 48) weaknesses.push(`Attacking output is limited to ${goalsPerGame.toFixed(2)} goals per match.`);

    if (defence >= 72) strengths.push(`Solid defensive record, conceding ${concededPerGame.toFixed(2)} goals per match.`);
    else if (defence < 48) weaknesses.push(`Defensive consistency is an issue at ${concededPerGame.toFixed(2)} conceded per match.`);

    if (form >= 70) strengths.push(`Recent momentum is strong with ${formPoints} points from the last ${recentForm.length || 0} matches.`);
    else if (form < 45 && recentForm.length) weaknesses.push(`Recent form has dipped, producing only ${formPoints} points from the last ${recentForm.length} matches.`);

    if (winRate >= 0.55) strengths.push(`A high win rate of ${Math.round(winRate * 100)}% supports their league position.`);
    else if (winRate < 0.3 && played) weaknesses.push(`The team has won only ${Math.round(winRate * 100)}% of league matches.`);

    if (squad.length >= 24) strengths.push(`The registered squad offers good depth with ${squad.length} players.`);
    else if (squad.length && squad.length < 20) weaknesses.push(`Squad depth may become a concern with only ${squad.length} registered players.`);

    if (!strengths.length) strengths.push("The team profile is balanced without one clearly dominant area.");
    if (!weaknesses.length) weaknesses.push("No major statistical weakness stands out from the currently available data.");

    return {
      overall, attack, defence, results, form, leaguePosition, squadDepth,
      goalsPerGame, concededPerGame, pointsPerGame, strengths, weaknesses,
      radar: [
        { metric: "Attack", value: attack },
        { metric: "Defence", value: defence },
        { metric: "Results", value: results },
        { metric: "Form", value: form },
        { metric: "Position", value: leaguePosition },
        { metric: "Squad", value: squadDepth },
      ],
    };
  }, [standing, recentForm, squad.length]);

  if (loading) {
    return (
      <main className="page-container flex min-h-80 items-center justify-center">
        <div className="text-center">
          <Loader2
            size={34}
            className="mx-auto animate-spin text-accent"
          />

          <p className="mt-4 text-sm text-muted">
            Loading team details...
          </p>
        </div>
      </main>
    );
  }

  if (error || !data || !team) {
    return (
      <main className="page-container">
        <section className="panel p-8">
          <h1 className="text-xl font-bold text-white">
            Team could not be loaded
          </h1>

          <p className="mt-3 text-muted">
            {error || "Team not found."}
          </p>

          <Link
            to="/teams"
            className="primary-button mt-6 inline-flex"
          >
            Back to Teams
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="page-container">
      <Link
        to="/teams"
        className="mb-8 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-white"
      >
        <ArrowLeft size={17} />
        Back to Teams
      </Link>

      <section className="relative overflow-hidden rounded-2xl border border-border bg-panel p-6 md:p-8">
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <TeamLogo team={team} size="large" />

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                Premier League club
              </p>

              <h1 className="mt-2 text-4xl font-black text-white md:text-5xl">
                {team.name}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-muted-light">
                {team.venue && (
                  <span className="inline-flex items-center gap-2">
                    <MapPin
                      size={16}
                      className="text-accent"
                    />
                    {team.venue}
                  </span>
                )}

                {team.founded && (
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays
                      size={16}
                      className="text-accent"
                    />
                    Founded {team.founded}
                  </span>
                )}

                {team.coach?.name && (
                  <span className="inline-flex items-center gap-2">
                    <UserRound
                      size={16}
                      className="text-accent"
                    />
                    {team.coach.name}
                  </span>
                )}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Recent form
                </span>

                {recentForm.length ? (
                  recentForm.map((result, index) => (
                    <FormBadge
                      key={`${result}-${index}`}
                      result={result}
                    />
                  ))
                ) : (
                  <span className="text-sm text-muted">
                    Form unavailable
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-72">
            <div className="rounded-xl border border-accent/30 bg-accent-soft p-4 text-center">
              <p className="text-4xl font-black text-white">
                {standing?.position ?? "—"}
              </p>

              <p className="mt-1 text-xs uppercase tracking-wider text-accent">
                League position
              </p>
            </div>

            <div className="rounded-xl border border-border bg-black/15 p-4 text-center">
              <p className="text-4xl font-black text-white">
                {standing?.points ?? "—"}
              </p>

              <p className="mt-1 text-xs uppercase tracking-wider text-muted">
                Points
              </p>
            </div>
          </div>
        </div>

        <div className="relative mt-7 flex flex-wrap gap-3">
  {team.website && (
    <a
      href={team.website}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-light transition-colors hover:border-accent hover:text-white"
    >
      Official website
      <ExternalLink size={15} />
    </a>
  )}

  <Link
    to={`/teams/compare?team=${team.id}`}
    className="inline-flex items-center gap-2 rounded-lg border border-accent px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent-soft"
  >
    <Swords size={16} />
    Compare Team
  </Link>

  <Link
    to={`/teams/${team.id}/scout`}
    className="inline-flex items-center gap-2 rounded-lg border border-emerald-500 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-400 transition-all hover:bg-emerald-500/20 hover:border-emerald-400"
  >
    🕵️ Scout Report
  </Link>
</div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <StatCard
          label="Played"
          value={standing?.played ?? "—"}
        />

        <StatCard
          label="Wins"
          value={standing?.won ?? "—"}
        />

        <StatCard
          label="Draws"
          value={standing?.drawn ?? "—"}
        />

        <StatCard
          label="Losses"
          value={standing?.lost ?? "—"}
        />

        <StatCard
          label="Goals for"
          value={standing?.goalsFor ?? "—"}
        />

        <StatCard
          label="Goals against"
          value={standing?.goalsAgainst ?? "—"}
        />

        <StatCard
          label="Goal difference"
          value={formatGoalDifference(
            standing?.goalDifference,
          )}
        />
      </section>

      <section className="mt-10">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Team analytics
          </p>

          <h2 className="mt-2 text-2xl font-black text-white">
            Performance dashboard
          </h2>

          <p className="mt-1 max-w-3xl text-sm text-muted">
            Ratings are calculated from league results, scoring, defending, recent form, league position and squad depth.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <RatingCard
            rating={analytics.overall}
            label="Team performance rating"
            description={`${team.name} average ${analytics.pointsPerGame.toFixed(2)} points per match, score ${analytics.goalsPerGame.toFixed(2)} and concede ${analytics.concededPerGame.toFixed(2)}.`}
          />

          <article className="panel p-6">
            <h3 className="text-lg font-black text-white">Team profile</h3>
            <p className="mt-1 text-sm text-muted">Six-part view of the club’s current league performance.</p>
            <TeamRadarChart data={analytics.radar} />
          </article>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <article className="panel p-6">
            <h3 className="text-lg font-black text-white">Rating breakdown</h3>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <AnalyticsProgressBar label="Attack" value={analytics.attack} detail={`${analytics.goalsPerGame.toFixed(2)} goals per match`} />
              <AnalyticsProgressBar label="Defence" value={analytics.defence} detail={`${analytics.concededPerGame.toFixed(2)} conceded per match`} />
              <AnalyticsProgressBar label="Results" value={analytics.results} detail={`${analytics.pointsPerGame.toFixed(2)} points per match`} />
              <AnalyticsProgressBar label="Recent form" value={analytics.form} detail={`${getFormPoints(recentForm)} points from ${recentForm.length} matches`} />
              <AnalyticsProgressBar label="League position" value={analytics.leaguePosition} detail={`Currently ${standing?.position ?? "—"} in the table`} />
              <AnalyticsProgressBar label="Squad depth" value={analytics.squadDepth} detail={`${squad.length} registered players`} />
            </div>
          </article>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-1">
            <InsightList title="Strengths" items={analytics.strengths} type="strength" />
            <InsightList title="Development areas" items={analytics.weaknesses} type="weakness" />
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Key contributors
          </p>

          <h2 className="mt-2 text-2xl font-black text-white">
            Top players
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <PlayerHighlight
            title="Top scorer"
            player={data.topScorer}
            statLabel="Goals"
            statValue={data.topScorer?.goals ?? 0}
          />

          <PlayerHighlight
            title="Top assister"
            player={data.topAssister}
            statLabel="Assists"
            statValue={data.topAssister?.assists ?? 0}
          />
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <article className="panel p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-white">
                Recent results
              </h2>

              <p className="mt-1 text-sm text-muted">
                The club’s five most recent league matches.
              </p>
            </div>

            <Trophy
              size={23}
              className="text-accent"
            />
          </div>

          {recentResults.length ? (
            <div className="space-y-4">
              {recentResults.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  selectedTeamId={team.id}
                  result={match.result}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-border bg-black/10 p-5 text-sm text-muted">
              No recent results are available.
            </p>
          )}
        </article>

        <article className="panel p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-white">
                Upcoming fixtures
              </h2>

              <p className="mt-1 text-sm text-muted">
                The next five scheduled Premier League matches.
              </p>
            </div>

            <CalendarDays
              size={23}
              className="text-accent"
            />
          </div>

          {upcomingFixtures.length ? (
            <div className="space-y-4">
              {upcomingFixtures.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  selectedTeamId={team.id}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-border bg-black/10 p-5 text-sm text-muted">
              No scheduled fixtures are available.
            </p>
          )}
        </article>
      </section>

      <section className="panel mt-8 overflow-hidden">
        <div className="border-b border-border p-6">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                First team
              </p>

              <h2 className="mt-2 text-2xl font-black text-white">
                Squad
              </h2>

              <p className="mt-1 text-sm text-muted">
                {squad.length} registered players
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-[260px_200px]">
              <label className="flex items-center gap-3 rounded-xl border border-border bg-black/20 px-4">
                <Search
                  size={17}
                  className="text-muted"
                />

                <input
                  type="search"
                  value={squadSearch}
                  onChange={(event) =>
                    setSquadSearch(event.target.value)
                  }
                  placeholder="Search squad..."
                  className="w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-muted"
                />
              </label>

              <select
                value={positionFilter}
                onChange={(event) =>
                  setPositionFilter(event.target.value)
                }
                className="rounded-xl border border-border bg-black/20 px-4 py-3 text-sm text-white outline-none"
              >
                {positionOptions.map((position) => (
                  <option
                    key={position}
                    value={position}
                  >
                    {position === "All"
                      ? "All positions"
                      : position}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-black/10 text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-6 py-4">
                  Player
                </th>

                <th className="px-6 py-4">
                  Position
                </th>

                <th className="px-6 py-4">
                  Nationality
                </th>

                <th className="px-6 py-4 text-right">
                  Age
                </th>

                <th className="px-6 py-4 text-right">
                  Profile
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {visibleSquad.map((player) => (
                <tr
                  key={player.id}
                  className="transition-colors hover:bg-white/[0.03]"
                >
                  <td className="px-6 py-4">
                    <Link
                      to={`/players/${player.id}`}
                      className="font-semibold text-white transition-colors hover:text-accent"
                    >
                      {player.name}
                    </Link>
                  </td>

                  <td className="px-6 py-4 text-muted-light">
                    {player.position || "Unknown"}
                  </td>

                  <td className="px-6 py-4 text-muted-light">
                    {player.nationality || "—"}
                  </td>

                  <td className="px-6 py-4 text-right text-muted-light">
                    {calculateAge(player.dateOfBirth) ??
                      "—"}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/players/${player.id}`}
                      className="text-sm font-semibold text-accent hover:text-white"
                    >
                      View player
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {visibleSquad.length === 0 && (
          <div className="p-8 text-center">
            <Search
              size={28}
              className="mx-auto text-muted"
            />

            <h3 className="mt-4 font-bold text-white">
              No players found
            </h3>

            <p className="mt-2 text-sm text-muted">
              Try another name or position.
            </p>
          </div>
        )}
      </section>

      <section className="panel mt-8 p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          Team season summary
        </p>

        <h2 className="mt-2 text-xl font-bold text-white">
          {team.name} overview
        </h2>

        <p className="mt-3 max-w-4xl leading-7 text-muted-light">
          {team.name} currently sit{" "}
          <strong className="text-white">
            {standing?.position ?? "—"}
          </strong>{" "}
          in the Premier League with{" "}
          <strong className="text-white">
            {standing?.points ?? "—"} points
          </strong>
          . They have recorded{" "}
          <strong className="text-white">
            {standing?.won ?? 0} wins
          </strong>
          ,{" "}
          <strong className="text-white">
            {standing?.drawn ?? 0} draws
          </strong>{" "}
          and{" "}
          <strong className="text-white">
            {standing?.lost ?? 0} losses
          </strong>
          , scoring{" "}
          <strong className="text-white">
            {standing?.goalsFor ?? 0} goals
          </strong>{" "}
          while conceding{" "}
          <strong className="text-white">
            {standing?.goalsAgainst ?? 0}
          </strong>
          .
        </p>
      </section>
    </main>
  );
}