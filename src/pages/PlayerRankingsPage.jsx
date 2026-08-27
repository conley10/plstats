import { useEffect, useMemo, useState } from "react";
import {
  Award,
  ChevronDown,
  Filter,
  Loader2,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

import { getPlayers } from "../api/playersApi";

function clamp(value, minimum = 0, maximum = 100) {
  return Math.min(Math.max(Number(value) || 0, minimum), maximum);
}

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;

  const birthDate = new Date(dateOfBirth);

  if (Number.isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age;
}

function per90(value, minutes) {
  const number = Number(value);
  const playedMinutes = Number(minutes);

  if (
    !Number.isFinite(number) ||
    !Number.isFinite(playedMinutes) ||
    playedMinutes <= 0
  ) {
    return 0;
  }

  return (number / playedMinutes) * 90;
}

function formatNumber(value, digits = 1) {
  const number = Number(value);

  if (!Number.isFinite(number)) return "—";

  return number.toFixed(digits);
}

function formatInteger(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? Math.round(number).toLocaleString("en-AU")
    : "—";
}

function getPlayerId(player) {
  return player?.id ?? player?.playerId;
}

function getTeamName(player) {
  return (
    player?.team?.shortName ||
    player?.team?.name ||
    player?.teamName ||
    "Unknown club"
  );
}

function getTeamCrest(player) {
  return player?.team?.crest || player?.teamCrest || null;
}

function formatPosition(position) {
  if (!position) return "Unknown";

  const value = String(position).toUpperCase().trim();

  if (value === "GK" || value.includes("GOALKEEPER")) {
    return "Goalkeeper";
  }

  if (
    value.startsWith("D") ||
    value.includes("DEFENDER") ||
    value.includes("DEFENCE") ||
    value.includes("BACK")
  ) {
    return "Defender";
  }

  if (value.startsWith("M") || value.includes("MIDFIELD")) {
    return "Midfielder";
  }

  if (
    value.startsWith("F") ||
    value.includes("STRIKER") ||
    value.includes("FORWARD") ||
    value.includes("WINGER")
  ) {
    return "Forward";
  }

  return position;
}

function getPositionBenchmarks(position) {
  const formattedPosition = formatPosition(position);

  if (formattedPosition === "Forward") {
    return {
      goalsPer90: 0.48,
      assistsPer90: 0.2,
      xgPer90: 0.45,
      xaPer90: 0.17,
      shotsPer90: 2.8,
      keyPassesPer90: 1.3,
    };
  }

  if (formattedPosition === "Midfielder") {
    return {
      goalsPer90: 0.2,
      assistsPer90: 0.22,
      xgPer90: 0.2,
      xaPer90: 0.22,
      shotsPer90: 1.6,
      keyPassesPer90: 1.8,
    };
  }

  if (formattedPosition === "Defender") {
    return {
      goalsPer90: 0.08,
      assistsPer90: 0.1,
      xgPer90: 0.08,
      xaPer90: 0.1,
      shotsPer90: 0.65,
      keyPassesPer90: 0.75,
    };
  }

  return {
    goalsPer90: 0.1,
    assistsPer90: 0.05,
    xgPer90: 0.08,
    xaPer90: 0.05,
    shotsPer90: 0.25,
    keyPassesPer90: 0.3,
  };
}

function scoreAgainstBenchmark(value, benchmark, multiplier = 65) {
  if (!benchmark) return 0;
  return clamp((Number(value || 0) / benchmark) * multiplier);
}

function buildPlayerAnalytics(player) {
  const minutes = Number(player.minutes || 0);
  const goals = Number(player.goals || 0);
  const assists = Number(player.assists || 0);
  const xg = Number(player.xg || 0);
  const xa = Number(player.xa || 0);
  const shots = Number(player.shots || 0);
  const keyPasses = Number(player.keyPasses || 0);

  const goalsPer90 = per90(goals, minutes);
  const assistsPer90 = per90(assists, minutes);
  const xgPer90 = per90(xg, minutes);
  const xaPer90 = per90(xa, minutes);
  const shotsPer90 = per90(shots, minutes);
  const keyPassesPer90 = per90(keyPasses, minutes);

  const benchmarks = getPositionBenchmarks(player.position);

  const scoring = scoreAgainstBenchmark(
    goalsPer90,
    benchmarks.goalsPer90,
  );

  const creativity = Math.round(
    scoreAgainstBenchmark(
      assistsPer90,
      benchmarks.assistsPer90,
    ) *
      0.45 +
      scoreAgainstBenchmark(
        xaPer90,
        benchmarks.xaPer90,
      ) *
        0.3 +
      scoreAgainstBenchmark(
        keyPassesPer90,
        benchmarks.keyPassesPer90,
      ) *
        0.25,
  );

  const threat = Math.round(
    scoreAgainstBenchmark(xgPer90, benchmarks.xgPer90) * 0.55 +
      scoreAgainstBenchmark(
        shotsPer90,
        benchmarks.shotsPer90,
      ) *
        0.45,
  );

  const finishingDifference = goals - xg;
  const finishing = clamp(
    55 + finishingDifference * 6 + goalsPer90 * 30,
  );

  const involvement = clamp(
    ((goals + assists) / Math.max(minutes / 90, 1)) * 55,
  );

  const reliability = clamp((minutes / 2200) * 100);

  const rating = Math.round(
    scoring * 0.25 +
      creativity * 0.22 +
      threat * 0.2 +
      finishing * 0.16 +
      involvement * 0.12 +
      reliability * 0.05,
  );

  return {
    ...player,
    age: calculateAge(player.dateOfBirth),
    teamName: getTeamName(player),
    teamCrest: getTeamCrest(player),
    formattedPosition: formatPosition(player.position),
    goals,
    assists,
    xg,
    xa,
    shots,
    keyPasses,
    minutes,
    goalsPer90,
    assistsPer90,
    xgPer90,
    xaPer90,
    shotsPer90,
    keyPassesPer90,
    scoring,
    creativity,
    threat,
    finishing,
    finishingDifference,
    involvement,
    reliability,
    rating,
  };
}

function getMedal(rank) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
}

