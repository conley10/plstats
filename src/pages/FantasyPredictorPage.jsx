import {
  Activity,
  ArrowUpDown,
  BadgeCheck,
  Brain,
  CalendarDays,
  Gauge,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  NavLink,
} from "react-router-dom";

import {
  getFantasyPredictions,
} from "../api/fantasyApi";

function FantasyTabs() {
  const tabs = [
    {
      label: "Overview",
      path: "/fantasy",
    },
    {
      label: "Gameweek Predictor",
      path: "/fantasy/predictor",
    },
    {
      label: "My Team",
      path: "/fantasy/my-team",
    },
    {
      label: "Transfers",
      path: "/fantasy/transfers",
    },
  ];

  function getTabClass({
    isActive,
  }) {
    return [
      "rounded-md px-3 py-2 text-sm font-semibold transition-colors",
      isActive
        ? "bg-accent-soft text-accent"
        : "text-muted hover:bg-surface-hover hover:text-white",
    ].join(" ");
  }

  return (
    <nav className="mb-6 flex flex-wrap gap-2 rounded-xl border border-border bg-surface p-2">
      {tabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          end
          className={getTabClass}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}

function formatPercentage(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0.0%";
  }

  return `${number.toFixed(1)}%`;
}

function formatNumber(value, digits = 1) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return number.toFixed(digits);
}

function getPositionStyle(position) {
  switch (position) {
    case "GKP":
      return "bg-warning/10 text-warning";

    case "DEF":
      return "bg-success/10 text-success";

    case "MID":
      return "bg-accent-soft text-accent";

    case "FWD":
      return "bg-danger/10 text-danger";

    default:
      return "bg-surface-light text-muted-light";
  }
}

function getConfidenceStyle(
  confidence,
) {
  switch (confidence) {
    case "High":
      return "bg-success/10 text-success border-success/30";

    case "Medium":
      return "bg-warning/10 text-warning border-warning/30";

    default:
      return "bg-danger/10 text-danger border-danger/30";
  }
}

function getFixtureStars(
  difficulty,
) {
  const value = Number(difficulty);

  const safeDifficulty =
    Number.isFinite(value)
      ? Math.min(
          Math.max(value, 1),
          5,
        )
      : 3;

  const favourable =
    6 - safeDifficulty;

  return "★".repeat(favourable) +
    "☆".repeat(
      5 - favourable,
    );
}

function ProbabilityBar({
  label,
  value,
}) {
  const safeValue = Math.min(
    Math.max(
      Number(value) || 0,
      0,
    ),
    100,
  );

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-muted-light">
          {label}
        </span>

        <span className="font-semibold text-white">
          {safeValue.toFixed(1)}%
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-base">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{
            width: `${safeValue}%`,
          }}
        />
      </div>
    </div>
  );
}

