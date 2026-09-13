import {
  Activity,
  ArrowUpDown,
  Search,
  Sparkles,
  Target,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  getFantasyOverview,
  getFantasyPlayers,
} from "../api/fantasyApi";

function formatNumber(value) {
  return new Intl.NumberFormat("en-GB").format(
    Number(value || 0),
  );
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

function FantasyStatCard({
  icon: Icon,
  label,
  value,
  subtext,
}) {
  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="section-label">
          {label}
        </span>

        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-base">
          <Icon
            size={17}
            className="text-accent"
          />
        </div>
      </div>

      <div className="stat-number text-3xl">
        {value}
      </div>

      {subtext && (
        <p className="mt-2 text-xs text-muted">
          {subtext}
        </p>
      )}
    </div>
  );
}

function PlayerRow({ player, rank }) {
  return (
    <tr>
      <td className="w-12 text-muted">
        {rank}
      </td>

      <td>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-base font-display font-bold text-accent">
            {player.webName?.charAt(0)}
          </div>

          <div>
            <div className="font-semibold text-white">
              {player.webName}
            </div>

            <div className="mt-0.5 text-xs text-muted">
              {player.team?.shortName ||
                player.team?.name}
            </div>
          </div>
        </div>
      </td>

      <td>
        <span
          className={[
            "rounded-md px-2 py-1 text-xs font-bold",
            getPositionStyle(
              player.position?.shortName,
            ),
          ].join(" ")}
        >
          {player.position?.shortName}
        </span>
      </td>

      <td className="font-semibold">
        £{player.price.toFixed(1)}m
      </td>

      <td>
        <span className="font-display text-lg font-bold text-accent">
          {player.totalPoints}
        </span>
      </td>

      <td>{player.form.toFixed(1)}</td>

      <td>
        {player.selectedByPercent.toFixed(1)}%
      </td>

      <td>
        {player.expectedPoints.toFixed(1)}
      </td>

      <td>
        {player.expectedGoals.toFixed(2)}
      </td>

      <td>
        {player.expectedAssists.toFixed(2)}
      </td>
    </tr>
  );
}

