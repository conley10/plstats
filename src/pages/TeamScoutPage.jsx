import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Brain,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Goal,
  Loader2,
  Shield,
  Sparkles,
  Swords,
  Target,
  TrendingUp,
  Trophy,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { getTeam } from "../api/teamsApi";

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function average(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  if (!valid.length) return 0;
  return valid.reduce((total, value) => total + value, 0) / valid.length;
}

function percentage(value, total) {
  if (!total) return 0;
  return (Number(value) / Number(total)) * 100;
}

function formatDate(dateValue) {
  if (!dateValue) return "Date unavailable";

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateValue));
}

function getOrdinal(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";

  const remainder100 = number % 100;
  if (remainder100 >= 11 && remainder100 <= 13) return `${number}th`;

  switch (number % 10) {
    case 1:
      return `${number}st`;
    case 2:
      return `${number}nd`;
    case 3:
      return `${number}rd`;
    default:
      return `${number}th`;
  }
}

function getRatingTone(value) {
  if (value >= 90) return "text-emerald-300";
  if (value >= 80) return "text-lime-300";
  if (value >= 70) return "text-yellow-200";
  if (value >= 60) return "text-orange-300";
  return "text-red-300";
}

function TeamLogo({ team, className = "h-28 w-28" }) {
  return (
    <div
      className={`flex items-center justify-center rounded-full border border-white/10 bg-black/25 p-4 ${className}`}
    >
      {team?.crest ? (
        <img
          src={team.crest}
          alt={team.name}
          className="h-full w-full object-contain"
        />
      ) : (
        <Shield className="h-12 w-12 text-muted" />
      )}
    </div>
  );
}

function RatingCircle({ value, label }) {
  const score = Math.round(clamp(value));

  return (
    <div className="relative flex h-40 w-40 items-center justify-center rounded-full bg-[conic-gradient(var(--color-accent)_0deg,var(--color-accent)_calc(var(--score)*3.6deg),rgba(255,255,255,0.08)_calc(var(--score)*3.6deg))] p-2 [--score:0]" style={{ "--score": score }}>
      <div className="flex h-full w-full flex-col items-center justify-center rounded-full border border-white/10 bg-[#0d1014] shadow-2xl">
        <span className={`text-5xl font-black tabular-nums ${getRatingTone(score)}`}>
          {score}
        </span>
        <span className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-muted">
          {label}
        </span>
      </div>
    </div>
  );
}

function RatingBar({ label, value, icon: Icon }) {
  const score = Math.round(clamp(value));

  return (
    <div className="rounded-xl border border-border bg-black/15 p-4">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          {Icon && <Icon size={17} className="text-accent" />}
          {label}
        </div>
        <span className={`text-lg font-black tabular-nums ${getRatingTone(score)}`}>
          {score}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-accent transition-all duration-700"
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function FormBadge({ result }) {
  const styles = {
    W: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
    D: "border-yellow-500/30 bg-yellow-500/15 text-yellow-200",
    L: "border-red-500/30 bg-red-500/15 text-red-300",
  };

  return (
    <span
      className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-black ${
        styles[result] || "border-border bg-black/20 text-muted"
      }`}
    >
      {result}
    </span>
  );
}

function InsightCard({ title, items, positive }) {
  const Icon = positive ? CheckCircle2 : XCircle;
  const tone = positive
    ? "border-emerald-500/20 bg-emerald-500/[0.04]"
    : "border-red-500/20 bg-red-500/[0.04]";
  const iconTone = positive ? "text-emerald-300" : "text-red-300";

  return (
    <article className={`rounded-2xl border p-6 ${tone}`}>
      <div className="flex items-center gap-3">
        <Icon className={iconTone} size={22} />
        <h2 className="text-xl font-black text-white">{title}</h2>
      </div>

      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <div
            key={item}
            className="flex items-start gap-3 rounded-xl border border-white/5 bg-black/15 p-3 text-sm leading-6 text-muted-light"
          >
            <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${positive ? "bg-emerald-400" : "bg-red-400"}`} />
            {item}
          </div>
        ))}
      </div>
    </article>
  );
}

function MiniStat({ label, value, description }) {
  return (
    <div className="rounded-xl border border-border bg-black/15 p-4">
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted">
        {label}
      </p>
      {description && (
        <p className="mt-2 text-xs leading-5 text-muted-light">{description}</p>
      )}
    </div>
  );
}

