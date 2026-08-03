import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Loader2,
  Search,
  Trophy,
  Users,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  getPlayerHistory,
  getPlayers,
} from "../api/playersApi";

function formatDecimal(value, digits = 1) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : "—";
}

function formatInteger(value) {
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.round(number).toLocaleString("en-AU")
    : "—";
}

function formatPosition(position) {
  if (!position) return "Unknown position";

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

  if (
    value.startsWith("M") ||
    value.includes("MIDFIELD")
  ) {
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

function calculatePer90(value, minutes) {
  const numericValue = Number(value);
  const numericMinutes = Number(minutes);

  if (
    !Number.isFinite(numericValue) ||
    !Number.isFinite(numericMinutes) ||
    numericMinutes <= 0
  ) {
    return null;
  }

  return (numericValue / numericMinutes) * 90;
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

function PlayerSearch({
  label,
  players,
  selectedId,
  onSelect,
  disabledPlayerId,
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selectedPlayer = useMemo(
    () =>
      players.find(
        (player) =>
          String(getPlayerId(player)) === String(selectedId),
      ) || null,
    [players, selectedId],
  );

  const filteredPlayers = useMemo(() => {
    const searchValue = query.trim().toLowerCase();

    return players
      .filter(
        (player) =>
          String(getPlayerId(player)) !==
          String(disabledPlayerId),
      )
      .filter((player) => {
        if (!searchValue) return true;

        const searchText = [
          player.name,
          getTeamName(player),
          formatPosition(player.position),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchText.includes(searchValue);
      })
      .slice(0, 15);
  }, [players, query, disabledPlayerId]);

  function choosePlayer(player) {
    onSelect(String(getPlayerId(player)));
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
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-black/20">
            {selectedPlayer && getTeamCrest(selectedPlayer) ? (
              <img
                src={getTeamCrest(selectedPlayer)}
                alt=""
                className="h-8 w-8 object-contain"
              />
            ) : (
              <Users size={18} className="text-muted" />
            )}
          </div>

          <div className="min-w-0">
            <p className="truncate font-semibold text-white">
              {selectedPlayer?.name || "Choose a player"}
            </p>

            <p className="truncate text-sm text-muted">
              {selectedPlayer
                ? getTeamName(selectedPlayer)
                : "Search Premier League players"}
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
                onChange={(event) =>
                  setQuery(event.target.value)
                }
                placeholder="Search name, club or position..."
                className="w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-muted"
              />
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {filteredPlayers.length > 0 ? (
              filteredPlayers.map((player) => (
                <button
                  key={getPlayerId(player)}
                  type="button"
                  onClick={() => choosePlayer(player)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-white/[0.05]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-black/20">
                    {getTeamCrest(player) ? (
                      <img
                        src={getTeamCrest(player)}
                        alt=""
                        className="h-7 w-7 object-contain"
                      />
                    ) : (
                      <Users size={16} className="text-muted" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">
                      {player.name}
                    </p>

                    <p className="truncate text-xs text-muted">
                      {getTeamName(player)} ·{" "}
                      {formatPosition(player.position)}
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <p className="px-3 py-6 text-center text-sm text-muted">
                No matching players found.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerHero({ player, side }) {
  return (
    <article
      className={`flex flex-col items-center text-center ${
        side === "right"
          ? "lg:items-end lg:text-right"
          : "lg:items-start lg:text-left"
      }`}
    >
      <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-border bg-panel">
        {getTeamCrest(player) ? (
          <img
            src={getTeamCrest(player)}
            alt={getTeamName(player)}
            className="h-16 w-16 object-contain"
          />
        ) : (
          <Users size={28} className="text-muted" />
        )}
      </div>

      <h2 className="mt-4 text-3xl font-black text-white">
        {player.name}
      </h2>

      <p className="mt-2 text-muted-light">
        {getTeamName(player)}
      </p>

      <p className="mt-1 text-sm text-muted">
        {formatPosition(player.position)}
        {player.nationality
          ? ` · ${player.nationality}`
          : ""}
      </p>

      <Link
        to={`/players/${player.id}`}
        className="mt-4 text-sm font-semibold text-accent transition-colors hover:text-white"
      >
        View full profile
      </Link>
    </article>
  );
}

function ComparisonRow({
  label,
  leftValue,
  rightValue,
  formatter = formatInteger,
}) {
  const leftNumber = Number(leftValue);
  const rightNumber = Number(rightValue);

  const validLeft = Number.isFinite(leftNumber);
  const validRight = Number.isFinite(rightNumber);

  const maximum = Math.max(
    validLeft ? leftNumber : 0,
    validRight ? rightNumber : 0,
    1,
  );

  const leftPercent = validLeft
    ? Math.max((leftNumber / maximum) * 100, 4)
    : 0;

  const rightPercent = validRight
    ? Math.max((rightNumber / maximum) * 100, 4)
    : 0;

  const leftWins =
    validLeft && validRight && leftNumber > rightNumber;

  const rightWins =
    validLeft && validRight && rightNumber > leftNumber;

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
              leftWins || tied
                ? "bg-accent"
                : "bg-white/20"
            }`}
            style={{ width: `${leftPercent}%` }}
          />
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-black/25">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              rightWins || tied
                ? "bg-accent"
                : "bg-white/20"
            }`}
            style={{ width: `${rightPercent}%` }}
          />
        </div>
      </div>
    </article>
  );
}

function CareerTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-panel px-4 py-3 shadow-xl">
      <p className="mb-2 font-semibold text-white">{label}</p>

      {payload.map((entry) => (
        <p
          key={entry.dataKey}
          className="text-sm text-muted-light"
        >
          {entry.name}:{" "}
          <span className="font-semibold text-white">
            {formatDecimal(entry.value)}
          </span>
        </p>
      ))}
    </div>
  );
}

export default function ComparePlayersPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [players, setPlayers] = useState([]);
  const [leftId, setLeftId] = useState(
    searchParams.get("player") || "",
  );
  const [rightId, setRightId] = useState(
    searchParams.get("opponent") || "",
  );

  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] =
    useState(false);
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [leftHistory, setLeftHistory] = useState(null);
  const [rightHistory, setRightHistory] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPlayers() {
      try {
        setLoading(true);
        setError("");

        const data = await getPlayers({
          limit: 100,
        });

        if (!cancelled) {
          setPlayers(data.players || []);
        }
      } catch (requestError) {
        console.error(
          "Unable to load player list:",
          requestError,
        );

        if (!cancelled) {
          setError(
            "Unable to load Premier League players.",
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

  useEffect(() => {
    const nextParams = {};

    if (leftId) nextParams.player = leftId;
    if (rightId) nextParams.opponent = rightId;

    setSearchParams(nextParams, {
      replace: true,
    });
  }, [leftId, rightId, setSearchParams]);

  const leftPlayer = useMemo(
    () =>
      players.find(
        (player) =>
          String(getPlayerId(player)) === String(leftId),
      ) || null,
    [players, leftId],
  );

  const rightPlayer = useMemo(
    () =>
      players.find(
        (player) =>
          String(getPlayerId(player)) === String(rightId),
      ) || null,
    [players, rightId],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setHistoryError("");
      setLeftHistory(null);
      setRightHistory(null);

      if (!leftId || !rightId) return;

      try {
        setHistoryLoading(true);

        const [leftResult, rightResult] =
          await Promise.allSettled([
            getPlayerHistory(leftId),
            getPlayerHistory(rightId),
          ]);

        if (cancelled) return;

        if (leftResult.status === "fulfilled") {
          setLeftHistory(leftResult.value);
        }

        if (rightResult.status === "fulfilled") {
          setRightHistory(rightResult.value);
        }

        if (
          leftResult.status === "rejected" ||
          rightResult.status === "rejected"
        ) {
          setHistoryError(
            "Some career history could not be loaded. Current-season comparison is still available.",
          );
        }
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [leftId, rightId]);

  const currentStats = useMemo(() => {
    if (!leftPlayer || !rightPlayer) return [];

    return [
      {
        label: "Goals",
        left: leftPlayer.goals,
        right: rightPlayer.goals,
      },
      {
        label: "Assists",
        left: leftPlayer.assists,
        right: rightPlayer.assists,
      },
      {
        label: "Appearances",
        left: leftPlayer.appearances,
        right: rightPlayer.appearances,
      },
      {
        label: "Minutes",
        left: leftPlayer.minutes,
        right: rightPlayer.minutes,
      },
      {
        label: "Expected goals",
        left: leftPlayer.xg,
        right: rightPlayer.xg,
        formatter: (value) => formatDecimal(value, 1),
      },
      {
        label: "Expected assists",
        left: leftPlayer.xa,
        right: rightPlayer.xa,
        formatter: (value) => formatDecimal(value, 1),
      },
      {
        label: "Shots",
        left: leftPlayer.shots,
        right: rightPlayer.shots,
      },
      {
        label: "Key passes",
        left: leftPlayer.keyPasses,
        right: rightPlayer.keyPasses,
      },
      {
        label: "Goals per 90",
        left: calculatePer90(
          leftPlayer.goals,
          leftPlayer.minutes,
        ),
        right: calculatePer90(
          rightPlayer.goals,
          rightPlayer.minutes,
        ),
        formatter: (value) => formatDecimal(value, 2),
      },
      {
        label: "Assists per 90",
        left: calculatePer90(
          leftPlayer.assists,
          leftPlayer.minutes,
        ),
        right: calculatePer90(
          rightPlayer.assists,
          rightPlayer.minutes,
        ),
        formatter: (value) => formatDecimal(value, 2),
      },
      {
        label: "xG per 90",
        left: calculatePer90(
          leftPlayer.xg,
          leftPlayer.minutes,
        ),
        right: calculatePer90(
          rightPlayer.xg,
          rightPlayer.minutes,
        ),
        formatter: (value) => formatDecimal(value, 2),
      },
      {
        label: "xA per 90",
        left: calculatePer90(
          leftPlayer.xa,
          leftPlayer.minutes,
        ),
        right: calculatePer90(
          rightPlayer.xa,
          rightPlayer.minutes,
        ),
        formatter: (value) => formatDecimal(value, 2),
      },
    ];
  }, [leftPlayer, rightPlayer]);

  const careerStats = useMemo(() => {
    const left = leftHistory?.careerTotals;
    const right = rightHistory?.careerTotals;

    if (!left || !right) return [];

    return [
      {
        label: "Career appearances",
        left: left.appearances,
        right: right.appearances,
      },
      {
        label: "Career goals",
        left: left.goals,
        right: right.goals,
      },
      {
        label: "Career assists",
        left: left.assists,
        right: right.assists,
      },
      {
        label: "Career minutes",
        left: left.minutes,
        right: right.minutes,
      },
      {
        label: "Career xG",
        left: left.xg,
        right: right.xg,
        formatter: (value) => formatDecimal(value, 1),
      },
      {
        label: "Career xA",
        left: left.xa,
        right: right.xa,
        formatter: (value) => formatDecimal(value, 1),
      },
      {
        label: "Career shots",
        left: left.shots,
        right: right.shots,
      },
      {
        label: "Career key passes",
        left: left.keyPasses,
        right: right.keyPasses,
      },
    ];
  }, [leftHistory, rightHistory]);

  const careerChartData = useMemo(() => {
    if (!leftHistory || !rightHistory) return [];

    const seasonLabels = new Set([
      ...leftHistory.seasons.map((season) => season.label),
      ...rightHistory.seasons.map((season) => season.label),
    ]);

    return [...seasonLabels]
      .sort()
      .map((label) => {
        const leftSeason = leftHistory.seasons.find(
          (season) => season.label === label,
        );

        const rightSeason = rightHistory.seasons.find(
          (season) => season.label === label,
        );

        return {
          season: label,
          leftGoals: Number(leftSeason?.goals || 0),
          rightGoals: Number(rightSeason?.goals || 0),
          leftXg: Number(leftSeason?.xg || 0),
          rightXg: Number(rightSeason?.xg || 0),
        };
      });
  }, [leftHistory, rightHistory]);

  const seasonRows = useMemo(() => {
    if (!leftHistory || !rightHistory) return [];

    return careerChartData
      .map(({ season }) => ({
        season,
        left: leftHistory.seasons.find(
          (entry) => entry.label === season,
        ),
        right: rightHistory.seasons.find(
          (entry) => entry.label === season,
        ),
      }))
      .reverse();
  }, [careerChartData, leftHistory, rightHistory]);

  function swapPlayers() {
    setLeftId(rightId);
    setRightId(leftId);
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
              Loading Premier League players...
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
            Compare page could not be loaded
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
          Head-to-head analytics
        </p>

        <h1 className="page-heading mt-2">
          Compare Players
        </h1>

        <p className="mt-3 max-w-2xl leading-7 text-muted-light">
          Compare current-season output, career totals and
          season-by-season Premier League performance.
        </p>
      </section>

      <section className="panel relative z-20 overflow-visible p-5 md:p-6">
        <div className="grid items-end gap-4 lg:grid-cols-[1fr_auto_1fr]">
          <PlayerSearch
            label="Player one"
            players={players}
            selectedId={leftId}
            disabledPlayerId={rightId}
            onSelect={setLeftId}
          />

          <button
            type="button"
            onClick={swapPlayers}
            disabled={!leftId && !rightId}
            aria-label="Swap selected players"
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeftRight size={19} />
          </button>

          <PlayerSearch
            label="Player two"
            players={players}
            selectedId={rightId}
            disabledPlayerId={leftId}
            onSelect={setRightId}
          />
        </div>
      </section>

      {leftPlayer && rightPlayer ? (
        <>
          <section className="relative mt-8 grid items-center gap-8 rounded-2xl border border-border bg-panel p-6 md:p-8 lg:grid-cols-[1fr_auto_1fr]">
            <PlayerHero player={leftPlayer} side="left" />

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-accent/50 bg-accent-soft text-sm font-black uppercase tracking-wider text-accent">
              VS
            </div>

            <PlayerHero player={rightPlayer} side="right" />
          </section>

          <section className="mt-8">
            <div className="mb-5">
              <h2 className="text-2xl font-black text-white">
                Current-season comparison
              </h2>

              <p className="mt-1 text-sm text-muted">
                The stronger value in each category is highlighted.
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {currentStats.map((stat) => (
                <ComparisonRow
                  key={stat.label}
                  label={stat.label}
                  leftValue={stat.left}
                  rightValue={stat.right}
                  formatter={stat.formatter}
                />
              ))}
            </div>
          </section>

          {historyError && (
            <div className="mt-8 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-5 py-4 text-sm text-yellow-200">
              {historyError}
            </div>
          )}

          {historyLoading && (
            <section className="panel mt-8 flex min-h-48 items-center justify-center">
              <div className="text-center">
                <Loader2
                  size={28}
                  className="mx-auto animate-spin text-accent"
                />

                <p className="mt-4 text-sm text-muted">
                  Loading career history...
                </p>
              </div>
            </section>
          )}

          {!historyLoading &&
            leftHistory &&
            rightHistory && (
              <>
                <section className="mt-10">
                  <div className="mb-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                      Multi-season record
                    </p>

                    <h2 className="mt-2 text-2xl font-black text-white">
                      Career comparison
                    </h2>

                    <p className="mt-1 text-sm text-muted">
                      Combined totals from all imported Premier
                      League seasons.
                    </p>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    {careerStats.map((stat) => (
                      <ComparisonRow
                        key={stat.label}
                        label={stat.label}
                        leftValue={stat.left}
                        rightValue={stat.right}
                        formatter={stat.formatter}
                      />
                    ))}
                  </div>
                </section>

                <section className="panel mt-8 p-6">
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-white">
                      Goals and xG by season
                    </h2>

                    <p className="mt-1 text-sm text-muted">
                      Career progression for both selected players.
                    </p>
                  </div>

                  <div className="h-96">
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >
                      <LineChart data={careerChartData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="rgba(148, 163, 184, 0.14)"
                        />

                        <XAxis
                          dataKey="season"
                          tick={{ fill: "#94a3b8" }}
                          axisLine={false}
                          tickLine={false}
                        />

                        <YAxis
                          tick={{ fill: "#94a3b8" }}
                          axisLine={false}
                          tickLine={false}
                        />

                        <Tooltip content={<CareerTooltip />} />
                        <Legend />

                        <Line
                          type="monotone"
                          dataKey="leftGoals"
                          name={`${leftPlayer.name} goals`}
                          stroke="#38bdf8"
                          strokeWidth={3}
                          dot={{ r: 4 }}
                        />

                        <Line
                          type="monotone"
                          dataKey="rightGoals"
                          name={`${rightPlayer.name} goals`}
                          stroke="#f59e0b"
                          strokeWidth={3}
                          dot={{ r: 4 }}
                        />

                        <Line
                          type="monotone"
                          dataKey="leftXg"
                          name={`${leftPlayer.name} xG`}
                          stroke="#0f4c67"
                          strokeWidth={2}
                          strokeDasharray="6 5"
                          dot={false}
                        />

                        <Line
                          type="monotone"
                          dataKey="rightXg"
                          name={`${rightPlayer.name} xG`}
                          stroke="#92400e"
                          strokeWidth={2}
                          strokeDasharray="6 5"
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                <section className="panel mt-8 overflow-hidden">
                  <div className="border-b border-border p-6">
                    <h2 className="text-xl font-bold text-white">
                      Season-by-season comparison
                    </h2>

                    <p className="mt-1 text-sm text-muted">
                      A direct comparison across matching imported
                      seasons.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b border-border bg-black/10 text-xs uppercase tracking-wider text-muted">
                        <tr>
                          <th className="px-5 py-4">Season</th>
                          <th className="px-5 py-4">Player</th>
                          <th className="px-5 py-4">Club</th>
                          <th className="px-5 py-4 text-right">
                            Apps
                          </th>
                          <th className="px-5 py-4 text-right">
                            Goals
                          </th>
                          <th className="px-5 py-4 text-right">
                            Assists
                          </th>
                          <th className="px-5 py-4 text-right">
                            xG
                          </th>
                          <th className="px-5 py-4 text-right">
                            xA
                          </th>
                          <th className="px-5 py-4 text-right">
                            Minutes
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-border">
                        {seasonRows.flatMap((row) => [
                          <tr
                            key={`${row.season}-left`}
                            className="transition-colors hover:bg-white/[0.03]"
                          >
                            <td className="whitespace-nowrap px-5 py-4 font-semibold text-white">
                              {row.season}
                            </td>
                            <td className="whitespace-nowrap px-5 py-4 font-semibold text-accent">
                              {leftPlayer.name}
                            </td>
                            <td className="whitespace-nowrap px-5 py-4 text-muted-light">
                              {row.left?.team || "—"}
                            </td>
                            <td className="px-5 py-4 text-right text-muted-light">
                              {row.left?.appearances ?? "—"}
                            </td>
                            <td className="px-5 py-4 text-right font-semibold text-white">
                              {row.left?.goals ?? "—"}
                            </td>
                            <td className="px-5 py-4 text-right text-muted-light">
                              {row.left?.assists ?? "—"}
                            </td>
                            <td className="px-5 py-4 text-right text-muted-light">
                              {formatDecimal(row.left?.xg)}
                            </td>
                            <td className="px-5 py-4 text-right text-muted-light">
                              {formatDecimal(row.left?.xa)}
                            </td>
                            <td className="px-5 py-4 text-right text-muted-light">
                              {formatInteger(row.left?.minutes)}
                            </td>
                          </tr>,
                          <tr
                            key={`${row.season}-right`}
                            className="border-b-2 border-border transition-colors hover:bg-white/[0.03]"
                          >
                            <td className="whitespace-nowrap px-5 py-4 text-muted">
                              {row.season}
                            </td>
                            <td className="whitespace-nowrap px-5 py-4 font-semibold text-yellow-300">
                              {rightPlayer.name}
                            </td>
                            <td className="whitespace-nowrap px-5 py-4 text-muted-light">
                              {row.right?.team || "—"}
                            </td>
                            <td className="px-5 py-4 text-right text-muted-light">
                              {row.right?.appearances ?? "—"}
                            </td>
                            <td className="px-5 py-4 text-right font-semibold text-white">
                              {row.right?.goals ?? "—"}
                            </td>
                            <td className="px-5 py-4 text-right text-muted-light">
                              {row.right?.assists ?? "—"}
                            </td>
                            <td className="px-5 py-4 text-right text-muted-light">
                              {formatDecimal(row.right?.xg)}
                            </td>
                            <td className="px-5 py-4 text-right text-muted-light">
                              {formatDecimal(row.right?.xa)}
                            </td>
                            <td className="px-5 py-4 text-right text-muted-light">
                              {formatInteger(row.right?.minutes)}
                            </td>
                          </tr>,
                        ])}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
        </>
      ) : (
        <section className="panel mt-8 flex min-h-64 flex-col items-center justify-center p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-black/20">
            <Users size={25} className="text-muted" />
          </div>

          <h2 className="mt-5 text-xl font-bold text-white">
            Select two players
          </h2>

          <p className="mt-2 max-w-md text-muted">
            Search for a player on each side, then click
            their result to generate the full comparison.
          </p>
        </section>
      )}
    </main>
  );
}