function getRatingLabel(rating) {
  if (rating >= 90) return "Elite";
  if (rating >= 80) return "Excellent";
  if (rating >= 70) return "Strong";
  if (rating >= 60) return "Good";
  if (rating >= 50) return "Average";
  return "Developing";
}

function getSortValue(player, sortBy) {
  switch (sortBy) {
    case "goals":
      return player.goals;
    case "assists":
      return player.assists;
    case "xg":
      return player.xg;
    case "xa":
      return player.xa;
    case "goalsPer90":
      return player.goalsPer90;
    case "assistsPer90":
      return player.assistsPer90;
    case "xgPer90":
      return player.xgPer90;
    case "xaPer90":
      return player.xaPer90;
    case "finishing":
      return player.finishing;
    case "creativity":
      return player.creativity;
    case "threat":
      return player.threat;
    case "minutes":
      return player.minutes;
    default:
      return player.rating;
  }
}

function getSortLabel(sortBy) {
  const labels = {
    rating: "Attacking rating",
    goals: "Goals",
    assists: "Assists",
    xg: "Expected goals",
    xa: "Expected assists",
    goalsPer90: "Goals per 90",
    assistsPer90: "Assists per 90",
    xgPer90: "xG per 90",
    xaPer90: "xA per 90",
    finishing: "Finishing",
    creativity: "Creativity",
    threat: "Goal threat",
    minutes: "Minutes",
  };

  return labels[sortBy] || "Attacking rating";
}

function QuickFilterButton({
  active,
  children,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
        active
          ? "border-accent bg-accent-soft text-accent"
          : "border-border bg-panel text-muted-light hover:border-accent/50 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function RatingBar({ value }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-black/25">
      <div
        className="h-full rounded-full bg-accent transition-all duration-500"
        style={{ width: `${clamp(value)}%` }}
      />
    </div>
  );
}