export default function FantasyPage() {
  const [overview, setOverview] =
    useState(null);

  const [players, setPlayers] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [position, setPosition] =
    useState("");

  const [sort, setSort] =
    useState("points");

  useEffect(() => {
    async function loadFantasyData() {
      try {
        setLoading(true);
        setError("");

        const [
          overviewData,
          playerData,
        ] = await Promise.all([
          getFantasyOverview(),

          getFantasyPlayers({
            limit: 700,
          }),
        ]);

        setOverview(overviewData);

        setPlayers(
          playerData.players || [],
        );
      } catch (loadError) {
        console.error(loadError);

        setError(
          "Fantasy data could not be loaded. Make sure the PLStats backend is running.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadFantasyData();
  }, []);

  const filteredPlayers = useMemo(() => {
    const searchValue = search
      .trim()
      .toLowerCase();

    let result = [...players];

    if (searchValue) {
      result = result.filter((player) => {
        const playerName =
          player.name?.toLowerCase() || "";

        const webName =
          player.webName?.toLowerCase() || "";

        const teamName =
          player.team?.name?.toLowerCase() ||
          "";

        return (
          playerName.includes(searchValue) ||
          webName.includes(searchValue) ||
          teamName.includes(searchValue)
        );
      });
    }

    if (position) {
      result = result.filter(
        (player) =>
          player.position?.shortName ===
          position,
      );
    }

    switch (sort) {
      case "price":
        result.sort(
          (a, b) => b.price - a.price,
        );
        break;

      case "form":
        result.sort(
          (a, b) => b.form - a.form,
        );
        break;

      case "ownership":
        result.sort(
          (a, b) =>
            b.selectedByPercent -
            a.selectedByPercent,
        );
        break;

      case "expected":
        result.sort(
          (a, b) =>
            b.expectedPoints -
            a.expectedPoints,
        );
        break;

      case "points":
      default:
        result.sort(
          (a, b) =>
            b.totalPoints -
            a.totalPoints,
        );
        break;
    }

    return result;
  }, [
    players,
    search,
    position,
    sort,
  ]);

  const highestOwnedPlayer =
    players.length > 0
      ? [...players].sort(
          (a, b) =>
            b.selectedByPercent -
            a.selectedByPercent,
        )[0]
      : null;

  const highestFormPlayer =
    players.length > 0
      ? [...players].sort(
          (a, b) =>
            b.form - a.form,
        )[0]
      : null;

  return (
    <main className="page-container animate-fade-in">
      <section className="mb-8 overflow-hidden rounded-xl border border-border bg-surface p-6 shadow-panel md:p-8">
        <div className="max-w-3xl">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles
              size={16}
              className="text-accent"
            />

            <span className="section-label">
              PLStats Fantasy
            </span>
          </div>

          <h1 className="page-heading text-gradient">
            Fantasy Intelligence
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-light">
            Analyse Fantasy Premier League
            players using current prices,
            points, form, ownership and
            expected performance. Prediction
            models and squad optimisation will
            be added to this dashboard next.
          </p>

          {overview?.currentGameweek && (
            <div className="mt-5 inline-flex items-center gap-2 rounded-lg border border-border bg-base px-3 py-2 text-sm">
              <Activity
                size={15}
                className="text-success"
              />

              <span className="text-muted">
                Current:
              </span>

              <span className="font-semibold">
                GW
                {
                  overview.currentGameweek
                    .id
                }
              </span>
            </div>
          )}
        </div>
      </section>

      <div className="mt-5 flex flex-wrap gap-3">
  <Link
    to="/fantasy/predictor"
    className="primary-button"
  >
    View Gameweek Predictor
  </Link>

  <Link
    to="/fantasy/my-team"
    className="secondary-button"
  >
    Build My Team
  </Link>
</div>

      {error && (
        <div className="mb-6 rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FantasyStatCard
          icon={Users}
          label="FPL players"
          value={
            loading
              ? "—"
              : formatNumber(
                  overview?.totalPlayers,
                )
          }
          subtext="Available Premier League players"
        />

        <FantasyStatCard
          icon={Trophy}
          label="Managers"
          value={
            loading
              ? "—"
              : formatNumber(
                  overview?.totalManagers,
                )
          }
          subtext="Active FPL managers"
        />

        <FantasyStatCard
          icon={Target}
          label="Best form"
          value={
            loading
              ? "—"
              : highestFormPlayer?.webName ||
                "—"
          }
          subtext={
            highestFormPlayer
              ? `${highestFormPlayer.form.toFixed(
                  1,
                )} form`
              : ""
          }
        />

        <FantasyStatCard
          icon={Wallet}
          label="Most owned"
          value={
            loading
              ? "—"
              : highestOwnedPlayer?.webName ||
                "—"
          }
          subtext={
            highestOwnedPlayer
              ? `${highestOwnedPlayer.selectedByPercent.toFixed(
                  1,
                )}% ownership`
              : ""
          }
        />
      </section>

      <section className="panel">
        <div className="border-b border-border p-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <span className="section-label">
                Player Database
              </span>

              <h2 className="mt-1 font-display text-2xl font-bold">
                FPL Players
              </h2>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
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
                  placeholder="Search player..."
                  className="form-control min-w-[220px] pl-9"
                />
              </div>

              <select
                value={position}
                onChange={(event) =>
                  setPosition(
                    event.target.value,
                  )
                }
                className="form-control sm:w-36"
              >
                <option value="">
                  All positions
                </option>

                <option value="GKP">
                  Goalkeeper
                </option>

                <option value="DEF">
                  Defender
                </option>

                <option value="MID">
                  Midfielder
                </option>

                <option value="FWD">
                  Forward
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
                  className="form-control pl-9 sm:w-44"
                >
                  <option value="points">
                    Total points
                  </option>

                  <option value="form">
                    Form
                  </option>

                  <option value="expected">
                    Expected points
                  </option>

                  <option value="ownership">
                    Ownership
                  </option>

                  <option value="price">
                    Price
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-muted">
            Loading Fantasy data...
          </div>
        ) : (
          <div className="table-container rounded-none border-0 shadow-none">
            <table className="data-table min-w-[1100px]">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Player</th>
                  <th>Pos</th>
                  <th>Price</th>
                  <th>Pts</th>
                  <th>Form</th>
                  <th>Owned</th>
                  <th>xPts</th>
                  <th>xG</th>
                  <th>xA</th>
                </tr>
              </thead>

              <tbody>
                {filteredPlayers
                  .slice(0, 100)
                  .map(
                    (
                      player,
                      index,
                    ) => (
                      <PlayerRow
                        key={player.id}
                        player={player}
                        rank={
                          index + 1
                        }
                      />
                    ),
                  )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && (
          <div className="border-t border-border px-5 py-3 text-xs text-muted">
            Showing{" "}
            {Math.min(
              filteredPlayers.length,
              100,
            )}{" "}
            of{" "}
            {filteredPlayers.length} players
          </div>
        )}
      </section>
    </main>
  );
}