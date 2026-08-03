import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Check,
  CalendarDays,
  Clipboard,
  Loader2,
  Search,
  Shield,
  Swords,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  getTeamHeadToHead,
  getTeams,
} from "../api/teamsApi";

function formatInteger(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? Math.round(number).toLocaleString("en-AU")
    : "—";
}

function formatDecimal(value, digits = 2) {
  const number = Number(value);

  return Number.isFinite(number) ? number.toFixed(digits) : "—";
}

function formatGoalDifference(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return number > 0 ? `+${number}` : String(number);
}

function getTeamId(team) {
  return team?.id ?? team?.teamId;
}

function getPointsPerGame(team) {
  const played = Number(team?.played);
  const points = Number(team?.points);

  if (!Number.isFinite(played) || played <= 0) {
    return 0;
  }

  return Number.isFinite(points) ? points / played : 0;
}

function getGoalsPerGame(team) {
  const played = Number(team?.played);
  const goals = Number(team?.goalsFor);

  if (!Number.isFinite(played) || played <= 0) {
    return 0;
  }

  return Number.isFinite(goals) ? goals / played : 0;
}

function getGoalsConcededPerGame(team) {
  const played = Number(team?.played);
  const goalsAgainst = Number(team?.goalsAgainst);

  if (!Number.isFinite(played) || played <= 0) {
    return 0;
  }

  return Number.isFinite(goalsAgainst)
    ? goalsAgainst / played
    : 0;
}

function getWinPercentage(team) {
  const played = Number(team?.played);
  const wins = Number(team?.won);

  if (!Number.isFinite(played) || played <= 0) {
    return 0;
  }

  return Number.isFinite(wins) ? (wins / played) * 100 : 0;
}

function getFormPoints(team) {
  return (team?.recentForm || []).reduce((total, result) => {
    if (result === "W") return total + 3;
    if (result === "D") return total + 1;

    return total;
  }, 0);
}

function getFormRecord(team) {
  return (team?.recentForm || []).reduce(
    (record, result) => {
      if (result === "W") record.wins += 1;
      if (result === "D") record.draws += 1;
      if (result === "L") record.losses += 1;

      return record;
    },
    {
      wins: 0,
      draws: 0,
      losses: 0,
    },
  );
}

function getCurrentStreak(team) {
  const form = team?.recentForm || [];

  if (!form.length) {
    return "No form available";
  }

  const latestResult = form[form.length - 1];
  let streak = 0;

  for (let index = form.length - 1; index >= 0; index -= 1) {
    if (form[index] !== latestResult) {
      break;
    }

    streak += 1;
  }

  const labels = {
    W: "Win",
    D: "Draw",
    L: "Loss",
  };

  return `${streak} ${labels[latestResult]}${streak === 1 ? "" : "s"}`;
}

function clamp(value, minimum = 0, maximum = 100) {
  return Math.min(Math.max(value, minimum), maximum);
}

function scaleTo100(value, maximum, inverse = false) {
  const numericValue = Number(value);
  const numericMaximum = Number(maximum);

  if (
    !Number.isFinite(numericValue) ||
    !Number.isFinite(numericMaximum) ||
    numericMaximum <= 0
  ) {
    return 0;
  }

  const score = clamp((numericValue / numericMaximum) * 100);

  return inverse ? 100 - score : score;
}

function TeamCrest({ team, large = false }) {
  const containerSize = large ? "h-24 w-24" : "h-11 w-11";
  const imageSize = large ? "h-16 w-16" : "h-8 w-8";

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
        <Shield
          size={large ? 30 : 18}
          className="text-muted"
        />
      )}
    </div>
  );
}

