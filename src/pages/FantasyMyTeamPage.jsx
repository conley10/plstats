import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  Crown,
  RotateCcw,
  Search,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Users,
  WalletCards,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  NavLink,
} from "react-router-dom";

import {
  analyseFantasySquad,
  getFantasyPredictions,
} from "../api/fantasyApi";

const POSITION_REQUIREMENTS = {
  GKP: 2,
  DEF: 5,
  MID: 5,
  FWD: 3,
};

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
      {tabs.map(
        (tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end
            className={
              getTabClass
            }
          >
            {tab.label}
          </NavLink>
        ),
      )}
    </nav>
  );
}

function getPositionStyle(
  position,
) {
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
      return "bg-surface-light text-muted";
  }
}

function SquadStat({
  icon: Icon,
  label,
  value,
  subtext,
}) {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="section-label">
            {label}
          </div>

          <div className="mt-2 font-display text-3xl font-bold text-accent">
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
            size={18}
            className="text-accent"
          />
        </div>
      </div>
    </div>
  );
}

function RatingCard({
  label,
  value,
}) {
  const safeValue =
    Math.min(
      Math.max(
        Number(value) || 0,
        0,
      ),
      100,
    );

  return (
    <div className="rounded-lg border border-border bg-base p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-light">
          {label}
        </span>

        <span className="font-display text-xl font-bold text-accent">
          {safeValue}
        </span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface">
        <div
          className="h-full rounded-full bg-accent"
          style={{
            width:
              `${safeValue}%`,
          }}
        />
      </div>
    </div>
  );
}

function SelectedPlayer({
  player,
  onRemove,
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-base p-3">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-white">
            {player.webName}
          </span>

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

        <div className="mt-1 text-xs text-muted">
          {
            player.team
              ?.shortName
          }{" "}
          • £
          {Number(
            player.price,
          ).toFixed(1)}
          m
        </div>
      </div>

      <button
        type="button"
        className="secondary-button min-h-8 px-3 text-xs"
        onClick={() =>
          onRemove(
            player.id,
          )
        }
      >
        Remove
      </button>
    </div>
  );
}

function PlayerRow({
  player,
  selected,
  disabled,
  onToggle,
}) {
  return (
    <tr>
      <td>
        <div>
          <div className="font-semibold">
            {player.webName}
          </div>

          <div className="text-xs text-muted">
            {
              player.team
                ?.shortName
            }
          </div>
        </div>
      </td>

      <td>
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
      </td>

      <td>
        £
        {Number(
          player.price,
        ).toFixed(1)}
        m
      </td>

      <td>
        <span className="font-semibold text-accent">
          {Number(
            player.prediction
              ?.predictedPoints ||
              0,
          ).toFixed(1)}
        </span>
      </td>

      <td>
        {
          player.totalPoints
        }
      </td>

      <td>
        <button
          type="button"
          disabled={
            disabled &&
            !selected
          }
          className={
            selected
              ? "primary-button min-h-8 px-3 text-xs"
              : "secondary-button min-h-8 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-40"
          }
          onClick={() =>
            onToggle(
              player,
            )
          }
        >
          {selected
            ? "Selected"
            : "Add"}
        </button>
      </td>
    </tr>
  );
}

