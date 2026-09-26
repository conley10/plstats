const METRICS = [
  "shotsPer90",
  "keyPassesPer90",
  "xgPer90",
  "xaPer90",
  "xgChainPer90",
  "xgBuildupPer90",
];

/*
 * Position-specific metric weights.
 *
 * These are deliberately simple for V2.
 * They control the relative influence of each
 * available Understat metric rather than claiming
 * to identify detailed tactical roles.
 */
const POSITION_WEIGHTS = {
  Midfield: {
    shotsPer90: 0.75,
    keyPassesPer90: 1.15,
    xgPer90: 0.75,
    xaPer90: 1.1,
    xgChainPer90: 1.2,
    xgBuildupPer90: 1.3,
  },

  Attack: {
    shotsPer90: 1.2,
    keyPassesPer90: 0.9,
    xgPer90: 1.3,
    xaPer90: 1.0,
    xgChainPer90: 1.1,
    xgBuildupPer90: 0.6,
  },

  Defender: {
    shotsPer90: 0.5,
    keyPassesPer90: 0.7,
    xgPer90: 0.5,
    xaPer90: 0.7,
    xgChainPer90: 1.0,
    xgBuildupPer90: 1.4,
  },

  Goalkeeper: {
    shotsPer90: 1,
    keyPassesPer90: 1,
    xgPer90: 1,
    xaPer90: 1,
    xgChainPer90: 1,
    xgBuildupPer90: 1,
  },
};

const DEFAULT_WEIGHTS = {
  shotsPer90: 1,
  keyPassesPer90: 1,
  xgPer90: 1,
  xaPer90: 1,
  xgChainPer90: 1,
  xgBuildupPer90: 1,
};

