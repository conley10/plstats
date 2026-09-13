function clamp(
  value,
  min,
  max,
) {
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

function sigmoid(value) {
  return 1 / (1 + Math.exp(-value));
}

function fixtureScore(difficulty) {
  const value = safeNumber(difficulty);

  /*
   * FPL fixture difficulty:
   *
   * 1 = easiest
   * 5 = hardest
   */

  switch (value) {
    case 1:
      return 1;

    case 2:
      return 0.8;

    case 3:
      return 0.6;

    case 4:
      return 0.35;

    case 5:
      return 0.15;

    default:
      return 0.5;
  }
}

function estimateMinutes(player) {
  const chance =
    player.chanceOfPlayingNextRound;

  if (
    chance !== null &&
    chance !== undefined
  ) {
    return clamp(
      (Number(chance) / 100) * 90,
      0,
      90,
    );
  }

  const seasonMinutes =
    safeNumber(player.minutes);

  if (seasonMinutes <= 0) {
    return 45;
  }

  /*
   * Players with significant season
   * minutes are assumed increasingly
   * likely to start.
   */

  return clamp(
    55 +
      Math.min(
        seasonMinutes / 100,
        35,
      ),
    45,
    90,
  );
}

function calculateGoalProbability({
  currentXg,
  historicalXgPer90,
  expectedMinutes,
  fixtureMultiplier,
}) {
  const current =
    safeNumber(currentXg);

  const historical =
    safeNumber(
      historicalXgPer90,
    );

  const minutesFactor =
    expectedMinutes / 90;

  const expectedGoals =
    (
      historical * 0.65 +
      Math.min(
        current / 5,
        1,
      ) *
        0.35
    ) *
    minutesFactor *
    fixtureMultiplier;

  /*
   * Poisson probability:
   * P(at least one goal)
   * = 1 - e^-lambda
   */

  const probability =
    1 -
    Math.exp(
      -Math.max(
        expectedGoals,
        0,
      ),
    );

  return clamp(
    probability * 100,
    0,
    95,
  );
}

function calculateAssistProbability({
  currentXa,
  historicalXaPer90,
  expectedMinutes,
  fixtureMultiplier,
}) {
  const current =
    safeNumber(currentXa);

  const historical =
    safeNumber(
      historicalXaPer90,
    );

  const minutesFactor =
    expectedMinutes / 90;

  const expectedAssists =
    (
      historical * 0.65 +
      Math.min(
        current / 5,
        1,
      ) *
        0.35
    ) *
    minutesFactor *
    fixtureMultiplier;

  const probability =
    1 -
    Math.exp(
      -Math.max(
        expectedAssists,
        0,
      ),
    );

  return clamp(
    probability * 100,
    0,
    90,
  );
}

export function createPlayerPrediction({
  player,
  historical,
  fixture,
}) {
  const form =
    safeNumber(player.form);

  const fplExpectedPoints =
    safeNumber(
      player.expectedPoints,
    );

  const pointsPerGame =
    safeNumber(
      player.pointsPerGame,
    );

  const historyXg =
    safeNumber(
      historical.xgPer90,
    );

  const historyXa =
    safeNumber(
      historical.xaPer90,
    );

  const fixtureDifficulty =
    safeNumber(
      fixture?.difficulty,
    ) || 3;

  const fixtureValue =
    fixtureScore(
      fixtureDifficulty,
    );

  const fixtureMultiplier =
    0.7 +
    fixtureValue * 0.6;

  const expectedMinutes =
    estimateMinutes(player);

  const minutesFactor =
    expectedMinutes / 90;

  /*
   * PLStats V1 prediction model.
   *
   * This is deliberately transparent.
   * Later we can replace these weights
   * with trained ML coefficients.
   */

  const formComponent =
    form * 0.27;

  const fplExpectedComponent =
    fplExpectedPoints * 0.25;

  const pointsComponent =
    pointsPerGame * 0.15;

  const attackingComponent =
    (
      historyXg * 4 +
      historyXa * 3
    ) *
    0.18;

  const fixtureComponent =
    fixtureValue * 10 * 0.15;

  let predictedPoints =
    formComponent +
    fplExpectedComponent +
    pointsComponent +
    attackingComponent +
    fixtureComponent;

  predictedPoints *=
    minutesFactor;

  predictedPoints = clamp(
    predictedPoints,
    0,
    18,
  );

  const goalProbability =
    calculateGoalProbability({
      currentXg:
        player.expectedGoals,

      historicalXgPer90:
        historical.xgPer90,

      expectedMinutes,

      fixtureMultiplier,
    });

  const assistProbability =
    calculateAssistProbability({
      currentXa:
        player.expectedAssists,

      historicalXaPer90:
        historical.xaPer90,

      expectedMinutes,

      fixtureMultiplier,
    });

  /*
   * These probabilities use the
   * predicted points value as the
   * main signal.
   *
   * We will eventually replace these
   * with models trained against
   * gameweek-level historical data.
   */

  const fivePlusProbability =
    sigmoid(
      (predictedPoints - 4.5) /
        1.8,
    ) * 100;

  const tenPlusProbability =
    sigmoid(
      (predictedPoints - 9.5) /
        1.8,
    ) * 100;

  const twoPlusProbability =
    sigmoid(
      (predictedPoints - 1.8) /
        1.5,
    ) * 100;

  const confidenceInputs = [
    historical.seasonCount > 0,
    historical.minutes > 900,
    expectedMinutes >= 60,
    player.status === "a",
    fixture !== null,
  ];

  const confidenceScore =
    confidenceInputs.filter(
      Boolean,
    ).length / confidenceInputs.length;

  let confidence = "Low";

  if (confidenceScore >= 0.8) {
    confidence = "High";
  } else if (
    confidenceScore >= 0.5
  ) {
    confidence = "Medium";
  }

  return {
    predictedPoints: Number(
      predictedPoints.toFixed(1),
    ),

    expectedMinutes:
      Math.round(expectedMinutes),

    goalProbability: Number(
      goalProbability.toFixed(1),
    ),

    assistProbability: Number(
      assistProbability.toFixed(1),
    ),

    twoPlusProbability: Number(
      twoPlusProbability.toFixed(1),
    ),

    fivePlusProbability: Number(
      fivePlusProbability.toFixed(1),
    ),

    tenPlusProbability: Number(
      tenPlusProbability.toFixed(1),
    ),

    fixtureDifficulty,

    confidence,

    model: "PLStats V1",
  };
}