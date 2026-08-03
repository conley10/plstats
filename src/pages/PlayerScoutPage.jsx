import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Brain,
  ChartNoAxesCombined,
  CheckCircle2,
  Crosshair,
  Gauge,
  Loader2,
  ShieldAlert,
  Sparkles,
  Swords,
  Target,
  TrendingUp,
  TriangleAlert,
  UserRoundSearch,
  WandSparkles,
  Zap,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import {
  getPlayer,
  getPlayerHistory,
} from "../api/playersApi";

const clamp = (value, minimum = 0, maximum = 100) =>
  Math.min(maximum, Math.max(minimum, Math.round(Number(value) || 0)));

const safeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;

  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age;
}

function formatPosition(position) {
  if (!position) return "Unknown role";

  const value = String(position).toUpperCase().trim();

  if (value.includes("GK")) return "Goalkeeper";
  if (value.startsWith("D")) return "Defender";
  if (value.startsWith("M")) return "Midfielder";
  if (value.startsWith("F")) return "Forward";

  return position;
}

function getPositionGroup(position) {
  const value = String(position || "").toUpperCase();

  if (value.includes("GK")) return "goalkeeper";
  if (value.startsWith("D")) return "defender";
  if (value.startsWith("M")) return "midfielder";
  return "forward";
}

function formatDecimal(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return Number(value).toFixed(digits);
}

function getPer90(value, minutes) {
  const safeMinutes = safeNumber(minutes);
  if (!safeMinutes) return 0;

  return (safeNumber(value) / safeMinutes) * 90;
}

function buildRatings(player) {
  const minutes = safeNumber(player.minutes);
  const appearances = Math.max(safeNumber(player.appearances), 1);
  const goals = safeNumber(player.goals);
  const assists = safeNumber(player.assists);
  const xg = safeNumber(player.xg);
  const xa = safeNumber(player.xa);
  const npxg = safeNumber(player.npxg);
  const shots = safeNumber(player.shots);
  const keyPasses = safeNumber(player.keyPasses);
  const penalties = safeNumber(player.penalties);

  const goalsPer90 = getPer90(goals, minutes);
  const assistsPer90 = getPer90(assists, minutes);
  const xgPer90 = getPer90(xg, minutes);
  const xaPer90 = getPer90(xa, minutes);
  const shotsPer90 = getPer90(shots, minutes);
  const keyPassesPer90 = getPer90(keyPasses, minutes);
  const nonPenaltyGoals = Math.max(goals - penalties, 0);
  const conversion = shots > 0 ? goals / shots : 0;
  const finishingDifference = goals - xg;
  const availability = Math.min(1, appearances / 32);
  const positionGroup = getPositionGroup(player.position);

  const finishing = clamp(
    44 +
      goalsPer90 * 45 +
      conversion * 55 +
      finishingDifference * 2.2,
  );

  const creativity = clamp(
    42 +
      assistsPer90 * 45 +
      xaPer90 * 38 +
      keyPassesPer90 * 9,
  );

  const passing = clamp(
    48 +
      keyPassesPer90 * 11 +
      assistsPer90 * 28 +
      xaPer90 * 18,
  );

  const goalThreat = clamp(
    42 +
      xgPer90 * 38 +
      shotsPer90 * 8 +
      getPer90(npxg, minutes) * 24,
  );

  const movement = clamp(
    46 +
      xgPer90 * 31 +
      shotsPer90 * 6 +
      nonPenaltyGoals * 1.1,
  );

  const efficiency = clamp(
    55 +
      finishingDifference * 4 +
      conversion * 60 +
      (goalsPer90 - xgPer90) * 24,
  );

  const availabilityRating = clamp(48 + availability * 48);

  let defensiveWork = 58;
  if (positionGroup === "defender") defensiveWork = 78;
  if (positionGroup === "goalkeeper") defensiveWork = 82;
  if (positionGroup === "forward") defensiveWork = 49;

  const discipline = clamp(
    72 +
      availability * 10 -
      Math.max(0, penalties - 3) * 2,
  );

  const overallWeights = {
    goalkeeper: [
      [availabilityRating, 0.27],
      [discipline, 0.22],
      [defensiveWork, 0.36],
      [passing, 0.15],
    ],
    defender: [
      [defensiveWork, 0.26],
      [passing, 0.18],
      [availabilityRating, 0.18],
      [discipline, 0.16],
      [creativity, 0.12],
      [movement, 0.1],
    ],
    midfielder: [
      [creativity, 0.23],
      [passing, 0.21],
      [goalThreat, 0.15],
      [movement, 0.13],
      [efficiency, 0.1],
      [availabilityRating, 0.1],
      [discipline, 0.08],
    ],
    forward: [
      [finishing, 0.25],
      [goalThreat, 0.22],
      [movement, 0.17],
      [efficiency, 0.14],
      [creativity, 0.1],
      [availabilityRating, 0.07],
      [discipline, 0.05],
    ],
  };

  const overall = clamp(
    overallWeights[positionGroup].reduce(
      (total, [rating, weight]) => total + rating * weight,
      0,
    ),
  );

  return {
    overall,
    finishing,
    creativity,
    passing,
    goalThreat,
    movement,
    efficiency,
    availability: availabilityRating,
    discipline,
    defensiveWork,
    goalsPer90,
    assistsPer90,
    xgPer90,
    xaPer90,
    shotsPer90,
    keyPassesPer90,
    finishingDifference,
  };
}

