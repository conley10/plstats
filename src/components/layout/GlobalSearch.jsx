import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  GitCompareArrows,
  Loader2,
  Search,
  Shield,
  Trophy,
  UserRound,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";

import { getPlayers } from "../../api/playersApi";
import { getTeams } from "../../api/teamsApi";

const STATIC_PAGES = [
  {
    id: "players",
    type: "page",
    label: "Player Statistics",
    description: "Browse Premier League player data",
    path: "/players",
    icon: UserRound,
    keywords: ["players", "player stats", "goals", "assists", "xg"],
  },
  {
    id: "compare-players",
    type: "page",
    label: "Compare Players",
    description: "Compare two players side by side",
    path: "/players/compare",
    icon: GitCompareArrows,
    keywords: ["compare players", "player comparison"],
  },
  {
    id: "teams",
    type: "page",
    label: "Teams",
    description: "Browse Premier League clubs",
    path: "/teams",
    icon: Shield,
    keywords: ["teams", "clubs", "team stats"],
  },
  {
    id: "team-stats",
    type: "page",
    label: "Team Statistics",
    description: "Analyse club performance",
    path: "/teams/stats",
    icon: BarChart3,
    keywords: ["team statistics", "club stats", "analytics"],
  },
  {
    id: "compare-teams",
    type: "page",
    label: "Compare Teams",
    description: "Compare two Premier League clubs",
    path: "/teams/compare",
    icon: GitCompareArrows,
    keywords: ["compare teams", "team comparison"],
  },
  {
    id: "table",
    type: "page",
    label: "League Table",
    description: "View the current standings",
    path: "/table",
    icon: Trophy,
    keywords: ["league table", "standings", "position"],
  },
  {
    id: "fixtures",
    type: "page",
    label: "Fixtures",
    description: "View Premier League matches",
    path: "/fixtures",
    icon: CalendarDays,
    keywords: ["fixtures", "matches", "schedule"],
  },
  {
    id: "understat",
    type: "page",
    label: "Understat Analytics",
    description: "Explore expected-goal statistics",
    path: "/understat",
    icon: BarChart3,
    keywords: ["understat", "expected goals", "xg", "xa"],
  },
];

function normalizeCollection(payload, candidateKeys = []) {
  if (Array.isArray(payload)) return payload;

  for (const key of candidateKeys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }

  return [];
}

function getPlayerId(player) {
  return player?.id ?? player?.playerId;
}

function getTeamId(team) {
  return team?.id ?? team?.teamId;
}

function searchableText(...values) {
  return values
    .flat()
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesQuery(text, query) {
  const terms = query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return terms.every((term) => text.includes(term));
}

function resultKey(result) {
  return `${result.type}-${result.id}`;
}

function ResultIcon({ result }) {
  if (result.image) {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-black/20">
        <img
          src={result.image}
          alt=""
          className="h-9 w-9 object-contain"
        />
      </div>
    );
  }

  const Icon =
    result.icon ||
    (result.type === "player"
      ? UserRound
      : result.type === "team"
        ? Shield
        : Search);

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-black/20">
      <Icon size={20} className="text-accent" />
    </div>
  );
}

