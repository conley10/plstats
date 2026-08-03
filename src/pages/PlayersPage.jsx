import {
  ArrowDown,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router-dom";

import { getPlayers } from "../api/playersApi";

const sortOptions = [
  { value: "goals", label: "Goals" },
  { value: "assists", label: "Assists" },
  { value: "xg", label: "xG" },
  { value: "xa", label: "xA" },
  { value: "npxg", label: "npxG" },
  { value: "minutes", label: "Minutes" },
  { value: "appearances", label: "Apps" },
  { value: "name", label: "Name" },
];

function formatPosition(position) {
  if (!position || position === "Unknown") {
    return "—";
  }

  const value = position
    .toUpperCase()
    .trim();

  if (
    value === "GK" ||
    value.includes("GOALKEEPER")
  ) {
    return "GK";
  }

  if (
    value.startsWith("D") ||
    value.includes("DEFENDER") ||
    value.includes("DEFENCE") ||
    value.includes("BACK")
  ) {
    return "DF";
  }

  if (
    value.startsWith("M") ||
    value.includes("MIDFIELD")
  ) {
    return "MF";
  }

  if (
    value.startsWith("F") ||
    value.includes("STRIKER") ||
    value.includes("FORWARD") ||
    value.includes("WINGER")
  ) {
    return "FW";
  }

  return "—";
}

function formatDecimal(value) {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(Number(value))
  ) {
    return "—";
  }

  return Number(value).toFixed(1);
}

function formatWholeNumber(value) {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(Number(value))
  ) {
    return "—";
  }

  return Number(value).toLocaleString("en-AU");
}

export default function PlayersPage() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [selectedTeam, setSelectedTeam] =
    useState("all");
  const [selectedPosition, setSelectedPosition] =
    useState("all");
  const [sortBy, setSortBy] = useState("goals");

async function loadPlayers() {
  try {
    setLoading(true);
    setError("");

    const data = await getPlayers({
      limit: 100,
    });

    setPlayers(data.players || []);
  } catch (requestError) {
    console.error(
      "Unable to load players:",
      requestError,
    );

    setError(
      "Unable to load Premier League player data.",
    );
  } finally {
    setLoading(false);
  }
}