function getPlayingStyle(player, ratings) {
  const group = getPositionGroup(player.position);

  if (group === "goalkeeper") {
    return {
      title: ratings.passing >= 68 ? "Sweeper Keeper" : "Traditional Goalkeeper",
      description:
        ratings.passing >= 68
          ? "Comfortable contributing to build-up play and helping the team progress possession from deep."
          : "A defence-first goalkeeper profile focused on reliability and protecting the penalty area.",
      bestPosition: "GK",
      secondaryPosition: "—",
      tacticalFit: "Structured possession",
    };
  }

  if (group === "defender") {
    if (ratings.passing >= 72 && ratings.creativity >= 65) {
      return {
        title: "Ball-Playing Defender",
        description:
          "Best used in a side that builds from the back and asks defenders to progress the ball with composure.",
        bestPosition: "CB",
        secondaryPosition: "Full-back",
        tacticalFit: "Possession build-up",
      };
    }

    return {
      title: "Defensive Stopper",
      description:
        "A defence-led profile suited to protecting space, competing physically and keeping the structure secure.",
      bestPosition: "CB",
      secondaryPosition: "Defensive full-back",
      tacticalFit: "Compact defensive block",
    };
  }

  if (group === "midfielder") {
    if (ratings.creativity >= 78) {
      return {
        title: "Advanced Playmaker",
        description:
          "A creative midfielder who is most valuable between the lines, supplying chances and connecting attacks.",
        bestPosition: "CAM",
        secondaryPosition: "CM / RW",
        tacticalFit: "Possession and combinations",
      };
    }

    if (ratings.goalThreat >= 72) {
      return {
        title: "Goalscoring Midfielder",
        description:
          "A midfielder who offers meaningful penalty-area presence and can contribute directly to the scoreline.",
        bestPosition: "CAM",
        secondaryPosition: "CM",
        tacticalFit: "Vertical attacking football",
      };
    }

    return {
      title: "Progressive Midfielder",
      description:
        "A balanced midfield profile capable of linking phases and supporting both chance creation and ball progression.",
      bestPosition: "CM",
      secondaryPosition: "CAM",
      tacticalFit: "Balanced possession",
    };
  }

  if (ratings.creativity >= 74 && ratings.goalThreat >= 72) {
    return {
      title: "Complete Attacker",
      description:
        "Combines scoring threat with creative output and can influence attacks both as a finisher and a provider.",
      bestPosition: "CF",
      secondaryPosition: "RW / LW",
      tacticalFit: "Fluid front three",
    };
  }

  if (ratings.finishing >= 78) {
    return {
      title: "Clinical Finisher",
      description:
        "Most dangerous close to goal, with a profile built around converting chances and attacking decisive spaces.",
      bestPosition: "ST",
      secondaryPosition: "CF",
      tacticalFit: "Direct chance creation",
    };
  }

  if (ratings.movement >= ratings.creativity) {
    return {
      title: "Mobile Forward",
      description:
        "Creates value through movement, shot volume and repeated involvement across the attacking line.",
      bestPosition: "ST",
      secondaryPosition: "RW / LW",
      tacticalFit: "High-tempo attack",
    };
  }

  return {
    title: "Creative Forward",
    description:
      "A forward who can drop into pockets, combine with teammates and contribute to chance creation.",
    bestPosition: "CF",
    secondaryPosition: "RW / LW",
    tacticalFit: "Possession attack",
  };
}