function SearchResult({
  result,
  active,
  onMouseEnter,
  onSelect,
}) {
  return (
    <button
      type="button"
      onMouseEnter={onMouseEnter}
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
        active
          ? "bg-accent-soft ring-1 ring-accent/40"
          : "hover:bg-white/[0.04]"
      }`}
    >
      <ResultIcon result={result} />

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-white">
          {result.label}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted">
          {result.description}
        </p>
      </div>

      <span className="hidden rounded-md border border-border px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted sm:inline-flex">
        {result.type}
      </span>

      <ArrowRight
        size={16}
        className={active ? "text-accent" : "text-muted"}
      />
    </button>
  );
}

export default function GlobalSearch({
  compact = false,
  className = "",
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setOpen(false);
    setQuery("");
  }, [location.pathname, location.search]);

  useEffect(() => {
    function handleShortcut(event) {
      const target = event.target;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;

      if (
        event.key === "/" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isTyping
      ) {
        event.preventDefault();
        setOpen(true);
      }

      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        setOpen(true);
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 30);

    function closeOnEscape(event) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open || loaded) return;

    let cancelled = false;

    async function loadSearchData() {
      setLoadingData(true);
      setLoadError("");

      try {
        const [playersResult, teamsResult] =
          await Promise.allSettled([
            getPlayers({ limit: 100 }),
            getTeams(),
          ]);

        if (cancelled) return;

        if (playersResult.status === "fulfilled") {
          setPlayers(
            normalizeCollection(playersResult.value, [
              "players",
              "data",
              "results",
            ]),
          );
        } else {
          console.error(
            "Player search request failed:",
            playersResult.reason,
          );
        }

        if (teamsResult.status === "fulfilled") {
          setTeams(
            normalizeCollection(teamsResult.value, [
              "teams",
              "table",
              "standings",
              "data",
              "results",
            ]),
          );
        } else {
          console.error(
            "Team search request failed:",
            teamsResult.reason,
          );
        }

        if (
          playersResult.status === "rejected" &&
          teamsResult.status === "rejected"
        ) {
          setLoadError(
            "Player and team results could not be loaded.",
          );
        }

        setLoaded(true);
      } catch (error) {
        console.error(
          "Unable to load global search data:",
          error,
        );

        if (!cancelled) {
          setLoadError(
            "Player and team results could not be loaded.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingData(false);
        }
      }
    }

    loadSearchData();

    return () => {
      cancelled = true;
    };
  }, [open, loaded]);

  const results = useMemo(() => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return STATIC_PAGES.slice(0, 6);
    }

    const playerResults = players
      .filter((player) =>
        matchesQuery(
          searchableText(
            player.name,
            player.playerName,
            player.position,
            player.nationality,
            player.team?.name,
            player.team?.shortName,
            player.teamName,
          ),
          trimmedQuery,
        ),
      )
      .slice(0, 6)
      .map((player) => ({
        id: getPlayerId(player),
        type: "player",
        label:
          player.name ||
          player.playerName ||
          "Unknown player",
        description: [
          player.team?.shortName ||
            player.team?.name ||
            player.teamName,
          player.position,
        ]
          .filter(Boolean)
          .join(" • ") || "Premier League player",
        image:
          player.photo ||
          player.image ||
          player.team?.crest ||
          player.teamCrest,
        path: `/players/${getPlayerId(player)}`,
      }))
      .filter((result) => result.id !== undefined);

    const teamResults = teams
      .filter((team) =>
        matchesQuery(
          searchableText(
            team.name,
            team.shortName,
            team.tla,
            team.venue,
            team.coach?.name,
          ),
          trimmedQuery,
        ),
      )
      .slice(0, 5)
      .map((team) => ({
        id: getTeamId(team),
        type: "team",
        label: team.shortName || team.name || "Unknown team",
        description: [
          team.name !== team.shortName ? team.name : null,
          team.position ? `League position ${team.position}` : null,
        ]
          .filter(Boolean)
          .join(" • ") || "Premier League club",
        image: team.crest || team.logo,
        path: `/teams/${getTeamId(team)}`,
      }))
      .filter((result) => result.id !== undefined);

    const pageResults = STATIC_PAGES.filter((page) =>
      matchesQuery(
        searchableText(
          page.label,
          page.description,
          page.keywords,
        ),
        trimmedQuery,
      ),
    ).slice(0, 4);

    return [...playerResults, ...teamResults, ...pageResults].slice(
      0,
      12,
    );
  }, [players, teams, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function selectResult(result) {
    if (!result?.path) return;

    navigate(result.path);
    setOpen(false);
    setQuery("");
  }

  function handleKeyDown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        Math.min(current + 1, Math.max(results.length - 1, 0)),
      );
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    }

    if (event.key === "Enter" && results[activeIndex]) {
      event.preventDefault();
      selectResult(results[activeIndex]);
    }
  }

  const trigger = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={`inline-flex items-center border border-border bg-panel text-muted-light transition-colors hover:border-accent/50 hover:text-white ${
        compact
          ? "h-10 w-10 justify-center rounded-lg"
          : "min-w-48 justify-between gap-3 rounded-xl px-4 py-2.5"
      } ${className}`}
      aria-label="Search PLSTATS"
    >
      <span className="flex items-center gap-2">
        <Search size={17} />
        {!compact && (
          <span className="text-sm">Search PLSTATS</span>
        )}
      </span>

      {!compact && (
        <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-bold text-muted">
          /
        </span>
      )}
    </button>
  );

  if (typeof document === "undefined") return trigger;

  return (
    <>
      {trigger}

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] bg-black/75 px-4 py-8 backdrop-blur-sm sm:py-16"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setOpen(false);
              }
            }}
          >
            <section className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-border bg-panel shadow-2xl">
              <div className="flex items-center gap-3 border-b border-border px-4">
                <Search size={20} className="shrink-0 text-accent" />

                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) =>
                    setQuery(event.target.value)
                  }
                  onKeyDown={handleKeyDown}
                  placeholder="Search players, teams and pages..."
                  className="h-16 min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-muted"
                />

                {loadingData && (
                  <Loader2
                    size={18}
                    className="animate-spin text-accent"
                  />
                )}

                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="rounded-lg p-2 text-muted transition-colors hover:bg-white/5 hover:text-white"
                    aria-label="Clear search"
                  >
                    <X size={17} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-border px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted transition-colors hover:text-white"
                >
                  Esc
                </button>
              </div>

              <div className="max-h-[65vh] overflow-y-auto p-3">
                {!query.trim() && (
                  <p className="px-3 pb-2 pt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
                    Quick access
                  </p>
                )}

                {query.trim() && results.length > 0 && (
                  <p className="px-3 pb-2 pt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
                    Search results
                  </p>
                )}

                {results.map((result, index) => (
                  <SearchResult
                    key={resultKey(result)}
                    result={result}
                    active={index === activeIndex}
                    onMouseEnter={() => setActiveIndex(index)}
                    onSelect={() => selectResult(result)}
                  />
                ))}

                {!loadingData &&
                  query.trim() &&
                  results.length === 0 && (
                    <div className="px-6 py-12 text-center">
                      <Search
                        size={30}
                        className="mx-auto text-muted"
                      />
                      <h2 className="mt-4 font-bold text-white">
                        No matching results
                      </h2>
                      <p className="mt-2 text-sm text-muted">
                        Try a player name, club or page.
                      </p>
                    </div>
                  )}

                {loadError && (
                  <div className="mx-3 mt-3 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] p-4">
                    <p className="text-sm text-amber-200">
                      {loadError} Page links are still available.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setLoaded(false);
                        setLoadError("");
                      }}
                      className="mt-2 text-xs font-bold text-accent hover:underline"
                    >
                      Retry loading data
                    </button>
                  </div>
                )}
              </div>

              <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-[11px] text-muted">
                <span>
                  Use ↑ ↓ to navigate and Enter to open
                </span>
                <span>Press / or Ctrl K from anywhere</span>
              </footer>
            </section>
          </div>,
          document.body,
        )}
    </>
  );
}