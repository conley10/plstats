import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowDownRight,
  ArrowUpRight,
  BrainCircuit,
  ChevronDown,
  Loader2,
  Search,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

import {
  getTransferValues,
} from "../api/transferValueApi";


function formatMoney(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  if (Math.abs(number) >= 1_000_000) {
    return `€${(
      number / 1_000_000
    ).toFixed(1)}m`;
  }

  if (Math.abs(number) >= 1_000) {
    return `€${Math.round(
      number / 1_000,
    )}k`;
  }

  return `€${Math.round(
    number,
  ).toLocaleString("en-AU")}`;
}


function formatSignedMoney(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  const prefix =
    number > 0
      ? "+"
      : number < 0
        ? "-"
        : "";

  return `${prefix}${formatMoney(
    Math.abs(number),
  )}`;
}


function formatNumber(
  value,
  digits = 2,
) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return number.toFixed(digits);
}


function formatPosition(player) {
  const position =
    player.transfermarktPosition ||
    player.position;

  if (!position) {
    return "Unknown";
  }

  const value =
    String(position).toLowerCase();

  if (
    value.includes("goalkeeper") ||
    value === "gk"
  ) {
    return "Goalkeeper";
  }

  if (
    value.includes("defender") ||
    value.includes("defence") ||
    value.startsWith("d")
  ) {
    return "Defender";
  }

  if (
    value.includes("midfield") ||
    value.startsWith("m")
  ) {
    return "Midfielder";
  }

  if (
    value.includes("attack") ||
    value.includes("forward") ||
    value.includes("striker") ||
    value.startsWith("f")
  ) {
    return "Forward";
  }

  return position;
}

function getValueInsights(player) {
  if (!player) {
    return [];
  }

  const insights = [];

  const goalsPer90 =
    Number(player.goalsPer90) || 0;

  const assistsPer90 =
    Number(player.assistsPer90) || 0;

  const xgPer90 =
    Number(player.xgPer90) || 0;

  const xaPer90 =
    Number(player.xaPer90) || 0;

  const age =
    Number(player.age) || 0;

  const change =
    Number(player.predictedChangeEur) || 0;

  const previousValue =
    Number(player.previousMarketValueEur) || 0;

  const oneYearAgo =
    Number(player.marketValueOneYearAgoEur) || 0;

  if (goalsPer90 >= 0.6) {
    insights.push({
      type: "positive",
      title: "Elite goalscoring output",
      text: `${goalsPer90.toFixed(
        2,
      )} goals per 90 provides strong support for the player's valuation.`,
    });
  } else if (goalsPer90 >= 0.3) {
    insights.push({
      type: "positive",
      title: "Strong goalscoring contribution",
      text: `${goalsPer90.toFixed(
        2,
      )} goals per 90 contributes positively to the valuation.`,
    });
  }

  if (xgPer90 >= 0.5) {
    insights.push({
      type: "positive",
      title: "Strong expected-goals profile",
      text: `${xgPer90.toFixed(
        2,
      )} xG per 90 indicates consistently high-quality scoring opportunities.`,
    });
  }

  if (assistsPer90 >= 0.25 || xaPer90 >= 0.25) {
    insights.push({
      type: "positive",
      title: "Creative contribution",
      text: `${assistsPer90.toFixed(
        2,
      )} assists and ${xaPer90.toFixed(
        2,
      )} xA per 90 show strong chance creation.`,
    });
  }

  if (age > 0 && age <= 23) {
    insights.push({
      type: "positive",
      title: "Young age profile",
      text: `At ${age}, the player remains within a high-potential development age range.`,
    });
  } else if (age >= 24 && age <= 28) {
    insights.push({
      type: "positive",
      title: "Prime-age profile",
      text: `At ${age}, the player is within a typical prime performance age range.`,
    });
  } else if (age >= 31) {
    insights.push({
      type: "negative",
      title: "Age pressure",
      text: `At ${age}, age may place downward pressure on future market value.`,
    });
  }

  if (
    previousValue > 0 &&
    oneYearAgo > 0
  ) {
    const historicalChange =
      previousValue - oneYearAgo;

    if (historicalChange > 0) {
      insights.push({
        type: "positive",
        title: "Positive market-value trend",
        text: `The previous valuation of ${formatMoney(
          previousValue,
        )} is above the ${formatMoney(
          oneYearAgo,
        )} valuation from one year earlier.`,
      });
    } else if (historicalChange < 0) {
      insights.push({
        type: "negative",
        title: "Declining market-value trend",
        text: `The previous valuation of ${formatMoney(
          previousValue,
        )} is below the ${formatMoney(
          oneYearAgo,
        )} valuation from one year earlier.`,
      });
    }
  }

  if (change > 0) {
    insights.push({
      type: "positive",
      title: "Model predicts value growth",
      text: `PLStats predicts an increase of ${formatSignedMoney(
        change,
      )} from the player's previous valuation.`,
    });
  } else if (change < 0) {
    insights.push({
      type: "negative",
      title: "Model predicts value decline",
      text: `PLStats predicts a decrease of ${formatSignedMoney(
        change,
      )} from the player's previous valuation.`,
    });
  }

  return insights.slice(0, 5);
}