function buildStrengths(player, ratings) {
  const strengths = [];

  const candidates = [
    [ratings.creativity, "Elite chance creation and creative influence"],
    [ratings.finishing, "Strong finishing output"],
    [ratings.goalThreat, "Consistent goal threat"],
    [ratings.passing, "Progressive passing contribution"],
    [ratings.movement, "Dangerous attacking movement"],
    [ratings.efficiency, "Efficient conversion of chances"],
    [ratings.availability, "Reliable availability across the season"],
  ]
    .sort((a, b) => b[0] - a[0])
    .filter(([score]) => score >= 64);

  for (const [, label] of candidates.slice(0, 4)) {
    strengths.push(label);
  }

  if (ratings.finishingDifference > 1.5) {
    strengths.unshift("Finishing above expected-goal output");
  }

  if (ratings.keyPassesPer90 >= 1.8) {
    strengths.unshift("Regularly creates chances for teammates");
  }

  return [...new Set(strengths)].slice(0, 5);
}

function buildWeaknesses(player, ratings) {
  const weaknesses = [];

  const candidates = [
    [ratings.finishing, "Finishing consistency can improve"],
    [ratings.creativity, "Limited creative production"],
    [ratings.passing, "Passing influence is below elite level"],
    [ratings.goalThreat, "Needs to generate more goal threat"],
    [ratings.movement, "Can improve off-ball attacking impact"],
    [ratings.efficiency, "Output is below expected levels"],
    [ratings.availability, "Limited season availability"],
  ]
    .sort((a, b) => a[0] - b[0])
    .filter(([score]) => score < 67);

  for (const [, label] of candidates.slice(0, 4)) {
    weaknesses.push(label);
  }

  if (ratings.finishingDifference < -1.5) {
    weaknesses.unshift("Finishing below expected-goal output");
  }

  if (getPositionGroup(player.position) === "forward" && ratings.creativity < 62) {
    weaknesses.push("Offers less as a creator than as a finisher");
  }

  return [...new Set(weaknesses)].slice(0, 5);
}

function buildScoutSummary(player, ratings, style) {
  const name = player.name || "This player";
  const team = player.team?.shortName || player.team?.name || "their club";
  const position = formatPosition(player.position).toLowerCase();

  const level =
    ratings.overall >= 86
      ? "elite"
      : ratings.overall >= 78
        ? "high-level"
        : ratings.overall >= 69
          ? "strong"
          : ratings.overall >= 60
            ? "useful"
            : "developing";

  const leadingAttribute = [
    ["finishing", ratings.finishing],
    ["creativity", ratings.creativity],
    ["passing", ratings.passing],
    ["goal threat", ratings.goalThreat],
    ["movement", ratings.movement],
  ].sort((a, b) => b[1] - a[1])[0][0];

  const finishingSentence =
    ratings.finishingDifference > 1
      ? "The current numbers also show above-expected finishing."
      : ratings.finishingDifference < -1
        ? "The underlying numbers suggest there is room to improve finishing efficiency."
        : "Actual scoring output is broadly aligned with the quality of chances received.";

  return `${name} profiles as a ${level} ${position} for ${team}. The data best fits the ${style.title.toLowerCase()} role, with ${leadingAttribute} standing out as the clearest strength. ${finishingSentence} The best tactical environment would be ${style.tacticalFit.toLowerCase()}, where the player can maximise involvement in their strongest phases.`;
}