function AnalysisPlayerCard({
  player,
  captain = false,
  viceCaptain = false,
}) {
  if (!player) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-base p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">
              {player.webName}
            </span>

            <span
              className={[
                "rounded-md px-2 py-1 text-[10px] font-bold",
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

            {captain && (
              <span className="rounded-md bg-accent-soft px-2 py-1 text-[10px] font-bold text-accent">
                C
              </span>
            )}

            {viceCaptain && (
              <span className="rounded-md bg-surface-light px-2 py-1 text-[10px] font-bold text-muted-light">
                VC
              </span>
            )}
          </div>

          <div className="mt-1 text-xs text-muted">
            {
              player.team
                ?.shortName
            }{" "}
            • £
            {Number(
              player.price,
            ).toFixed(1)}
            m
          </div>
        </div>

        <div className="text-right">
          <div className="font-display text-xl font-bold text-accent">
            {Number(
              player.prediction
                ?.predictedPoints ||
                0,
            ).toFixed(1)}
          </div>

          <div className="text-[10px] text-muted">
            projected
          </div>
        </div>
      </div>
    </div>
  );
}

function FormationGroup({
  label,
  players,
  captainId,
  viceCaptainId,
}) {
  return (
    <div>
      <div className="mb-2 section-label">
        {label}
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {players.map(
          (player) => (
            <AnalysisPlayerCard
              key={
                player.id
              }
              player={
                player
              }
              captain={
                player.id ===
                captainId
              }
              viceCaptain={
                player.id ===
                viceCaptainId
              }
            />
          ),
        )}
      </div>
    </div>
  );
}

export default function FantasyMyTeamPage() {
  const [
    players,
    setPlayers,
  ] =
    useState([]);

  const [
    selectedIds,
    setSelectedIds,
  ] =
    useState(() => {
      try {
        const stored =
          localStorage.getItem(
            "plstats-fantasy-squad",
          );

        return stored
          ? JSON.parse(
              stored,
            )
          : [];
      } catch {
        return [];
      }
    });

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    position,
    setPosition,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    analysis,
    setAnalysis,
  ] =
    useState(null);

  const [
    analysing,
    setAnalysing,
  ] =
    useState(false);

  const analysisRef =
    useRef(null);

  useEffect(() => {
    async function loadPlayers() {
      try {
        setLoading(
          true,
        );

        const response =
          await getFantasyPredictions({
            limit: 700,
          });

        setPlayers(
          response.predictions ||
            [],
        );
      } catch (
        loadError
      ) {
        console.error(
          loadError,
        );

        setError(
          "Fantasy players could not be loaded.",
        );
      } finally {
        setLoading(
          false,
        );
      }
    }

    loadPlayers();
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "plstats-fantasy-squad",

      JSON.stringify(
        selectedIds,
      ),
    );

    setAnalysis(
      null,
    );
  }, [selectedIds]);

  useEffect(() => {
    if (
      analysis &&
      analysisRef.current
    ) {
      setTimeout(() => {
        analysisRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  }, [analysis]);

  const selectedPlayers =
    useMemo(
      () =>
        players.filter(
          (player) =>
            selectedIds.includes(
              player.id,
            ),
        ),
      [
        players,
        selectedIds,
      ],
    );

  const totalCost =
    selectedPlayers.reduce(
      (total, player) =>
        total +
        Number(
          player.price ||
            0,
        ),
      0,
    );

  const remainingBudget =
    100 -
    totalCost;

  const positionCounts =
    selectedPlayers.reduce(
      (
        counts,
        player,
      ) => {
        const pos =
          player.position
            ?.shortName;

        if (
          Object.hasOwn(
            counts,
            pos,
          )
        ) {
          counts[
            pos
          ] += 1;
        }

        return counts;
      },
      {
        GKP: 0,
        DEF: 0,
        MID: 0,
        FWD: 0,
      },
    );

  const filteredPlayers =
    useMemo(() => {
      let result = [
        ...players,
      ];

      const value =
        search
          .trim()
          .toLowerCase();

      if (value) {
        result =
          result.filter(
            (player) =>
              player.name
                ?.toLowerCase()
                .includes(
                  value,
                ) ||
              player.webName
                ?.toLowerCase()
                .includes(
                  value,
                ) ||
              player.team
                ?.name
                ?.toLowerCase()
                .includes(
                  value,
                ),
          );
      }

      if (
        position
      ) {
        result =
          result.filter(
            (player) =>
              player.position
                ?.shortName ===
              position,
          );
      }

      return result;
    }, [
      players,
      search,
      position,
    ]);

  function canAddPlayer(
    player,
  ) {
    if (
      selectedIds.includes(
        player.id,
      )
    ) {
      return true;
    }

    if (
      selectedIds.length >=
      15
    ) {
      return false;
    }

    const pos =
      player.position
        ?.shortName;

    const required =
      POSITION_REQUIREMENTS[
        pos
      ];

    if (
      required !==
        undefined &&
      positionCounts[
        pos
      ] >= required
    ) {
      return false;
    }

    const clubCount =
      selectedPlayers.filter(
        (selected) =>
          selected.team
            ?.id ===
          player.team?.id,
      ).length;

    if (
      clubCount >= 3
    ) {
      return false;
    }

    if (
      totalCost +
        Number(
          player.price ||
            0,
        ) >
      100
    ) {
      return false;
    }

    return true;
  }

  function togglePlayer(
    player,
  ) {
    if (
      selectedIds.includes(
        player.id,
      )
    ) {
      setSelectedIds(
        (current) =>
          current.filter(
            (id) =>
              id !==
              player.id,
          ),
      );

      return;
    }

    if (
      !canAddPlayer(
        player,
      )
    ) {
      return;
    }

    setSelectedIds(
      (current) => [
        ...current,
        player.id,
      ],
    );
  }

  function removePlayer(
    playerId,
  ) {
    setSelectedIds(
      (current) =>
        current.filter(
          (id) =>
            id !==
            playerId,
        ),
    );
  }

  function resetSquad() {
    setSelectedIds(
      [],
    );

    setAnalysis(
      null,
    );

    setError(
      "",
    );
  }

  async function handleAnalyseSquad() {
    try {
      setAnalysing(
        true,
      );

      setError(
        "",
      );

      const response =
        await analyseFantasySquad(
          selectedIds,
        );

      setAnalysis(
        response,
      );
    } catch (
      analysisError
    ) {
      console.error(
        analysisError,
      );

      const data =
        analysisError.response
          ?.data;

      if (
        Array.isArray(
          data?.errors,
        )
      ) {
        setError(
          data.errors.join(
            " ",
          ),
        );
      } else {
        setError(
          data?.error ||
            "Unable to analyse squad.",
        );
      }
    } finally {
      setAnalysing(
        false,
      );
    }
  }

  const squadAnalysis =
    analysis?.analysis;

  const bestXI =
    squadAnalysis
      ?.bestXI || [];

  const goalkeeper =
    bestXI.filter(
      (player) =>
        player.position
          ?.shortName ===
        "GKP",
    );

  const defenders =
    bestXI.filter(
      (player) =>
        player.position
          ?.shortName ===
        "DEF",
    );

  const midfielders =
    bestXI.filter(
      (player) =>
        player.position
          ?.shortName ===
        "MID",
    );

  const forwards =
    bestXI.filter(
      (player) =>
        player.position
          ?.shortName ===
        "FWD",
    );

  return (
    <main className="page-container animate-fade-in">
      <FantasyTabs />

      <section className="mb-6 rounded-xl border border-border bg-surface p-6 shadow-panel md:p-8">
        

        <h1 className="page-heading text-gradient">
          My Team
        </h1>

        <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-light">
          Build your
          15-player Fantasy
          squad and PLStats
          will automatically
          calculate your best
          XI, captain,
          projected points
          and squad ratings
          using the Gameweek
          prediction model.
        </p>
      </section>

      {error && (
        <div className="mb-6 rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SquadStat
          icon={Users}
          label="Players"
          value={`${selectedIds.length}/15`}
          subtext="Squad size"
        />

        <SquadStat
          icon={
            CircleDollarSign
          }
          label="Squad Value"
          value={`£${totalCost.toFixed(
            1,
          )}m`}
          subtext="Maximum £100.0m"
        />

        <SquadStat
          icon={WalletCards}
          label="Remaining"
          value={`£${remainingBudget.toFixed(
            1,
          )}m`}
          subtext="Available budget"
        />

        <SquadStat
          icon={
            analysis
              ? CheckCircle2
              : BarChart3
          }
          label="Analysis"
          value={
            analysis
              ? `GW${analysis.gameweek}`
              : "Not run"
          }
          subtext={
            analysis
              ? analysis.model
              : "Complete the squad"
          }
        />
      </section>

      <section className="mb-8 grid gap-6 xl:grid-cols-[360px_1fr]">
        <aside className="panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <span className="section-label">
                Selected Squad
              </span>

              <h2 className="mt-1 font-display text-xl font-bold">
                Your 15
              </h2>
            </div>

            <button
              type="button"
              onClick={
                resetSquad
              }
              className="secondary-button min-h-8 px-3 text-xs"
            >
              <RotateCcw
                size={14}
              />

              Reset
            </button>
          </div>

          <div className="mb-5 grid grid-cols-4 gap-2">
            {Object.entries(
              POSITION_REQUIREMENTS,
            ).map(
              ([
                pos,
                required,
              ]) => (
                <div
                  key={pos}
                  className="rounded-lg border border-border bg-base p-2 text-center"
                >
                  <div className="text-xs text-muted">
                    {pos}
                  </div>

                  <div className="mt-1 font-display text-lg font-bold">
                    {
                      positionCounts[
                        pos
                      ]
                    }
                    /
                    {required}
                  </div>
                </div>
              ),
            )}
          </div>

          <div className="space-y-2">
            {selectedPlayers.length ===
            0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted">
                Select players
                from the database
                below.
              </div>
            ) : (
              selectedPlayers.map(
                (player) => (
                  <SelectedPlayer
                    key={
                      player.id
                    }
                    player={
                      player
                    }
                    onRemove={
                      removePlayer
                    }
                  />
                ),
              )
            )}
          </div>

          <button
            type="button"
            disabled={
              selectedIds.length !==
                15 ||
              analysing
            }
            onClick={
              handleAnalyseSquad
            }
            className="primary-button mt-5 w-full disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Sparkles
              size={16}
            />

            {analysing
              ? "Analysing..."
              : "Analyse Squad"}
          </button>
        </aside>

        <div className="panel p-6">
          <span className="section-label">
            Squad Builder
          </span>

          <h2 className="mt-1 font-display text-2xl font-bold">
            Build your FPL squad
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-light">
            Select 15 players
            from the database
            below. Your squad
            must contain 2
            goalkeepers, 5
            defenders, 5
            midfielders and 3
            forwards, with no
            more than 3 players
            from one club.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {Object.entries(
              POSITION_REQUIREMENTS,
            ).map(
              ([
                pos,
                required,
              ]) => {
                const current =
                  positionCounts[
                    pos
                  ];

                const complete =
                  current ===
                  required;

                return (
                  <div
                    key={pos}
                    className="rounded-lg border border-border bg-base p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        {pos}
                      </span>

                      <span
                        className={
                          complete
                            ? "text-success"
                            : "text-muted"
                        }
                      >
                        {current}/
                        {required}
                      </span>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{
                          width: `${Math.min(
                            (current /
                              required) *
                              100,
                            100,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              },
            )}
          </div>

          <div className="mt-6 rounded-lg border border-border bg-base p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">
                Budget used
              </span>

              <span className="font-semibold">
                £
                {totalCost.toFixed(
                  1,
                )}
                m / £100.0m
              </span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-accent"
                style={{
                  width: `${Math.min(
                    totalCost,
                    100,
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {squadAnalysis && (
        <section
          ref={analysisRef}
          className="mb-8 space-y-6 scroll-mt-24"
        >
          <div>
            <span className="section-label">
              PLStats Squad Intelligence
            </span>

            <h2 className="mt-1 font-display text-3xl font-bold">
              Gameweek{" "}
              {analysis.gameweek}{" "}
              Analysis
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SquadStat
              icon={Trophy}
              label="Squad Rating"
              value={`${squadAnalysis.squadRating}/100`}
              subtext="Overall PLStats score"
            />

            <SquadStat
              icon={
                TrendingUp
              }
              label="Projected GW"
              value={Number(
                squadAnalysis.projectedPoints,
              ).toFixed(1)}
              subtext="Captain included"
            />

            <SquadStat
              icon={Crown}
              label="Captain"
              value={
                squadAnalysis
                  .captain
                  ?.webName ||
                "—"
              }
              subtext={
                squadAnalysis
                  .captain
                  ? `${Number(
                      squadAnalysis
                        .captain
                        .prediction
                        ?.predictedPoints ||
                        0,
                    ).toFixed(
                      1,
                    )} pts × 2`
                  : ""
              }
            />

            <SquadStat
              icon={Star}
              label="Vice Captain"
              value={
                squadAnalysis
                  .viceCaptain
                  ?.webName ||
                "—"
              }
              subtext="Second-best starter projection"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="panel p-5">
              <div className="mb-5">
                <span className="section-label">
                  Squad Ratings
                </span>

                <h3 className="mt-1 font-display text-2xl font-bold">
                  Team Strength
                </h3>
              </div>

              <div className="space-y-3">
                <RatingCard
                  label="Attack"
                  value={
                    squadAnalysis
                      .ratings
                      .attack
                  }
                />

                <RatingCard
                  label="Midfield"
                  value={
                    squadAnalysis
                      .ratings
                      .midfield
                  }
                />

                <RatingCard
                  label="Defence"
                  value={
                    squadAnalysis
                      .ratings
                      .defence
                  }
                />

                <RatingCard
                  label="Fixtures"
                  value={
                    squadAnalysis
                      .ratings
                      .fixtures
                  }
                />

                <RatingCard
                  label="Value"
                  value={
                    squadAnalysis
                      .ratings
                      .value
                  }
                />
              </div>
            </div>

            <div className="panel p-5">
              <span className="section-label">
                Squad Alerts
              </span>

              <h3 className="mt-1 font-display text-2xl font-bold">
                Players to Watch
              </h3>

              <div className="mt-5 space-y-4">
                <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Target
                      size={16}
                      className="text-warning"
                    />

                    <span className="text-sm font-semibold">
                      Weakest Pick
                    </span>
                  </div>

                  <AnalysisPlayerCard
                    player={
                      squadAnalysis
                        .weakestPlayer
                    }
                  />
                </div>

                <div className="rounded-lg border border-danger/30 bg-danger/5 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <AlertTriangle
                      size={16}
                      className="text-danger"
                    />

                    <span className="text-sm font-semibold">
                      Biggest Risk
                    </span>
                  </div>

                  <AnalysisPlayerCard
                    player={
                      squadAnalysis
                        .biggestRisk
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="panel p-5">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <span className="section-label">
                  Recommended Line-up
                </span>

                <h3 className="mt-1 font-display text-2xl font-bold">
                  Best XI
                </h3>
              </div>

              <div className="rounded-lg border border-accent/30 bg-accent-soft px-4 py-2 text-right">
                <div className="text-xs text-muted">
                  Starting XI
                </div>

                <div className="font-display text-xl font-bold text-accent">
                  {Number(
                    squadAnalysis
                      .startingPoints,
                  ).toFixed(
                    1,
                  )}{" "}
                  pts
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <FormationGroup
                label="Goalkeeper"
                players={
                  goalkeeper
                }
                captainId={
                  squadAnalysis
                    .captain
                    ?.id
                }
                viceCaptainId={
                  squadAnalysis
                    .viceCaptain
                    ?.id
                }
              />

              <FormationGroup
                label="Defenders"
                players={
                  defenders
                }
                captainId={
                  squadAnalysis
                    .captain
                    ?.id
                }
                viceCaptainId={
                  squadAnalysis
                    .viceCaptain
                    ?.id
                }
              />

              <FormationGroup
                label="Midfielders"
                players={
                  midfielders
                }
                captainId={
                  squadAnalysis
                    .captain
                    ?.id
                }
                viceCaptainId={
                  squadAnalysis
                    .viceCaptain
                    ?.id
                }
              />

              <FormationGroup
                label="Forwards"
                players={
                  forwards
                }
                captainId={
                  squadAnalysis
                    .captain
                    ?.id
                }
                viceCaptainId={
                  squadAnalysis
                    .viceCaptain
                    ?.id
                }
              />
            </div>
          </div>

          <div className="panel p-5">
            <span className="section-label">
              Substitutes
            </span>

            <h3 className="mt-1 font-display text-2xl font-bold">
              Bench Order
            </h3>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {squadAnalysis.bench.map(
                (
                  player,
                  index,
                ) => (
                  <div
                    key={
                      player.id
                    }
                  >
                    <div className="mb-2 text-xs text-muted">
                      {player.position
                        ?.shortName ===
                      "GKP"
                        ? "Bench GK"
                        : `Sub ${
                            index +
                            1
                          }`}
                    </div>

                    <AnalysisPlayerCard
                      player={
                        player
                      }
                    />
                  </div>
                ),
              )}
            </div>
          </div>
        </section>
      )}

      <section className="panel">
        <div className="border-b border-border p-5">
          <div className="mb-4">
            <span className="section-label">
              Player Database
            </span>

            <h2 className="mt-1 font-display text-2xl font-bold">
              Select Players
            </h2>

            <p className="mt-2 text-sm text-muted">
              Search the full FPL
              player pool to build
              or change your squad.
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />

              <input
                type="search"
                value={search}
                onChange={(
                  event,
                ) =>
                  setSearch(
                    event.target
                      .value,
                  )
                }
                placeholder="Search player or club..."
                className="form-control pl-9"
              />
            </div>

            <select
              value={position}
              onChange={(
                event,
              ) =>
                setPosition(
                  event.target
                    .value,
                )
              }
              className="form-control lg:w-44"
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
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-muted">
            Loading players...
          </div>
        ) : (
          <div className="table-container rounded-none border-0 shadow-none">
            <table className="data-table">
              <thead>
                <tr>
                  <th>
                    Player
                  </th>

                  <th>
                    Pos
                  </th>

                  <th>
                    Price
                  </th>

                  <th>
                    Pred
                  </th>

                  <th>
                    FPL Pts
                  </th>

                  <th>
                    Squad
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredPlayers.map(
                  (player) => {
                    const selected =
                      selectedIds.includes(
                        player.id,
                      );

                    return (
                      <PlayerRow
                        key={
                          player.id
                        }
                        player={
                          player
                        }
                        selected={
                          selected
                        }
                        disabled={
                          !canAddPlayer(
                            player,
                          )
                        }
                        onToggle={
                          togglePlayer
                        }
                      />
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}