function ValueChange({
  value,
  percentage,
  large = false,
}) {
  const number =
    Number(value) || 0;

  const positive =
    number > 0;

  const negative =
    number < 0;

  const Icon =
    positive
      ? ArrowUpRight
      : negative
        ? ArrowDownRight
        : TrendingUp;

  const colourClass =
    positive
      ? "text-emerald-400"
      : negative
        ? "text-red-400"
        : "text-muted-light";

  return (
    <div
      className={`flex items-center gap-2 ${colourClass}`}
    >
      <Icon
        size={large ? 22 : 17}
      />

      <span
        className={
          large
            ? "text-lg font-black"
            : "text-sm font-bold"
        }
      >
        {formatSignedMoney(number)}

        {Number.isFinite(
          Number(percentage),
        ) && (
          <span className="ml-2">
            (
            {Number(percentage) > 0
              ? "+"
              : ""}
            {Number(
              percentage,
            ).toFixed(1)}
            %)
          </span>
        )}
      </span>
    </div>
  );
}


function StatCard({
  label,
  value,
  detail,
}) {
  return (
    <div className="rounded-xl border border-border bg-black/20 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black text-white">
        {value}
      </p>

      {detail && (
        <p className="mt-1 text-xs text-muted">
          {detail}
        </p>
      )}
    </div>
  );
}


