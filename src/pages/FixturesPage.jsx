import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  ChevronRight,
  Clock,
  RefreshCw,
  Search,
  Shield,
  Trophy,
} from "lucide-react";

import apiClient from "../api/client";

function formatDate(dateString) {
  if (!dateString) return "Date unavailable";

  return new Intl.DateTimeFormat("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateString));
}

function formatTime(dateString) {
  if (!dateString) return "TBC";

  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function getStatusLabel(status) {
  const labels = {
    SCHEDULED: "Scheduled",
    TIMED: "Upcoming",
    IN_PLAY: "Live",
    PAUSED: "Half Time",
    FINISHED: "Full Time",
    POSTPONED: "Postponed",
    SUSPENDED: "Suspended",
    CANCELLED: "Cancelled",
  };

  return labels[status] || status || "Unknown";
}

function getStatusStyles(status) {
  if (status === "IN_PLAY") {
    return "border-red-400/30 bg-red-400/10 text-red-300";
  }

  if (status === "FINISHED") {
    return "border-slate-400/20 bg-white/[0.05] text-slate-300";
  }

  if (status === "POSTPONED" || status === "CANCELLED") {
    return "border-amber-400/30 bg-amber-400/10 text-amber-300";
  }

  return "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";
}

function TeamRow({ team, score, winner }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border p-2 ${
            winner
              ? "border-emerald-400/30 bg-emerald-400/10"
              : "border-white/10 bg-white/[0.04]"
          }`}
        >
          {team?.crest ? (
            <img
              src={team.crest}
              alt={`${team.name} crest`}
              className="h-full w-full object-contain"
            />
          ) : (
            <Shield className="h-5 w-5 text-slate-500" />
          )}
        </div>

        <div className="min-w-0">
          <p
            className={`truncate font-semibold ${
              winner ? "text-emerald-300" : "text-white"
            }`}
          >
            {team?.name || "TBC"}
          </p>

          {team?.tla && (
            <p className="text-xs uppercase tracking-wider text-slate-500">
              {team.tla}
            </p>
          )}
        </div>
      </div>

      {score !== null && score !== undefined && (
        <span
          className={`text-2xl font-black ${
            winner ? "text-emerald-300" : "text-white"
          }`}
        >
          {score}
        </span>
      )}
    </div>
  );
}

function FixtureCard({ fixture }) {
  const homeScore = fixture.score?.fullTime?.home;
  const awayScore = fixture.score?.fullTime?.away;

  const hasScore =
    homeScore !== null &&
    homeScore !== undefined &&
    awayScore !== null &&
    awayScore !== undefined;

  const homeWinner = fixture.score?.winner === "HOME_TEAM";
  const awayWinner = fixture.score?.winner === "AWAY_TEAM";

  return (
    <Link
      to={`/fixtures/${fixture.id}`}
      className="group block rounded-3xl border border-white/10 bg-[#0b1728] p-5 shadow-lg shadow-black/10 transition duration-300 hover:-translate-y-1 hover:border-cyan-400/30 hover:shadow-cyan-950/30"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-300">
            {formatDate(fixture.utcDate)}
          </p>

          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatTime(fixture.utcDate)}</span>

            {fixture.matchday && (
              <>
                <span>•</span>
                <span>Matchday {fixture.matchday}</span>
              </>
            )}
          </div>
        </div>

        <span
          className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${getStatusStyles(
            fixture.status,
          )}`}
        >
          {getStatusLabel(fixture.status)}
        </span>
      </div>

      <div className="space-y-4">
        <TeamRow
          team={fixture.homeTeam}
          score={hasScore ? homeScore : null}
          winner={homeWinner}
        />

        <div className="h-px bg-white/10" />

        <TeamRow
          team={fixture.awayTeam}
          score={hasScore ? awayScore : null}
          winner={awayWinner}
        />
      </div>

      {!hasScore && (
        <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] py-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Upcoming fixture
        </div>
      )}

      <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
        <span className="text-xs text-slate-500">
          {fixture.competition?.name || "Premier League"}
        </span>

        <span className="flex items-center gap-1 text-sm font-semibold text-cyan-300 transition group-hover:gap-2">
          Match details
          <ChevronRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}