function FixtureCard({ match, teamId }) {
  const isHome = Number(match.homeTeam?.id) === Number(teamId);
  const opponent = isHome ? match.awayTeam : match.homeTeam;

  return (
    <Link
      to={`/fixtures/${match.id}`}
      className="group flex items-center justify-between gap-4 rounded-xl border border-border bg-black/10 p-4 transition-colors hover:border-accent/50"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-black/20 p-2">
          {opponent?.crest ? (
            <img
              src={opponent.crest}
              alt={opponent.name}
              className="h-full w-full object-contain"
            />
          ) : (
            <Shield size={18} className="text-muted" />
          )}
        </div>

        <div className="min-w-0">
          <p className="truncate font-bold text-white">
            {opponent?.shortName || opponent?.name || "Opponent"}
          </p>
          <p className="mt-1 text-xs text-muted">
            {formatDate(match.utcDate)} · {isHome ? "Home" : "Away"}
          </p>
        </div>
      </div>

      <ChevronRight
        size={18}
        className="shrink-0 text-muted transition-transform group-hover:translate-x-1 group-hover:text-accent"
      />
    </Link>
  );
}

function buildScoutModel(data) {
  const standing = data?.standing || {};
  const team = data?.team || {};
  const form = data?.recentForm || [];
  const scorers = data?.teamScorers || [];

  const played = Number(standing.played) || 0;
  const wins = Number(standing.won) || 0;
  const draws = Number(standing.drawn) || 0;
  const losses = Number(standing.lost) || 0;
  const goalsFor = Number(standing.goalsFor) || 0;
  const goalsAgainst = Number(standing.goalsAgainst) || 0;
  const goalDifference = Number(standing.goalDifference) || 0;
  const points = Number(standing.points) || 0;
  const position = Number(standing.position) || 20;

  const winRate = percentage(wins, played);
  const drawRate = percentage(draws, played);
  const lossRate = percentage(losses, played);
  const goalsPerGame = played ? goalsFor / played : 0;
  const concededPerGame = played ? goalsAgainst / played : 0;
  const pointsPerGame = played ? points / played : 0;
  const formScore = form.length
    ? average(form.map((result) => (result === "W" ? 100 : result === "D" ? 55 : 20)))
    : 50;

  const attack = clamp(45 + goalsPerGame * 24 + winRate * 0.18 + Math.max(goalDifference, 0) * 0.25);
  const defence = clamp(100 - concededPerGame * 30 - lossRate * 0.2 + Math.max(goalDifference, 0) * 0.12);
  const formRating = clamp(formScore);
  const consistency = clamp(100 - drawRate * 0.32 - lossRate * 0.45 + pointsPerGame * 15);
  const squadDepth = clamp(45 + Math.min(team.squad?.length || 0, 30) * 1.3 + scorers.length * 0.8);
  const creativity = clamp(
    48 + goalsPerGame * 20 + (data?.topAssister?.assists || 0) * 2.1 + winRate * 0.12,
  );
  const discipline = clamp(72 + (wins - losses) * 0.8 - drawRate * 0.08);
  const pressing = clamp(average([formRating, consistency, attack]));
  const physicality = clamp(average([defence, discipline, squadDepth]));
  const overall = clamp(
    average([attack, defence, formRating, creativity, consistency, squadDepth]) +
      Math.max(0, 11 - position) * 0.7,
  );

  const expectedFinish = clamp(Math.round(position * 0.72 + (21 - overall / 5) * 0.28), 1, 20);
  const championsLeagueChance = clamp(100 - Math.max(expectedFinish - 4, 0) * 18 + Math.max(4 - expectedFinish, 0) * 8);
  const titleChance = clamp((overall - 76) * 4.2 - Math.max(position - 1, 0) * 10);
  const relegationChance = clamp((55 - overall) * 3 + Math.max(position - 15, 0) * 9);

  const strengths = [];
  const weaknesses = [];

  if (attack >= 82) strengths.push("Elite attacking output compared with the rest of the league.");
  else if (attack >= 72) strengths.push("Reliable goal production across the current campaign.");

  if (defence >= 80) strengths.push("Strong defensive record and good control without the ball.");
  if (formRating >= 78) strengths.push("Excellent recent momentum with a high rate of positive results.");
  if (goalDifference > 15) strengths.push("A healthy goal difference shows dominance at both ends of the pitch.");
  if (winRate >= 55) strengths.push("Consistently converts league matches into victories.");
  if ((data?.topScorer?.goals || 0) >= 10) strengths.push("Has a dependable leading scorer capable of deciding close matches.");
  if (squadDepth >= 78) strengths.push("A strong first-team squad gives the manager useful selection depth.");

  if (concededPerGame > 1.45) weaknesses.push("Concedes too frequently to be considered defensively secure.");
  if (drawRate >= 30) weaknesses.push("Too many draws are limiting the club's points ceiling.");
  if (lossRate >= 35) weaknesses.push("Defeats are arriving too often across the league season.");
  if (formRating < 55) weaknesses.push("Recent form is inconsistent and momentum needs to improve.");
  if (attack < 65) weaknesses.push("Chance conversion and overall attacking output remain below the desired level.");
  if (defence < 65) weaknesses.push("The defensive structure is vulnerable and gives opponents too many opportunities.");
  if ((data?.topScorer?.goals || 0) > goalsFor * 0.42) weaknesses.push("A large share of the goals depends on one primary scorer.");
  if (squadDepth < 68) weaknesses.push("Squad depth may become a concern when injuries or fixture congestion arrive.");

  if (!strengths.length) strengths.push("Balanced underlying numbers with room to improve in several areas.");
  if (!weaknesses.length) weaknesses.push("No major statistical weakness stands out in the current league record.");

  const attackPhrase = attack >= 84
    ? "one of the league's most dangerous attacking sides"
    : attack >= 72
      ? "a capable attacking team that regularly creates scoring opportunities"
      : "a side that still needs more consistent attacking production";

  const defencePhrase = defence >= 82
    ? "Their defensive record is a major strength and gives them a stable platform."
    : defence >= 68
      ? "Defensively, they have been reasonably competitive but remain vulnerable in certain matches."
      : "Their clearest concern is defensive reliability, with too many goals being conceded.";

  const formPhrase = formRating >= 80
    ? "Recent momentum is excellent, suggesting the team is performing near its current ceiling."
    : formRating >= 60
      ? "Recent form is steady, although there is still room to build greater consistency."
      : "Current momentum is below expectations and results need to improve quickly.";

  const report = `${team.name} profile as ${attackPhrase}. ${defencePhrase} ${formPhrase} With an overall scout rating of ${Math.round(overall)}, the data projects a ${getOrdinal(expectedFinish)}-place finish if current performance levels continue.`;

  return {
    played,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    goalDifference,
    points,
    position,
    winRate,
    goalsPerGame,
    concededPerGame,
    pointsPerGame,
    attack,
    defence,
    formRating,
    creativity,
    consistency,
    squadDepth,
    discipline,
    pressing,
    physicality,
    overall,
    expectedFinish,
    championsLeagueChance,
    titleChance,
    relegationChance,
    strengths: strengths.slice(0, 5),
    weaknesses: weaknesses.slice(0, 5),
    report,
  };
}