function getDevelopment(player, ratings, history) {
  const age = calculateAge(player.dateOfBirth);
  const positionGroup = getPositionGroup(player.position);
  const peakAge =
    positionGroup === "goalkeeper"
      ? 29
      : positionGroup === "defender"
        ? 27
        : 26;

  const ageBoost =
    age === null
      ? 2
      : age <= 21
        ? 8
        : age <= 24
          ? 5
          : age <= 27
            ? 2
            : age <= 30
              ? 0
              : -3;

  const potential = clamp(ratings.overall + ageBoost, 45, 96);
  const seasons = history?.seasons || [];
  const recent = seasons.slice(-3);

  let consistency = ratings.availability;
  if (recent.length >= 2) {
    const outputs = recent.map(
      (season) => safeNumber(season.goals) + safeNumber(season.assists),
    );
    const average =
      outputs.reduce((total, value) => total + value, 0) / outputs.length;
    const variance =
      outputs.reduce(
        (total, value) => total + Math.abs(value - average),
        0,
      ) / outputs.length;

    consistency = clamp(88 - variance * 4 + ratings.availability * 0.12);
  }

  const risk =
    ratings.availability >= 80
      ? "Low"
      : ratings.availability >= 64
        ? "Moderate"
        : "Elevated";

  const yearsToPeak =
    age === null ? "—" : Math.max(peakAge - age, 0);

  return {
    currentAbility: ratings.overall,
    potential,
    consistency,
    peakAge,
    yearsToPeak,
    risk,
  };
}

function RatingRing({ value, label, size = "large" }) {
  const diameter = size === "large" ? 176 : 112;
  const strokeWidth = size === "large" ? 11 : 8;
  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamp(value) / 100) * circumference;

  return (
    <div className="relative shrink-0" style={{ width: diameter, height: diameter }}>
      <svg className="-rotate-90" width={diameter} height={diameter}>
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="transparent"
          stroke="rgba(148,163,184,0.14)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-accent transition-all duration-700"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={
            size === "large"
              ? "text-5xl font-black tabular-nums text-white"
              : "text-3xl font-black tabular-nums text-white"
          }
        >
          {clamp(value)}
        </span>
        <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
          {label}
        </span>
      </div>
    </div>
  );
}

function AttributeBar({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-border bg-black/10 p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={16} className="text-accent" />}
          <span className="text-sm font-semibold text-muted-light">{label}</span>
        </div>
        <span className="text-lg font-black tabular-nums text-white">{value}</span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-accent transition-all duration-700"
          style={{ width: `${clamp(value)}%` }}
        />
      </div>
    </div>
  );
}

function InfoMetric({ label, value, helper }) {
  return (
    <div className="rounded-xl border border-border bg-black/10 p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-2 text-3xl font-black tabular-nums text-white">{value}</p>
      {helper && <p className="mt-2 text-xs text-muted">{helper}</p>}
    </div>
  );
}

function RadarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;

  const item = payload[0]?.payload;

  return (
    <div className="rounded-lg border border-border bg-panel px-4 py-3 shadow-xl">
      <p className="font-semibold text-white">{item?.attribute}</p>
      <p className="mt-1 text-sm text-muted-light">
        Rating: <span className="font-bold text-accent">{item?.rating}</span>
      </p>
    </div>
  );
}

