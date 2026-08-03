import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Flag,
  Shield,
  Trophy,
  UserRound,
} from "lucide-react";

import apiClient from "../api/client";

function formatMatchDate(dateString) {
  if (!dateString) return "Date unavailable";

  return new Intl.DateTimeFormat("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateString));
}

function formatShortDate(dateString) {
  if (!dateString) return "Date unavailable";

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateString));
}

function formatMatchTime(dateString) {
  if (!dateString) return "Time unavailable";

  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function getStatusLabel(status) {
  const statusLabels = {
    SCHEDULED: "Scheduled",
    TIMED: "Upcoming",
    IN_PLAY: "Live",
    PAUSED: "Half Time",
    FINISHED: "Full Time",
    POSTPONED: "Postponed",
    SUSPENDED: "Suspended",
    CANCELLED: "Cancelled",
  };

  return statusLabels[status] || status || "Unknown";
}

function TeamDisplay({ team, score, winner }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center text-center">
      <Link
        to={team?.id ? `/teams/${team.id}` : "#"}
        className={`mb-5 flex h-28 w-28 items-center justify-center rounded-3xl border p-5 transition ${
          winner
            ? "border-emerald-400/40 bg-emerald-400/10"
            : "border-white/10 bg-white/[0.04]"
        } ${
          team?.id
            ? "hover:-translate-y-1 hover:border-cyan-400/40"
            : "pointer-events-none"
        }`}
      >
        {team?.crest ? (
          <img
            src={team.crest}
            alt={`${team.name} crest`}
            className="h-full w-full object-contain"
          />
        ) : (
          <Shield className="h-14 w-14 text-slate-500" />
        )}
      </Link>

      {team?.id ? (
        <Link
          to={`/teams/${team.id}`}
          className="max-w-xs text-xl font-bold text-white transition hover:text-cyan-300 sm:text-2xl"
        >
          {team?.name || "TBC"}
        </Link>
      ) : (
        <h2 className="max-w-xs text-xl font-bold text-white sm:text-2xl">
          {team?.name || "TBC"}
        </h2>
      )}

      {score !== null && score !== undefined && (
        <p className="mt-4 text-5xl font-black text-white sm:text-6xl">
          {score}
        </p>
      )}

      {winner && (
        <span className="mt-4 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-300">
          Winner
        </span>
      )}
    </div>
  );
}

