import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  History,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  WandSparkles,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  NavLink,
  useNavigate,
} from "react-router-dom";

import {
  getFantasyPredictions,
  getFantasyTransferRecommendations,
  optimiseFantasyMultiTransfers,
} from "../api/fantasyApi";

const SQUAD_STORAGE_KEY =
  "plstats-fantasy-squad";

const TRANSFER_HISTORY_KEY =
  "plstats-fantasy-transfer-history";

const HORIZONS = [
  {
    value: 1,
    label: "1 GW",
  },
  {
    value: 3,
    label: "3 GWs",
  },
  {
    value: 5,
    label: "5 GWs",
  },
];

/* =========================================================
   NAVIGATION
========================================================= */

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

  return (
    <nav className="mb-6 flex flex-wrap gap-2 rounded-xl border border-border bg-surface p-2">
      {tabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          end
          className={({ isActive }) =>
            [
              "rounded-md px-3 py-2 text-sm font-semibold transition-colors",

              isActive
                ? "bg-accent-soft text-accent"
                : "text-muted hover:bg-surface-hover hover:text-white",
            ].join(" ")
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}

/* =========================================================
   HELPERS
========================================================= */

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
      return "bg-surface-light text-muted";
  }
}

function formatHistoryDate(value) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Unknown";
  }

  return date.toLocaleString(
    "en-AU",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    },
  );
}

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function PlayerBadge({
  player,
}) {
  if (!player) {
    return null;
  }

  return (
    <span
      className={[
        "rounded-md px-2 py-1 text-[10px] font-bold",
        getPositionStyle(
          player.position?.shortName,
        ),
      ].join(" ")}
    >
      {player.position?.shortName}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  subtext,
  icon: Icon,
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

function SquadPlayerButton({
  player,
  selected,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded-lg border p-3 text-left transition-colors",

        selected
          ? "border-accent bg-accent-soft"
          : "border-border bg-base hover:border-accent/50 hover:bg-surface-hover",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">
              {player.webName}
            </span>

            <PlayerBadge
              player={player}
            />
          </div>

          <div className="mt-1 text-xs text-muted">
            {player.team?.shortName} • £
            {Number(
              player.price,
            ).toFixed(1)}
            m
          </div>
        </div>

        <div className="text-right">
          <div className="font-display text-lg font-bold text-accent">
            {Number(
              player.prediction
                ?.predictedPoints || 0,
            ).toFixed(1)}
          </div>

          <div className="text-[10px] text-muted">
            next GW
          </div>
        </div>
      </div>
    </button>
  );
}

function SelectedOutgoingCard({
  player,
}) {
  if (!player) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-base p-5 text-center">
        <div className="text-sm font-semibold">
          No player selected
        </div>

        <div className="mt-1 text-xs text-muted">
          Choose someone from your squad on the left.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-accent/30 bg-accent-soft p-5">
      <div className="section-label">
        Selected Player
      </div>

      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-2xl font-bold">
              {player.webName}
            </span>

            <PlayerBadge
              player={player}
            />
          </div>

          <div className="mt-2 text-sm text-muted">
            {player.team?.shortName} • £
            {Number(
              player.price,
            ).toFixed(1)}
            m
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-muted">
            Next GW
          </div>

          <div className="font-display text-3xl font-bold text-accent">
            {Number(
              player.prediction
                ?.predictedPoints || 0,
            ).toFixed(1)}
          </div>
        </div>
      </div>
    </div>
  );
}

function HorizonSelector({
  horizon,
  onChange,
  disabled,
}) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-base p-1">
      {HORIZONS.map(
        (option) => (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() =>
              onChange(
                option.value,
              )
            }
            className={[
              "rounded-md px-4 py-2 text-sm font-semibold transition-colors",

              horizon ===
              option.value
                ? "bg-accent text-black"
                : "text-muted hover:text-white",

              disabled
                ? "cursor-not-allowed opacity-50"
                : "",
            ].join(" ")}
          >
            {option.label}
          </button>
        ),
      )}
    </div>
  );
}