export default function PlayerScoutPage() {
  const { playerId } = useParams();

  const [player, setPlayer] = useState(null);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const playerData = await getPlayer(playerId);
        if (isCancelled) return;

        setPlayer(playerData);

        try {
          const historyData = await getPlayerHistory(playerId);
          if (!isCancelled) setHistory(historyData);
        } catch (historyError) {
          console.error("Unable to load player history:", historyError);
          if (!isCancelled) setHistory(null);
        }
      } catch (requestError) {
        console.error("Unable to load scout report:", requestError);
        if (!isCancelled) setError("Unable to load this player scout report.");
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [playerId]);

  const ratings = useMemo(
    () => (player ? buildRatings(player) : null),
    [player],
  );

  const playingStyle = useMemo(
    () => (player && ratings ? getPlayingStyle(player, ratings) : null),
    [player, ratings],
  );

  const strengths = useMemo(
    () => (player && ratings ? buildStrengths(player, ratings) : []),
    [player, ratings],
  );

  const weaknesses = useMemo(
    () => (player && ratings ? buildWeaknesses(player, ratings) : []),
    [player, ratings],
  );

  const development = useMemo(
    () =>
      player && ratings
        ? getDevelopment(player, ratings, history)
        : null,
    [player, ratings, history],
  );

  const radarData = useMemo(() => {
    if (!ratings) return [];

    return [
      { attribute: "Finishing", rating: ratings.finishing },
      { attribute: "Creativity", rating: ratings.creativity },
      { attribute: "Passing", rating: ratings.passing },
      { attribute: "Threat", rating: ratings.goalThreat },
      { attribute: "Movement", rating: ratings.movement },
      { attribute: "Efficiency", rating: ratings.efficiency },
    ];
  }, [ratings]);

  const summary = useMemo(
    () =>
      player && ratings && playingStyle
        ? buildScoutSummary(player, ratings, playingStyle)
        : "",
    [player, ratings, playingStyle],
  );

  const careerTotals = history?.careerTotals || {};