function PlayerValueCard({
  player,
  rank,
  onSelect,
}) {
  return (
    <button
      type="button"
      onClick={() =>
        onSelect(player)
      }
      className="group w-full rounded-2xl border border-border bg-panel p-5 text-left transition-all hover:-translate-y-0.5 hover:border-accent/50"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
        <div className="flex min-w-0 items-center gap-4 lg:w-[35%]">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-black/20 font-black text-white">
            {rank}
          </div>

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-black/20">
            <Users
              size={19}
              className="text-muted"
            />
          </div>

          <div className="min-w-0">
            <p className="truncate text-lg font-black text-white transition-colors group-hover:text-accent">
              {player.player}
            </p>

            <p className="mt-1 truncate text-sm text-muted-light">
              {player.team}
            </p>

            <p className="mt-1 text-xs text-muted">
              {formatPosition(
                player,
              )}
              {player.age
                ? ` · ${player.age} years`
                : ""}
            </p>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xl font-black text-white">
              {formatMoney(
                player.previousMarketValueEur,
              )}
            </p>

            <p className="mt-1 text-xs uppercase tracking-wider text-muted">
              Previous
            </p>
          </div>

          <div>
            <p className="text-xl font-black text-accent">
              {formatMoney(
                player.predictedMarketValueEur,
              )}
            </p>

            <p className="mt-1 text-xs uppercase tracking-wider text-muted">
              PLStats value
            </p>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <ValueChange
              value={
                player.predictedChangeEur
              }
              percentage={
                player.predictedChangePercent
              }
            />

            <p className="mt-1 text-xs uppercase tracking-wider text-muted">
              Predicted change
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}


export default function TransferValuePage() {
  const [
    data,
    setData,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    club,
    setClub,
  ] = useState("All");

  const [
    position,
    setPosition,
  ] = useState("All");

  const [
    sortBy,
    setSortBy,
  ] = useState(
    "predictedValue",
  );

  const [
    selectedPlayer,
    setSelectedPlayer,
  ] = useState(null);

  const [
    visibleCount,
    setVisibleCount,
  ] = useState(25);


  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const response =
          await getTransferValues();

        if (!cancelled) {
          setData(response);

          if (
            response.players?.length
          ) {
            setSelectedPlayer(
              response.players[0],
            );
          }
        }
      } catch (requestError) {
        console.error(
          "Unable to load transfer values:",
          requestError,
        );

        if (!cancelled) {
          setError(
            "Unable to load PLStats transfer-value predictions.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);


  const players =
    data?.players || [];


  const clubs = useMemo(
    () => [
      "All",
      ...[
        ...new Set(
          players
            .map(
              (player) =>
                player.team,
            )
            .filter(Boolean),
        ),
      ].sort(),
    ],
    [players],
  );


  const filteredPlayers =
    useMemo(() => {
      const searchValue =
        search
          .trim()
          .toLowerCase();

      return [...players]
        .filter((player) => {
          if (
            searchValue &&
            ![
              player.player,
              player.team,
              formatPosition(
                player,
              ),
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(
                searchValue,
              )
          ) {
            return false;
          }

          if (
            club !== "All" &&
            player.team !== club
          ) {
            return false;
          }

          if (
            position !== "All" &&
            formatPosition(
              player,
            ) !== position
          ) {
            return false;
          }

          return true;
        })
        .sort((a, b) => {
          if (
            sortBy ===
            "increase"
          ) {
            return (
              b.predictedChangeEur -
              a.predictedChangeEur
            );
          }

          if (
            sortBy ===
            "increasePercent"
          ) {
            return (
              b.predictedChangePercent -
              a.predictedChangePercent
            );
          }

          if (
            sortBy ===
            "decrease"
          ) {
            return (
              a.predictedChangeEur -
              b.predictedChangeEur
            );
          }

          if (
            sortBy === "age"
          ) {
            return (
              a.age - b.age
            );
          }

          return (
            b.predictedMarketValueEur -
            a.predictedMarketValueEur
          );
        });
    }, [
      players,
      search,
      club,
      position,
      sortBy,
    ]);


  const visiblePlayers =
    filteredPlayers.slice(
      0,
      visibleCount,
    );


  const highestValue =
    players.length
      ? Math.max(
          ...players.map(
            (player) =>
              Number(
                player.predictedMarketValueEur,
              ) || 0,
          ),
        )
      : 0;


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
              Loading PLStats transfer-value model...
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
            Transfer values could not be loaded
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

      {/* HERO */}

      <section className="relative overflow-hidden rounded-2xl border border-border bg-panel p-6 md:p-8">
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              PLSTATS AI MODEL
            </p>

            <h1 className="page-heading mt-2">
              Transfer Value Predictor
            </h1>

            <p className="mt-3 max-w-2xl leading-7 text-muted-light">
              Explore estimated Premier League
              player market values using historical
              valuations, age and performance data
              including goals, assists, xG, xA and
              other Understat metrics.
            </p>
          </div>

          <div className="min-w-72 rounded-2xl border border-accent/30 bg-accent-soft p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-accent/40 bg-black/15">
                <BrainCircuit
                  size={24}
                  className="text-accent"
                />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                  V5 model
                </p>

                <p className="mt-1 text-xl font-black text-white">
                  Random Forest
                </p>

                <p className="text-sm text-muted-light">
                  2025 unseen MAE ≈ €2.18m
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* OVERVIEW */}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Players analysed"
          value={
            data.playerCount?.toLocaleString(
              "en-AU",
            ) ||
            players.length.toLocaleString(
              "en-AU",
            )
          }
        />

        <StatCard
          label="Model season"
          value={
            `${data.season}/${String(
              Number(data.season) +
                1,
            ).slice(-2)}`
          }
        />

        <StatCard
          label="Highest prediction"
          value={formatMoney(
            highestValue,
          )}
        />

        <StatCard
          label="Unseen test MAE"
          value={formatMoney(
            data.validation
              ?.unseen2025MAE,
          )}
          detail="Mean absolute error"
        />
      </section>


      {/* SELECTED PLAYER */}

      {selectedPlayer && (
        <section className="panel mt-6 overflow-hidden p-6 md:p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                Player valuation
              </p>

              <h2 className="mt-2 text-3xl font-black text-white">
                {selectedPlayer.player}
              </h2>

              <p className="mt-2 text-muted-light">
                {selectedPlayer.team}
                {" · "}
                {formatPosition(
                  selectedPlayer,
                )}
                {selectedPlayer.age
                  ? ` · ${selectedPlayer.age} years`
                  : ""}
              </p>
            </div>

            <div className="lg:text-right">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                PLStats predicted value
              </p>

              <p className="mt-2 text-4xl font-black text-accent md:text-5xl">
                {formatMoney(
                  selectedPlayer.predictedMarketValueEur,
                )}
              </p>

              <div className="mt-3 flex lg:justify-end">
                <ValueChange
                  large
                  value={
                    selectedPlayer.predictedChangeEur
                  }
                  percentage={
                    selectedPlayer.predictedChangePercent
                  }
                />
              </div>
            </div>
          </div>


          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Previous value"
              value={formatMoney(
                selectedPlayer.previousMarketValueEur,
              )}
              detail={
                selectedPlayer.previousValuationDate
              }
            />

            <StatCard
              label="1 year ago"
              value={formatMoney(
                selectedPlayer.marketValueOneYearAgoEur,
              )}
            />

            <StatCard
              label="Goals"
              value={
                selectedPlayer.goals
              }
              detail={`${formatNumber(
                selectedPlayer.goalsPer90,
              )} per 90`}
            />

            <StatCard
              label="Assists"
              value={
                selectedPlayer.assists
              }
              detail={`${formatNumber(
                selectedPlayer.assistsPer90,
              )} per 90`}
            />
          </div>


          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Expected goals"
              value={formatNumber(
                selectedPlayer.xg,
                1,
              )}
              detail={`${formatNumber(
                selectedPlayer.xgPer90,
              )} xG / 90`}
            />

            <StatCard
              label="Expected assists"
              value={formatNumber(
                selectedPlayer.xa,
                1,
              )}
              detail={`${formatNumber(
                selectedPlayer.xaPer90,
              )} xA / 90`}
            />

            <StatCard
              label="Shots"
              value={
                selectedPlayer.shots
              }
              detail={`${formatNumber(
                selectedPlayer.shotsPer90,
              )} per 90`}
            />

            <StatCard
              label="Key passes"
              value={
                selectedPlayer.keyPasses
              }
              detail={`${formatNumber(
                selectedPlayer.keyPassesPer90,
              )} per 90`}
            />
                    </div>

          {/* MODEL INSIGHTS */}

          <div className="mt-8 border-t border-border pt-7">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/30 bg-accent-soft">
                <BrainCircuit
                  size={20}
                  className="text-accent"
                />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                  Model insights
                </p>

                <h3 className="mt-1 text-xl font-black text-white">
                  What is driving this valuation?
                </h3>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {getValueInsights(
                selectedPlayer,
              ).map((insight, index) => {
                const positive =
                  insight.type ===
                  "positive";

                return (
                  <div
                    key={`${insight.title}-${index}`}
                    className="rounded-xl border border-border bg-black/20 p-5"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                          positive
                            ? "bg-emerald-400/10 text-emerald-400"
                            : "bg-red-400/10 text-red-400"
                        }`}
                      >
                        {positive ? (
                          <ArrowUpRight
                            size={16}
                          />
                        ) : (
                          <ArrowDownRight
                            size={16}
                          />
                        )}
                      </div>

                      <div>
                        <h4 className="font-bold text-white">
                          {insight.title}
                        </h4>

                        <p className="mt-2 text-sm leading-6 text-muted-light">
                          {insight.text}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

{/* MARKET VALUE TRAJECTORY */}

<div className="mt-8 border-t border-border pt-7">
  <div>
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
      Value trajectory
    </p>

    <h3 className="mt-1 text-xl font-black text-white">
      Market value progression
    </h3>

    <p className="mt-2 text-sm text-muted">
      Historical market values compared with the PLStats prediction.
    </p>
  </div>

  <div className="mt-6 grid items-center gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr]">

    {/* ONE YEAR AGO */}

    <div className="rounded-xl border border-border bg-black/20 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        1 year ago
      </p>

      <p className="mt-2 text-2xl font-black text-white">
        {formatMoney(
          selectedPlayer.marketValueOneYearAgoEur,
        )}
      </p>

      <p className="mt-2 text-xs text-muted">
        Historical valuation
      </p>
    </div>

    <div className="hidden text-muted md:block">
      →
    </div>

    {/* PREVIOUS VALUE */}

    <div className="rounded-xl border border-border bg-black/20 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        Previous value
      </p>

      <p className="mt-2 text-2xl font-black text-white">
        {formatMoney(
          selectedPlayer.previousMarketValueEur,
        )}
      </p>

      <div className="mt-2">
        <ValueChange
          value={
            selectedPlayer.previousMarketValueEur -
            selectedPlayer.marketValueOneYearAgoEur
          }
          percent={
            selectedPlayer.marketValueOneYearAgoEur
              ? ((selectedPlayer.previousMarketValueEur -
                  selectedPlayer.marketValueOneYearAgoEur) /
                  selectedPlayer.marketValueOneYearAgoEur) *
                100
              : 0
          }
        />
      </div>
    </div>

    <div className="hidden text-muted md:block">
      →
    </div>

    {/* PLSTATS PREDICTION */}

    <div className="rounded-xl border border-accent/30 bg-accent-soft p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
        PLStats prediction
      </p>

      <p className="mt-2 text-2xl font-black text-accent">
        {formatMoney(
          selectedPlayer.predictedMarketValueEur,
        )}
      </p>

      <div className="mt-2">
        <ValueChange
          value={
            selectedPlayer.predictedChangeEur
          }
          percent={
            selectedPlayer.predictedChangePercent
          }
        />
      </div>
    </div>
  </div>
</div>

        </section>
      )}


      {/* FILTERS */}

      <section className="panel mt-6 p-5 md:p-6">
        <div>
          <h2 className="font-black text-white">
            Player values
          </h2>

          <p className="mt-1 text-sm text-muted">
            Search and compare model-generated
            valuations across the league.
          </p>
        </div>


        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">

          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted">
              Search
            </span>

            <div className="flex items-center gap-3 rounded-xl border border-border bg-black/20 px-4">
              <Search
                size={17}
                className="text-muted"
              />

              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(
                    event.target.value,
                  );
                  setVisibleCount(25);
                }}
                placeholder="Search player or club..."
                className="w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-muted"
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
                  setClub(
                    event.target.value,
                  );
                  setVisibleCount(25);
                }}
                className="w-full appearance-none rounded-xl border border-border bg-black/20 px-4 py-3 pr-10 text-sm text-white outline-none"
              >
                {clubs.map(
                  (option) => (
                    <option
                      key={option}
                      value={option}
                    >
                      {option === "All"
                        ? "All clubs"
                        : option}
                    </option>
                  ),
                )}
              </select>

              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted"
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
                  setPosition(
                    event.target.value,
                  );
                  setVisibleCount(25);
                }}
                className="w-full appearance-none rounded-xl border border-border bg-black/20 px-4 py-3 pr-10 text-sm text-white outline-none"
              >
                <option value="All">
                  All positions
                </option>

                <option value="Goalkeeper">
                  Goalkeepers
                </option>

                <option value="Defender">
                  Defenders
                </option>

                <option value="Midfielder">
                  Midfielders
                </option>

                <option value="Forward">
                  Forwards
                </option>
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
                  setSortBy(
                    event.target.value,
                  );
                  setVisibleCount(25);
                }}
                className="w-full appearance-none rounded-xl border border-border bg-black/20 px-4 py-3 pr-10 text-sm text-white outline-none"
              >
                <option value="predictedValue">
                  Highest value
                </option>

                <option value="increase">
                  Biggest increase
                </option>

                <option value="increasePercent">
                  Biggest % increase
                </option>

                <option value="decrease">
                  Biggest decrease
                </option>

                <option value="age">
                  Youngest
                </option>
              </select>

              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted"
              />
            </div>
          </label>
        </div>
      </section>


      {/* LEADERBOARD */}

      <section className="mt-8">

        <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Model leaderboard
            </p>

            <h2 className="mt-2 text-2xl font-black text-white">
              Predicted Market Values
            </h2>

            <p className="mt-1 text-sm text-muted">
              {filteredPlayers.length} players
              meet the selected criteria.
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted">
            <Sparkles
              size={16}
              className="text-accent"
            />

            Select a player to inspect
            their prediction.
          </div>
        </div>


        {visiblePlayers.length ? (
          <div className="space-y-4">
            {visiblePlayers.map(
              (player, index) => (
                <PlayerValueCard
                  key={`${player.understatId}-${player.season}`}
                  player={player}
                  rank={index + 1}
                  onSelect={
                    setSelectedPlayer
                  }
                />
              ),
            )}
          </div>
        ) : (
          <div className="panel flex min-h-64 flex-col items-center justify-center p-8 text-center">
            <Search
              size={30}
              className="text-muted"
            />

            <h3 className="mt-4 text-lg font-bold text-white">
              No players found
            </h3>

            <p className="mt-2 text-sm text-muted">
              Try changing your search
              or filters.
            </p>
          </div>
        )}


        {visibleCount <
          filteredPlayers.length && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() =>
                setVisibleCount(
                  (current) =>
                    current + 25,
                )
              }
              className="primary-button"
            >
              Load more players
            </button>
          </div>
        )}
      </section>



      {/* EXPLANATION */}

      <section className="panel mt-8 p-6">
        <h2 className="text-lg font-black text-white">
          About the model
        </h2>

        <p className="mt-3 max-w-4xl leading-7 text-muted-light">
          PLStats V5 estimates how a player's
          market value may change using their
          previous market valuation, historical
          value, age, position and Premier League
          performance data. Performance inputs
          include goals, assists, expected goals,
          expected assists, shots, key passes and
          per-90 metrics.
        </p>

        <p className="mt-3 max-w-4xl leading-7 text-muted">
          These values are model estimates rather
          than official transfer fees or asking
          prices. Real transfer prices can also be
          affected by contracts, injuries,
          negotiations, club finances and other
          factors not represented by the model.
        </p>
      </section>

    </main>
  );
}