function numberOrZero(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function per90(
  value,
  minutes,
) {
  const mins =
    numberOrZero(minutes);

  if (mins <= 0) {
    return 0;
  }

  return (
    numberOrZero(value) /
    mins *
    90
  );
}

function getPositionGroup(
  player,
) {
  const transfermarkt =
    String(
      player.transfermarktPosition ||
        "",
    ).trim();

  if (
    [
      "Defender",
      "Midfield",
      "Attack",
      "Goalkeeper",
    ].includes(
      transfermarkt,
    )
  ) {
    return transfermarkt;
  }

  /*
   * Fallback to Understat only when
   * Transfermarkt position is unavailable.
   */
  const position =
    String(
      player.position || "",
    ).toUpperCase();

  if (
    position.includes("GK")
  ) {
    return "Goalkeeper";
  }

  if (
    position.includes("F")
  ) {
    return "Attack";
  }

  if (
    position.includes("M")
  ) {
    return "Midfield";
  }

  if (
    position.includes("D")
  ) {
    return "Defender";
  }

  return "Unknown";
}

function buildProfile(player) {
  const minutes =
    numberOrZero(
      player.minutes,
    );

  return {
    ...player,

    positionGroup:
      getPositionGroup(
        player,
      ),

    shotsPer90:
      per90(
        player.shots,
        minutes,
      ),

    keyPassesPer90:
      per90(
        player.keyPasses,
        minutes,
      ),

    xgPer90:
      per90(
        player.xg,
        minutes,
      ),

    xaPer90:
      per90(
        player.xa,
        minutes,
      ),

    xgChainPer90:
      per90(
        player.xgChain,
        minutes,
      ),

    xgBuildupPer90:
      per90(
        player.xgBuildup,
        minutes,
      ),
  };
}

function calculateMetricStats(
  players,
) {
  const stats = {};

  for (
    const metric of METRICS
  ) {
    const values =
      players.map(
        (player) =>
          numberOrZero(
            player[metric],
          ),
      );

    const mean =
      values.reduce(
        (sum, value) =>
          sum + value,
        0,
      ) /
      Math.max(
        values.length,
        1,
      );

    const variance =
      values.reduce(
        (sum, value) =>
          sum +
          (
            value -
            mean
          ) ** 2,
        0,
      ) /
      Math.max(
        values.length,
        1,
      );

    const std =
      Math.sqrt(
        variance,
      );

    stats[metric] = {
      mean,
      std:
        std > 0
          ? std
          : 1,
    };
  }

  return stats;
}

function standardisedValue(
  player,
  metric,
  stats,
) {
  return (
    (
      numberOrZero(
        player[metric],
      ) -
      stats[metric].mean
    ) /
    stats[metric].std
  );
}

/*
 * Weighted Euclidean distance.
 *
 * Unlike our previous cosine implementation,
 * distance has a useful property here:
 * players must actually be close across the
 * standardised metrics to receive a high score.
 */
function calculateDistance(
  playerA,
  playerB,
  stats,
  weights,
) {
  let weightedSquaredDistance =
    0;

  let totalWeight = 0;

  for (
    const metric of METRICS
  ) {
    const weight =
      numberOrZero(
        weights[metric],
      ) || 1;

    const a =
      standardisedValue(
        playerA,
        metric,
        stats,
      );

    const b =
      standardisedValue(
        playerB,
        metric,
        stats,
      );

    weightedSquaredDistance +=
      weight *
      (
        a -
        b
      ) ** 2;

    totalWeight += weight;
  }

  return Math.sqrt(
    weightedSquaredDistance /
      Math.max(
        totalWeight,
        1,
      ),
  );
}

/*
 * Convert distance into a 0–100 score.
 *
 * distance = 0     -> 100
 * distance = 0.5   -> 66.7
 * distance = 1     -> 50
 * distance = 2     -> 33.3
 *
 * This is deliberately less generous than
 * the old cosine mapping.
 */
function distanceToSimilarity(
  distance,
) {
  return (
    100 /
    (
      1 +
      Math.max(
        distance,
        0,
      )
    )
  );
}

function metricDifference(
  target,
  candidate,
  metric,
  stats,
) {
  const targetZ =
    standardisedValue(
      target,
      metric,
      stats,
    );

  const candidateZ =
    standardisedValue(
      candidate,
      metric,
      stats,
    );

  return Math.abs(
    targetZ -
      candidateZ,
  );
}

function buildMetricMatches(
  target,
  candidate,
  stats,
) {
  const matches = {};

  for (const metric of METRICS) {
    const difference =
      metricDifference(
        target,
        candidate,
        metric,
        stats,
      );

    const match =
      distanceToSimilarity(
        difference,
      );

    matches[metric] =
      Number(
        match.toFixed(1),
      );
  }

  return matches;
}

function buildExplanation(
  target,
  candidate,
  stats,
) {
  const differences =
    METRICS.map(
      (metric) => ({
        metric,
        difference:
          metricDifference(
            target,
            candidate,
            metric,
            stats,
          ),
      }),
    ).sort(
      (a, b) =>
        a.difference -
        b.difference,
    );

  return {
    closestMetrics:
      differences
        .slice(0, 3)
        .map(
          (item) =>
            item.metric,
        ),

    biggestDifferences:
      [...differences]
        .reverse()
        .slice(0, 2)
        .map(
          (item) =>
            item.metric,
        ),
  };
}

function roundMetric(
  value,
) {
  return Number(
    numberOrZero(
      value,
    ).toFixed(2),
  );
}

export function findSimilarPlayers({
  targetPlayer,
  players,
  limit = 10,
  minMinutes = 900,
}) {
  if (!targetPlayer) {
    return [];
  }

  const targetProfile =
    buildProfile(
      targetPlayer,
    );

  const targetPosition =
    targetProfile.positionGroup;

  if (
    targetPosition ===
    "Unknown"
  ) {
    return [];
  }

  const comparisonPool =
    players
      .map(buildProfile)
      .filter(
        (player) =>
          String(
            player.understatId,
          ) !==
            String(
              targetPlayer.understatId,
            ) &&
          player.positionGroup ===
            targetPosition &&
          numberOrZero(
            player.minutes,
          ) >=
            minMinutes,
      );

  if (
    comparisonPool.length ===
    0
  ) {
    return [];
  }

  const statisticalPool = [
    targetProfile,
    ...comparisonPool,
  ];

  const stats =
    calculateMetricStats(
      statisticalPool,
    );

  const weights =
    POSITION_WEIGHTS[
      targetPosition
    ] ||
    DEFAULT_WEIGHTS;

  const results =
    comparisonPool.map(
      (player) => {
        const distance =
          calculateDistance(
            targetProfile,
            player,
            stats,
            weights,
          );

        const similarity =
          distanceToSimilarity(
            distance,
          );

        const explanation =
  buildExplanation(
    targetProfile,
    player,
    stats,
  );

const metricMatches =
  buildMetricMatches(
    targetProfile,
    player,
    stats,
  );

return {
  ...player,

          similarity:
            Number(
              similarity.toFixed(
                1,
              ),
            ),

          profileDistance:
            Number(
              distance.toFixed(
                3,
              ),
            ),
            metricMatches,

          similarityMetrics: {
            shotsPer90:
              roundMetric(
                player.shotsPer90,
              ),

            keyPassesPer90:
              roundMetric(
                player.keyPassesPer90,
              ),

            xgPer90:
              roundMetric(
                player.xgPer90,
              ),

            xaPer90:
              roundMetric(
                player.xaPer90,
              ),

            xgChainPer90:
              roundMetric(
                player.xgChainPer90,
              ),

            xgBuildupPer90:
              roundMetric(
                player.xgBuildupPer90,
              ),
          },

          explanation,
        };
      },
    );

  results.sort(
    (a, b) =>
      b.similarity -
      a.similarity,
  );

  return results.slice(
    0,
    limit,
  );
}

export {
  METRICS,
  POSITION_WEIGHTS,
  buildProfile,
  getPositionGroup,
};