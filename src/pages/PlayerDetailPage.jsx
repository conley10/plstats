import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  SearchCheck,
  Swords,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
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
  getPlayer,
  getPlayerHistory,
} from "../api/playersApi";

function formatPosition(position) {
  if (!position) return "—";

  const value = position.toUpperCase().trim();

  if (value.includes("GK")) return "GK";
  if (value.startsWith("D")) return "Defender";
  if (value.startsWith("M")) return "Midfielder";
  if (value.startsWith("F")) return "Forward";

  return position;
}

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;

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

function formatDecimal(value, digits = 1) {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(Number(value))
  ) {
    return "—";
  }

  return Number(value).toFixed(digits);
}

function clamp(value, minimum = 0, maximum = 100) {
  return Math.min(Math.max(value, minimum), maximum);
}

function per90(value, minutes) {
  const numericMinutes = Number(minutes || 0);

  if (!numericMinutes) return 0;

  return (Number(value || 0) / numericMinutes) * 90;
}

function getPositionBenchmarks(position) {
  const value = String(position || "").toUpperCase();

  if (value.includes("GK")) {
    return {
      goals: 0.02,
      xg: 0.02,
      xa: 0.03,
      shots: 0.2,
      keyPasses: 0.25,
      involvement: 0.8,
    };
  }

  if (value.startsWith("D")) {
    return {
      goals: 0.12,
      xg: 0.12,
      xa: 0.15,
      shots: 1.1,
      keyPasses: 1.0,
      involvement: 0.75,
    };
  }

  if (value.startsWith("M")) {
    return {
      goals: 0.45,
      xg: 0.45,
      xa: 0.45,
      shots: 2.7,
      keyPasses: 2.4,
      involvement: 0.8,
    };
  }

  return {
    goals: 0.75,
    xg: 0.75,
    xa: 0.5,
    shots: 4.2,
    keyPasses: 2.3,
    involvement: 0.85,
  };
}

function AnalyticsBar({ label, value }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-muted-light">
          {label}
        </span>

        <span className="text-sm font-black tabular-nums text-white">
          {Math.round(value)}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-accent transition-all duration-500"
          style={{ width: `${clamp(value)}%` }}
        />
      </div>
    </div>
  );
}