function FixturesPage() {
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [matchdayFilter, setMatchdayFilter] = useState("ALL");

  async function loadFixtures(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await apiClient.get("/fixtures");

      const payload = response.data;

      const fixtureList = Array.isArray(payload)
        ? payload
        : payload.fixtures ||
          payload.matches ||
          payload.data ||
          [];

      setFixtures(fixtureList);
    } catch (requestError) {
      console.error("Unable to load fixtures:", requestError);

      setError(
        requestError.response?.data?.error ||
          requestError.message ||
          "Fixtures could not be loaded.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

useEffect(() => {
  let cancelled = false;

  async function loadInitialFixtures() {
    try {
      const response = await apiClient.get("/fixtures");
      const payload = response.data;

      const fixtureList = Array.isArray(payload)
        ? payload
        : payload.fixtures ||
          payload.matches ||
          payload.data ||
          [];

      if (!cancelled) {
        setFixtures(fixtureList);
      }
    } catch (requestError) {
      console.error(
        "Unable to load fixtures:",
        requestError,
      );

      if (!cancelled) {
        setError(
          requestError.response?.data?.error ||
            requestError.message ||
            "Fixtures could not be loaded.",
        );
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  }

  loadInitialFixtures();

  return () => {
    cancelled = true;
  };
}, []);

  const matchdays = useMemo(() => {
    const values = fixtures
      .map((fixture) => fixture.matchday)
      .filter((matchday) => matchday !== null && matchday !== undefined);

    return [...new Set(values)].sort((a, b) => a - b);
  }, [fixtures]);

  const filteredFixtures = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return fixtures.filter((fixture) => {
      const homeTeam = fixture.homeTeam?.name?.toLowerCase() || "";
      const awayTeam = fixture.awayTeam?.name?.toLowerCase() || "";

      const matchesSearch =
        !searchTerm ||
        homeTeam.includes(searchTerm) ||
        awayTeam.includes(searchTerm);

      const matchesStatus =
        statusFilter === "ALL" ||
        fixture.status === statusFilter;

      const matchesMatchday =
        matchdayFilter === "ALL" ||
        String(fixture.matchday) === matchdayFilter;

      return matchesSearch && matchesStatus && matchesMatchday;
    });
  }, [fixtures, search, statusFilter, matchdayFilter]);

  const groupedFixtures = useMemo(() => {
    return filteredFixtures.reduce((groups, fixture) => {
      const dateKey = fixture.utcDate
        ? new Date(fixture.utcDate).toISOString().split("T")[0]
        : "unknown";

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }

      groups[dateKey].push(fixture);

      return groups;
    }, {});
  }, [filteredFixtures]);

  const sortedDateKeys = useMemo(() => {
    return Object.keys(groupedFixtures).sort((a, b) => {
      if (a === "unknown") return 1;
      if (b === "unknown") return -1;

      return new Date(a) - new Date(b);
    });
  }, [groupedFixtures]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07101f] px-5 py-12 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="animate-pulse">
            <div className="h-5 w-32 rounded bg-white/10" />
            <div className="mt-4 h-12 w-80 rounded bg-white/10" />
            <div className="mt-4 h-5 w-full max-w-xl rounded bg-white/10" />

            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-72 rounded-3xl border border-white/10 bg-white/[0.04]"
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07101f] px-5 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0b1728] px-6 py-10 sm:px-10">
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
                <Trophy className="h-3.5 w-3.5" />
                Premier League
              </div>

              <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                Fixtures & Results
              </h1>

              <p className="mt-4 max-w-2xl text-slate-400">
                Browse Premier League matches, upcoming fixtures and completed
                results. Select any match to view the full details.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadFixtures(true)}
              disabled={refreshing}
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-semibold text-white transition hover:border-cyan-400/30 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />
              {refreshing ? "Refreshing..." : "Refresh fixtures"}
            </button>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-white/10 bg-[#0b1728] p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
            <label className="relative block">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by team..."
                className="w-full rounded-xl border border-white/10 bg-[#07101f] py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/40"
              />
            </label>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-white/10 bg-[#07101f] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40"
            >
              <option value="ALL">All statuses</option>
              <option value="TIMED">Upcoming</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="IN_PLAY">Live</option>
              <option value="FINISHED">Finished</option>
              <option value="POSTPONED">Postponed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <select
              value={matchdayFilter}
              onChange={(event) => setMatchdayFilter(event.target.value)}
              className="rounded-xl border border-white/10 bg-[#07101f] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40"
            >
              <option value="ALL">All matchdays</option>

              {matchdays.map((matchday) => (
                <option key={matchday} value={String(matchday)}>
                  Matchday {matchday}
                </option>
              ))}
            </select>
          </div>
        </section>

        {error && (
          <section className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-6">
            <h2 className="font-bold text-red-200">
              Fixtures could not be loaded
            </h2>

            <p className="mt-2 text-sm text-red-100/70">{error}</p>

            <button
              type="button"
              onClick={() => loadFixtures()}
              className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950"
            >
              Try again
            </button>
          </section>
        )}

        {!error && filteredFixtures.length === 0 && (
          <section className="mt-6 rounded-3xl border border-white/10 bg-[#0b1728] p-12 text-center">
            <CalendarDays className="mx-auto h-10 w-10 text-slate-600" />

            <h2 className="mt-4 text-xl font-bold">
              No fixtures found
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Try changing your search or filters.
            </p>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("ALL");
                setMatchdayFilter("ALL");
              }}
              className="mt-5 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold transition hover:bg-white/10"
            >
              Clear filters
            </button>
          </section>
        )}

        {!error && filteredFixtures.length > 0 && (
          <div className="mt-8 space-y-10">
            {sortedDateKeys.map((dateKey) => {
              const dayFixtures = groupedFixtures[dateKey];

              return (
                <section key={dateKey}>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
                      <CalendarDays className="h-5 w-5 text-cyan-300" />
                    </div>

                    <div>
                      <h2 className="text-lg font-bold">
                        {dateKey === "unknown"
                          ? "Date unavailable"
                          : formatDate(dayFixtures[0]?.utcDate)}
                      </h2>

                      <p className="text-xs text-slate-500">
                        {dayFixtures.length}{" "}
                        {dayFixtures.length === 1 ? "match" : "matches"}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {dayFixtures.map((fixture) => (
                      <FixtureCard
                        key={fixture.id}
                        fixture={fixture}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

export default FixturesPage;