import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowUpRight,
  Search,
  SlidersHorizontal,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";

import {
  getMarketOpportunities,
} from "../api/transferValueApi";

function formatMoney(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  if (
    Math.abs(number) >=
    1_000_000
  ) {
    return `€${(
      number / 1_000_000
    ).toFixed(1)}m`;
  }

  if (
    Math.abs(number) >=
    1_000
  ) {
    return `€${(
      number / 1_000
    ).toFixed(0)}k`;
  }

  return `€${number.toFixed(0)}`;
}

function formatNumber(value) {
  return Number(
    value || 0,
  ).toLocaleString();
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  subtext,
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            {label}
          </p>

          <p className="mt-2 text-2xl font-black text-white">
            {value}
          </p>

          {subtext && (
            <p className="mt-1 text-xs text-muted">
              {subtext}
            </p>
          )}
        </div>

        <div className="rounded-lg border border-border bg-base p-2.5 text-accent">
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function FilterField({
  label,
  children,
}) {
  return (
    <label className="space-y-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
        {label}
      </span>

      {children}
    </label>
  );
}

function OpportunityCard({
  player,
  rank,
}) {
  const gap =
    Number(
      player.modelValueGapEur ||
        0,
    );

  const gapPercent =
    Number(
      player.modelValueGapPercent ||
        0,
    );

  return (
    <article className="rounded-xl border border-border bg-surface p-5 transition hover:border-accent/40">
      <div className="grid gap-5 lg:grid-cols-[minmax(240px,1.4fr)_repeat(3,minmax(120px,0.7fr))_auto] lg:items-center">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-base text-sm font-black text-white">
            {rank}
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-base font-black text-white">
              {player.player}
            </h3>

            <p className="mt-1 text-xs text-muted">
              {player.team}
            </p>

            <p className="mt-1 text-[11px] text-muted">
              {player.transfermarktPosition ||
                player.position ||
                "Unknown position"}
              {" • "}
              {player.age
                ? `${player.age} years`
                : "Age unknown"}
              {" • "}
              {formatNumber(
                player.minutes,
              )}{" "}
              mins
            </p>
          </div>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            Recorded value
          </p>

          <p className="mt-1 text-lg font-black text-white">
            {formatMoney(
              player.previousMarketValueEur,
            )}
          </p>

          {player.previousValuationDate && (
            <p className="mt-1 text-[10px] text-muted">
              {
                player.previousValuationDate
              }
            </p>
          )}
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            PLStats value
          </p>

          <p className="mt-1 text-lg font-black text-accent">
            {formatMoney(
              player.predictedMarketValueEur,
            )}
          </p>

          <p className="mt-1 text-[10px] text-muted">
            Model estimate
          </p>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            Model value gap
          </p>

          <p className="mt-1 text-lg font-black text-success">
            +{formatMoney(gap)}
          </p>

          <p className="mt-1 text-[11px] font-semibold text-success">
            +{gapPercent.toFixed(1)}%
          </p>
        </div>

        <a
          href={`/players/${player.understatId}`}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-base px-4 py-2 text-xs font-semibold text-white transition hover:border-accent hover:text-accent"
        >
          Scout
          <ArrowUpRight
            size={14}
          />
        </a>
      </div>
    </article>
  );
}

export default function MarketOpportunitiesPage() {
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
    position,
    setPosition,
  ] = useState("");

  const [
    maxAge,
    setMaxAge,
  ] = useState("24");

  const [
    maxValue,
    setMaxValue,
  ] = useState("30");

  const [
    minMinutes,
    setMinMinutes,
  ] = useState("1500");

  const [
    sort,
    setSort,
  ] = useState("gap");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const response =
          await getMarketOpportunities(
            {
              limit: 100,

              position:
                position ||
                undefined,

              maxAge:
                maxAge ||
                undefined,

              maxValue:
                maxValue
                  ? Number(
                      maxValue,
                    ) *
                    1_000_000
                  : undefined,

              minMinutes:
                minMinutes ||
                undefined,
            },
          );

        if (active) {
          setData(response);
        }
      } catch (loadError) {
        console.error(
          loadError,
        );

        if (active) {
          setError(
            "Could not load market opportunities.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [
    position,
    maxAge,
    maxValue,
    minMinutes,
  ]);

  const players =
    useMemo(() => {
      let results = [
        ...(data?.players || []),
      ];

      const query =
        search
          .trim()
          .toLowerCase();

      if (query) {
        results =
          results.filter(
            (player) =>
              String(
                player.player ||
                  "",
              )
                .toLowerCase()
                .includes(
                  query,
                ) ||
              String(
                player.team ||
                  "",
              )
                .toLowerCase()
                .includes(
                  query,
                ),
          );
      }

      switch (sort) {
        case "percentage":
          results.sort(
            (a, b) =>
              Number(
                b.modelValueGapPercent ||
                  0,
              ) -
              Number(
                a.modelValueGapPercent ||
                  0,
              ),
          );
          break;

        case "predicted":
          results.sort(
            (a, b) =>
              Number(
                b.predictedMarketValueEur ||
                  0,
              ) -
              Number(
                a.predictedMarketValueEur ||
                  0,
              ),
          );
          break;

        case "market":
          results.sort(
            (a, b) =>
              Number(
                b.previousMarketValueEur ||
                  0,
              ) -
              Number(
                a.previousMarketValueEur ||
                  0,
              ),
          );
          break;

        case "gap":
        default:
          results.sort(
            (a, b) =>
              Number(
                b.modelValueGapEur ||
                  0,
              ) -
              Number(
                a.modelValueGapEur ||
                  0,
              ),
          );
      }

      return results;
    }, [
      data,
      search,
      sort,
    ]);

  const displayedGap =
    useMemo(
      () =>
        players.reduce(
          (total, player) =>
            total +
            Number(
              player.modelValueGapEur ||
                0,
            ),
          0,
        ),
      [players],
    );

  return (
    <main className="min-h-screen bg-base text-white">
      <div className="mx-auto w-full max-w-7xl px-5 py-8 lg:px-8">
        {/* HERO */}

        <section className="rounded-2xl border border-border bg-surface p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
            PLStats Scouting
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-white md:text-4xl">
            Market Opportunities
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            Find players whose
            PLStats transfer-value
            model estimates a higher
            value than their recorded
            market valuation.
          </p>

          <div className="mt-5 max-w-3xl rounded-lg border border-border bg-base/50 px-4 py-3">
            <p className="text-xs leading-5 text-muted">
              The model value gap is
              an analytical estimate,
              not a guaranteed transfer
              fee or fair market price.
              It highlights players
              worth investigating
              further.
            </p>
          </div>
        </section>

        {/* SUMMARY */}

        <section className="mt-5 grid gap-4 md:grid-cols-3">
          <SummaryCard
            icon={Users}
            label="Opportunities"
            value={
              loading
                ? "—"
                : players.length
            }
            subtext="Matching current filters"
          />

          <SummaryCard
            icon={TrendingUp}
            label="Combined Model Gap"
            value={
              loading
                ? "—"
                : formatMoney(
                    displayedGap,
                  )
            }
            subtext="Across displayed players"
          />

          <SummaryCard
            icon={WalletCards}
            label="Model Season"
            value={
              data?.season
                ? `${data.season}/${String(
                    Number(
                      data.season,
                    ) + 1,
                  ).slice(-2)}`
                : "—"
            }
            subtext="PLStats valuation dataset"
          />
        </section>

        {/* FILTERS */}

        <section className="mt-5 rounded-xl border border-border bg-surface p-5">
          <div className="mb-5 flex items-center gap-2">
            <SlidersHorizontal
              size={17}
              className="text-accent"
            />

            <div>
              <h2 className="text-sm font-black text-white">
                Scouting filters
              </h2>

              <p className="mt-0.5 text-xs text-muted">
                Narrow the market to
                the type of player you
                are looking for.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <FilterField label="Search">
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Player or club"
                  className="w-full rounded-lg border border-border bg-base py-2.5 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-muted focus:border-accent"
                />
              </div>
            </FilterField>

            <FilterField label="Position">
              <select
                value={position}
                onChange={(event) =>
                  setPosition(
                    event.target
                      .value,
                  )
                }
                className="w-full rounded-lg border border-border bg-base px-3 py-2.5 text-sm text-white outline-none focus:border-accent"
              >
                <option value="">
                  All positions
                </option>

                <option value="Goalkeeper">
                  Goalkeeper
                </option>

                <option value="Defender">
                  Defender
                </option>

                <option value="Midfield">
                  Midfield
                </option>

                <option value="Attack">
                  Attack
                </option>
              </select>
            </FilterField>

            <FilterField label="Max age">
              <input
                type="number"
                min="16"
                max="40"
                value={maxAge}
                onChange={(event) =>
                  setMaxAge(
                    event.target
                      .value,
                  )
                }
                className="w-full rounded-lg border border-border bg-base px-3 py-2.5 text-sm text-white outline-none focus:border-accent"
              />
            </FilterField>

            <FilterField label="Max value (€m)">
              <input
                type="number"
                min="1"
                value={maxValue}
                onChange={(event) =>
                  setMaxValue(
                    event.target
                      .value,
                  )
                }
                className="w-full rounded-lg border border-border bg-base px-3 py-2.5 text-sm text-white outline-none focus:border-accent"
              />
            </FilterField>

            <FilterField label="Min minutes">
              <input
                type="number"
                min="0"
                step="100"
                value={minMinutes}
                onChange={(event) =>
                  setMinMinutes(
                    event.target
                      .value,
                  )
                }
                className="w-full rounded-lg border border-border bg-base px-3 py-2.5 text-sm text-white outline-none focus:border-accent"
              />
            </FilterField>

            <FilterField label="Sort by">
              <select
                value={sort}
                onChange={(event) =>
                  setSort(
                    event.target
                      .value,
                  )
                }
                className="w-full rounded-lg border border-border bg-base px-3 py-2.5 text-sm text-white outline-none focus:border-accent"
              >
                <option value="gap">
                  Biggest value gap
                </option>

                <option value="percentage">
                  Biggest % gap
                </option>

                <option value="predicted">
                  Highest PLStats value
                </option>

                <option value="market">
                  Highest market value
                </option>
              </select>
            </FilterField>
          </div>
        </section>

        {/* RESULTS */}

        <section className="mt-7">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                Model opportunities
              </p>

              <h2 className="mt-1 text-xl font-black text-white">
                Scouting shortlist
              </h2>

              <p className="mt-1 text-xs text-muted">
                Ranked using the
                selected sorting
                method.
              </p>
            </div>

            {!loading &&
              !error && (
                <p className="text-xs text-muted">
                  {players.length}{" "}
                  players shown
                </p>
              )}
          </div>

          {loading && (
            <div className="rounded-xl border border-border bg-surface p-10 text-center text-sm text-muted">
              Analysing market
              opportunities...
            </div>
          )}

          {!loading &&
            error && (
              <div className="rounded-xl border border-danger/30 bg-danger/5 p-6 text-sm text-danger">
                {error}
              </div>
            )}

          {!loading &&
            !error &&
            players.length ===
              0 && (
              <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
                <p className="font-semibold text-white">
                  No opportunities
                  found
                </p>

                <p className="mt-2 text-sm text-muted">
                  Try increasing the
                  maximum age or market
                  value, or lowering
                  the minimum minutes.
                </p>
              </div>
            )}

          {!loading &&
            !error &&
            players.length >
              0 && (
              <div className="space-y-3">
                {players.map(
                  (
                    player,
                    index,
                  ) => (
                    <OpportunityCard
                      key={
                        player.understatId
                      }
                      player={
                        player
                      }
                      rank={
                        index +
                        1
                      }
                    />
                  ),
                )}
              </div>
            )}
        </section>
      </div>
    </main>
  );
}