function InsightList({ title, items, positive = true }) {
  return (
    <div className="rounded-xl border border-border bg-black/10 p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">
        {title}
      </p>

      <div className="mt-4 space-y-3">
        {items.length ? (
          items.map((item) => (
            <div
              key={item}
              className="flex items-start gap-3 text-sm text-muted-light"
            >
              <span
                className={`mt-0.5 font-black ${
                  positive ? "text-green-400" : "text-amber-300"
                }`}
              >
                {positive ? "+" : "–"}
              </span>
              <span>{item}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted">
            Not enough data to generate an insight.
          </p>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-border bg-panel p-5">
      <p className="text-3xl font-black tabular-nums text-white">
        {value}
      </p>

      <p className="mt-1 text-xs uppercase tracking-wider text-muted">
        {label}
      </p>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-panel px-4 py-3 shadow-xl">
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
            {formatDecimal(entry.value)}
          </span>
        </p>
      ))}
    </div>
  );
}

export default function PlayerDetailPage() {
  const { playerId } = useParams();

  const [player, setPlayer] = useState(null);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

useEffect(() => {
  let isCancelled = false;

  async function loadPlayer() {
    try {
      setLoading(true);
      setError("");

      const playerData = await getPlayer(playerId);

      if (isCancelled) return;

      setPlayer(playerData);

      try {
        const historyData =
          await getPlayerHistory(playerId);

        if (!isCancelled) {
          setHistory(historyData);
        }
      } catch (historyError) {
        console.error(
          "Unable to load player history:",
          historyError
        );

        if (!isCancelled) {
          setHistory(null);
        }
      }
    } catch (requestError) {
      console.error(
        "Unable to load player:",
        requestError
      );

      if (!isCancelled) {
        setError("Unable to load player.");
      }
    } finally {
      if (!isCancelled) {
        setLoading(false);
      }
    }
  }

  loadPlayer();

  return () => {
    isCancelled = true;
  };
}, [playerId]);

  const age = useMemo(
    () => calculateAge(player?.dateOfBirth),
    [player?.dateOfBirth],
  );

  const goalsDifference = useMemo(() => {
    if (!player) return null;

    return Number(player.goals || 0) -
      Number(player.xg || 0);
  }, [player]);

  const xgPer90 = useMemo(() => {
    if (!player?.minutes) return null;

    return (
      (Number(player.xg || 0) /
        Number(player.minutes)) *
      90
    );
  }, [player]);

  const xaPer90 = useMemo(() => {
    if (!player?.minutes) return null;

    return (
      (Number(player.xa || 0) /
        Number(player.minutes)) *
      90
    );
  }, [player]);

  const analytics = useMemo(() => {
    if (!player) return null;

    const minutes = Number(player.minutes || 0);
    const benchmarks = getPositionBenchmarks(player.position);

    const metrics = {
      scoring: per90(player.goals, minutes),
      expectedGoals: per90(player.xg, minutes),
      creativity: per90(player.xa, minutes),
      shooting: per90(player.shots, minutes),
      keyPassing: per90(player.keyPasses, minutes),
      involvement: per90(player.xgChain, minutes),
    };

    const scores = {
      scoring: clamp((metrics.scoring / benchmarks.goals) * 100),
      expectedGoals: clamp(
        (metrics.expectedGoals / benchmarks.xg) * 100,
      ),
      creativity: clamp((metrics.creativity / benchmarks.xa) * 100),
      shooting: clamp((metrics.shooting / benchmarks.shots) * 100),
      keyPassing: clamp(
        (metrics.keyPassing / benchmarks.keyPasses) * 100,
      ),
      involvement: clamp(
        (metrics.involvement / benchmarks.involvement) * 100,
      ),
    };

    const availableScores = Object.entries(scores)
      .filter(([key]) => {
        if (key === "involvement") return player.xgChain != null;
        if (key === "keyPassing") return player.keyPasses != null;
        return true;
      })
      .map(([, value]) => value);

    const rating = availableScores.length
      ? Math.round(
          availableScores.reduce((total, value) => total + value, 0) /
            availableScores.length,
        )
      : null;

    const finishingDifference =
      Number(player.goals || 0) - Number(player.xg || 0);

    const strengths = [];
    const developmentAreas = [];

    if (scores.scoring >= 75) strengths.push("Strong goal output for the player's position.");
    if (scores.expectedGoals >= 75) strengths.push("Consistently gets into high-quality scoring positions.");
    if (scores.creativity >= 70) strengths.push("Produces strong expected-assist numbers.");
    if (scores.keyPassing >= 70) strengths.push("Creates chances regularly through key passes.");
    if (scores.shooting >= 75) strengths.push("Maintains a high shot volume.");
    if (finishingDifference > 1) strengths.push("Finishing above expected goals this season.");

    if (scores.scoring < 40) developmentAreas.push("Goal output is below the positional benchmark.");
    if (scores.creativity < 40) developmentAreas.push("Limited expected-assist production in the available data.");
    if (scores.keyPassing < 40) developmentAreas.push("Chance creation through key passes could improve.");
    if (scores.shooting < 40) developmentAreas.push("Low shot volume compared with the positional benchmark.");
    if (finishingDifference < -1) developmentAreas.push("Finishing below expected goals this season.");

    if (!strengths.length) {
      strengths.push("Balanced attacking output across the available metrics.");
    }

    if (!developmentAreas.length) {
      developmentAreas.push("No major weakness is visible in the available attacking data.");
    }

    return {
      rating,
      scores,
      radarData: [
        { metric: "Scoring", score: scores.scoring },
        { metric: "xG threat", score: scores.expectedGoals },
        { metric: "Creativity", score: scores.creativity },
        { metric: "Shooting", score: scores.shooting },
        { metric: "Key passing", score: scores.keyPassing },
        { metric: "Involvement", score: scores.involvement },
      ],
      strengths: strengths.slice(0, 4),
      developmentAreas: developmentAreas.slice(0, 4),
    };
  }, [player]);

  const chartData = useMemo(() => {
    if (!player) return [];

    return [
      {
        category: "Goals",
        actual: Number(player.goals || 0),
        expected: Number(player.xg || 0),
      },
      {
        category: "Assists",
        actual: Number(player.assists || 0),
        expected: Number(player.xa || 0),
      },
      {
        category: "Non-penalty",
        actual:
          Number(player.goals || 0) -
          Number(player.penalties || 0),
        expected: Number(player.npxg || 0),
      },
    ];
  }, [player]);


  const seasonHistory = useMemo(
    () => history?.seasons ?? [],
    [history],
  );

  const careerTotals = history?.careerTotals ?? {};

  const careerChartData = useMemo(
    () =>
      seasonHistory.map((season) => ({
        season: season.label,
        goals: Number(season.goals || 0),
        xg: Number(season.xg || 0),
        assists: Number(season.assists || 0),
        xa: Number(season.xa || 0),
      })),
    [seasonHistory],
  );

  const bestGoalSeason = useMemo(() => {
    if (!seasonHistory.length) return null;

    return seasonHistory.reduce((best, season) =>
      Number(season.goals || 0) >
      Number(best.goals || 0)
        ? season
        : best,
    );
  }, [seasonHistory]);

  const highestXgSeason = useMemo(() => {
    if (!seasonHistory.length) return null;

    return seasonHistory.reduce((best, season) =>
      Number(season.xg || 0) >
      Number(best.xg || 0)
        ? season
        : best,
    );
  }, [seasonHistory]);

  const mostMinutesSeason = useMemo(() => {
    if (!seasonHistory.length) return null;

    return seasonHistory.reduce((best, season) =>
      Number(season.minutes || 0) >
      Number(best.minutes || 0)
        ? season
        : best,
    );
  }, [seasonHistory]);

  if (loading) {
    return (
      <main className="page-container flex min-h-80 items-center justify-center">
        <Loader2
          size={32}
          className="animate-spin text-accent"
        />
      </main>
    );
  }

  if (error || !player) {
    return (
      <main className="page-container">
        <section className="panel p-8">
          <h1 className="text-xl font-bold text-white">
            Player could not be loaded
          </h1>

          <p className="mt-3 text-muted">
            {error || "Player not found."}
          </p>

          <Link
            to="/players"
            className="primary-button mt-6 inline-flex"
          >
            Back to Players
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="page-container">
      <Link
        to="/players"
        className="mb-8 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-white"
      >
        <ArrowLeft size={17} />
        Back to Players
      </Link>

      <section className="mb-8 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
        <div className="flex items-center gap-6">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-panel">
            {player.team?.crest ? (
              <img
                src={player.team.crest}
                alt={player.team.name}
                className="h-20 w-20 object-contain"
              />
            ) : (
              <span className="text-xs uppercase text-muted">
                No photo
              </span>
            )}
          </div>

          <div>
            <h1 className="text-4xl font-black text-white md:text-5xl">
              {player.name}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-muted-light">
              <span>
                {player.team?.shortName ||
                  player.team?.name}
              </span>

              <span className="text-border">•</span>

              <span>
                {formatPosition(player.position)}
              </span>

              {age !== null && (
                <>
                  <span className="text-border">
                    •
                  </span>

                  <span>Age {age}</span>
                </>
              )}

              {player.nationality && (
                <>
                  <span className="text-border">
                    •
                  </span>

                  <span>{player.nationality}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to={`/players/${player.id}/scout`}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-bold text-black transition-transform hover:-translate-y-0.5"
          >
            <SearchCheck size={17} />
            Scout Report
          </Link>

          <Link
            to={`/players/compare?player=${player.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-accent px-5 py-3 text-sm font-semibold text-accent transition-colors hover:bg-accent-soft"
          >
            <Swords size={17} />
            Compare to another player
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <StatCard
          label="Goals"
          value={player.goals ?? 0}
        />

        <StatCard
          label="Assists"
          value={player.assists ?? 0}
        />

        <StatCard
          label="xG"
          value={formatDecimal(player.xg)}
        />

        <StatCard
          label="xA"
          value={formatDecimal(player.xa)}
        />

        <StatCard
          label="npxG"
          value={formatDecimal(player.npxg)}
        />

        <StatCard
          label="Minutes"
          value={
            player.minutes
              ? Number(
                  player.minutes,
                ).toLocaleString("en-AU")
              : "—"
          }
        />

        <StatCard
          label="Shots"
          value={player.shots ?? "—"}
        />
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <article className="panel p-6">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white">
              Goals and expected output
            </h2>

            <p className="mt-1 text-sm text-muted">
              Solid bars show actual output. The
              second bar shows expected output.
            </p>
          </div>

          <div className="h-80">
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
                  dataKey="category"
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
                  content={<ChartTooltip />}
                />

                <Bar
                  dataKey="actual"
                  name="Actual"
                  fill="#38bdf8"
                  radius={[5, 5, 0, 0]}
                />

                <Bar
                  dataKey="expected"
                  name="Expected"
                  fill="#0f4c67"
                  radius={[5, 5, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel p-6">
          <div>
            <h2 className="text-lg font-bold text-white">
              Season performance
            </h2>

            <p className="mt-1 text-sm text-muted">
              Efficiency and underlying attacking
              numbers.
            </p>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <StatCard
              label="Appearances"
              value={player.appearances ?? "—"}
            />

            <StatCard
              label="Key Passes"
              value={player.keyPasses ?? "—"}
            />

            <StatCard
              label="xG per 90"
              value={formatDecimal(xgPer90, 2)}
            />

            <StatCard
              label="xA per 90"
              value={formatDecimal(xaPer90, 2)}
            />
          </div>

          <div className="mt-6 rounded-xl border border-accent/40 bg-accent-soft p-5">
            <p className="text-xs uppercase tracking-wider text-muted">
              Goals minus xG
            </p>

            <p
              className={`mt-2 text-3xl font-black ${
                goalsDifference >= 0
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {goalsDifference >= 0 ? "+" : ""}
              {formatDecimal(goalsDifference)}
            </p>

            <p className="mt-2 text-sm text-muted-light">
              {goalsDifference > 1
                ? "Finishing above expected output this season."
                : goalsDifference < -1
                  ? "Finishing below expected output this season."
                  : "Finishing closely matches expected output this season."}
            </p>
          </div>
        </article>
      </section>

      {analytics && (
        <section className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <article className="panel p-6">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                Player analytics
              </p>

              <h2 className="mt-2 text-xl font-black text-white">
                Attacking profile radar
              </h2>

              <p className="mt-2 text-sm leading-6 text-muted">
                Scores are normalised from the available Understat attacking
                data and adjusted against broad positional benchmarks.
              </p>
            </div>

            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={analytics.radarData} outerRadius="72%">
                  <PolarGrid stroke="rgba(148, 163, 184, 0.2)" />
                  <PolarAngleAxis
                    dataKey="metric"
                    tick={{ fill: "#cbd5e1", fontSize: 12 }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={false}
                    axisLine={false}
                  />
                  <Radar
                    name="Rating"
                    dataKey="score"
                    stroke="#38bdf8"
                    fill="#38bdf8"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                  <Tooltip
                    formatter={(value) => [Math.round(Number(value)), "Score"]}
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid rgba(148, 163, 184, 0.2)",
                      borderRadius: "12px",
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="panel p-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between xl:flex-col xl:items-stretch">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                  Performance rating
                </p>

                <div className="mt-3 flex items-end gap-2">
                  <span className="text-6xl font-black tabular-nums text-white">
                    {analytics.rating ?? "—"}
                  </span>
                  <span className="pb-2 text-lg font-bold text-muted">/100</span>
                </div>

                <p className="mt-3 max-w-md text-sm leading-6 text-muted">
                  This is an attacking-data rating, not a complete assessment
                  of defensive, physical or goalkeeping performance.
                </p>
              </div>

              <div className="grid flex-1 gap-4">
                <AnalyticsBar label="Scoring" value={analytics.scores.scoring} />
                <AnalyticsBar label="xG threat" value={analytics.scores.expectedGoals} />
                <AnalyticsBar label="Creativity" value={analytics.scores.creativity} />
                <AnalyticsBar label="Shooting" value={analytics.scores.shooting} />
                <AnalyticsBar label="Key passing" value={analytics.scores.keyPassing} />
              </div>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <InsightList
                title="Strengths"
                items={analytics.strengths}
              />

              <InsightList
                title="Development areas"
                items={analytics.developmentAreas}
                positive={false}
              />
            </div>
          </article>
        </section>
      )}

      {history && (
        <>
          <section className="mt-10">
            <div className="mb-5">
              <p className="text-xs uppercase tracking-wider text-accent">
                Premier League career
              </p>

              <h2 className="mt-2 text-2xl font-black text-white">
                Career totals
              </h2>

              <p className="mt-1 text-sm text-muted">
                Combined statistics from {history.seasonCount} recorded seasons.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              <StatCard
                label="Appearances"
                value={careerTotals.appearances ?? 0}
              />

              <StatCard
                label="Goals"
                value={careerTotals.goals ?? 0}
              />

              <StatCard
                label="Assists"
                value={careerTotals.assists ?? 0}
              />

              <StatCard
                label="xG"
                value={formatDecimal(careerTotals.xg)}
              />

              <StatCard
                label="xA"
                value={formatDecimal(careerTotals.xa)}
              />

              <StatCard
                label="Shots"
                value={careerTotals.shots ?? 0}
              />

              <StatCard
                label="Minutes"
                value={Number(
                  careerTotals.minutes || 0,
                ).toLocaleString("en-AU")}
              />
            </div>
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <article className="panel p-6">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-white">
                  Career progression
                </h2>

                <p className="mt-1 text-sm text-muted">
                  Goals compared with expected goals in each Premier League season.
                </p>
              </div>

              <div className="h-96">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart data={careerChartData}>
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

                    <Tooltip
                      content={<ChartTooltip />}
                    />

                    <Bar
                      dataKey="goals"
                      name="Goals"
                      fill="#38bdf8"
                      radius={[5, 5, 0, 0]}
                    />

                    <Bar
                      dataKey="xg"
                      name="xG"
                      fill="#0f4c67"
                      radius={[5, 5, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="panel p-6">
              <h2 className="text-lg font-bold text-white">
                Career records
              </h2>

              <p className="mt-1 text-sm text-muted">
                Best single-season totals from the available data.
              </p>

              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-border bg-panel p-5">
                  <p className="text-xs uppercase tracking-wider text-muted">
                    Best goal season
                  </p>

                  <p className="mt-2 text-3xl font-black text-white">
                    {bestGoalSeason?.goals ?? 0}
                  </p>

                  <p className="mt-1 text-sm text-muted-light">
                    {bestGoalSeason?.label ?? "—"}
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-panel p-5">
                  <p className="text-xs uppercase tracking-wider text-muted">
                    Highest xG
                  </p>

                  <p className="mt-2 text-3xl font-black text-white">
                    {formatDecimal(
                      highestXgSeason?.xg,
                    )}
                  </p>

                  <p className="mt-1 text-sm text-muted-light">
                    {highestXgSeason?.label ?? "—"}
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-panel p-5">
                  <p className="text-xs uppercase tracking-wider text-muted">
                    Most minutes
                  </p>

                  <p className="mt-2 text-3xl font-black text-white">
                    {Number(
                      mostMinutesSeason?.minutes || 0,
                    ).toLocaleString("en-AU")}
                  </p>

                  <p className="mt-1 text-sm text-muted-light">
                    {mostMinutesSeason?.label ?? "—"}
                  </p>
                </div>
              </div>
            </article>
          </section>

          <section className="panel mt-6 overflow-hidden">
            <div className="border-b border-border p-6">
              <h2 className="text-lg font-bold text-white">
                Season history
              </h2>

              <p className="mt-1 text-sm text-muted">
                Complete Premier League record from the imported Understat seasons.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-border bg-black/10 text-xs uppercase tracking-wider text-muted">
                  <tr>
                    <th className="px-5 py-4">Season</th>
                    <th className="px-5 py-4">Club</th>
                    <th className="px-5 py-4 text-right">Apps</th>
                    <th className="px-5 py-4 text-right">Goals</th>
                    <th className="px-5 py-4 text-right">Assists</th>
                    <th className="px-5 py-4 text-right">xG</th>
                    <th className="px-5 py-4 text-right">xA</th>
                    <th className="px-5 py-4 text-right">npxG</th>
                    <th className="px-5 py-4 text-right">Shots</th>
                    <th className="px-5 py-4 text-right">Minutes</th>
                    <th className="px-5 py-4 text-right">G-xG</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border">
                  {[...seasonHistory]
                    .reverse()
                    .map((season) => {
                      const difference =
                        Number(season.goals || 0) -
                        Number(season.xg || 0);

                      return (
                        <tr
                          key={season.season}
                          className="transition-colors hover:bg-white/[0.03]"
                        >
                          <td className="whitespace-nowrap px-5 py-4 font-semibold text-white">
                            {season.label}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-muted-light">
                            {season.team}
                          </td>

                          <td className="px-5 py-4 text-right text-muted-light">
                            {season.appearances}
                          </td>

                          <td className="px-5 py-4 text-right font-semibold text-white">
                            {season.goals}
                          </td>

                          <td className="px-5 py-4 text-right text-muted-light">
                            {season.assists}
                          </td>

                          <td className="px-5 py-4 text-right text-muted-light">
                            {formatDecimal(season.xg)}
                          </td>

                          <td className="px-5 py-4 text-right text-muted-light">
                            {formatDecimal(season.xa)}
                          </td>

                          <td className="px-5 py-4 text-right text-muted-light">
                            {formatDecimal(season.npxg)}
                          </td>

                          <td className="px-5 py-4 text-right text-muted-light">
                            {season.shots}
                          </td>

                          <td className="px-5 py-4 text-right text-muted-light">
                            {Number(
                              season.minutes || 0,
                            ).toLocaleString("en-AU")}
                          </td>

                          <td
                            className={`px-5 py-4 text-right font-semibold ${
                              difference >= 0
                                ? "text-green-400"
                                : "text-red-400"
                            }`}
                          >
                            {difference >= 0 ? "+" : ""}
                            {formatDecimal(difference)}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <section className="panel mt-6 p-6">
        <p className="text-xs uppercase tracking-wider text-muted">
          Player profile summary
        </p>

        <h2 className="mt-2 text-xl font-bold text-white">
          {player.name} season overview
        </h2>

        <p className="mt-3 max-w-3xl leading-7 text-muted-light">
          {player.name} has recorded{" "}
          <strong className="text-white">
            {player.goals ?? 0} goals
          </strong>{" "}
          from{" "}
          <strong className="text-white">
            {formatDecimal(player.xg)} xG
          </strong>{" "}
          across{" "}
          <strong className="text-white">
            {player.appearances ?? 0} appearances
          </strong>
          . The player averages{" "}
          <strong className="text-white">
            {formatDecimal(xgPer90, 2)} xG per 90
          </strong>{" "}
          and has produced{" "}
          <strong className="text-white">
            {player.keyPasses ?? 0} key passes
          </strong>
          .
        </p>
      </section>
    </main>
  );
}