const seasons = useMemo(
  () => history?.seasons || [],
  [history],
);
  const bestSeason = useMemo(() => {
    if (!seasons.length) return null;

    return seasons.reduce((best, season) => {
      const total =
        safeNumber(season.goals) + safeNumber(season.assists);
      const bestTotal =
        safeNumber(best.goals) + safeNumber(best.assists);
      return total > bestTotal ? season : best;
    });
  }, [seasons]);

  if (loading) {
    return (
      <main className="page-container flex min-h-[65vh] items-center justify-center">
        <div className="text-center">
          <Loader2 size={38} className="mx-auto animate-spin text-accent" />
          <p className="mt-4 text-sm text-muted">Building scout report...</p>
        </div>
      </main>
    );
  }

  if (error || !player || !ratings || !playingStyle || !development) {
    return (
      <main className="page-container">
        <section className="panel p-8">
          <h1 className="text-xl font-bold text-white">
            Player scout report could not be loaded
          </h1>
          <p className="mt-3 text-muted">{error || "Player not found."}</p>
          <Link to="/players" className="primary-button mt-6 inline-flex">
            Back to Players
          </Link>
        </section>
      </main>
    );
  }

  const age = calculateAge(player.dateOfBirth);

  return (
    <main className="page-container pb-16">
      <Link
        to={`/players/${player.id}`}
        className="mb-7 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-white"
      >
        <ArrowLeft size={17} />
        Back to player statistics
      </Link>

      <section className="relative overflow-hidden rounded-3xl border border-border bg-panel p-6 md:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative grid gap-8 xl:grid-cols-[1fr_auto] xl:items-center">
          <div>
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent-soft px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-accent">
                <UserRoundSearch size={14} />
                Player scout report
              </span>

              <span className="rounded-full border border-border bg-black/10 px-3 py-1 text-xs text-muted-light">
                Data-driven assessment
              </span>
            </div>

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-black/20">
                {player.team?.crest ? (
                  <img
                    src={player.team.crest}
                    alt={player.team.name || player.name}
                    className="h-20 w-20 object-contain"
                  />
                ) : (
                  <UserRoundSearch size={34} className="text-muted" />
                )}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                  {player.team?.shortName || player.team?.name || "Premier League"}
                </p>
                <h1 className="mt-2 text-4xl font-black tracking-tight text-white md:text-6xl">
                  {player.name}
                </h1>

                <div className="mt-4 flex flex-wrap gap-2 text-sm text-muted-light">
                  <span className="rounded-full border border-border px-3 py-1">
                    {formatPosition(player.position)}
                  </span>
                  {age !== null && (
                    <span className="rounded-full border border-border px-3 py-1">
                      Age {age}
                    </span>
                  )}
                  {player.nationality && (
                    <span className="rounded-full border border-border px-3 py-1">
                      {player.nationality}
                    </span>
                  )}
                  <span className="rounded-full border border-border px-3 py-1">
                    {playingStyle.title}
                  </span>
                </div>
              </div>
            </div>

            <p className="mt-7 max-w-3xl text-base leading-8 text-muted-light">
              {summary}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to={`/players/compare?player=${player.id}`}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-bold text-black transition-transform hover:-translate-y-0.5"
              >
                <Swords size={17} />
                Compare player
              </Link>

              <Link
                to={`/players/${player.id}`}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-5 py-3 text-sm font-semibold text-white transition-colors hover:border-accent/60 hover:text-accent"
              >
                <ChartNoAxesCombined size={17} />
                Full statistics
              </Link>
            </div>
          </div>

          <div className="flex justify-center xl:justify-end">
            <RatingRing value={ratings.overall} label="Overall" />
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="panel p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
                Technical profile
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                Attribute ratings
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Ratings are calculated from the current season statistics returned by your player API.
              </p>
            </div>
            <Gauge size={24} className="text-accent" />
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <AttributeBar label="Finishing" value={ratings.finishing} icon={Target} />
            <AttributeBar label="Creativity" value={ratings.creativity} icon={Sparkles} />
            <AttributeBar label="Passing" value={ratings.passing} icon={WandSparkles} />
            <AttributeBar label="Goal threat" value={ratings.goalThreat} icon={Crosshair} />
            <AttributeBar label="Movement" value={ratings.movement} icon={Zap} />
            <AttributeBar label="Efficiency" value={ratings.efficiency} icon={TrendingUp} />
            <AttributeBar label="Availability" value={ratings.availability} icon={BadgeCheck} />
            <AttributeBar label="Discipline" value={ratings.discipline} icon={ShieldAlert} />
          </div>
        </article>

        <article className="panel p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
              Shape of performance
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">
              Scout radar
            </h2>
          </div>

          <div className="mt-4 h-[390px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="72%">
                <PolarGrid stroke="rgba(148,163,184,0.18)" />
                <PolarAngleAxis
                  dataKey="attribute"
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                />
                <Tooltip content={<RadarTooltip />} />
                <Radar
                  dataKey="rating"
                  stroke="#38bdf8"
                  fill="#38bdf8"
                  fillOpacity={0.22}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <article className="panel p-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={22} className="text-green-400" />
            <h2 className="text-xl font-black text-white">Key strengths</h2>
          </div>

          <div className="mt-5 space-y-3">
            {strengths.length ? (
              strengths.map((strength) => (
                <div
                  key={strength}
                  className="flex items-start gap-3 rounded-xl border border-green-400/20 bg-green-400/[0.05] p-4"
                >
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-400" />
                  <p className="text-sm leading-6 text-muted-light">{strength}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">
                More match data is needed to identify standout strengths.
              </p>
            )}
          </div>
        </article>

        <article className="panel p-6">
          <div className="flex items-center gap-3">
            <TriangleAlert size={22} className="text-amber-400" />
            <h2 className="text-xl font-black text-white">Development areas</h2>
          </div>

          <div className="mt-5 space-y-3">
            {weaknesses.length ? (
              weaknesses.map((weakness) => (
                <div
                  key={weakness}
                  className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-4"
                >
                  <TriangleAlert size={18} className="mt-0.5 shrink-0 text-amber-400" />
                  <p className="text-sm leading-6 text-muted-light">{weakness}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">
                No major weaknesses stand out in the available attacking data.
              </p>
            )}
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="panel p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
                Tactical identity
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                {playingStyle.title}
              </h2>
            </div>
            <Brain size={24} className="text-accent" />
          </div>

          <p className="mt-4 leading-7 text-muted-light">
            {playingStyle.description}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <InfoMetric label="Best position" value={playingStyle.bestPosition} />
            <InfoMetric label="Secondary role" value={playingStyle.secondaryPosition} />
            <div className="sm:col-span-2 rounded-xl border border-border bg-black/10 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">
                Best tactical fit
              </p>
              <p className="mt-2 text-xl font-black text-white">
                {playingStyle.tacticalFit}
              </p>
            </div>
          </div>
        </article>

        <article className="panel p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
              Projection
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">
              Ability and development
            </h2>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoMetric
              label="Current ability"
              value={development.currentAbility}
              helper="Current data rating"
            />
            <InfoMetric
              label="Potential"
              value={development.potential}
              helper="Age-adjusted projection"
            />
            <InfoMetric
              label="Consistency"
              value={development.consistency}
              helper="Output stability"
            />
            <InfoMetric
              label="Estimated peak age"
              value={development.peakAge}
            />
            <InfoMetric
              label="Years to peak"
              value={development.yearsToPeak}
            />
            <InfoMetric
              label="Availability risk"
              value={development.risk}
            />
          </div>

          <p className="mt-5 text-xs leading-5 text-muted">
            These ratings are modelling estimates based on the statistics currently available in PLSTATS. They are not official scouting grades.
          </p>
        </article>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-4">
        <InfoMetric
          label="Goals per 90"
          value={formatDecimal(ratings.goalsPer90)}
        />
        <InfoMetric
          label="Assists per 90"
          value={formatDecimal(ratings.assistsPer90)}
        />
        <InfoMetric
          label="xG per 90"
          value={formatDecimal(ratings.xgPer90)}
        />
        <InfoMetric
          label="xA per 90"
          value={formatDecimal(ratings.xaPer90)}
        />
      </section>

      {history && (
        <section className="panel mt-6 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
                Career evidence
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                Career snapshot
              </h2>
              <p className="mt-2 text-sm text-muted">
                Long-term evidence from the imported Premier League history.
              </p>
            </div>
            <TrendingUp size={24} className="text-accent" />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <InfoMetric
              label="Career appearances"
              value={careerTotals.appearances ?? 0}
            />
            <InfoMetric
              label="Career goals"
              value={careerTotals.goals ?? 0}
            />
            <InfoMetric
              label="Career assists"
              value={careerTotals.assists ?? 0}
            />
            <InfoMetric
              label="Recorded seasons"
              value={history.seasonCount ?? seasons.length}
            />
            <InfoMetric
              label="Best output season"
              value={
                bestSeason
                  ? `${bestSeason.goals || 0}G / ${bestSeason.assists || 0}A`
                  : "—"
              }
              helper={bestSeason?.label}
            />
          </div>
        </section>
      )}

      <section className="mt-6 rounded-2xl border border-accent/30 bg-accent-soft p-6">
        <div className="flex items-start gap-4">
          <Sparkles size={24} className="mt-1 shrink-0 text-accent" />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
              Scout verdict
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">
              {ratings.overall >= 82
                ? "Top-level Premier League profile"
                : ratings.overall >= 72
                  ? "Strong first-team profile"
                  : ratings.overall >= 62
                    ? "Useful squad-level profile"
                    : "Developing statistical profile"}
            </h2>
            <p className="mt-3 max-w-4xl leading-7 text-muted-light">
              {summary}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}