function PredictorCard({
  player,
  rank,
}) {
  const prediction =
    player.prediction || {};

  const historical =
    player.historical || {};

  const fixture =
    player.fixture || null;

  return (
    <article className="panel panel-hover p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-base font-display text-lg font-bold text-accent">
            {rank}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl font-bold text-white">
                {player.webName}
              </h2>

              <span
                className={[
                  "rounded-md px-2 py-1 text-xs font-bold",
                  getPositionStyle(
                    player.position
                      ?.shortName,
                  ),
                ].join(" ")}
              >
                {
                  player.position
                    ?.shortName
                }
              </span>
            </div>

            <p className="mt-1 text-sm text-muted">
              {
                player.team
                  ?.shortName
              }{" "}
              • £
              {formatNumber(
                player.price,
                1,
              )}
              m
            </p>
          </div>
        </div>

        <div
          className={[
            "rounded-md border px-2 py-1 text-xs font-bold",
            getConfidenceStyle(
              prediction.confidence,
            ),
          ].join(" ")}
        >
          {prediction.confidence ||
            "Low"}
        </div>
      </div>

      <div className="mb-5 rounded-lg border border-accent/20 bg-accent-soft/40 p-4 text-center">
        <div className="section-label">
          Predicted Points
        </div>

        <div className="mt-2 font-display text-5xl font-extrabold text-accent">
          {formatNumber(
            prediction.predictedPoints,
            1,
          )}
        </div>

        <div className="mt-2 text-xs text-muted">
          PLStats V1 projection
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-base p-3">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Target size={14} />
            Goal
          </div>

          <div className="mt-1 font-display text-xl font-bold">
            {formatPercentage(
              prediction.goalProbability,
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-base p-3">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Sparkles size={14} />
            Assist
          </div>

          <div className="mt-1 font-display text-xl font-bold">
            {formatPercentage(
              prediction.assistProbability,
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <ProbabilityBar
          label="2+ points"
          value={
            prediction.twoPlusProbability
          }
        />

        <ProbabilityBar
          label="5+ points"
          value={
            prediction.fivePlusProbability
          }
        />

        <ProbabilityBar
          label="10+ points"
          value={
            prediction.tenPlusProbability
          }
        />
      </div>

      <div className="my-5 border-t border-border" />

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Timer size={13} />
            Minutes
          </div>

          <div className="mt-1 font-semibold">
            {
              prediction.expectedMinutes
            }
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <CalendarDays
              size={13}
            />
            Fixture
          </div>

          <div className="mt-1 font-semibold text-warning">
            {getFixtureStars(
              prediction.fixtureDifficulty,
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Gauge size={13} />
            FPL Form
          </div>

          <div className="mt-1 font-semibold">
            {formatNumber(
              player.form,
              1,
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <ShieldCheck
              size={13}
            />
            History
          </div>

          <div className="mt-1 font-semibold">
            {
              historical.seasonCount ||
              0
            }{" "}
            seasons
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-border bg-base p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-muted">
            Historical xG/90
          </span>

          <span className="font-semibold">
            {formatNumber(
              historical.xgPer90,
              3,
            )}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">
            Historical xA/90
          </span>

          <span className="font-semibold">
            {formatNumber(
              historical.xaPer90,
              3,
            )}
          </span>
        </div>
      </div>

      {fixture && (
        <div className="mt-3 text-xs text-muted">
          {fixture.home
            ? "Home fixture"
            : "Away fixture"}{" "}
          • Difficulty{" "}
          {
            fixture.difficulty
          }
        </div>
      )}
    </article>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  subtext,
}) {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="section-label">
            {label}
          </span>

          <div className="mt-2 font-display text-2xl font-bold text-accent">
            {value}
          </div>

          {subtext && (
            <div className="mt-1 text-xs text-muted">
              {subtext}
            </div>
          )}
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-base">
          <Icon
            size={17}
            className="text-accent"
          />
        </div>
      </div>
    </div>
  );
}

export default function FantasyPredictorPage() {
  const [data, setData] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [position, setPosition] =
    useState("");

  const [sort, setSort] =
    useState("predicted");

  const [confidence, setConfidence] =
    useState("");

  useEffect(() => {
    async function loadPredictions() {
      try {
        setLoading(true);
        setError("");

        const response =
          await getFantasyPredictions({
            limit: 700,
          });

        setData(response);
      } catch (loadError) {
        console.error(
          loadError,
        );

        setError(
          "Gameweek predictions could not be loaded.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadPredictions();
  }, []);

  const predictions =
    data?.predictions || [];

  const filteredPredictions =
    useMemo(() => {
      let result = [
        ...predictions,
      ];

      const searchValue =
        search
          .trim()
          .toLowerCase();

      if (searchValue) {
        result =
          result.filter(
            (player) =>
              player.name
                ?.toLowerCase()
                .includes(
                  searchValue,
                ) ||
              player.webName
                ?.toLowerCase()
                .includes(
                  searchValue,
                ) ||
              player.team?.name
                ?.toLowerCase()
                .includes(
                  searchValue,
                ),
          );
      }

      if (position) {
        result =
          result.filter(
            (player) =>
              player.position
                ?.shortName ===
              position,
          );
      }

      if (confidence) {
        result =
          result.filter(
            (player) =>
              player.prediction
                ?.confidence ===
              confidence,
          );
      }

      switch (sort) {
        case "goal":
          result.sort(
            (a, b) =>
              b.prediction
                .goalProbability -
              a.prediction
                .goalProbability,
          );
          break;

        case "assist":
          result.sort(
            (a, b) =>
              b.prediction
                .assistProbability -
              a.prediction
                .assistProbability,
          );
          break;

        case "five":
          result.sort(
            (a, b) =>
              b.prediction
                .fivePlusProbability -
              a.prediction
                .fivePlusProbability,
          );
          break;

        case "ten":
          result.sort(
            (a, b) =>
              b.prediction
                .tenPlusProbability -
              a.prediction
                .tenPlusProbability,
          );
          break;

        case "price":
          result.sort(
            (a, b) =>
              a.price -
              b.price,
          );
          break;

        case "form":
          result.sort(
            (a, b) =>
              b.form -
              a.form,
          );
          break;

        case "predicted":
        default:
          result.sort(
            (a, b) =>
              b.prediction
                .predictedPoints -
              a.prediction
                .predictedPoints,
          );
      }

      return result;
    }, [
      predictions,
      search,
      position,
      confidence,
      sort,
    ]);

  const topPrediction =
    predictions[0];

  const highestGoal =
    predictions.length > 0
      ? [...predictions].sort(
          (a, b) =>
            b.prediction
              .goalProbability -
            a.prediction
              .goalProbability,
        )[0]
      : null;

  const highestAssist =
    predictions.length > 0
      ? [...predictions].sort(
          (a, b) =>
            b.prediction
              .assistProbability -
            a.prediction
              .assistProbability,
        )[0]
      : null;

  return (
    <main className="page-container animate-fade-in">
      <FantasyTabs />

      <section className="mb-6 rounded-xl border border-border bg-surface p-6 shadow-panel md:p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Brain
                size={17}
                className="text-accent"
              />

              <span className="section-label">
                PLStats Prediction Engine
              </span>
            </div>

            <h1 className="page-heading text-gradient">
              Gameweek Predictor
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-light">
              PLStats combines
              current Fantasy Premier
              League information,
              upcoming fixture
              difficulty and historical
              attacking performance to
              estimate player returns for
              the next gameweek.
            </p>
          </div>

          <div className="rounded-lg border border-accent/30 bg-accent-soft px-4 py-3">
            <div className="section-label">
              Prediction Gameweek
            </div>

            <div className="mt-1 font-display text-3xl font-bold text-accent">
              GW
              {data?.gameweek ||
                "—"}
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="mb-6 rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={Brain}
          label="Model"
          value={
            data?.model ||
            "PLStats V1"
          }
          subtext="Current prediction model"
        />

        <SummaryCard
          icon={BadgeCheck}
          label="Understat Match"
          value={
            loading
              ? "—"
              : `${data?.matchedPlayers || 0}/${data?.count || 0}`
          }
          subtext="Players with historical data"
        />

        <SummaryCard
          icon={Target}
          label="Top Prediction"
          value={
            topPrediction
              ?.webName || "—"
          }
          subtext={
            topPrediction
              ? `${formatNumber(
                  topPrediction
                    .prediction
                    .predictedPoints,
                  1,
                )} predicted points`
              : ""
          }
        />

        <SummaryCard
          icon={Activity}
          label="Highest Goal Chance"
          value={
            highestGoal
              ?.webName || "—"
          }
          subtext={
            highestGoal
              ? formatPercentage(
                  highestGoal
                    .prediction
                    .goalProbability,
                )
              : ""
          }
        />
      </section>

      <section className="panel mb-6 p-4">
        <div className="flex flex-col gap-3 xl:flex-row">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search player or team..."
              className="form-control pl-9"
            />
          </div>

          <select
            value={position}
            onChange={(event) =>
              setPosition(
                event.target.value,
              )
            }
            className="form-control xl:w-40"
          >
            <option value="">
              All positions
            </option>

            <option value="GKP">
              Goalkeepers
            </option>

            <option value="DEF">
              Defenders
            </option>

            <option value="MID">
              Midfielders
            </option>

            <option value="FWD">
              Forwards
            </option>
          </select>

          <select
            value={confidence}
            onChange={(event) =>
              setConfidence(
                event.target.value,
              )
            }
            className="form-control xl:w-40"
          >
            <option value="">
              All confidence
            </option>

            <option value="High">
              High
            </option>

            <option value="Medium">
              Medium
            </option>

            <option value="Low">
              Low
            </option>
          </select>

          <div className="relative">
            <ArrowUpDown
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />

            <select
              value={sort}
              onChange={(event) =>
                setSort(
                  event.target.value,
                )
              }
              className="form-control pl-9 xl:w-52"
            >
              <option value="predicted">
                Predicted points
              </option>

              <option value="goal">
                Goal probability
              </option>

              <option value="assist">
                Assist probability
              </option>

              <option value="five">
                5+ points chance
              </option>

              <option value="ten">
                10+ points chance
              </option>

              <option value="form">
                Current form
              </option>

              <option value="price">
                Lowest price
              </option>
            </select>
          </div>
        </div>
      </section>

      <div className="mb-4 flex items-center justify-between">
        <div>
          <span className="section-label">
            Predictions
          </span>

          <h2 className="mt-1 font-display text-2xl font-bold">
            Gameweek{" "}
            {data?.gameweek ||
              "—"}{" "}
            Rankings
          </h2>
        </div>

        {!loading && (
          <div className="text-sm text-muted">
            {
              filteredPredictions.length
            }{" "}
            players
          </div>
        )}
      </div>

      {loading ? (
        <div className="panel p-12 text-center text-muted">
          Generating predictions...
        </div>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredPredictions.map(
            (
              player,
              index,
            ) => (
              <PredictorCard
                key={player.id}
                player={player}
                rank={index + 1}
              />
            ),
          )}
        </section>
      )}

      {!loading &&
        filteredPredictions.length ===
          0 && (
          <div className="panel p-10 text-center text-muted">
            No players match the
            selected filters.
          </div>
        )}
    </main>
  );
}