useEffect(() => {
  let cancelled = false;

  async function loadInitialPlayers() {
    try {
      const data = await getPlayers({
        limit: 100,
      });

      if (!cancelled) {
        setPlayers(data.players || []);
      }
    } catch (requestError) {
      console.error(
        "Unable to load players:",
        requestError,
      );

      if (!cancelled) {
        setError(
          "Unable to load Premier League player data.",
        );
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  }

  loadInitialPlayers();

  return () => {
    cancelled = true;
  };
}, []);

  const teams = useMemo(() => {
    const uniqueTeams = new Map();

    players.forEach((player) => {
      if (player.team?.id) {
        uniqueTeams.set(
          player.team.id,
          player.team,
        );
      }
    });

    return [...uniqueTeams.values()].sort(
      (a, b) => a.name.localeCompare(b.name),
    );
  }, [players]);

  const filteredPlayers = useMemo(() => {
    const searchValue = search
      .trim()
      .toLowerCase();

    return [...players]
      .filter((player) => {
        const playerName =
          player.name?.toLowerCase() || "";

        const teamName =
          player.team?.name?.toLowerCase() || "";

        const matchesSearch =
          !searchValue ||
          playerName.includes(searchValue) ||
          teamName.includes(searchValue);

        const matchesTeam =
          selectedTeam === "all" ||
          String(player.team?.id) === selectedTeam;

        const positionCode = formatPosition(
          player.position,
        );

        const matchesPosition =
          selectedPosition === "all" ||
          positionCode === selectedPosition;

        return (
          matchesSearch &&
          matchesTeam &&
          matchesPosition
        );
      })
      .sort((a, b) => {
        if (sortBy === "name") {
          return a.name.localeCompare(b.name);
        }

        const firstValue = Number(a[sortBy]) || 0;
        const secondValue = Number(b[sortBy]) || 0;

        if (secondValue !== firstValue) {
          return secondValue - firstValue;
        }

        return a.name.localeCompare(b.name);
      });
  }, [
    players,
    search,
    selectedTeam,
    selectedPosition,
    sortBy,
  ]);

  if (loading) {
    return (
      <main className="page-container">
        <div className="panel flex min-h-52 items-center justify-center">
          <div className="text-center">
            <RefreshCw
              size={24}
              className="mx-auto animate-spin text-accent"
            />

            <p className="mt-4 text-sm text-muted">
              Loading Premier League players...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page-container">
        <section className="panel p-8">
          <p className="section-label mb-3 text-danger">
            Connection error
          </p>

          <h1 className="text-xl font-bold text-white">
            Players could not be loaded
          </h1>

          <p className="mt-3 text-muted">
            {error}
          </p>

          <button
            type="button"
            onClick={loadPlayers}
            className="primary-button mt-6"
          >
            <RefreshCw size={16} />
            Try again
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="page-container">
      <section className="mb-7">
        <h1 className="page-heading">
          Players
        </h1>
      </section>

      <section className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-end">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="relative sm:col-span-2 lg:col-span-1">
            <span className="sr-only">
              Search players
            </span>

            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search players..."
              className="form-control pl-10"
            />
          </label>

          <select
            value={selectedPosition}
            onChange={(event) =>
              setSelectedPosition(
                event.target.value,
              )
            }
            className="form-control"
          >
            <option value="all">
              All Positions
            </option>
            <option value="FW">
              Forwards
            </option>
            <option value="MF">
              Midfielders
            </option>
            <option value="DF">
              Defenders
            </option>
            <option value="GK">
              Goalkeepers
            </option>
          </select>

          <select
            value={selectedTeam}
            onChange={(event) =>
              setSelectedTeam(event.target.value)
            }
            className="form-control"
          >
            <option value="all">
              All Teams
            </option>

            {teams.map((team) => (
              <option
                key={team.id}
                value={team.id}
              >
                {team.name}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(event) =>
              setSortBy(event.target.value)
            }
            className="form-control"
          >
            {sortOptions.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                Sort: {option.label}
              </option>
            ))}
          </select>
        </div>

        <p className="shrink-0 text-sm text-muted">
          {filteredPlayers.length} players
        </p>
      </section>

      <section className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Team</th>
              <th>Pos</th>

              <th className="text-right">
                Goals
                {sortBy === "goals" && (
                  <ArrowDown
                    size={13}
                    className="ml-1 inline"
                  />
                )}
              </th>

              <th className="text-right">
                Assists
              </th>

              <th className="text-right">
                xG
              </th>

              <th className="text-right">
                xA
              </th>

              <th className="text-right">
                npxG
              </th>

              <th className="text-right">
                Minutes
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredPlayers.map((player) => {
              const isOverperforming =
                player.xg !== null &&
                player.xg !== undefined &&
                player.goals - Number(player.xg) >= 3;

              return (
                <tr key={player.id}>
                  <td>
                    <Link
                      to={`/players/${player.id}`}
                      className="font-semibold text-white transition-colors hover:text-accent"
                    >
                      {player.name}
                    </Link>
                  </td>

                  <td>
                    <Link
                      to={`/teams/${player.team?.id}`}
                      className="inline-flex items-center gap-2 text-muted-light transition-colors hover:text-white"
                    >
                      {player.team?.crest && (
                        <img
                          src={player.team.crest}
                          alt=""
                          className="h-5 w-5 object-contain"
                        />
                      )}

                      <span>
                        {player.team?.name || "Unknown team"}
                      </span>
                    </Link>
                  </td>

                  <td className="text-muted">
                    {formatPosition(player.position)}
                  </td>

                  <td className="text-right">
                    <span
                      className={
                        isOverperforming
                          ? "rounded-md bg-accent-soft px-2 py-1 font-bold tabular-nums text-accent"
                          : "font-bold tabular-nums text-white"
                      }
                    >
                      {player.goals ?? 0}
                    </span>
                  </td>

                  <td className="text-right font-semibold tabular-nums text-white">
                    {player.assists ?? 0}
                  </td>

                  <td className="text-right tabular-nums text-muted-light">
                    {formatDecimal(player.xg)}
                  </td>

                  <td className="text-right tabular-nums text-muted-light">
                    {formatDecimal(player.xa)}
                  </td>

                  <td className="text-right tabular-nums text-muted-light">
                    {formatDecimal(player.npxg)}
                  </td>

                  <td className="text-right tabular-nums text-muted-light">
                    {formatWholeNumber(
                      player.minutes,
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredPlayers.length === 0 && (
          <div className="border-t border-border p-10 text-center">
            <p className="font-semibold text-white">
              No players found
            </p>

            <p className="mt-2 text-sm text-muted">
              Try changing the search or filters.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}