function TeamSearch({
  label,
  teams,
  selectedId,
  disabledTeamId,
  onSelect,
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selectedTeam = useMemo(
    () =>
      teams.find(
        (team) => String(getTeamId(team)) === String(selectedId),
      ) || null,
    [teams, selectedId],
  );

  const filteredTeams = useMemo(() => {
    const searchValue = query.trim().toLowerCase();

    return teams
      .filter(
        (team) =>
          String(getTeamId(team)) !== String(disabledTeamId),
      )
      .filter((team) => {
        if (!searchValue) return true;

        return [team.name, team.shortName, team.tla]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(searchValue);
      });
  }, [teams, query, disabledTeamId]);

  function chooseTeam(team) {
    onSelect(String(getTeamId(team)));
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted">
        {label}
      </label>

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-4 rounded-xl border border-border bg-panel px-4 py-4 text-left transition-colors hover:border-accent/60"
      >
        <div className="flex min-w-0 items-center gap-3">
          <TeamCrest team={selectedTeam} />

          <div className="min-w-0">
            <p className="truncate font-semibold text-white">
              {selectedTeam?.name || "Choose a team"}
            </p>

            <p className="truncate text-sm text-muted">
              {selectedTeam
                ? `Position ${selectedTeam.position ?? "—"} · ${
                    selectedTeam.points ?? "—"
                  } points`
                : "Search Premier League clubs"}
            </p>
          </div>
        </div>

        <Search size={18} className="shrink-0 text-muted" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-xl border border-border bg-panel shadow-2xl">
          <div className="border-b border-border p-3">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-black/20 px-3">
              <Search size={16} className="text-muted" />

              <input
                autoFocus
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search clubs..."
                className="w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-muted"
              />
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {filteredTeams.length > 0 ? (
              filteredTeams.map((team) => (
                <button
                  key={getTeamId(team)}
                  type="button"
                  onClick={() => chooseTeam(team)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-white/[0.05]"
                >
                  <TeamCrest team={team} />

                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">
                      {team.name}
                    </p>

                    <p className="truncate text-xs text-muted">
                      Position {team.position ?? "—"} ·{" "}
                      {team.points ?? "—"} points
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <p className="px-3 py-6 text-center text-sm text-muted">
                No matching teams found.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
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
      className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-black ${
        styles[result] ||
        "border-border bg-black/20 text-muted"
      }`}
    >
      {result}
    </span>
  );
}

function TeamHero({ team, side }) {
  return (
    <article
      className={`flex flex-col items-center text-center ${
        side === "right"
          ? "lg:items-end lg:text-right"
          : "lg:items-start lg:text-left"
      }`}
    >
      <TeamCrest team={team} large />

      <h2 className="mt-4 text-3xl font-black text-white">
        {team.name}
      </h2>

      <p className="mt-2 text-muted-light">
        Position {team.position ?? "—"}
      </p>

      <p className="mt-1 text-sm text-muted">
        {team.points ?? "—"} points · {team.played ?? "—"} matches
        played
      </p>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {team.recentForm?.length ? (
          team.recentForm.map((result, index) => (
            <FormBadge
              key={`${getTeamId(team)}-${index}`}
              result={result}
            />
          ))
        ) : (
          <span className="text-sm text-muted">
            No recent form available
          </span>
        )}
      </div>

      <Link
        to={`/teams/${getTeamId(team)}`}
        className="mt-5 text-sm font-semibold text-accent transition-colors hover:text-white"
      >
        View team profile
      </Link>
    </article>
  );
}

function ComparisonRow({
  label,
  leftValue,
  rightValue,
  formatter = formatInteger,
  lowerIsBetter = false,
}) {
  const leftNumber = Number(leftValue);
  const rightNumber = Number(rightValue);

  const validLeft = Number.isFinite(leftNumber);
  const validRight = Number.isFinite(rightNumber);

  const maximum = Math.max(
    validLeft ? Math.abs(leftNumber) : 0,
    validRight ? Math.abs(rightNumber) : 0,
    1,
  );

  const leftPercent = validLeft
    ? Math.max((Math.abs(leftNumber) / maximum) * 100, 4)
    : 0;

  const rightPercent = validRight
    ? Math.max((Math.abs(rightNumber) / maximum) * 100, 4)
    : 0;

  const leftWins =
    validLeft &&
    validRight &&
    (lowerIsBetter
      ? leftNumber < rightNumber
      : leftNumber > rightNumber);

  const rightWins =
    validLeft &&
    validRight &&
    (lowerIsBetter
      ? rightNumber < leftNumber
      : rightNumber > leftNumber);

  const tied =
    validLeft &&
    validRight &&
    leftNumber === rightNumber;

  return (
    <article className="rounded-xl border border-border bg-panel p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex min-w-20 items-center gap-2">
          {leftWins && (
            <Trophy size={15} className="text-accent" />
          )}

          <span className="text-xl font-black text-white">
            {formatter(leftValue)}
          </span>
        </div>

        <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted">
          {label}
        </p>

        <div className="flex min-w-20 items-center justify-end gap-2">
          <span className="text-xl font-black text-white">
            {formatter(rightValue)}
          </span>

          {rightWins && (
            <Trophy size={15} className="text-accent" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex h-3 justify-end overflow-hidden rounded-full bg-black/25">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              leftWins || tied ? "bg-accent" : "bg-white/20"
            }`}
            style={{ width: `${leftPercent}%` }}
          />
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-black/25">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              rightWins || tied ? "bg-accent" : "bg-white/20"
            }`}
            style={{ width: `${rightPercent}%` }}
          />
        </div>
      </div>
    </article>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-panel px-4 py-3 shadow-xl">
      <p className="mb-2 font-semibold text-white">{label}</p>

      {payload.map((entry) => (
        <p
          key={`${entry.dataKey}-${entry.name}`}
          className="text-sm text-muted-light"
        >
          {entry.name}:{" "}
          <span className="font-semibold text-white">
            {formatDecimal(entry.value, 1)}
          </span>
        </p>
      ))}
    </div>
  );
}

function RecentFormCard({ team }) {
  const record = getFormRecord(team);

  return (
    <article className="panel p-6">
      <div className="flex items-center gap-4">
        <TeamCrest team={team} />

        <div>
          <h3 className="text-xl font-black text-white">
            {team.name}
          </h3>

          <p className="mt-1 text-sm text-muted">
            {getFormPoints(team)} form points
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {team.recentForm?.length ? (
          team.recentForm.map((result, index) => (
            <FormBadge
              key={`${getTeamId(team)}-form-${index}`}
              result={result}
            />
          ))
        ) : (
          <p className="text-sm text-muted">
            No recent form available.
          </p>
        )}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-black/15 p-4 text-center">
          <p className="text-xs uppercase tracking-wider text-muted">
            Wins
          </p>
          <p className="mt-2 text-2xl font-black text-emerald-300">
            {record.wins}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-black/15 p-4 text-center">
          <p className="text-xs uppercase tracking-wider text-muted">
            Draws
          </p>
          <p className="mt-2 text-2xl font-black text-yellow-200">
            {record.draws}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-black/15 p-4 text-center">
          <p className="text-xs uppercase tracking-wider text-muted">
            Losses
          </p>
          <p className="mt-2 text-2xl font-black text-red-300">
            {record.losses}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-black/15 px-4 py-3">
        <p className="text-xs uppercase tracking-wider text-muted">
          Current streak
        </p>
        <p className="mt-1 font-bold text-white">
          {getCurrentStreak(team)}
        </p>
      </div>
    </article>
  );
}


function formatMatchDate(value) {
  if (!value) return "Date unavailable";

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function HeadToHeadMatchCard({ match }) {
  const homeScore = match.score?.fullTime?.home;
  const awayScore = match.score?.fullTime?.away;

  return (
    <article className="rounded-xl border border-border bg-black/15 p-4 transition-colors hover:border-accent/35">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-3">
        <div className="flex items-center gap-2 text-xs text-muted">
          <CalendarDays size={14} />
          <span>{formatMatchDate(match.utcDate)}</span>
        </div>

        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          {match.competition?.name || "Premier League"}
          {match.matchday ? ` · Matchday ${match.matchday}` : ""}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <TeamCrest team={match.homeTeam} />
          <p className="truncate font-bold text-white">
            {match.homeTeam?.shortName || match.homeTeam?.name}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-panel px-4 py-2 text-center text-xl font-black text-white">
          {Number.isFinite(homeScore) ? homeScore : "—"}
          <span className="mx-2 text-muted">–</span>
          {Number.isFinite(awayScore) ? awayScore : "—"}
        </div>

        <div className="flex min-w-0 items-center justify-end gap-3 text-right">
          <p className="truncate font-bold text-white">
            {match.awayTeam?.shortName || match.awayTeam?.name}
          </p>
          <TeamCrest team={match.awayTeam} />
        </div>
      </div>
    </article>
  );
}

function HeadToHeadSection({ data, loading, error }) {
  if (loading) {
    return (
      <section className="panel mt-10 flex min-h-56 items-center justify-center">
        <div className="text-center">
          <Loader2 size={28} className="mx-auto animate-spin text-accent" />
          <p className="mt-3 text-sm text-muted">
            Loading previous meetings...
          </p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="panel mt-10 p-6">
        <h2 className="text-xl font-bold text-white">
          Head-to-head history unavailable
        </h2>
        <p className="mt-2 text-sm text-muted">{error}</p>
      </section>
    );
  }

  if (!data) return null;

  const { summary, teamOne, teamTwo, matches } = data;
  const biggestWin = summary?.biggestWin;

  return (
    <section className="mt-10">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          Rivalry history
        </p>
        <h2 className="mt-2 text-2xl font-black text-white">
          Head-to-head meetings
        </h2>
        <p className="mt-1 text-sm text-muted">
          Recent completed Premier League meetings and the combined record
          from the seasons available through the data provider.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="panel p-5 md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-white">
                Recent meetings
              </h3>
              <p className="mt-1 text-sm text-muted">
                {matches.length
                  ? `Showing the latest ${matches.length} completed meeting${matches.length === 1 ? "" : "s"}.`
                  : "No completed meetings were found."}
              </p>
            </div>
            <Swords size={24} className="text-accent" />
          </div>

          <div className="mt-5 grid gap-3">
            {matches.length ? (
              matches.map((match) => (
                <HeadToHeadMatchCard key={match.id} match={match} />
              ))
            ) : (
              <div className="rounded-xl border border-border bg-black/15 p-8 text-center text-sm text-muted">
                The API did not return any previous meetings for these clubs.
              </div>
            )}
          </div>
        </div>

        <aside className="panel overflow-hidden">
          <div className="border-b border-border p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">
              Overall record
            </p>
            <h3 className="mt-2 text-xl font-black text-white">
              {teamOne.name} vs {teamTwo.name}
            </h3>
          </div>

          <div className="grid grid-cols-3 border-b border-border">
            <div className="p-5 text-center">
              <p className="text-3xl font-black text-white">
                {summary.teamOneWins}
              </p>
              <p className="mt-2 text-xs text-muted">
                {teamOne.shortName || teamOne.name} wins
              </p>
            </div>
            <div className="border-x border-border p-5 text-center">
              <p className="text-3xl font-black text-white">
                {summary.draws}
              </p>
              <p className="mt-2 text-xs text-muted">Draws</p>
            </div>
            <div className="p-5 text-center">
              <p className="text-3xl font-black text-white">
                {summary.teamTwoWins}
              </p>
              <p className="mt-2 text-xs text-muted">
                {teamTwo.shortName || teamTwo.name} wins
              </p>
            </div>
          </div>

          <div className="space-y-4 p-6">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-black/15 p-4">
              <span className="text-sm text-muted">Meetings found</span>
              <span className="font-black text-white">{summary.played}</span>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-black/15 p-4">
              <span className="text-sm text-muted">Combined goals</span>
              <span className="font-black text-white">
                {summary.teamOneGoals}–{summary.teamTwoGoals}
              </span>
            </div>

            {biggestWin && (
              <div className="rounded-xl border border-border bg-black/15 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Biggest victory
                </p>
                <p className="mt-2 font-bold text-white">
                  {biggestWin.winner?.name || "Unknown"} by {biggestWin.margin}
                  {biggestWin.margin === 1 ? " goal" : " goals"}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {biggestWin.match.homeTeam?.shortName || biggestWin.match.homeTeam?.name}{" "}
                  {biggestWin.match.score.fullTime.home}–{biggestWin.match.score.fullTime.away}{" "}
                  {biggestWin.match.awayTeam?.shortName || biggestWin.match.awayTeam?.name}
                </p>
              </div>
            )}

            {data.unavailableSeasons?.length > 0 && (
              <p className="text-xs leading-5 text-muted">
                Historical data was unavailable for season{data.unavailableSeasons.length === 1 ? "" : "s"}:{" "}
                {data.unavailableSeasons.join(", ")}.
              </p>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}

export default function CompareTeamsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [teams, setTeams] = useState([]);
  const [season, setSeason] = useState("");
  const [leftId, setLeftId] = useState(
    searchParams.get("team") || "",
  );
  const [rightId, setRightId] = useState(
    searchParams.get("opponent") || "",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [headToHead, setHeadToHead] = useState(null);
  const [headToHeadLoading, setHeadToHeadLoading] = useState(false);
  const [headToHeadError, setHeadToHeadError] = useState("");

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
          "Unable to load team comparison:",
          requestError,
        );

        if (!cancelled) {
          setError("Unable to load Premier League teams.");
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

  useEffect(() => {
    const nextParams = {};

    if (leftId) nextParams.team = leftId;
    if (rightId) nextParams.opponent = rightId;

    setSearchParams(nextParams, {
      replace: true,
    });
  }, [leftId, rightId, setSearchParams]);

  useEffect(() => {
    let cancelled = false;

if (!leftId || !rightId || leftId === rightId || !season) {
  const resetTimer = window.setTimeout(() => {
    setHeadToHead(null);
    setHeadToHeadError("");
    setHeadToHeadLoading(false);
  }, 0);

  return () => {
    window.clearTimeout(resetTimer);
  };
}

    async function loadHeadToHead() {
      try {
        setHeadToHeadLoading(true);
        setHeadToHeadError("");

        const data = await getTeamHeadToHead(
          leftId,
          rightId,
          {
            season: season || undefined,
            history: 5,
            limit: 5,
          },
        );

        if (!cancelled) {
          setHeadToHead(data);
        }
      } catch (requestError) {
        console.error(
          "Unable to load head-to-head history:",
          requestError,
        );

        if (!cancelled) {
          setHeadToHead(null);
          setHeadToHeadError(
            requestError.message ||
              "Unable to load previous meetings.",
          );
        }
      } finally {
        if (!cancelled) {
          setHeadToHeadLoading(false);
        }
      }
    }

    loadHeadToHead();

    return () => {
      cancelled = true;
    };
  }, [leftId, rightId, season]);

  const leftTeam = useMemo(
    () =>
      teams.find(
        (team) => String(getTeamId(team)) === String(leftId),
      ) || null,
    [teams, leftId],
  );

  const rightTeam = useMemo(
    () =>
      teams.find(
        (team) => String(getTeamId(team)) === String(rightId),
      ) || null,
    [teams, rightId],
  );

  const comparisonStats = useMemo(() => {
    if (!leftTeam || !rightTeam) {
      return [];
    }

    return [
      {
        label: "League position",
        left: leftTeam.position,
        right: rightTeam.position,
        lowerIsBetter: true,
      },
      {
        label: "Points",
        left: leftTeam.points,
        right: rightTeam.points,
      },
      {
        label: "Matches played",
        left: leftTeam.played,
        right: rightTeam.played,
      },
      {
        label: "Wins",
        left: leftTeam.won,
        right: rightTeam.won,
      },
      {
        label: "Draws",
        left: leftTeam.drawn,
        right: rightTeam.drawn,
      },
      {
        label: "Losses",
        left: leftTeam.lost,
        right: rightTeam.lost,
        lowerIsBetter: true,
      },
      {
        label: "Goals scored",
        left: leftTeam.goalsFor,
        right: rightTeam.goalsFor,
      },
      {
        label: "Goals conceded",
        left: leftTeam.goalsAgainst,
        right: rightTeam.goalsAgainst,
        lowerIsBetter: true,
      },
      {
        label: "Goal difference",
        left: leftTeam.goalDifference,
        right: rightTeam.goalDifference,
        formatter: formatGoalDifference,
      },
      {
        label: "Points per game",
        left: getPointsPerGame(leftTeam),
        right: getPointsPerGame(rightTeam),
        formatter: (value) => formatDecimal(value, 2),
      },
      {
        label: "Goals per game",
        left: getGoalsPerGame(leftTeam),
        right: getGoalsPerGame(rightTeam),
        formatter: (value) => formatDecimal(value, 2),
      },
      {
        label: "Goals conceded per game",
        left: getGoalsConcededPerGame(leftTeam),
        right: getGoalsConcededPerGame(rightTeam),
        formatter: (value) => formatDecimal(value, 2),
        lowerIsBetter: true,
      },
      {
        label: "Win percentage",
        left: getWinPercentage(leftTeam),
        right: getWinPercentage(rightTeam),
        formatter: (value) => `${formatDecimal(value, 1)}%`,
      },
      {
        label: "Recent form points",
        left: getFormPoints(leftTeam),
        right: getFormPoints(rightTeam),
      },
    ];
  }, [leftTeam, rightTeam]);

  const comparisonResult = useMemo(() => {
    if (!comparisonStats.length) {
      return null;
    }

    let leftScore = 0;
    let rightScore = 0;
    let ties = 0;

    comparisonStats.forEach((stat) => {
      const leftValue = Number(stat.left);
      const rightValue = Number(stat.right);

      if (
        !Number.isFinite(leftValue) ||
        !Number.isFinite(rightValue)
      ) {
        return;
      }

      if (leftValue === rightValue) {
        ties += 1;
        return;
      }

      const leftWins = stat.lowerIsBetter
        ? leftValue < rightValue
        : leftValue > rightValue;

      if (leftWins) {
        leftScore += 1;
      } else {
        rightScore += 1;
      }
    });

    let winner = null;

    if (leftScore > rightScore) winner = leftTeam;
    if (rightScore > leftScore) winner = rightTeam;

    return {
      leftScore,
      rightScore,
      ties,
      winner,
    };
  }, [comparisonStats, leftTeam, rightTeam]);

  const matchupSummary = useMemo(() => {
    if (!leftTeam || !rightTeam || !comparisonResult) {
      return null;
    }

    const winner = comparisonResult.winner;
    const loser =
      winner && getTeamId(winner) === getTeamId(leftTeam)
        ? rightTeam
        : leftTeam;

    const totalDecided =
      comparisonResult.leftScore + comparisonResult.rightScore;

    const winningScore = Math.max(
      comparisonResult.leftScore,
      comparisonResult.rightScore,
    );

    const rawConfidence =
      totalDecided > 0 ? (winningScore / totalDecided) * 100 : 50;

    const confidence = clamp(Math.round(rawConfidence), 50, 99);
    const rating = clamp(Math.round(60 + confidence * 0.4), 60, 99);

    const advantages = [];

    if (winner && loser) {
      const goalDifference =
        Number(winner.goalsFor || 0) - Number(loser.goalsFor || 0);

      if (goalDifference > 0) {
        advantages.push({
          title: "Stronger attack",
          detail: `${winner.goalsFor} goals vs ${loser.goalsFor} (+${goalDifference})`,
        });
      }

      const concededDifference =
        Number(loser.goalsAgainst || 0) -
        Number(winner.goalsAgainst || 0);

      if (concededDifference > 0) {
        advantages.push({
          title: "Better defence",
          detail: `${winner.goalsAgainst} conceded vs ${loser.goalsAgainst} (${concededDifference} fewer)`,
        });
      }

      const winnerWinRate = getWinPercentage(winner);
      const loserWinRate = getWinPercentage(loser);

      if (winnerWinRate > loserWinRate) {
        advantages.push({
          title: "Higher win percentage",
          detail: `${formatDecimal(winnerWinRate, 1)}% vs ${formatDecimal(
            loserWinRate,
            1,
          )}%`,
        });
      }

      const winnerFormPoints = getFormPoints(winner);
      const loserFormPoints = getFormPoints(loser);

      if (winnerFormPoints > loserFormPoints) {
        advantages.push({
          title: "Better recent form",
          detail: `${winnerFormPoints} form points vs ${loserFormPoints}`,
        });
      }

      const winnerPpg = getPointsPerGame(winner);
      const loserPpg = getPointsPerGame(loser);

      if (winnerPpg > loserPpg) {
        advantages.push({
          title: "More points per match",
          detail: `${formatDecimal(winnerPpg, 2)} PPG vs ${formatDecimal(
            loserPpg,
            2,
          )}`,
        });
      }
    }

    if (!advantages.length) {
      advantages.push({
        title: "Very closely matched",
        detail: "The available statistics do not show a clear overall advantage.",
      });
    }

    return {
      winner,
      loser,
      confidence,
      rating,
      advantages: advantages.slice(0, 5),
    };
  }, [leftTeam, rightTeam, comparisonResult]);

  const chartData = useMemo(() => {
    if (!leftTeam || !rightTeam) {
      return [];
    }

    return [
      {
        statistic: "Points",
        left: Number(leftTeam.points || 0),
        right: Number(rightTeam.points || 0),
      },
      {
        statistic: "Wins",
        left: Number(leftTeam.won || 0),
        right: Number(rightTeam.won || 0),
      },
      {
        statistic: "Goals",
        left: Number(leftTeam.goalsFor || 0),
        right: Number(rightTeam.goalsFor || 0),
      },
      {
        statistic: "Goal difference",
        left: Number(leftTeam.goalDifference || 0),
        right: Number(rightTeam.goalDifference || 0),
      },
      {
        statistic: "Form points",
        left: getFormPoints(leftTeam),
        right: getFormPoints(rightTeam),
      },
    ];
  }, [leftTeam, rightTeam]);

  const radarData = useMemo(() => {
    if (!leftTeam || !rightTeam) {
      return [];
    }

    const teamsForScale = [leftTeam, rightTeam];

    const maximumPoints = Math.max(
      ...teamsForScale.map((team) => Number(team.points || 0)),
      1,
    );

    const maximumGoals = Math.max(
      ...teamsForScale.map((team) => Number(team.goalsFor || 0)),
      1,
    );

    const maximumConceded = Math.max(
      ...teamsForScale.map((team) => Number(team.goalsAgainst || 0)),
      1,
    );

    const maximumGoalDifference = Math.max(
      ...teamsForScale.map((team) =>
        Math.max(Number(team.goalDifference || 0), 0),
      ),
      1,
    );

    const maximumFormPoints = Math.max(
      ...teamsForScale.map((team) => getFormPoints(team)),
      1,
    );

    return [
      {
        category: "Points",
        left: scaleTo100(leftTeam.points, maximumPoints),
        right: scaleTo100(rightTeam.points, maximumPoints),
      },
      {
        category: "Attack",
        left: scaleTo100(leftTeam.goalsFor, maximumGoals),
        right: scaleTo100(rightTeam.goalsFor, maximumGoals),
      },
      {
        category: "Defence",
        left: scaleTo100(
          leftTeam.goalsAgainst,
          maximumConceded,
          true,
        ),
        right: scaleTo100(
          rightTeam.goalsAgainst,
          maximumConceded,
          true,
        ),
      },
      {
        category: "Goal diff.",
        left: scaleTo100(
          Math.max(Number(leftTeam.goalDifference || 0), 0),
          maximumGoalDifference,
        ),
        right: scaleTo100(
          Math.max(Number(rightTeam.goalDifference || 0), 0),
          maximumGoalDifference,
        ),
      },
      {
        category: "Win rate",
        left: clamp(getWinPercentage(leftTeam)),
        right: clamp(getWinPercentage(rightTeam)),
      },
      {
        category: "Form",
        left: scaleTo100(
          getFormPoints(leftTeam),
          maximumFormPoints,
        ),
        right: scaleTo100(
          getFormPoints(rightTeam),
          maximumFormPoints,
        ),
      },
    ];
  }, [leftTeam, rightTeam]);

  function swapTeams() {
    setLeftId(rightId);
    setRightId(leftId);
  }

  async function copyComparisonLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch (copyError) {
      console.error("Unable to copy comparison link:", copyError);
    }
  }

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
            Team comparison could not be loaded
          </h1>

          <p className="mt-3 text-muted">{error}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-container">
      <section className="mb-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              Head-to-head club analytics
            </p>

            <h1 className="page-heading mt-2">Compare Teams</h1>

            <p className="mt-3 max-w-2xl leading-7 text-muted-light">
              Compare Premier League clubs across league position,
              points, results, goals, efficiency and recent form.
            </p>

            {season && (
              <p className="mt-2 text-sm text-muted">
                Season: {season}
              </p>
            )}
          </div>

          {leftTeam && rightTeam && (
            <button
              type="button"
              onClick={copyComparisonLink}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-panel px-4 py-3 text-sm font-semibold text-muted-light transition-colors hover:border-accent/50 hover:text-white"
            >
              {copied ? (
                <Check size={17} className="text-emerald-300" />
              ) : (
                <Clipboard size={17} />
              )}

              {copied ? "Link copied" : "Copy comparison link"}
            </button>
          )}
        </div>
      </section>

      <section className="panel relative z-20 overflow-visible p-5 md:p-6">
        <div className="grid items-end gap-4 lg:grid-cols-[1fr_auto_1fr]">
          <TeamSearch
            label="Team one"
            teams={teams}
            selectedId={leftId}
            disabledTeamId={rightId}
            onSelect={setLeftId}
          />

          <button
            type="button"
            onClick={swapTeams}
            disabled={!leftId && !rightId}
            aria-label="Swap selected teams"
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeftRight size={19} />
          </button>

          <TeamSearch
            label="Team two"
            teams={teams}
            selectedId={rightId}
            disabledTeamId={leftId}
            onSelect={setRightId}
          />
        </div>
      </section>

      {leftTeam && rightTeam ? (
        <>
          <section className="relative mt-8 grid items-center gap-8 rounded-2xl border border-border bg-panel p-6 md:p-8 lg:grid-cols-[1fr_auto_1fr]">
            <TeamHero team={leftTeam} side="left" />

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-accent/50 bg-accent-soft text-sm font-black uppercase tracking-wider text-accent">
              VS
            </div>

            <TeamHero team={rightTeam} side="right" />
          </section>

          {matchupSummary && comparisonResult && (
            <section className="panel mt-8 overflow-hidden">
              <div className="border-b border-border p-6 md:p-8">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent-soft">
                    <Sparkles size={21} className="text-accent" />
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                      AI-style matchup summary
                    </p>

                    <h2 className="mt-2 text-2xl font-black text-white md:text-3xl">
                      {matchupSummary.winner
                        ? `${matchupSummary.winner.name} enters as favourite`
                        : "This matchup is too close to call"}
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-muted">
                      Generated from the currently available league
                      statistics. This is a statistical comparison,
                      not a guaranteed match prediction.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-8 p-6 md:p-8 xl:grid-cols-[1fr_320px]">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Key advantages
                  </h3>

                  <div className="mt-5 grid gap-3">
                    {matchupSummary.advantages.map((advantage) => (
                      <article
                        key={`${advantage.title}-${advantage.detail}`}
                        className="flex items-center gap-4 rounded-xl border border-border bg-black/15 p-4"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                          <Check size={17} />
                        </div>

                        <div>
                          <p className="font-semibold text-white">
                            {advantage.title}
                          </p>
                          <p className="mt-1 text-sm text-muted">
                            {advantage.detail}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-accent/25 bg-accent-soft p-6 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Overall rating
                  </p>

                  <p className="mt-3 text-6xl font-black text-white">
                    {matchupSummary.rating}
                  </p>

                  <div className="mt-5 h-3 overflow-hidden rounded-full bg-black/30">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{
                        width: `${matchupSummary.rating}%`,
                      }}
                    />
                  </div>

                  <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-muted">
                    Prediction confidence
                  </p>

                  <p className="mt-2 text-4xl font-black text-accent">
                    {matchupSummary.confidence}%
                  </p>

                  <div className="mt-6 border-t border-border/70 pt-5">
                    <p className="text-sm font-semibold text-white">
                      Categories won
                    </p>

                    <div className="mt-3 flex items-center justify-center gap-4">
                      <span className="text-2xl font-black text-white">
                        {comparisonResult.leftScore}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                        —
                      </span>
                      <span className="text-2xl font-black text-white">
                        {comparisonResult.rightScore}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-muted">
                      {comparisonResult.ties} tied{" "}
                      {comparisonResult.ties === 1
                        ? "category"
                        : "categories"}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          <section className="mt-8">
            <div className="mb-5">
              <h2 className="text-2xl font-black text-white">
                Current-season comparison
              </h2>

              <p className="mt-1 text-sm text-muted">
                The stronger result in each category is highlighted.
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {comparisonStats.map((stat) => (
                <ComparisonRow
                  key={stat.label}
                  label={stat.label}
                  leftValue={stat.left}
                  rightValue={stat.right}
                  formatter={stat.formatter}
                  lowerIsBetter={stat.lowerIsBetter}
                />
              ))}
            </div>
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-2">
            <article className="panel p-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white">
                  Head-to-head overview
                </h2>

                <p className="mt-1 text-sm text-muted">
                  A visual comparison of major team statistics.
                </p>
              </div>

              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="rgba(148, 163, 184, 0.14)"
                    />

                    <XAxis
                      dataKey="statistic"
                      tick={{ fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <YAxis
                      tick={{ fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <Tooltip content={<ChartTooltip />} />
                    <Legend />

                    <Bar
                      dataKey="left"
                      name={leftTeam.name}
                      fill="#38bdf8"
                      radius={[6, 6, 0, 0]}
                    />

                    <Bar
                      dataKey="right"
                      name={rightTeam.name}
                      fill="#f59e0b"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="panel p-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white">
                  Team strengths radar
                </h2>

                <p className="mt-1 text-sm text-muted">
                  Normalised ratings across six performance areas.
                </p>
              </div>

              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(148, 163, 184, 0.22)" />

                    <PolarAngleAxis
                      dataKey="category"
                      tick={{ fill: "#94a3b8", fontSize: 12 }}
                    />

                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={false}
                      axisLine={false}
                    />

                    <Tooltip content={<ChartTooltip />} />
                    <Legend />

                    <Radar
                      name={leftTeam.name}
                      dataKey="left"
                      stroke="#38bdf8"
                      fill="#38bdf8"
                      fillOpacity={0.22}
                      strokeWidth={2}
                    />

                    <Radar
                      name={rightTeam.name}
                      dataKey="right"
                      stroke="#f59e0b"
                      fill="#f59e0b"
                      fillOpacity={0.18}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </article>
          </section>

          <HeadToHeadSection
            data={headToHead}
            loading={headToHeadLoading}
            error={headToHeadError}
          />

          <section className="mt-10">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                Latest available matches
              </p>

              <h2 className="mt-2 text-2xl font-black text-white">
                Recent form comparison
              </h2>

              <p className="mt-1 text-sm text-muted">
                Compare each club’s wins, draws, losses and form
                points from their latest available matches.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <RecentFormCard team={leftTeam} />
              <RecentFormCard team={rightTeam} />
            </div>
          </section>
        </>
      ) : (
        <section className="panel mt-8 flex min-h-64 flex-col items-center justify-center p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-black/20">
            <Shield size={25} className="text-muted" />
          </div>

          <h2 className="mt-5 text-xl font-bold text-white">
            Select two teams
          </h2>

          <p className="mt-2 max-w-md text-muted">
            Choose a Premier League club on each side to generate
            the full comparison.
          </p>
        </section>
      )}
    </main>
  );
}