function FormDisplay({ form = [] }) {
  if (!form.length) {
    return <p className="text-sm text-slate-500">Recent form is unavailable.</p>;
  }

  const resultStyles = {
    W: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    D: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    L: "border-red-400/30 bg-red-400/10 text-red-300",
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {form.map((result, index) => (
        <span
          key={`${result}-${index}`}
          title={result === "W" ? "Win" : result === "D" ? "Draw" : "Loss"}
          className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-black ${
            resultStyles[result] ||
            "border-white/10 bg-white/[0.05] text-slate-300"
          }`}
        >
          {result}
        </span>
      ))}
    </div>
  );
}

function FormCard({ team, form }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#0b1728] p-6">
      <div className="flex items-center gap-4">
        <Link
          to={team?.id ? `/teams/${team.id}` : "#"}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] p-2 transition ${
            team?.id ? "hover:border-cyan-400/30" : "pointer-events-none"
          }`}
        >
          {team?.crest ? (
            <img
              src={team.crest}
              alt={`${team.name} crest`}
              className="h-full w-full object-contain"
            />
          ) : (
            <Shield className="h-6 w-6 text-slate-500" />
          )}
        </Link>

        <div className="min-w-0">
          <p className="text-sm text-slate-500">Last five matches</p>
          <Link
            to={team?.id ? `/teams/${team.id}` : "#"}
            className={`block truncate font-bold text-white transition ${
              team?.id ? "hover:text-cyan-300" : "pointer-events-none"
            }`}
          >
            {team?.name || "Team"}
          </Link>
        </div>
      </div>

      <div className="mt-5">
        <FormDisplay form={form} />
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span><strong className="text-emerald-300">W</strong> Win</span>
        <span><strong className="text-amber-300">D</strong> Draw</span>
        <span><strong className="text-red-300">L</strong> Loss</span>
      </div>
    </article>
  );
}

function SummaryTeam({ team, wins, goals }) {
  return (
    <div className="flex flex-1 flex-col items-center text-center">
      <Link
        to={team?.id ? `/teams/${team.id}` : "#"}
        className={team?.id ? "transition hover:scale-105" : "pointer-events-none"}
      >
        {team?.crest ? (
          <img
            src={team.crest}
            alt={`${team.name} crest`}
            className="h-16 w-16 object-contain"
          />
        ) : (
          <Shield className="h-16 w-16 text-slate-500" />
        )}
      </Link>
      <p className="mt-3 max-w-48 font-bold text-white">{team?.shortName || team?.name}</p>
      <p className="mt-4 text-4xl font-black text-white">{wins ?? 0}</p>
      <p className="text-xs uppercase tracking-wider text-slate-500">Wins</p>
      <p className="mt-3 text-sm text-slate-400">{goals ?? 0} goals</p>
    </div>
  );
}

function HeadToHeadSection({ data, loading, error }) {
  if (loading) {
    return (
      <section className="mt-10 animate-pulse">
        <div className="h-7 w-52 rounded bg-white/10" />
        <div className="mt-5 h-80 rounded-3xl border border-white/10 bg-white/[0.04]" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="mt-10">
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-5 py-4 text-sm text-amber-200">
          {error}
        </div>
      </section>
    );
  }

  if (!data) return null;

  const { teamOne, teamTwo, summary, matches = [] } = data;

  return (
    <section className="mt-10">
      <div className="mb-5">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
          Head to head
        </p>
        <h2 className="mt-2 text-2xl font-black text-white">Previous meetings</h2>
        <p className="mt-2 text-sm text-slate-400">
          A comparison of recent Premier League meetings between both clubs.
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b1728]">
        <div className="grid items-center gap-6 border-b border-white/10 bg-gradient-to-r from-cyan-400/5 via-transparent to-violet-400/5 px-6 py-8 sm:grid-cols-[1fr_auto_1fr] sm:px-10">
          <SummaryTeam
            team={teamOne}
            wins={summary?.teamOneWins}
            goals={summary?.teamOneGoals}
          />

          <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/[0.03] px-7 py-5 text-center">
            <p className="text-4xl font-black text-white">{summary?.draws ?? 0}</p>
            <p className="mt-1 text-xs uppercase tracking-wider text-slate-500">Draws</p>
            <p className="mt-4 text-sm text-slate-400">
              {summary?.played ?? 0} meetings found
            </p>
          </div>

          <SummaryTeam
            team={teamTwo}
            wins={summary?.teamTwoWins}
            goals={summary?.teamTwoGoals}
          />
        </div>

        <div className="p-6 sm:p-8">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10">
              <Trophy className="h-5 w-5 text-cyan-300" />
            </div>
            <div>
              <h3 className="font-bold text-white">Latest meetings</h3>
              <p className="text-sm text-slate-500">Most recent first</p>
            </div>
          </div>

          {matches.length ? (
            <div className="space-y-3">
              {matches.map((match) => {
                const homeScore = match.score?.fullTime?.home;
                const awayScore = match.score?.fullTime?.away;

                return (
                  <Link
                    key={match.id}
                    to={`/fixtures/${match.id}`}
                    className="grid items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-4 transition hover:border-cyan-400/30 hover:bg-white/[0.045] sm:grid-cols-[150px_1fr_auto_1fr]"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-300">
                        {formatShortDate(match.utcDate)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {match.competition?.name || "Premier League"}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 sm:justify-end">
                      <span className="text-sm font-semibold text-white">
                        {match.homeTeam?.shortName || match.homeTeam?.name}
                      </span>
                      {match.homeTeam?.crest && (
                        <img
                          src={match.homeTeam.crest}
                          alt=""
                          className="h-8 w-8 object-contain"
                        />
                      )}
                    </div>

                    <div className="rounded-xl border border-white/10 bg-[#07101f] px-4 py-2 text-center text-lg font-black text-white">
                      {homeScore ?? "–"} <span className="text-slate-600">:</span> {awayScore ?? "–"}
                    </div>

                    <div className="flex items-center gap-3">
                      {match.awayTeam?.crest && (
                        <img
                          src={match.awayTeam.crest}
                          alt=""
                          className="h-8 w-8 object-contain"
                        />
                      )}
                      <span className="text-sm font-semibold text-white">
                        {match.awayTeam?.shortName || match.awayTeam?.name}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="rounded-2xl border border-white/10 bg-white/[0.025] px-5 py-8 text-center text-sm text-slate-500">
              No previous meetings were found.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function MatchDetailPage() {
  const { fixtureId } = useParams();

  const [fixture, setFixture] = useState(null);
  const [homeForm, setHomeForm] = useState([]);
  const [awayForm, setAwayForm] = useState([]);
  const [headToHead, setHeadToHead] = useState(null);

  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [headToHeadLoading, setHeadToHeadLoading] = useState(false);

  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [headToHeadError, setHeadToHeadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadFixture() {
      try {
        setLoading(true);
        setError("");
        setFormError("");
        setHeadToHeadError("");
        setHomeForm([]);
        setAwayForm([]);
        setHeadToHead(null);

        const fixtureResponse = await apiClient.get(`/fixtures/${fixtureId}`);
        const fixtureData = fixtureResponse.data;

        if (cancelled) return;

        setFixture(fixtureData);
        setLoading(false);

        const homeTeamId = fixtureData.homeTeam?.id;
        const awayTeamId = fixtureData.awayTeam?.id;

        if (!homeTeamId || !awayTeamId) {
          setFormError("Recent form could not be loaded because team information is incomplete.");
          setHeadToHeadError("Head-to-head history could not be loaded because team information is incomplete.");
          return;
        }

        setFormLoading(true);
        setHeadToHeadLoading(true);

        const [teamsResult, headToHeadResult] = await Promise.allSettled([
          apiClient.get("/teams"),
          apiClient.get(`/teams/${homeTeamId}/headtohead/${awayTeamId}`, {
            params: { history: 5, limit: 5 },
          }),
        ]);

        if (cancelled) return;

        if (teamsResult.status === "fulfilled") {
          const teams = teamsResult.value.data?.teams || [];
          const homeTeamData = teams.find(
            (team) => Number(team.id) === Number(homeTeamId),
          );
          const awayTeamData = teams.find(
            (team) => Number(team.id) === Number(awayTeamId),
          );

          setHomeForm(homeTeamData?.recentForm || []);
          setAwayForm(awayTeamData?.recentForm || []);

          if (!homeTeamData || !awayTeamData) {
            setFormError("Some recent form information could not be found.");
          }
        } else {
          console.error("Unable to load recent form:", teamsResult.reason);
          setFormError("Recent form information could not be loaded.");
        }

        if (headToHeadResult.status === "fulfilled") {
          setHeadToHead(headToHeadResult.value.data);
        } else {
          console.error("Unable to load head-to-head history:", headToHeadResult.reason);
          setHeadToHeadError(
            headToHeadResult.reason?.response?.data?.error ||
              "Head-to-head history could not be loaded.",
          );
        }
      } catch (requestError) {
        console.error("Unable to load fixture:", requestError);

        if (!cancelled) {
          setError(
            requestError.response?.data?.error ||
              "This match could not be loaded.",
          );
          setLoading(false);
        }
      } finally {
        if (!cancelled) {
          setFormLoading(false);
          setHeadToHeadLoading(false);
        }
      }
    }

    loadFixture();

    return () => {
      cancelled = true;
    };
  }, [fixtureId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07101f] px-5 py-12 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="animate-pulse space-y-6">
            <div className="h-5 w-32 rounded bg-white/10" />
            <div className="h-96 rounded-3xl bg-white/[0.05]" />
            <div className="grid gap-5 md:grid-cols-3">
              <div className="h-36 rounded-2xl bg-white/[0.05]" />
              <div className="h-36 rounded-2xl bg-white/[0.05]" />
              <div className="h-36 rounded-2xl bg-white/[0.05]" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !fixture) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07101f] px-5 text-white">
        <div className="max-w-lg rounded-3xl border border-red-400/20 bg-red-400/10 p-8 text-center">
          <h1 className="text-2xl font-bold">Match unavailable</h1>
          <p className="mt-3 text-red-100/70">
            {error || "The requested fixture could not be found."}
          </p>
          <Link
            to="/fixtures"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to fixtures
          </Link>
        </div>
      </main>
    );
  }

  const homeScore = fixture.score?.fullTime?.home;
  const awayScore = fixture.score?.fullTime?.away;
  const hasScore =
    homeScore !== null &&
    homeScore !== undefined &&
    awayScore !== null &&
    awayScore !== undefined;
  const homeWinner = fixture.score?.winner === "HOME_TEAM";
  const awayWinner = fixture.score?.winner === "AWAY_TEAM";
  const referee = fixture.referees?.[0];

  return (
    <main className="min-h-screen bg-[#07101f] px-5 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/fixtures"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to fixtures
        </Link>

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b1728] shadow-2xl shadow-black/20">
          <div className="border-b border-white/10 bg-gradient-to-r from-cyan-400/10 via-transparent to-violet-400/10 px-6 py-5 sm:px-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {fixture.competition?.emblem ? (
                  <img
                    src={fixture.competition.emblem}
                    alt={`${fixture.competition.name} emblem`}
                    className="h-10 w-10 object-contain"
                  />
                ) : (
                  <Trophy className="h-8 w-8 text-cyan-300" />
                )}
                <div>
                  <p className="text-sm text-slate-400">Competition</p>
                  <h1 className="font-bold text-white">
                    {fixture.competition?.name || "Premier League"}
                  </h1>
                </div>
              </div>

              <span
                className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider ${
                  fixture.status === "IN_PLAY"
                    ? "border-red-400/30 bg-red-400/10 text-red-300"
                    : fixture.status === "FINISHED"
                      ? "border-slate-400/20 bg-white/[0.05] text-slate-300"
                      : "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
                }`}
              >
                {getStatusLabel(fixture.status)}
              </span>
            </div>
          </div>

          <div className="px-5 py-10 sm:px-10 sm:py-14">
            <div className="mb-10 flex flex-wrap justify-center gap-x-7 gap-y-3 text-sm text-slate-400">
              <span className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-cyan-300" />
                {formatMatchDate(fixture.utcDate)}
              </span>
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-300" />
                {formatMatchTime(fixture.utcDate)}
              </span>
              {fixture.matchday && (
                <span className="flex items-center gap-2">
                  <Flag className="h-4 w-4 text-cyan-300" />
                  Matchday {fixture.matchday}
                </span>
              )}
            </div>

            <div className="flex items-center justify-center gap-4 sm:gap-10">
              <TeamDisplay
                team={fixture.homeTeam}
                score={hasScore ? homeScore : null}
                winner={homeWinner}
              />

              <div className="flex shrink-0 flex-col items-center">
                <span className="text-sm font-bold uppercase tracking-[0.3em] text-slate-500">
                  {hasScore ? "Score" : "Versus"}
                </span>
                {!hasScore && (
                  <span className="mt-3 text-3xl font-black text-slate-400">VS</span>
                )}
              </div>

              <TeamDisplay
                team={fixture.awayTeam}
                score={hasScore ? awayScore : null}
                winner={awayWinner}
              />
            </div>

            {fixture.score?.halfTime?.home !== null &&
              fixture.score?.halfTime?.home !== undefined && (
                <p className="mt-10 text-center text-sm text-slate-400">
                  Half time: {fixture.score.halfTime.home}–{fixture.score.halfTime.away}
                </p>
              )}
          </div>
        </section>

        <section className="mt-6 grid gap-5 md:grid-cols-3">
          <article className="rounded-2xl border border-white/10 bg-[#0b1728] p-6">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10">
              <CalendarDays className="h-5 w-5 text-cyan-300" />
            </div>
            <p className="text-sm text-slate-500">Kick-off</p>
            <p className="mt-1 font-semibold text-white">{formatMatchDate(fixture.utcDate)}</p>
            <p className="mt-1 text-sm text-slate-400">{formatMatchTime(fixture.utcDate)}</p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-[#0b1728] p-6">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-400/10">
              <Trophy className="h-5 w-5 text-violet-300" />
            </div>
            <p className="text-sm text-slate-500">Competition</p>
            <p className="mt-1 font-semibold text-white">
              {fixture.competition?.name || "Premier League"}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {fixture.matchday ? `Matchday ${fixture.matchday}` : fixture.stage || "Regular season"}
            </p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-[#0b1728] p-6">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-400/10">
              <UserRound className="h-5 w-5 text-emerald-300" />
            </div>
            <p className="text-sm text-slate-500">Referee</p>
            <p className="mt-1 font-semibold text-white">
              {referee?.name || "Not announced"}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {referee?.nationality || "Details unavailable"}
            </p>
          </article>
        </section>

        <section className="mt-10">
          <div className="mb-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Team form</p>
            <h2 className="mt-2 text-2xl font-black text-white">Recent results</h2>
            <p className="mt-2 text-sm text-slate-400">
              The latest five Premier League results for each team.
            </p>
          </div>

          {formLoading ? (
            <div className="grid animate-pulse gap-5 md:grid-cols-2">
              <div className="h-44 rounded-2xl border border-white/10 bg-white/[0.04]" />
              <div className="h-44 rounded-2xl border border-white/10 bg-white/[0.04]" />
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              <FormCard team={fixture.homeTeam} form={homeForm} />
              <FormCard team={fixture.awayTeam} form={awayForm} />
            </div>
          )}

          {formError && !formLoading && (
            <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
              {formError}
            </p>
          )}
        </section>

        <HeadToHeadSection
          data={headToHead}
          loading={headToHeadLoading}
          error={headToHeadError}
        />
      </div>
    </main>
  );
}

export default MatchDetailPage;