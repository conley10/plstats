const SQUAD_SIZE = 15;
const MAX_BUDGET = 100;
const MAX_BUDGET_TENTHS = 1000;

const POSITION_LIMITS = {
  GKP: 2,
  DEF: 5,
  MID: 5,
  FWD: 3,
};

const MAX_PLAYERS_PER_TEAM = 3;

function clamp(value, min, max) {
  return Math.min(
    Math.max(value, min),
    max,
  );
}

function safeNumber(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function getPositionShortName(
  player,
  positionMap,
) {
  return (
    positionMap.get(
      player.element_type,
    )?.shortName || "UNK"
  );
}

export function validateSquad({
  selectedPlayers,
  teamMap,
  positionMap,
}) {
  const errors = [];

  const totalPlayers =
    selectedPlayers.length;

const totalCostTenths =
  selectedPlayers.reduce(
    (total, player) =>
      total +
      Math.round(
        safeNumber(
          player.now_cost,
        ),
      ),
    0,
  );

const totalCost =
  totalCostTenths / 10;

  const positionCounts = {
    GKP: 0,
    DEF: 0,
    MID: 0,
    FWD: 0,
  };

  const teamCounts = new Map();

  for (const player of selectedPlayers) {
    const position =
      getPositionShortName(
        player,
        positionMap,
      );

    if (
      Object.hasOwn(
        positionCounts,
        position,
      )
    ) {
      positionCounts[position] += 1;
    }

    const teamId =
      player.team;

    teamCounts.set(
      teamId,
      (teamCounts.get(teamId) || 0) +
        1,
    );
  }

  if (totalPlayers !== SQUAD_SIZE) {
    errors.push(
      `A squad must contain exactly ${SQUAD_SIZE} players.`,
    );
  }

  for (const [
    position,
    required,
  ] of Object.entries(
    POSITION_LIMITS,
  )) {
    if (
      positionCounts[position] !==
      required
    ) {
      errors.push(
        `${position} requires ${required} players. You currently have ${positionCounts[position]}.`,
      );
    }
  }

if (
  totalCostTenths >
  MAX_BUDGET_TENTHS
) {
  errors.push(
    `Squad value exceeds £${MAX_BUDGET.toFixed(
      1,
    )}m.`,
  );
}

  for (const [
    teamId,
    count,
  ] of teamCounts.entries()) {
    if (
      count >
      MAX_PLAYERS_PER_TEAM
    ) {
      const team =
        teamMap.get(teamId);

      errors.push(
        `You can select a maximum of ${MAX_PLAYERS_PER_TEAM} players from ${
          team?.name ||
          "one club"
        }.`,
      );
    }
  }

  return {
    valid:
      errors.length === 0,

    errors,

    summary: {
      playerCount:
        totalPlayers,

      totalCost: Number(
        totalCost.toFixed(1),
      ),

      remainingBudget: Number(
        (
          MAX_BUDGET -
          totalCost
        ).toFixed(1),
      ),

      positions:
        positionCounts,

      teamCounts:
        Array.from(
          teamCounts.entries(),
        ).map(
          ([teamId, count]) => ({
            teamId,

            team:
              teamMap.get(
                teamId,
              )?.name ||
              "Unknown",

            count,
          }),
        ),
    },
  };
}

function sortByPrediction(
  players,
) {
  return [...players].sort(
    (a, b) =>
      safeNumber(
        b.prediction
          ?.predictedPoints,
      ) -
      safeNumber(
        a.prediction
          ?.predictedPoints,
      ),
  );
}

function selectBestXI(players) {
  const byPosition = {
    GKP: [],
    DEF: [],
    MID: [],
    FWD: [],
  };

  for (const player of players) {
    const position =
      player.position
        ?.shortName;

    if (
      byPosition[
        position
      ]
    ) {
      byPosition[
        position
      ].push(player);
    }
  }

  for (const position of Object.keys(
    byPosition,
  )) {
    byPosition[
      position
    ] =
      sortByPrediction(
        byPosition[
          position
        ],
      );
  }

  const startingXI = [];

  /*
   * Required minimum formation:
   *
   * 1 goalkeeper
   * 3 defenders
   * 2 midfielders
   * 1 forward
   *
   * This uses 7 players.
   * The remaining 4 outfield places
   * are selected by predicted points.
   */

  startingXI.push(
    ...byPosition.GKP.slice(
      0,
      1,
    ),
  );

  startingXI.push(
    ...byPosition.DEF.slice(
      0,
      3,
    ),
  );

  startingXI.push(
    ...byPosition.MID.slice(
      0,
      2,
    ),
  );

  startingXI.push(
    ...byPosition.FWD.slice(
      0,
      1,
    ),
  );

  const selectedIds =
    new Set(
      startingXI.map(
        (player) =>
          player.id,
      ),
    );

  const remainingOutfield =
    sortByPrediction(
      players.filter(
        (player) =>
          player.position
            ?.shortName !==
            "GKP" &&
          !selectedIds.has(
            player.id,
          ),
      ),
    );

  for (const player of remainingOutfield) {
    if (
      startingXI.length >=
      11
    ) {
      break;
    }

    const position =
      player.position
        ?.shortName;

    const currentPositionCount =
      startingXI.filter(
        (starter) =>
          starter.position
            ?.shortName ===
          position,
      ).length;

    const maxPositionCount =
      POSITION_LIMITS[
        position
      ] || 0;

    if (
      currentPositionCount <
      maxPositionCount
    ) {
      startingXI.push(
        player,
      );

      selectedIds.add(
        player.id,
      );
    }
  }

  const bench =
    players.filter(
      (player) =>
        !selectedIds.has(
          player.id,
        ),
    );

  const benchGoalkeeper =
    bench.find(
      (player) =>
        player.position
          ?.shortName ===
        "GKP",
    );

  const benchOutfield =
    sortByPrediction(
      bench.filter(
        (player) =>
          player.position
            ?.shortName !==
          "GKP",
      ),
    );

  const orderedBench = [
    ...benchOutfield,
  ];

  if (benchGoalkeeper) {
    orderedBench.push(
      benchGoalkeeper,
    );
  }

  return {
    startingXI:
      sortStartingXI(
        startingXI,
      ),

    bench:
      orderedBench,
  };
}

function sortStartingXI(players) {
  const order = {
    GKP: 1,
    DEF: 2,
    MID: 3,
    FWD: 4,
  };

  return [...players].sort(
    (a, b) => {
      const positionDifference =
        (order[
          a.position
            ?.shortName
        ] || 99) -
        (order[
          b.position
            ?.shortName
        ] || 99);

      if (
        positionDifference !==
        0
      ) {
        return positionDifference;
      }

      return (
        safeNumber(
          b.prediction
            ?.predictedPoints,
        ) -
        safeNumber(
          a.prediction
            ?.predictedPoints,
        )
      );
    },
  );
}

function calculatePositionRating(
  players,
  position,
) {
  const filtered =
    players.filter(
      (player) =>
        player.position
          ?.shortName ===
        position,
    );

  if (
    filtered.length ===
    0
  ) {
    return 0;
  }

  const average =
    filtered.reduce(
      (total, player) =>
        total +
        safeNumber(
          player.prediction
            ?.predictedPoints,
        ),
      0,
    ) /
    filtered.length;

  /*
   * Around 7.5 predicted points
   * corresponds approximately
   * to a 100/100 positional score.
   */

  return Math.round(
    clamp(
      (average / 7.5) *
        100,
      0,
      100,
    ),
  );
}

function calculateDefenceRating(
  players,
) {
  const defenders =
    players.filter(
      (player) =>
        player.position
          ?.shortName ===
          "DEF" ||
        player.position
          ?.shortName ===
          "GKP",
    );

  if (
    defenders.length ===
    0
  ) {
    return 0;
  }

  const average =
    defenders.reduce(
      (total, player) =>
        total +
        safeNumber(
          player.prediction
            ?.predictedPoints,
        ),
      0,
    ) /
    defenders.length;

  return Math.round(
    clamp(
      (average / 6.5) *
        100,
      0,
      100,
    ),
  );
}

function calculateFixtureRating(
  players,
) {
  if (
    players.length ===
    0
  ) {
    return 0;
  }

  const difficultyScores =
    players.map(
      (player) => {
        const difficulty =
          safeNumber(
            player.prediction
              ?.fixtureDifficulty,
          ) || 3;

        switch (
          difficulty
        ) {
          case 1:
            return 100;

          case 2:
            return 80;

          case 3:
            return 60;

          case 4:
            return 40;

          case 5:
            return 20;

          default:
            return 60;
        }
      },
    );

  const average =
    difficultyScores.reduce(
      (total, value) =>
        total + value,
      0,
    ) /
    difficultyScores.length;

  return Math.round(
    average,
  );
}

function calculateValueRating(
  players,
) {
  if (
    players.length ===
    0
  ) {
    return 0;
  }

  const values =
    players.map(
      (player) => {
        const price =
          safeNumber(
            player.price,
          );

        const prediction =
          safeNumber(
            player.prediction
              ?.predictedPoints,
          );

        if (
          price <= 0
        ) {
          return 0;
        }

        return (
          prediction /
          price
        );
      },
    );

  const average =
    values.reduce(
      (total, value) =>
        total + value,
      0,
    ) /
    values.length;

  /*
   * 1 projected point per £1m
   * is treated as an excellent
   * value score.
   */

  return Math.round(
    clamp(
      average * 100,
      0,
      100,
    ),
  );
}

function calculateSquadRating({
  attack,
  midfield,
  defence,
  fixtures,
  value,
}) {
  const score =
    attack * 0.22 +
    midfield * 0.24 +
    defence * 0.22 +
    fixtures * 0.17 +
    value * 0.15;

  return Math.round(
    clamp(
      score,
      0,
      100,
    ),
  );
}

function findWeakestPlayer(
  players,
) {
  return [...players].sort(
    (a, b) =>
      safeNumber(
        a.prediction
          ?.predictedPoints,
      ) -
      safeNumber(
        b.prediction
          ?.predictedPoints,
      ),
  )[0];
}

function confidencePenalty(
  confidence,
) {
  switch (
    confidence
  ) {
    case "High":
      return 0;

    case "Medium":
      return 20;

    case "Low":
      return 40;

    default:
      return 30;
  }
}

function calculateRiskScore(
  player,
) {
  const expectedMinutes =
    safeNumber(
      player.prediction
        ?.expectedMinutes,
    );

  const minuteRisk =
    clamp(
      90 -
        expectedMinutes,
      0,
      90,
    );

  const confidenceRisk =
    confidencePenalty(
      player.prediction
        ?.confidence,
    );

  const injuryRisk =
    player.status &&
    player.status !== "a"
      ? 40
      : 0;

  return (
    minuteRisk +
    confidenceRisk +
    injuryRisk
  );
}

function findBiggestRisk(
  players,
) {
  return [...players].sort(
    (a, b) =>
      calculateRiskScore(
        b,
      ) -
      calculateRiskScore(
        a,
      ),
  )[0];
}

function simplifyPlayer(
  player,
) {
  if (!player) {
    return null;
  }

  return {
    id:
      player.id,

    name:
      player.name,

    webName:
      player.webName,

    team:
      player.team,

    position:
      player.position,

    price:
      player.price,

    totalPoints:
      player.totalPoints,

    form:
      player.form,

    status:
      player.status,

    prediction:
      player.prediction,

    fixture:
      player.fixture,

    historical:
      player.historical,
  };
}

export function analyseSquad(
  players,
) {
  const {
    startingXI,
    bench,
  } =
    selectBestXI(
      players,
    );

  const sortedStarters =
    sortByPrediction(
      startingXI,
    );

  const captain =
    sortedStarters[0] ||
    null;

  const viceCaptain =
    sortedStarters[1] ||
    null;

  const startingPoints =
    startingXI.reduce(
      (total, player) =>
        total +
        safeNumber(
          player.prediction
            ?.predictedPoints,
        ),
      0,
    );

  /*
   * Captain points are doubled,
   * therefore add the captain's
   * projection once more.
   */

  const captainBonus =
    safeNumber(
      captain?.prediction
        ?.predictedPoints,
    );

  const projectedPoints =
    startingPoints +
    captainBonus;

  const ratings = {
    attack:
      calculatePositionRating(
        players,
        "FWD",
      ),

    midfield:
      calculatePositionRating(
        players,
        "MID",
      ),

    defence:
      calculateDefenceRating(
        players,
      ),

    fixtures:
      calculateFixtureRating(
        players,
      ),

    value:
      calculateValueRating(
        players,
      ),
  };

  const squadRating =
    calculateSquadRating(
      ratings,
    );

  const weakestPlayer =
    findWeakestPlayer(
      players,
    );

  const biggestRisk =
    findBiggestRisk(
      players,
    );

  return {
    projectedPoints:
      Number(
        projectedPoints.toFixed(
          1,
        ),
      ),

    startingPoints:
      Number(
        startingPoints.toFixed(
          1,
        ),
      ),

    captainBonus:
      Number(
        captainBonus.toFixed(
          1,
        ),
      ),

    squadRating,

    captain:
      simplifyPlayer(
        captain,
      ),

    viceCaptain:
      simplifyPlayer(
        viceCaptain,
      ),

    bestXI:
      startingXI.map(
        simplifyPlayer,
      ),

    bench:
      bench.map(
        simplifyPlayer,
      ),

    ratings,

    weakestPlayer:
      simplifyPlayer(
        weakestPlayer,
      ),

    biggestRisk:
      simplifyPlayer(
        biggestRisk,
      ),
  };
}

export const squadRules = {
  squadSize:
    SQUAD_SIZE,

  budget:
    MAX_BUDGET,

  maxPlayersPerClub:
    MAX_PLAYERS_PER_TEAM,

  positions:
    POSITION_LIMITS,
};