function RankingCard({ player, rank, sortBy }) {
  const medal = getMedal(rank);
  const sortValue = getSortValue(player, sortBy);

  return (
    <article className="group rounded-2xl border border-border bg-panel p-5 transition-all hover:-translate-y-0.5 hover:border-accent/50">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
        <div className="flex items-center gap-4 lg:w-[34%]">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-black/20 text-lg font-black text-white">
            {medal || rank}
          </div>

          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-black/20">
            {player.teamCrest ? (
              <img
                src={player.teamCrest}
                alt={player.teamName}
                className="h-10 w-10 object-contain"
              />
            ) : (
              <Users size={20} className="text-muted" />
            )}
          </div>

          <div className="min-w-0">
            <Link
              to={`/players/${getPlayerId(player)}`}
              className="truncate text-lg font-black text-white transition-colors group-hover:text-accent"
            >
              {player.name}
            </Link>

            <p className="mt-1 truncate text-sm text-muted-light">
              {player.teamName}
            </p>

            <p className="mt-1 text-xs text-muted">
              {player.formattedPosition}
              {player.age ? ` · ${player.age} years` : ""}
            </p>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-2xl font-black text-white">
              {formatInteger(player.goals)}
            </p>
            <p className="mt-1 text-xs uppercase tracking-wider text-muted">
              Goals
            </p>
          </div>

          <div>
            <p className="text-2xl font-black text-white">
              {formatInteger(player.assists)}
            </p>
            <p className="mt-1 text-xs uppercase tracking-wider text-muted">
              Assists
            </p>
          </div>

          <div>
            <p className="text-2xl font-black text-white">
              {formatNumber(player.goalsPer90, 2)}
            </p>
            <p className="mt-1 text-xs uppercase tracking-wider text-muted">
              Goals / 90
            </p>
          </div>

          <div>
            <p className="text-2xl font-black text-white">
              {formatNumber(player.xgPer90, 2)}
            </p>
            <p className="mt-1 text-xs uppercase tracking-wider text-muted">
              xG / 90
            </p>
          </div>
        </div>

        <div className="min-w-52 lg:w-60">
          <div className="mb-2 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                {getSortLabel(sortBy)}
              </p>

              <p className="mt-1 text-sm font-semibold text-muted-light">
                {sortBy === "rating"
                  ? getRatingLabel(player.rating)
                  : "Current season"}
              </p>
            </div>

            <p className="text-3xl font-black text-white">
              {sortBy === "rating" ||
              sortBy === "finishing" ||
              sortBy === "creativity" ||
              sortBy === "threat"
                ? Math.round(sortValue)
                : sortBy.includes("Per90")
                  ? formatNumber(sortValue, 2)
                  : formatNumber(sortValue, 1)}
            </p>
          </div>

          {sortBy === "rating" ||
          sortBy === "finishing" ||
          sortBy === "creativity" ||
          sortBy === "threat" ? (
            <RatingBar value={sortValue} />
          ) : (
            <div className="h-2 rounded-full bg-black/25" />
          )}
        </div>
      </div>
    </article>
  );
}