function FixtureRun({
  player,
  horizon,
}) {
  const gameweeks =
    player?.multiGameweek
      ?.gameweeks
      ?.slice(
        0,
        horizon,
      ) || [];

  if (
    gameweeks.length ===
    0
  ) {
    return (
      <span className="text-xs text-muted">
        No fixture data
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {gameweeks.map(
        (gameweek) => {
          const fixtures =
            gameweek.fixtures ||
            [];

          if (
            fixtures.length ===
            0
          ) {
            return (
              <div
                key={
                  gameweek.gameweek
                }
                className="rounded-md border border-border bg-surface px-2 py-1 text-xs"
              >
                GW
                {gameweek.gameweek}: BGW
              </div>
            );
          }

          return (
            <div
              key={
                gameweek.gameweek
              }
              className="rounded-md border border-border bg-surface px-2 py-1 text-xs"
            >
              GW
              {gameweek.gameweek}:{" "}
              {fixtures
                .map(
                  (fixture) =>
                    `FDR ${fixture.difficulty}`,
                )
                .join(" + ")}
            </div>
          );
        },
      )}
    </div>
  );
}

function GainBox({
  label,
  value,
  active,
}) {
  const positive =
    Number(value) >=
    0;

  return (
    <div
      className={[
        "rounded-lg border p-3",

        active
          ? "border-accent/50 bg-accent-soft"
          : "border-border bg-base",
      ].join(" ")}
    >
      <div className="text-xs text-muted">
        {label}
      </div>

      <div
        className={[
          "mt-1 font-display text-xl font-bold",

          positive
            ? "text-success"
            : "text-danger",
        ].join(" ")}
      >
        {positive
          ? "+"
          : ""}
        {Number(
          value || 0,
        ).toFixed(1)}
      </div>
    </div>
  );
}

/* =========================================================
   SINGLE TRANSFER CARD
========================================================= */

function TransferCard({
  transfer,
  rank,
  horizon,
  onApply,
  applying,
}) {
  const outgoing =
    transfer.outgoingPlayer;

  const incoming =
    transfer.incomingPlayer;

  const positive =
    transfer.predictedGain >
    0;

  return (
    <div className="panel p-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="section-label">
            Recommendation #
            {rank}
          </span>

          <div className="mt-1 flex items-center gap-2">
            <TrendingUp
              size={18}
              className={
                positive
                  ? "text-success"
                  : "text-danger"
              }
            />

            <span
              className={[
                "font-display text-2xl font-bold",

                positive
                  ? "text-success"
                  : "text-danger",
              ].join(" ")}
            >
              {transfer.predictedGain >=
              0
                ? "+"
                : ""}
              {Number(
                transfer.predictedGain,
              ).toFixed(1)}
            </span>

            <span className="text-sm text-muted">
              projected over{" "}
              {horizon} GW
              {horizon > 1
                ? "s"
                : ""}
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-base px-3 py-2 text-right">
          <div className="text-xs text-muted">
            Bank after
          </div>

          <div className="font-semibold text-accent">
            £
            {Number(
              transfer.remainingBudget,
            ).toFixed(1)}
            m
          </div>
        </div>
      </div>

      <div className="grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-4">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-danger">
            Sell
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-xl font-bold">
              {outgoing.webName}
            </span>

            <PlayerBadge
              player={outgoing}
            />
          </div>

          <div className="mt-2 text-sm text-muted">
            {outgoing.team?.shortName}{" "}
            • £
            {Number(
              outgoing.price,
            ).toFixed(1)}
            m
          </div>

          <div className="mt-4">
            <div className="text-xs text-muted">
              {horizon} GW projection
            </div>

            <div className="font-display text-2xl font-bold">
              {Number(
                transfer.outgoingProjection,
              ).toFixed(1)}
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-accent/30 bg-accent-soft">
            <ArrowRight
              size={18}
              className="text-accent"
            />
          </div>
        </div>

        <div className="rounded-lg border border-success/30 bg-success/5 p-4">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-success">
            Buy
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-xl font-bold">
              {incoming.webName}
            </span>

            <PlayerBadge
              player={incoming}
            />
          </div>

          <div className="mt-2 text-sm text-muted">
            {incoming.team?.shortName}{" "}
            • £
            {Number(
              incoming.price,
            ).toFixed(1)}
            m
          </div>

          <div className="mt-4">
            <div className="text-xs text-muted">
              {horizon} GW projection
            </div>

            <div className="font-display text-2xl font-bold text-accent">
              {Number(
                transfer.incomingProjection,
              ).toFixed(1)}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <GainBox
          label="Next GW"
          value={
            transfer.gains?.[1]
          }
          active={
            horizon === 1
          }
        />

        <GainBox
          label="Next 3 GWs"
          value={
            transfer.gains?.[3]
          }
          active={
            horizon === 3
          }
        />

        <GainBox
          label="Next 5 GWs"
          value={
            transfer.gains?.[5]
          }
          active={
            horizon === 5
          }
        />
      </div>

      <div className="mt-5 rounded-lg border border-border bg-base p-4">
        <div className="mb-3 flex items-center gap-2">
          <CalendarDays
            size={15}
            className="text-accent"
          />

          <span className="text-sm font-semibold">
            Incoming fixture run
          </span>
        </div>

        <FixtureRun
          player={incoming}
          horizon={horizon}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <div>
          <div className="text-xs text-muted">
            Cost difference
          </div>

          <span
            className={
              transfer.costDifference <=
              0
                ? "font-semibold text-success"
                : "font-semibold text-warning"
            }
          >
            {transfer.costDifference >
            0
              ? "+"
              : ""}
            £
            {Number(
              transfer.costDifference,
            ).toFixed(1)}
            m
          </span>
        </div>

        <button
          type="button"
          disabled={applying}
          onClick={() =>
            onApply(transfer)
          }
          className="primary-button disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCircle2
            size={16}
          />

          {applying
            ? "Applying..."
            : "Apply Transfer"}
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   TRANSFER HISTORY
========================================================= */

function TransferHistoryItem({
  transfer,
}) {
  const positive =
    Number(
      transfer.projectedGain,
    ) >= 0;

  const isMulti =
    transfer.type ===
      "multi" &&
    Array.isArray(
      transfer.transfers,
    );

  if (isMulti) {
    return (
      <div className="rounded-xl border border-border bg-base p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="section-label">
                GW
                {transfer.gameweek ||
                  "—"}
              </span>

              <span className="rounded-md border border-accent/30 bg-accent-soft px-2 py-1 text-[10px] font-semibold text-accent">
                {transfer.transferCount ||
                  transfer.transfers.length}{" "}
                Transfers
              </span>

              <span className="rounded-md border border-border bg-surface px-2 py-1 text-[10px] font-semibold text-muted">
                {transfer.horizon} GW
                {transfer.horizon >
                1
                  ? "s"
                  : ""}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {transfer.transfers.map(
                (
                  item,
                  index,
                ) => (
                  <div
                    key={
                      index
                    }
                    className="grid items-center gap-3 rounded-lg border border-border bg-surface p-4 sm:grid-cols-[1fr_auto_1fr]"
                  >
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-danger">
                        Out
                      </div>

                      <div className="font-display text-lg font-bold">
                        {
                          item
                            .outgoingPlayer
                            ?.webName
                        }
                      </div>

                      <div className="text-xs text-muted">
                        {
                          item
                            .outgoingPlayer
                            ?.team
                            ?.shortName
                        }{" "}
                        • £
                        {Number(
                          item
                            .outgoingPlayer
                            ?.price ||
                            0,
                        ).toFixed(1)}
                        m
                      </div>
                    </div>

                    <ArrowRight
                      size={16}
                      className="mx-auto text-muted"
                    />

                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-success">
                        In
                      </div>

                      <div className="font-display text-lg font-bold">
                        {
                          item
                            .incomingPlayer
                            ?.webName
                        }
                      </div>

                      <div className="text-xs text-muted">
                        {
                          item
                            .incomingPlayer
                            ?.team
                            ?.shortName
                        }{" "}
                        • £
                        {Number(
                          item
                            .incomingPlayer
                            ?.price ||
                            0,
                        ).toFixed(1)}
                        m
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-muted">
              Projected gain
            </div>

            <div
              className={[
                "font-display text-3xl font-bold",

                positive
                  ? "text-success"
                  : "text-danger",
              ].join(" ")}
            >
              {positive
                ? "+"
                : ""}
              {Number(
                transfer.projectedGain ||
                  0,
              ).toFixed(1)}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-surface p-3">
            <div className="text-xs text-muted">
              Current projection
            </div>

            <div className="mt-1 font-semibold">
              {Number(
                transfer.currentProjection ||
                  0,
              ).toFixed(1)}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-3">
            <div className="text-xs text-muted">
              New projection
            </div>

            <div className="mt-1 font-semibold text-accent">
              {Number(
                transfer.newProjection ||
                  0,
              ).toFixed(1)}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-3">
            <div className="text-xs text-muted">
              Bank after
            </div>

            <div className="mt-1 font-semibold text-accent">
              £
              {Number(
                transfer.remainingBudget ||
                  0,
              ).toFixed(1)}
              m
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted">
          <div className="flex items-center gap-2">
            <Clock3
              size={14}
            />

            Applied{" "}
            {formatHistoryDate(
              transfer.appliedAt,
            )}
          </div>

          <span>
            {transfer.model}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-base p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="section-label">
              GW
              {transfer.gameweek ||
                "—"}
            </span>

            <span className="rounded-md border border-border bg-surface px-2 py-1 text-[10px] font-semibold text-muted">
              {transfer.horizon} GW
              {transfer.horizon > 1
                ? "s"
                : ""}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-danger">
                Out
              </div>

              <div className="font-display text-xl font-bold">
                {
                  transfer
                    .outgoingPlayer
                    ?.webName
                }
              </div>

              <div className="text-xs text-muted">
                {
                  transfer
                    .outgoingPlayer
                    ?.team
                    ?.shortName
                }{" "}
                • £
                {Number(
                  transfer
                    .outgoingPlayer
                    ?.price || 0,
                ).toFixed(1)}
                m
              </div>
            </div>

            <ArrowRight
              size={18}
              className="text-muted"
            />

            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-success">
                In
              </div>

              <div className="font-display text-xl font-bold">
                {
                  transfer
                    .incomingPlayer
                    ?.webName
                }
              </div>

              <div className="text-xs text-muted">
                {
                  transfer
                    .incomingPlayer
                    ?.team
                    ?.shortName
                }{" "}
                • £
                {Number(
                  transfer
                    .incomingPlayer
                    ?.price || 0,
                ).toFixed(1)}
                m
              </div>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-muted">
            Projected gain
          </div>

          <div
            className={[
              "font-display text-3xl font-bold",

              positive
                ? "text-success"
                : "text-danger",
            ].join(" ")}
          >
            {positive
              ? "+"
              : ""}
            {Number(
              transfer.projectedGain ||
                0,
            ).toFixed(1)}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface p-3">
          <div className="text-xs text-muted">
            Cost change
          </div>

          <div className="mt-1 font-semibold">
            {Number(
              transfer.costDifference,
            ) > 0
              ? "+"
              : ""}
            £
            {Number(
              transfer.costDifference ||
                0,
            ).toFixed(1)}
            m
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-3">
          <div className="text-xs text-muted">
            Bank after
          </div>

          <div className="mt-1 font-semibold text-accent">
            £
            {Number(
              transfer.remainingBudget ||
                0,
            ).toFixed(1)}
            m
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-3">
          <div className="text-xs text-muted">
            Model
          </div>

          <div className="mt-1 font-semibold">
            {transfer.model ||
              "PLStats V1"}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-border pt-4 text-xs text-muted">
        <Clock3
          size={14}
        />

        Applied{" "}
        {formatHistoryDate(
          transfer.appliedAt,
        )}
      </div>
    </div>
  );
}

function TransferHistorySection({
  history,
  onClear,
}) {
  return (
    <section className="mt-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History
              size={17}
              className="text-accent"
            />

            <span className="section-label">
              Transfer Activity
            </span>
          </div>

          <h2 className="mt-1 font-display text-3xl font-bold">
            Transfer History
          </h2>

          <p className="mt-2 text-sm text-muted">
            Transfers you apply through
            PLStats are recorded here.
          </p>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/5 px-4 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger/10"
          >
            <Trash2
              size={15}
            />

            Clear History
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="panel p-8 text-center">
          <History
            size={26}
            className="mx-auto text-muted"
          />

          <h3 className="mt-3 font-display text-xl font-bold">
            No transfers recorded yet
          </h3>

          <p className="mt-2 text-sm text-muted">
            Apply a recommendation and
            it will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map(
            (transfer) => (
              <TransferHistoryItem
                key={transfer.id}
                transfer={transfer}
              />
            ),
          )}
        </div>
      )}
    </section>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function FantasyTransfersPage() {
  const navigate =
    useNavigate();

  const [
    allPlayers,
    setAllPlayers,
  ] = useState([]);

  const [
    selectedIds,
    setSelectedIds,
  ] = useState(() => {
    try {
      const stored =
        localStorage.getItem(
          SQUAD_STORAGE_KEY,
        );

      return stored
        ? JSON.parse(stored)
        : [];
    } catch {
      return [];
    }
  });

  const [
    transferHistory,
    setTransferHistory,
  ] = useState(() => {
    try {
      const stored =
        localStorage.getItem(
          TRANSFER_HISTORY_KEY,
        );

      return stored
        ? JSON.parse(stored)
        : [];
    } catch {
      return [];
    }
  });

  const [
    outgoingPlayerId,
    setOutgoingPlayerId,
  ] = useState(null);

  const [
    recommendations,
    setRecommendations,
  ] = useState(null);

  const [
    horizon,
    setHorizon,
  ] = useState(3);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    generating,
    setGenerating,
  ] = useState(false);

  const [
    applyingTransferId,
    setApplyingTransferId,
  ] = useState(null);

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    multiTransferResult,
    setMultiTransferResult,
  ] = useState(null);

  const [
    optimisingMulti,
    setOptimisingMulti,
  ] = useState(false);

  const [
    multiTransferError,
    setMultiTransferError,
  ] = useState("");

  const [
    applyingMultiPlanIndex,
    setApplyingMultiPlanIndex,
  ] = useState(null);

  const resultsRef =
    useRef(null);

  /* =======================================================
     LOAD PLAYERS
  ======================================================= */

  useEffect(() => {
    async function loadPlayers() {
      try {
        setLoading(true);

        const response =
          await getFantasyPredictions({
            limit: 700,
          });

        setAllPlayers(
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
          "Unable to load Fantasy player data.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadPlayers();
  }, []);

  /* =======================================================
     SCROLL TO SINGLE RESULTS
  ======================================================= */

  useEffect(() => {
    if (
      recommendations &&
      resultsRef.current
    ) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 150);
    }
  }, [recommendations]);

  /* =======================================================
     SAVE SQUAD
  ======================================================= */

  useEffect(() => {
    localStorage.setItem(
      SQUAD_STORAGE_KEY,
      JSON.stringify(
        selectedIds,
      ),
    );
  }, [selectedIds]);

  /* =======================================================
     SAVE HISTORY
  ======================================================= */

  useEffect(() => {
    localStorage.setItem(
      TRANSFER_HISTORY_KEY,
      JSON.stringify(
        transferHistory,
      ),
    );
  }, [transferHistory]);

  /* =======================================================
     SQUAD COMPUTED VALUES
  ======================================================= */

  const squadPlayers =
    useMemo(
      () =>
        allPlayers.filter(
          (player) =>
            selectedIds.includes(
              player.id,
            ),
        ),
      [
        allPlayers,
        selectedIds,
      ],
    );

  const selectedOutgoingPlayer =
    useMemo(
      () =>
        squadPlayers.find(
          (player) =>
            player.id ===
            outgoingPlayerId,
        ) || null,
      [
        squadPlayers,
        outgoingPlayerId,
      ],
    );

  const filteredSquad =
    useMemo(() => {
      const value =
        search
          .trim()
          .toLowerCase();

      if (!value) {
        return squadPlayers;
      }

      return squadPlayers.filter(
        (player) =>
          player.webName
            ?.toLowerCase()
            .includes(value) ||
          player.name
            ?.toLowerCase()
            .includes(value) ||
          player.team?.name
            ?.toLowerCase()
            .includes(value),
      );
    }, [
      squadPlayers,
      search,
    ]);

  /* =======================================================
     SINGLE TRANSFER RECOMMENDATIONS
  ======================================================= */

  async function generateRecommendations(
    selectedOutgoingId,
    selectedHorizon =
      horizon,
  ) {
    try {
      setGenerating(true);

      setError("");

      setSuccessMessage("");

      const response =
        await getFantasyTransferRecommendations({
          playerIds:
            selectedIds,

          outgoingPlayerId:
            selectedOutgoingId ||
            undefined,

          horizon:
            selectedHorizon,

          limit: 10,
        });

      setRecommendations(
        response,
      );

      if (
        response.outgoingPlayer
          ?.id
      ) {
        setOutgoingPlayerId(
          response.outgoingPlayer.id,
        );
      }
    } catch (
      recommendationError
    ) {
      console.error(
        recommendationError,
      );

      const data =
        recommendationError
          .response?.data;

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
            "Unable to generate transfer recommendations.",
        );
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleManualRecommend() {
    if (
      !outgoingPlayerId
    ) {
      setError(
        "Select a player to sell first.",
      );

      return;
    }

    await generateRecommendations(
      outgoingPlayerId,
      horizon,
    );
  }

  async function handleAutoRecommend() {
    setOutgoingPlayerId(
      null,
    );

    setRecommendations(
      null,
    );

    await generateRecommendations(
      null,
      horizon,
    );
  }

  async function handleHorizonChange(
    newHorizon,
  ) {
    setHorizon(
      newHorizon,
    );

    /*
     * Remove old multi-transfer results
     * because those belong to a different
     * prediction horizon.
     */
    setMultiTransferResult(
      null,
    );

    setMultiTransferError(
      "",
    );

    if (
      recommendations
    ) {
      await generateRecommendations(
        outgoingPlayerId,
        newHorizon,
      );
    }
  }

  /* =======================================================
     APPLY SINGLE TRANSFER
  ======================================================= */

  function handleApplyTransfer(
    transfer,
  ) {
    const outgoingId =
      transfer.outgoingPlayer?.id;

    const incomingId =
      transfer.incomingPlayer?.id;

    if (
      !outgoingId ||
      !incomingId
    ) {
      setError(
        "Unable to apply this transfer.",
      );

      return;
    }

    if (
      !selectedIds.includes(
        outgoingId,
      )
    ) {
      setError(
        "The outgoing player is no longer in your squad.",
      );

      return;
    }

    if (
      selectedIds.includes(
        incomingId,
      )
    ) {
      setError(
        "The incoming player is already in your squad.",
      );

      return;
    }

    setApplyingTransferId(
      incomingId,
    );

    const updatedSquad =
      selectedIds.map(
        (id) =>
          id === outgoingId
            ? incomingId
            : id,
      );

    const historyEntry = {
      id:
        typeof crypto !==
          "undefined" &&
        crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${incomingId}`,

      type:
        "single",

      transferCount:
        1,

      gameweek:
        recommendations?.gameweek,

      horizon,

      appliedAt:
        new Date().toISOString(),

      model:
        recommendations
          ?.transferModel ||
        recommendations?.model ||
        "PLStats V1",

      projectedGain:
        Number(
          transfer.predictedGain ||
            0,
        ),

      costDifference:
        Number(
          transfer.costDifference ||
            0,
        ),

      remainingBudget:
        Number(
          transfer.remainingBudget ||
            0,
        ),

      outgoingProjection:
        Number(
          transfer.outgoingProjection ||
            0,
        ),

      incomingProjection:
        Number(
          transfer.incomingProjection ||
            0,
        ),

      outgoingPlayer: {
        id:
          transfer.outgoingPlayer
            .id,

        webName:
          transfer.outgoingPlayer
            .webName,

        price:
          Number(
            transfer
              .outgoingPlayer
              .price || 0,
          ),

        team:
          transfer.outgoingPlayer
            .team,

        position:
          transfer.outgoingPlayer
            .position,
      },

      incomingPlayer: {
        id:
          transfer.incomingPlayer
            .id,

        webName:
          transfer.incomingPlayer
            .webName,

        price:
          Number(
            transfer
              .incomingPlayer
              .price || 0,
          ),

        team:
          transfer.incomingPlayer
            .team,

        position:
          transfer.incomingPlayer
            .position,
      },
    };

    localStorage.setItem(
      SQUAD_STORAGE_KEY,
      JSON.stringify(
        updatedSquad,
      ),
    );

    setSelectedIds(
      updatedSquad,
    );

    setTransferHistory(
      (currentHistory) => [
        historyEntry,
        ...currentHistory,
      ],
    );

    setSuccessMessage(
      `${transfer.outgoingPlayer.webName} was replaced by ${transfer.incomingPlayer.webName}.`,
    );

    setRecommendations(
      null,
    );

    setMultiTransferResult(
      null,
    );

    setOutgoingPlayerId(
      null,
    );

    setError("");

    setTimeout(() => {
      setApplyingTransferId(
        null,
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }, 250);
  }

  /* =======================================================
     MULTI TRANSFER OPTIMISER
  ======================================================= */

  async function handleOptimiseTwoTransfers() {
    try {
      setOptimisingMulti(
        true,
      );

      setMultiTransferError(
        "",
      );

      setMultiTransferResult(
        null,
      );

      setSuccessMessage(
        "",
      );

      const response =
        await optimiseFantasyMultiTransfers({
          playerIds:
            selectedIds,

          horizon,

          limit: 5,
        });

      setMultiTransferResult(
        response,
      );
    } catch (
      optimiseError
    ) {
      console.error(
        optimiseError,
      );

      const data =
        optimiseError
          .response?.data;

      setMultiTransferError(
        data?.error ||
          "Unable to optimise two transfers.",
      );
    } finally {
      setOptimisingMulti(
        false,
      );
    }
  }

  /* =======================================================
     APPLY TWO TRANSFERS
  ======================================================= */

  function handleApplyTwoTransfers(
    plan,
    planIndex,
  ) {
    if (
      !plan?.transfers ||
      plan.transfers.length !==
        2
    ) {
      setError(
        "This transfer plan is invalid.",
      );

      return;
    }

    const [
      firstTransfer,
      secondTransfer,
    ] =
      plan.transfers;

    const outgoingIds = [
      firstTransfer
        .outgoingPlayer?.id,
      secondTransfer
        .outgoingPlayer?.id,
    ];

    const incomingIds = [
      firstTransfer
        .incomingPlayer?.id,
      secondTransfer
        .incomingPlayer?.id,
    ];

    if (
      outgoingIds.some(
        (id) => !id,
      ) ||
      incomingIds.some(
        (id) => !id,
      )
    ) {
      setError(
        "Unable to apply this two-transfer plan.",
      );

      return;
    }

    if (
      new Set(
        outgoingIds,
      ).size !== 2 ||
      new Set(
        incomingIds,
      ).size !== 2
    ) {
      setError(
        "This transfer plan contains duplicate players.",
      );

      return;
    }

    const missingOutgoing =
      outgoingIds.some(
        (id) =>
          !selectedIds.includes(
            id,
          ),
      );

    if (
      missingOutgoing
    ) {
      setError(
        "One of the outgoing players is no longer in your squad.",
      );

      return;
    }

    const incomingAlreadySelected =
      incomingIds.some(
        (id) =>
          selectedIds.includes(
            id,
          ),
      );

    if (
      incomingAlreadySelected
    ) {
      setError(
        "One of the incoming players is already in your squad.",
      );

      return;
    }

    setApplyingMultiPlanIndex(
      planIndex,
    );

    const transferMap =
      new Map([
        [
          firstTransfer
            .outgoingPlayer.id,

          firstTransfer
            .incomingPlayer.id,
        ],

        [
          secondTransfer
            .outgoingPlayer.id,

          secondTransfer
            .incomingPlayer.id,
        ],
      ]);

    const updatedSquad =
      selectedIds.map(
        (playerId) =>
          transferMap.has(
            playerId,
          )
            ? transferMap.get(
                playerId,
              )
            : playerId,
      );

    if (
      updatedSquad.length !==
        15 ||
      new Set(
        updatedSquad,
      ).size !== 15
    ) {
      setError(
        "The updated squad would be invalid.",
      );

      setApplyingMultiPlanIndex(
        null,
      );

      return;
    }

    localStorage.setItem(
      SQUAD_STORAGE_KEY,
      JSON.stringify(
        updatedSquad,
      ),
    );

    setSelectedIds(
      updatedSquad,
    );

    const historyEntry = {
      id:
        typeof crypto !==
          "undefined" &&
        crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-multi`,

      type:
        "multi",

      transferCount:
        2,

      gameweek:
        multiTransferResult
          ?.gameweek,

      horizon,

      appliedAt:
        new Date().toISOString(),

      model:
        multiTransferResult
          ?.model ||
        "PLStats Multi-Transfer V1",

      projectedGain:
        Number(
          plan.projectedGain ||
            0,
        ),

      remainingBudget:
        Number(
          plan.bankAfter ||
            0,
        ),

      currentProjection:
        Number(
          plan.currentProjection ||
            0,
        ),

      newProjection:
        Number(
          plan.newProjection ||
            0,
        ),

      transfers:
        plan.transfers.map(
          (transfer) => ({
            projectedGain:
              Number(
                transfer
                  .projectedGain ||
                  0,
              ),

            costDifference:
              Number(
                transfer
                  .costDifference ||
                  0,
              ),

            outgoingProjection:
              Number(
                transfer
                  .outgoingProjection ||
                  0,
              ),

            incomingProjection:
              Number(
                transfer
                  .incomingProjection ||
                  0,
              ),

            outgoingPlayer: {
              id:
                transfer
                  .outgoingPlayer
                  .id,

              webName:
                transfer
                  .outgoingPlayer
                  .webName,

              price:
                Number(
                  transfer
                    .outgoingPlayer
                    .price || 0,
                ),

              team:
                transfer
                  .outgoingPlayer
                  .team,

              position:
                transfer
                  .outgoingPlayer
                  .position,
            },

            incomingPlayer: {
              id:
                transfer
                  .incomingPlayer
                  .id,

              webName:
                transfer
                  .incomingPlayer
                  .webName,

              price:
                Number(
                  transfer
                    .incomingPlayer
                    .price || 0,
                ),

              team:
                transfer
                  .incomingPlayer
                  .team,

              position:
                transfer
                  .incomingPlayer
                  .position,
            },
          }),
        ),
    };

    setTransferHistory(
      (currentHistory) => [
        historyEntry,
        ...currentHistory,
      ],
    );

    setSuccessMessage(
      `${firstTransfer.outgoingPlayer.webName} → ${firstTransfer.incomingPlayer.webName} and ${secondTransfer.outgoingPlayer.webName} → ${secondTransfer.incomingPlayer.webName} applied successfully.`,
    );

    setMultiTransferResult(
      null,
    );

    setRecommendations(
      null,
    );

    setOutgoingPlayerId(
      null,
    );

    setError("");

    setMultiTransferError(
      "",
    );

    setTimeout(() => {
      setApplyingMultiPlanIndex(
        null,
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }, 250);
  }

  /* =======================================================
     CLEAR HISTORY
  ======================================================= */

  function handleClearHistory() {
    const confirmed =
      window.confirm(
        "Clear all PLStats transfer history?",
      );

    if (!confirmed) {
      return;
    }

    setTransferHistory(
      [],
    );

    localStorage.removeItem(
      TRANSFER_HISTORY_KEY,
    );
  }

  /* =======================================================
     REQUIRE COMPLETE SQUAD
  ======================================================= */

  if (
    !loading &&
    selectedIds.length !==
      15
  ) {
    return (
      <main className="page-container animate-fade-in">
        <FantasyTabs />

        <section className="panel p-8">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle
              size={18}
              className="text-warning"
            />

            <span className="section-label">
              Transfer Planner
            </span>
          </div>

          <h1 className="page-heading">
            Build your squad first
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-light">
            PLStats needs your
            complete 15-player
            squad before it can
            calculate legal
            transfer
            recommendations.
          </p>

          <NavLink
            to="/fantasy/my-team"
            className="primary-button mt-6 inline-flex"
          >
            Go to My Team
          </NavLink>
        </section>
      </main>
    );
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <main className="page-container animate-fade-in">
      <FantasyTabs />

      {/* HEADER */}

      <section className="mb-6 rounded-xl border border-border bg-surface p-6 shadow-panel md:p-8">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles
            size={17}
            className="text-accent"
          />

          <span className="section-label">
            PLStats Fantasy
          </span>
        </div>

        <h1 className="page-heading text-gradient">
          Transfer Planner
        </h1>

        <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-light">
          Compare transfer
          options across the next
          1, 3 or 5 gameweeks.
          PLStats considers
          projected points,
          fixture runs, budget,
          club limits, price and
          model confidence.
        </p>
      </section>

      {/* SUCCESS */}

      {successMessage && (
        <div className="mb-6 rounded-lg border border-success/40 bg-success/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle2
                size={20}
                className="text-success"
              />

              <div>
                <div className="font-semibold text-success">
                  Transfer applied
                </div>

                <div className="mt-1 text-sm text-muted-light">
                  {successMessage}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/fantasy/my-team",
                )
              }
              className="secondary-button"
            >
              View My Team
            </button>
          </div>
        </div>
      )}

      {/* ERROR */}

      {error && (
        <div className="mb-6 rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      {loading ? (
        <div className="panel p-12 text-center text-muted">
          Loading your squad...
        </div>
      ) : (
        <>
          {/* SUMMARY */}

          <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              icon={
                RefreshCw
              }
              label="Squad"
              value="15/15"
              subtext="Loaded from My Team"
            />

            <SummaryCard
              icon={
                CircleDollarSign
              }
              label="Bank"
              value={
                recommendations
                  ? `£${Number(
                      recommendations.remainingBudget,
                    ).toFixed(
                      1,
                    )}m`
                  : "—"
              }
              subtext="Current available funds"
            />

            <SummaryCard
              icon={
                BadgeDollarSign
              }
              label="Max Spend"
              value={
                recommendations
                  ? `£${Number(
                      recommendations.availableBudget,
                    ).toFixed(
                      1,
                    )}m`
                  : "—"
              }
              subtext="For selected player"
            />

            <SummaryCard
              icon={
                TrendingUp
              }
              label="Window"
              value={`${horizon} GW${
                horizon > 1
                  ? "s"
                  : ""
              }`}
              subtext={
                recommendations
                  ? `Starts GW${recommendations.gameweek}`
                  : "Prediction horizon"
              }
            />
          </section>

          {/* SINGLE TRANSFER AREA */}

          <section className="mb-8 grid gap-6 xl:grid-cols-[380px_1fr]">
            {/* SQUAD LIST */}

            <aside className="panel p-5">
              <span className="section-label">
                Player Out
              </span>

              <h2 className="mt-1 font-display text-2xl font-bold">
                Choose who to sell
              </h2>

              <div className="relative mt-5">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />

                <input
                  id="transfer-squad-search"
                  name="transferSquadSearch"
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
                  placeholder="Search your squad..."
                  className="form-control pl-9"
                />
              </div>

              <div className="mt-4 max-h-[600px] space-y-2 overflow-y-auto pr-1">
                {filteredSquad.map(
                  (player) => (
                    <SquadPlayerButton
                      key={
                        player.id
                      }
                      player={
                        player
                      }
                      selected={
                        outgoingPlayerId ===
                        player.id
                      }
                      onClick={() => {
                        setOutgoingPlayerId(
                          player.id,
                        );

                        setRecommendations(
                          null,
                        );

                        setSuccessMessage(
                          "",
                        );

                        setError(
                          "",
                        );
                      }}
                    />
                  ),
                )}
              </div>
            </aside>

            {/* RECOMMENDATION ENGINE */}

            <section className="panel p-6">
              <span className="section-label">
                Recommendation Engine
              </span>

              <h2 className="mt-1 font-display text-2xl font-bold">
                Find your best
                transfer
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-light">
                Choose how far
                ahead PLStats
                should plan, then
                select a player
                manually or let
                Auto Recommend
                target your
                weakest option.
              </p>

              <div className="mt-6">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                  Planning Window
                </div>

                <HorizonSelector
                  horizon={
                    horizon
                  }
                  onChange={
                    handleHorizonChange
                  }
                  disabled={
                    generating ||
                    optimisingMulti
                  }
                />
              </div>

              <div className="mt-6">
                <SelectedOutgoingCard
                  player={
                    selectedOutgoingPlayer
                  }
                />
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <button
                  type="button"
                  disabled={
                    generating
                  }
                  onClick={
                    handleAutoRecommend
                  }
                  className="rounded-xl border border-accent/30 bg-accent-soft p-5 text-left transition-colors hover:border-accent disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <WandSparkles
                      size={18}
                      className="text-accent"
                    />

                    <span className="font-semibold">
                      Auto Recommend
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-6 text-muted">
                    Automatically
                    find the weakest
                    player across
                    the selected
                    planning window.
                  </p>
                </button>

                <button
                  type="button"
                  disabled={
                    !outgoingPlayerId ||
                    generating
                  }
                  onClick={
                    handleManualRecommend
                  }
                  className="rounded-xl border border-border bg-base p-5 text-left transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp
                      size={18}
                      className="text-accent"
                    />

                    <span className="font-semibold">
                      Find Replacements
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-6 text-muted">
                    Search for the
                    best legal
                    replacements
                    across{" "}
                    {horizon} GW
                    {horizon > 1
                      ? "s"
                      : ""}
                    .
                  </p>
                </button>
              </div>

              {generating && (
                <div className="mt-6 rounded-lg border border-accent/30 bg-accent-soft p-5">
                  <div className="flex items-center gap-3">
                    <RefreshCw
                      size={18}
                      className="animate-spin text-accent"
                    />

                    <div>
                      <div className="font-semibold">
                        Analysing{" "}
                        {horizon}{" "}
                        gameweek
                        {horizon > 1
                          ? "s"
                          : ""}
                        ...
                      </div>

                      <div className="mt-1 text-sm text-muted">
                        Calculating
                        fixture runs,
                        projections,
                        legal
                        transfers and
                        budget.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!generating &&
                !recommendations && (
                  <div className="mt-6 rounded-lg border border-dashed border-border p-8 text-center">
                    <Sparkles
                      size={24}
                      className="mx-auto text-accent"
                    />

                    <div className="mt-3 font-semibold">
                      No transfer
                      analysis yet
                    </div>

                    <div className="mt-1 text-sm text-muted">
                      Choose your
                      planning window
                      and run a
                      recommendation.
                    </div>
                  </div>
                )}

              {recommendations && (
                <div className="mt-6 rounded-lg border border-border bg-base p-5">
                  <span className="section-label">
                    Player Being
                    Replaced
                  </span>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-2xl font-bold">
                          {
                            recommendations
                              .outgoingPlayer
                              ?.webName
                          }
                        </span>

                        <PlayerBadge
                          player={
                            recommendations
                              .outgoingPlayer
                          }
                        />
                      </div>

                      <div className="mt-1 text-sm text-muted">
                        {
                          recommendations
                            .outgoingPlayer
                            ?.team
                            ?.shortName
                        }{" "}
                        • £
                        {Number(
                          recommendations
                            .outgoingPlayer
                            ?.price ||
                            0,
                        ).toFixed(
                          1,
                        )}
                        m
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-muted">
                        {horizon} GW
                        projection
                      </div>

                      <div className="font-display text-3xl font-bold text-accent">
                        {Number(
                          recommendations
                            .currentProjection,
                        ).toFixed(
                          1,
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </section>

          {/* SINGLE TRANSFER RESULTS */}

          {recommendations && (
            <section
              ref={
                resultsRef
              }
              className="scroll-mt-24 space-y-4"
            >
              <div>
                <span className="section-label">
                  PLStats Transfer
                  Intelligence
                </span>

                <h2 className="mt-1 font-display text-3xl font-bold">
                  Best{" "}
                  {horizon}-GW
                  Replacements
                </h2>

                <p className="mt-2 text-sm text-muted">
                  Ranked using
                  projected
                  improvement,
                  fixture run,
                  value and model
                  confidence.
                </p>
              </div>

              {recommendations
                .recommendations
                ?.length > 0 ? (
                recommendations.recommendations.map(
                  (
                    transfer,
                    index,
                  ) => (
                    <TransferCard
                      key={
                        transfer
                          .incomingPlayer
                          .id
                      }
                      transfer={
                        transfer
                      }
                      rank={
                        index + 1
                      }
                      horizon={
                        horizon
                      }
                      applying={
                        applyingTransferId ===
                        transfer
                          .incomingPlayer
                          .id
                      }
                      onApply={
                        handleApplyTransfer
                      }
                    />
                  ),
                )
              ) : (
                <div className="panel p-8 text-center">
                  <AlertTriangle
                    size={24}
                    className="mx-auto text-warning"
                  />

                  <h3 className="mt-3 font-display text-xl font-bold">
                    No legal
                    replacements
                    found
                  </h3>

                  <p className="mt-2 text-sm text-muted">
                    Try selecting a
                    different player
                    from your squad.
                  </p>
                </div>
              )}
            </section>
          )}

          {/* ===================================================
              MULTI TRANSFER OPTIMISER
          =================================================== */}

          <section className="mt-10">
            <div className="mb-5">
              <div className="flex items-center gap-2">
                <Sparkles
                  size={17}
                  className="text-accent"
                />

                <span className="section-label">
                  PLStats
                  Optimisation
                </span>
              </div>

              <h2 className="mt-1 font-display text-3xl font-bold">
                Multi-Transfer
                Optimiser
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                Search for the
                best legal
                combination of two
                transfers across
                your selected{" "}
                {horizon}-gameweek
                planning window.
              </p>
            </div>

            <div className="panel p-6">
              <div className="flex flex-wrap items-center justify-between gap-5">
                <div>
                  <div className="section-label">
                    Two Transfers
                  </div>

                  <h3 className="mt-1 font-display text-2xl font-bold">
                    Optimise your
                    squad
                  </h3>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
                    PLStats will
                    test combinations
                    of weaker squad
                    players and find
                    the pair of legal
                    replacements with
                    the largest
                    projected
                    improvement.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={
                    optimisingMulti
                  }
                  onClick={
                    handleOptimiseTwoTransfers
                  }
                  className="primary-button disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {optimisingMulti ? (
                    <>
                      <RefreshCw
                        size={16}
                        className="animate-spin"
                      />

                      Optimising...
                    </>
                  ) : (
                    <>
                      <WandSparkles
                        size={16}
                      />

                      Find Best 2
                      Transfers
                    </>
                  )}
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-base p-4">
                  <div className="text-xs text-muted">
                    Transfers
                  </div>

                  <div className="mt-1 font-display text-2xl font-bold text-accent">
                    2
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-base p-4">
                  <div className="text-xs text-muted">
                    Planning window
                  </div>

                  <div className="mt-1 font-display text-2xl font-bold">
                    {horizon} GW
                    {horizon > 1
                      ? "s"
                      : ""}
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-base p-4">
                  <div className="text-xs text-muted">
                    Squad
                  </div>

                  <div className="mt-1 font-display text-2xl font-bold">
                    15/15
                  </div>
                </div>
              </div>

              {multiTransferError && (
                <div className="mt-5 rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
                  {
                    multiTransferError
                  }
                </div>
              )}

              {optimisingMulti && (
                <div className="mt-5 rounded-lg border border-accent/30 bg-accent-soft p-5">
                  <div className="flex items-center gap-3">
                    <RefreshCw
                      size={18}
                      className="animate-spin text-accent"
                    />

                    <div>
                      <div className="font-semibold">
                        Searching
                        transfer
                        combinations...
                      </div>

                      <div className="mt-1 text-sm text-muted">
                        Checking
                        positions,
                        budget, club
                        limits and
                        projected
                        points.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!optimisingMulti &&
                multiTransferResult && (
                  <div className="mt-6">
                    <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
                      <div>
                        <span className="section-label">
                          Optimisation
                          Results
                        </span>

                        <h3 className="mt-1 font-display text-2xl font-bold">
                          Best
                          2-Transfer
                          Plans
                        </h3>
                      </div>

                      <div className="text-right text-xs text-muted">
                        {
                          multiTransferResult.combinationsChecked
                        }{" "}
                        legal
                        combinations
                        tested
                      </div>
                    </div>

                    {multiTransferResult
                      .plans
                      ?.length > 0 ? (
                      <div className="space-y-4">
                        {multiTransferResult.plans.map(
                          (
                            plan,
                            planIndex,
                          ) => (
                            <div
                              key={
                                planIndex
                              }
                              className="rounded-xl border border-border bg-base p-5"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                  <span className="section-label">
                                    Plan #
                                    {planIndex +
                                      1}
                                  </span>

                                  <h4 className="mt-1 font-display text-xl font-bold">
                                    Two-transfer
                                    combination
                                  </h4>
                                </div>

                                <div className="text-right">
                                  <div className="text-xs text-muted">
                                    Projected
                                    gain
                                  </div>

                                  <div
                                    className={[
                                      "font-display text-3xl font-bold",

                                      plan.projectedGain >=
                                      0
                                        ? "text-success"
                                        : "text-danger",
                                    ].join(
                                      " ",
                                    )}
                                  >
                                    {plan.projectedGain >=
                                    0
                                      ? "+"
                                      : ""}
                                    {Number(
                                      plan.projectedGain,
                                    ).toFixed(
                                      1,
                                    )}
                                  </div>

                                  <div className="text-xs text-muted">
                                    over{" "}
                                    {horizon}{" "}
                                    GW
                                    {horizon >
                                    1
                                      ? "s"
                                      : ""}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-5 space-y-3">
                                {plan.transfers.map(
                                  (
                                    transfer,
                                    transferIndex,
                                  ) => (
                                    <div
                                      key={
                                        transferIndex
                                      }
                                      className="grid items-center gap-3 rounded-lg border border-border bg-surface p-4 md:grid-cols-[1fr_auto_1fr]"
                                    >
                                      <div>
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-danger">
                                          Out
                                        </div>

                                        <div className="mt-1 flex items-center gap-2">
                                          <span className="font-display text-lg font-bold">
                                            {
                                              transfer
                                                .outgoingPlayer
                                                .webName
                                            }
                                          </span>

                                          <PlayerBadge
                                            player={
                                              transfer.outgoingPlayer
                                            }
                                          />
                                        </div>

                                        <div className="text-xs text-muted">
                                          {
                                            transfer
                                              .outgoingPlayer
                                              .team
                                              ?.shortName
                                          }{" "}
                                          • £
                                          {Number(
                                            transfer
                                              .outgoingPlayer
                                              .price,
                                          ).toFixed(
                                            1,
                                          )}
                                          m
                                        </div>

                                        <div className="mt-2 text-xs text-muted">
                                          Projection:{" "}
                                          {Number(
                                            transfer.outgoingProjection,
                                          ).toFixed(
                                            1,
                                          )}
                                        </div>
                                      </div>

                                      <ArrowRight
                                        size={
                                          18
                                        }
                                        className="mx-auto text-accent"
                                      />

                                      <div>
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-success">
                                          In
                                        </div>

                                        <div className="mt-1 flex items-center gap-2">
                                          <span className="font-display text-lg font-bold">
                                            {
                                              transfer
                                                .incomingPlayer
                                                .webName
                                            }
                                          </span>

                                          <PlayerBadge
                                            player={
                                              transfer.incomingPlayer
                                            }
                                          />
                                        </div>

                                        <div className="text-xs text-muted">
                                          {
                                            transfer
                                              .incomingPlayer
                                              .team
                                              ?.shortName
                                          }{" "}
                                          • £
                                          {Number(
                                            transfer
                                              .incomingPlayer
                                              .price,
                                          ).toFixed(
                                            1,
                                          )}
                                          m
                                        </div>

                                        <div className="mt-2 text-xs text-muted">
                                          Projection:{" "}
                                          {Number(
                                            transfer.incomingProjection,
                                          ).toFixed(
                                            1,
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ),
                                )}
                              </div>

                              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                                <div className="rounded-lg border border-border bg-surface p-3">
                                  <div className="text-xs text-muted">
                                    Current
                                  </div>

                                  <div className="mt-1 font-display text-xl font-bold">
                                    {Number(
                                      plan.currentProjection,
                                    ).toFixed(
                                      1,
                                    )}
                                  </div>
                                </div>

                                <div className="rounded-lg border border-border bg-surface p-3">
                                  <div className="text-xs text-muted">
                                    New
                                  </div>

                                  <div className="mt-1 font-display text-xl font-bold text-accent">
                                    {Number(
                                      plan.newProjection,
                                    ).toFixed(
                                      1,
                                    )}
                                  </div>
                                </div>

                                <div className="rounded-lg border border-border bg-surface p-3">
                                  <div className="text-xs text-muted">
                                    Gain
                                  </div>

                                  <div
                                    className={[
                                      "mt-1 font-display text-xl font-bold",

                                      plan.projectedGain >=
                                      0
                                        ? "text-success"
                                        : "text-danger",
                                    ].join(
                                      " ",
                                    )}
                                  >
                                    {plan.projectedGain >=
                                    0
                                      ? "+"
                                      : ""}
                                    {Number(
                                      plan.projectedGain,
                                    ).toFixed(
                                      1,
                                    )}
                                  </div>
                                </div>

                                <div className="rounded-lg border border-border bg-surface p-3">
                                  <div className="text-xs text-muted">
                                    Bank
                                    after
                                  </div>

                                  <div className="mt-1 font-display text-xl font-bold">
                                    £
                                    {Number(
                                      plan.bankAfter,
                                    ).toFixed(
                                      1,
                                    )}
                                    m
                                  </div>
                                </div>
                              </div>

                              {/* APPLY 2 TRANSFERS */}

                              <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
                                <div>
                                  <div className="text-xs text-muted">
                                    Apply this
                                    plan
                                  </div>

                                  <div className="mt-1 text-sm font-semibold">
                                    Replace
                                    both players
                                    and update
                                    My Team
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  disabled={
                                    applyingMultiPlanIndex !==
                                    null
                                  }
                                  onClick={() =>
                                    handleApplyTwoTransfers(
                                      plan,
                                      planIndex,
                                    )
                                  }
                                  className="primary-button disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {applyingMultiPlanIndex ===
                                  planIndex ? (
                                    <>
                                      <RefreshCw
                                        size={
                                          16
                                        }
                                        className="animate-spin"
                                      />

                                      Applying
                                      2
                                      Transfers...
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2
                                        size={
                                          16
                                        }
                                      />

                                      Apply 2
                                      Transfers
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-border p-8 text-center">
                        <AlertTriangle
                          size={
                            24
                          }
                          className="mx-auto text-warning"
                        />

                        <h4 className="mt-3 font-display text-xl font-bold">
                          No legal
                          plans found
                        </h4>

                        <p className="mt-2 text-sm text-muted">
                          PLStats
                          could not
                          find a valid
                          pair of
                          upgrades
                          within the
                          current
                          budget.
                        </p>
                      </div>
                    )}
                  </div>
                )}
            </div>
          </section>

          {/* TRANSFER HISTORY */}

          <TransferHistorySection
            history={
              transferHistory
            }
            onClear={
              handleClearHistory
            }
          />
        </>
      )}
    </main>
  );
}