export default function TeamScoutPage() {
  const { teamId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadTeam() {
      try {
        setLoading(true);
        setError("");

        const response = await getTeam(teamId);
        if (!cancelled) setData(response);
      } catch (requestError) {
        console.error("Unable to load scout report:", requestError);
        if (!cancelled) {
          setError("Unable to generate the team scout report.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTeam();
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  const model = useMemo(() => (data ? buildScoutModel(data) : null), [data]);

  const radarData = useMemo(() => {
    if (!model) return [];

    return [
      { category: "Attack", rating: Math.round(model.attack) },
      { category: "Defence", rating: Math.round(model.defence) },
      { category: "Creativity", rating: Math.round(model.creativity) },
      { category: "Form", rating: Math.round(model.formRating) },
      { category: "Consistency", rating: Math.round(model.consistency) },
      { category: "Squad", rating: Math.round(model.squadDepth) },
    ];
  }, [model]);

  if (loading) {
    return (
      <main className="page-container flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 size={38} className="mx-auto animate-spin text-accent" />
          <p className="mt-4 text-sm text-muted">Generating team scout report...</p>
        </div>
      </main>
    );
  }

  if (error || !data?.team || !model) {
    return (
      <main className="page-container">
        <section className="panel p-8">
          <h1 className="text-2xl font-black text-white">Scout report unavailable</h1>
          <p className="mt-3 text-muted">{error || "Team data could not be loaded."}</p>
          <Link to="/teams" className="primary-button mt-6 inline-flex">
            Back to Teams
          </Link>
        </section>
      </main>
    );
  }

  const { team, recentForm = [], upcomingFixtures = [] } = data;

  return (
    <main className="page-container">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <Link
          to={`/teams/${team.id}`}
          className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-white"
        >
          <ArrowLeft size={17} />
          Back to team details
        </Link>

        <Link
          to={`/teams/compare?team=${team.id}`}
          className="inline-flex items-center gap-2 rounded-lg border border-accent px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent-soft"
        >
          <Swords size={16} />
          Compare team
        </Link>
      </div>

      <section className="relative overflow-hidden rounded-3xl border border-border bg-panel p-6 shadow-2xl md:p-9">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.15),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.05),transparent_38%)]" />
        <div className="absolute right-[-80px] top-[-80px] h-72 w-72 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative grid gap-9 xl:grid-cols-[1fr_auto] xl:items-center">
          <div className="flex flex-col gap-7 md:flex-row md:items-center">
            <TeamLogo team={team} />

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
                  Team Scout Report
                </span>
                <span className="rounded-full border border-border bg-black/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-muted">
                  Premier League
                </span>
              </div>

              <h1 className="mt-4 text-4xl font-black text-white md:text-6xl">
                {team.name}
              </h1>

              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-light">
                A data-driven assessment of current performance, tactical profile,
                squad quality and season outlook.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-5 text-sm text-muted-light">
                {team.coach?.name && (
                  <span className="inline-flex items-center gap-2">
                    <UserRound size={16} className="text-accent" />
                    {team.coach.name}
                  </span>
                )}

                {team.venue && (
                  <span className="inline-flex items-center gap-2">
                    <Shield size={16} className="text-accent" />
                    {team.venue}
                  </span>
                )}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-2">
                <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-muted">
                  Recent form
                </span>
                {recentForm.length ? (
                  recentForm.map((result, index) => (
                    <FormBadge key={`${result}-${index}`} result={result} />
                  ))
                ) : (
                  <span className="text-sm text-muted">Unavailable</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-center xl:justify-end">
            <RatingCircle value={model.overall} label="Overall" />
          </div>
        </div>

        <div className="relative mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MiniStat label="League position" value={getOrdinal(model.position)} />
          <MiniStat label="Predicted finish" value={getOrdinal(model.expectedFinish)} />
          <MiniStat label="Points per game" value={model.pointsPerGame.toFixed(2)} />
          <MiniStat label="Win rate" value={`${Math.round(model.winRate)}%`} />
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="panel p-6 md:p-7">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                Performance profile
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">Core ratings</h2>
            </div>
            <BarChart3 size={24} className="text-accent" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <RatingBar label="Attack" value={model.attack} icon={Goal} />
            <RatingBar label="Defence" value={model.defence} icon={Shield} />
            <RatingBar label="Creativity" value={model.creativity} icon={Sparkles} />
            <RatingBar label="Recent form" value={model.formRating} icon={TrendingUp} />
            <RatingBar label="Consistency" value={model.consistency} icon={Activity} />
            <RatingBar label="Squad depth" value={model.squadDepth} icon={Users} />
          </div>
        </article>

        <article className="panel p-6 md:p-7">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                Tactical profile
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">Team radar</h2>
            </div>
            <Target size={24} className="text-accent" />
          </div>

          <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="72%">
                <PolarGrid stroke="rgba(255,255,255,0.12)" />
                <PolarAngleAxis
                  dataKey="category"
                  tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 12 }}
                />
                <PolarRadiusAxis
                  domain={[0, 100]}
                  tick={false}
                  axisLine={false}
                />
                <Radar
                  name={team.shortName || team.name}
                  dataKey="rating"
                  stroke="var(--color-accent)"
                  fill="var(--color-accent)"
                  fillOpacity={0.25}
                />
                <Tooltip
                  contentStyle={{
                    background: "#11151a",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 12,
                    color: "white",
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <InsightCard title="Key strengths" items={model.strengths} positive />
        <InsightCard title="Areas to improve" items={model.weaknesses} />
      </section>

      <section className="panel mt-8 overflow-hidden p-6 md:p-8">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-start">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-accent/30 bg-accent-soft">
            <Brain size={28} className="text-accent" />
          </div>

          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Automated analysis
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">Scout summary</h2>
            <p className="mt-5 max-w-5xl text-base leading-8 text-muted-light">
              {model.report}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="panel p-6 md:p-7">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                Season outlook
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">Prediction model</h2>
            </div>
            <Trophy size={24} className="text-accent" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <MiniStat
              label="Expected finish"
              value={getOrdinal(model.expectedFinish)}
              description="Projected from current league position, results and rating profile."
            />
            <MiniStat
              label="Top-four chance"
              value={`${Math.round(model.championsLeagueChance)}%`}
              description="Estimated probability of a Champions League place."
            />
            <MiniStat
              label="Title chance"
              value={`${Math.round(model.titleChance)}%`}
              description="An indicative probability based on current performance only."
            />
            <MiniStat
              label="Relegation risk"
              value={`${Math.round(model.relegationChance)}%`}
              description="Estimated risk if the current performance level continues."
            />
          </div>

          <div className="mt-6 rounded-xl border border-border bg-black/10 p-4 text-xs leading-6 text-muted">
            These projections are generated from current Premier League statistics and are not betting advice.
          </div>
        </article>

        <article className="panel p-6 md:p-7">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                Team identity
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">Playing style</h2>
            </div>
            <Activity size={24} className="text-accent" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <RatingBar label="Pressing intensity" value={model.pressing} icon={Activity} />
            <RatingBar label="Physicality" value={model.physicality} icon={Shield} />
            <RatingBar label="Discipline" value={model.discipline} icon={CheckCircle2} />
            <RatingBar label="Attacking intent" value={model.attack} icon={Goal} />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <MiniStat label="Goals per game" value={model.goalsPerGame.toFixed(2)} />
            <MiniStat label="Conceded per game" value={model.concededPerGame.toFixed(2)} />
            <MiniStat label="Goal difference" value={model.goalDifference > 0 ? `+${model.goalDifference}` : model.goalDifference} />
          </div>
        </article>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        <article className="panel p-6">
          <div className="flex items-center gap-3">
            <UserRound size={22} className="text-accent" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Manager</p>
              <h2 className="mt-1 text-xl font-black text-white">
                {team.coach?.name || "Unavailable"}
              </h2>
            </div>
          </div>

          <div className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-border pb-3">
              <span className="text-muted">Nationality</span>
              <span className="font-semibold text-white">{team.coach?.nationality || "—"}</span>
            </div>
            <div className="flex justify-between gap-4 border-b border-border pb-3">
              <span className="text-muted">Squad size</span>
              <span className="font-semibold text-white">{team.squad?.length || 0}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted">Club founded</span>
              <span className="font-semibold text-white">{team.founded || "—"}</span>
            </div>
          </div>
        </article>

        <article className="panel p-6">
          <div className="flex items-center gap-3">
            <Goal size={22} className="text-accent" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Top scorer</p>
              <h2 className="mt-1 text-xl font-black text-white">
                {data.topScorer?.name || "Unavailable"}
              </h2>
            </div>
          </div>

          <p className="mt-7 text-5xl font-black text-white">{data.topScorer?.goals ?? 0}</p>
          <p className="mt-1 text-sm text-muted">Premier League goals</p>

          {data.topScorer?.id && (
            <Link
              to={`/players/${data.topScorer.id}`}
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:text-white"
            >
              View player profile <ChevronRight size={16} />
            </Link>
          )}
        </article>

        <article className="panel p-6">
          <div className="flex items-center gap-3">
            <Sparkles size={22} className="text-accent" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Top creator</p>
              <h2 className="mt-1 text-xl font-black text-white">
                {data.topAssister?.name || "Unavailable"}
              </h2>
            </div>
          </div>

          <p className="mt-7 text-5xl font-black text-white">{data.topAssister?.assists ?? 0}</p>
          <p className="mt-1 text-sm text-muted">Premier League assists</p>

          {data.topAssister?.id && (
            <Link
              to={`/players/${data.topAssister.id}`}
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:text-white"
            >
              View player profile <ChevronRight size={16} />
            </Link>
          )}
        </article>
      </section>

      <section className="panel mt-8 p-6 md:p-7">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Schedule watch
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">Upcoming fixtures</h2>
          </div>
          <CalendarDays size={24} className="text-accent" />
        </div>

        {upcomingFixtures.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {upcomingFixtures.slice(0, 6).map((match) => (
              <FixtureCard key={match.id} match={match} teamId={team.id} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-border bg-black/10 p-5 text-sm text-muted">
            No upcoming fixtures are available.
          </p>
        )}
      </section>
    </main>
  );
}