export default function PlayerRankingsPage() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [position, setPosition] = useState("All");
  const [club, setClub] = useState("All");
  const [minimumMinutes, setMinimumMinutes] = useState(45);
  const [sortBy, setSortBy] = useState("rating");
  const [quickFilter, setQuickFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(25);

  useEffect(() => {
    let cancelled = false;

    async function loadPlayers() {
      try {
        setLoading(true);
        setError("");

        const response = await getPlayers({
          limit: 500,
        });

        if (!cancelled) {
          setPlayers(response.players || []);
        }
      } catch (requestError) {
        console.error(
          "Unable to load player rankings:",
          requestError,
        );

        if (!cancelled) {
          setError(
            "Unable to load Premier League player rankings.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPlayers();

    return () => {
      cancelled = true;
    };
  }, []);

  const analyticsPlayers = useMemo(
    () => players.map(buildPlayerAnalytics),
    [players],
  );

  const clubs = useMemo(
    () =>
      [
        "All",
        ...new Set(
          analyticsPlayers
            .map((player) => player.teamName)
            .filter(Boolean),
        ),
      ].sort((a, b) => {
        if (a === "All") return -1;
        if (b === "All") return 1;
        return a.localeCompare(b);
      }),
    [analyticsPlayers],
  );

  const rankedPlayers = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return analyticsPlayers
      .filter((player) => {
        if (player.minutes < minimumMinutes) return false;

        if (
          position !== "All" &&
          player.formattedPosition !== position
        ) {
          return false;
        }

        if (club !== "All" && player.teamName !== club) {
          return false;
        }

        if (
          searchValue &&
          ![
            player.name,
            player.teamName,
            player.formattedPosition,
            player.nationality,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(searchValue)
        ) {
          return false;
        }

        if (quickFilter === "u23") {
          return player.age !== null && player.age <= 23;
        }

        if (quickFilter === "clinical") {
          return (
            player.goals >= 3 &&
            player.finishingDifference > 0
          );
        }

        if (quickFilter === "creators") {
          return player.creativity >= 65;
        }

        if (quickFilter === "hidden-gems") {
          return (
            player.rating >= 68 &&
            player.age !== null &&
            player.age <= 24 &&
            player.minutes >= 600
          );
        }

        return true;
      })
      .sort((a, b) => {
        const difference =
          getSortValue(b, sortBy) -
          getSortValue(a, sortBy);

        if (difference !== 0) return difference;

        return b.minutes - a.minutes;
      });
  }, [
    analyticsPlayers,
    search,
    position,
    club,
    minimumMinutes,
    sortBy,
    quickFilter,
  ]);

  const visiblePlayers = rankedPlayers.slice(0, visibleCount);
  const leader = rankedPlayers[0] || null;

  function resetFilters() {
    setSearch("");
    setPosition("All");
    setClub("All");
    setMinimumMinutes(45);
    setSortBy("rating");
    setQuickFilter("all");
    setVisibleCount(25);
  }

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
              Building player rankings...
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
            Rankings could not be loaded
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
              PLSTATS analytics
            </p>

            <h1 className="page-heading mt-2">
              Player Rankings
            </h1>

            <p className="mt-3 max-w-2xl leading-7 text-muted-light">
              Rank Premier League players using current-season
              attacking output, expected data and position-adjusted
              performance.
            </p>
          </div>

          {leader && (
            <div className="min-w-72 rounded-2xl border border-accent/30 bg-accent-soft p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-accent/40 bg-black/15 text-2xl">
                  🥇
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                    Current leader
                  </p>

                  <p className="mt-1 truncate text-xl font-black text-white">
                    {leader.name}
                  </p>

                  <p className="text-sm text-muted-light">
                    {leader.rating}/100 attacking rating
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="panel mt-6 p-5 md:p-6">
        <div className="mb-5 flex items-center gap-3">
          <SlidersHorizontal
            size={20}
            className="text-accent"
          />

          <div>
            <h2 className="font-black text-white">
              Ranking controls
            </h2>

            <p className="text-sm text-muted">
              Filter the player pool and choose the ranking metric.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="xl:col-span-2">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted">
              Search
            </span>

            <div className="flex items-center gap-3 rounded-xl border border-border bg-black/20 px-4">
              <Search size={17} className="text-muted" />

              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setVisibleCount(25);
                }}
                placeholder="Search player, club or position..."
                className="w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-muted"
              />
            </div>
          </label>

          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted">
              Position
            </span>

            <div className="relative">
              <select
                value={position}
                onChange={(event) => {
                  setPosition(event.target.value);
                  setVisibleCount(25);
                }}
                className="w-full appearance-none rounded-xl border border-border bg-black/20 px-4 py-3 pr-10 text-sm text-white outline-none"
              >
                {[
                  "All",
                  "Goalkeeper",
                  "Defender",
                  "Midfielder",
                  "Forward",
                ].map((option) => (
                  <option key={option} value={option}>
                    {option === "All"
                      ? "All positions"
                      : option}
                  </option>
                ))}
              </select>

              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted"
              />
            </div>
          </label>

          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted">
              Club
            </span>

            <div className="relative">
              <select
                value={club}
                onChange={(event) => {
                  setClub(event.target.value);
                  setVisibleCount(25);
                }}
                className="w-full appearance-none rounded-xl border border-border bg-black/20 px-4 py-3 pr-10 text-sm text-white outline-none"
              >
                {clubs.map((option) => (
                  <option key={option} value={option}>
                    {option === "All" ? "All clubs" : option}
                  </option>
                ))}
              </select>

              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted"
              />
            </div>
          </label>

          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted">
              Sort by
            </span>

            <div className="relative">
              <select
                value={sortBy}
                onChange={(event) => {
                  setSortBy(event.target.value);
                  setVisibleCount(25);
                }}
                className="w-full appearance-none rounded-xl border border-border bg-black/20 px-4 py-3 pr-10 text-sm text-white outline-none"
              >
                <option value="rating">Attacking rating</option>
                <option value="goals">Goals</option>
                <option value="assists">Assists</option>
                <option value="xg">Expected goals</option>
                <option value="xa">Expected assists</option>
                <option value="goalsPer90">Goals per 90</option>
                <option value="assistsPer90">
                  Assists per 90
                </option>
                <option value="xgPer90">xG per 90</option>
                <option value="xaPer90">xA per 90</option>
                <option value="finishing">Finishing</option>
                <option value="creativity">Creativity</option>
                <option value="threat">Goal threat</option>
                <option value="minutes">Minutes</option>
              </select>

              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted"
              />
            </div>
          </label>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between gap-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Minimum minutes
            </span>

            <span className="text-sm font-bold text-white">
              {minimumMinutes.toLocaleString("en-AU")}
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="2500"
            step="90"
            value={minimumMinutes}
            onChange={(event) => {
              setMinimumMinutes(Number(event.target.value));
              setVisibleCount(25);
            }}
            className="w-full accent-[var(--color-accent)]"
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <QuickFilterButton
            active={quickFilter === "all"}
            onClick={() => setQuickFilter("all")}
          >
            All players
          </QuickFilterButton>

          <QuickFilterButton
            active={quickFilter === "u23"}
            onClick={() => setQuickFilter("u23")}
          >
            Best U23
          </QuickFilterButton>

          <QuickFilterButton
            active={quickFilter === "clinical"}
            onClick={() => setQuickFilter("clinical")}
          >
            Most clinical
          </QuickFilterButton>

          <QuickFilterButton
            active={quickFilter === "creators"}
            onClick={() => setQuickFilter("creators")}
          >
            Best creators
          </QuickFilterButton>

          <QuickFilterButton
            active={quickFilter === "hidden-gems"}
            onClick={() => setQuickFilter("hidden-gems")}
          >
            Hidden gems
          </QuickFilterButton>

          <button
            type="button"
            onClick={resetFilters}
            className="ml-auto inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-accent/50 hover:text-white"
          >
            <Filter size={15} />
            Reset
          </button>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              League leaderboard
            </p>

            <h2 className="mt-2 text-2xl font-black text-white">
              {getSortLabel(sortBy)}
            </h2>

            <p className="mt-1 text-sm text-muted">
              {rankedPlayers.length} players meet the selected criteria.
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted">
            <Sparkles size={16} className="text-accent" />
            Ratings are position-adjusted attacking scores.
          </div>
        </div>

        {visiblePlayers.length ? (
          <div className="space-y-4">
            {visiblePlayers.map((player, index) => (
              <RankingCard
                key={getPlayerId(player)}
                player={player}
                rank={index + 1}
                sortBy={sortBy}
              />
            ))}
          </div>
        ) : (
          <div className="panel flex min-h-64 flex-col items-center justify-center p-8 text-center">
            <Award size={30} className="text-muted" />

            <h3 className="mt-4 text-lg font-bold text-white">
              No players found
            </h3>

            <p className="mt-2 max-w-md text-sm text-muted">
              Try reducing the minimum-minutes requirement or
              changing the current filters.
            </p>
          </div>
        )}

        {visibleCount < rankedPlayers.length && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() =>
                setVisibleCount((current) => current + 25)
              }
              className="primary-button inline-flex items-center gap-2"
            >
              <Trophy size={16} />
              Load more players
            </button>
          </div>
        )}
      </section>

      <section className="panel mt-8 p-6">
        <h2 className="text-lg font-black text-white">
          About the rankings
        </h2>

        <p className="mt-3 max-w-4xl leading-7 text-muted-light">
          The overall score combines goals, assists, expected goals,
          expected assists, shots, key passes, per-90 output and
          playing time. Benchmarks are adjusted by broad position, so
          defenders and midfielders are not judged against the same
          attacking expectations as forwards. This remains an
          attacking-data rating rather than a complete assessment of
          every part of a player’s game.
        </p>
      </section>
    </main>
  );
}