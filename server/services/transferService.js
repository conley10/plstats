function numberOrZero(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function getClubId(player) {
  return (
    player.team?.id ??
    player.teamId ??
    player.team ??
    null
  );
}

function getPosition(player) {
  return (
    player.position?.shortName ??
    player.position ??
    null
  );
}

function getProjectionTotal(
  player,
  horizon = 1,
) {
  const totals =
    player.multiGameweek?.totals;

  if (!totals) {
    return numberOrZero(
      player.prediction?.predictedPoints,
    );
  }

  return numberOrZero(
    totals[horizon],
  );
}

function calculateValueScore(
  player,
  horizon,
) {
  const price =
    numberOrZero(player.price);

  if (price <= 0) {
    return 0;
  }

  const projection =
    getProjectionTotal(
      player,
      horizon,
    );

  /*
   * Convert the total back into an
   * approximate per-GW projection
   * before calculating value.
   */
  const perGameweek =
    projection / horizon;

  return perGameweek / price;
}

function getConfidenceScore(player) {
  switch (
    player.prediction?.confidence
  ) {
    case "High":
      return 1;

    case "Medium":
      return 0.7;

    case "Low":
      return 0.4;

    default:
      return 0.5;
  }
}

function getFixtureRunScore(
  player,
  horizon,
) {
  const fixtures =
    player.multiGameweek
      ?.gameweeks
      ?.slice(0, horizon) ||
    [];

  const difficulties =
    fixtures.flatMap(
      (gameweek) =>
        gameweek.fixtures?.map(
          (fixture) =>
            numberOrZero(
              fixture.difficulty,
            ),
        ) || [],
    );

  if (
    difficulties.length === 0
  ) {
    return 0.5;
  }

  const average =
    difficulties.reduce(
      (total, difficulty) =>
        total + difficulty,
      0,
    ) /
    difficulties.length;

  /*
   * FPL difficulty:
   * 1 easiest
   * 5 hardest
   */
  return Math.max(
    Math.min(
      (6 - average) / 5,
      1,
    ),
    0,
  );
}

function calculateRecommendationScore({
  candidate,
  outgoingPlayer,
  horizon,
}) {
  const candidateProjection =
    getProjectionTotal(
      candidate,
      horizon,
    );

  const outgoingProjection =
    getProjectionTotal(
      outgoingPlayer,
      horizon,
    );

  const predictedGain =
    candidateProjection -
    outgoingProjection;

  /*
   * Normalise gain relative to the
   * chosen number of gameweeks.
   */
  const gainPerGameweek =
    predictedGain / horizon;

  const normalisedGain =
    Math.max(
      Math.min(
        gainPerGameweek / 5,
        1,
      ),
      -1,
    );

  const valueScore =
    Math.min(
      calculateValueScore(
        candidate,
        horizon,
      ) / 1.2,
      1,
    );

  const fixtureScore =
    getFixtureRunScore(
      candidate,
      horizon,
    );

  const confidenceScore =
    getConfidenceScore(
      candidate,
    );

  /*
   * PLStats Transfer Ranking V2
   *
   * 65% projected improvement
   * 15% value
   * 10% fixture run
   * 10% model confidence
   */
  return (
    normalisedGain * 0.65 +
    valueScore * 0.15 +
    fixtureScore * 0.1 +
    confidenceScore * 0.1
  );
}

function countPlayersByClub(
  players,
) {
  const counts =
    new Map();

  for (const player of players) {
    const clubId =
      getClubId(player);

    if (!clubId) {
      continue;
    }

    counts.set(
      clubId,
      (counts.get(clubId) || 0) +
        1,
    );
  }

  return counts;
}

function simplifyTransferPlayer(
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
      numberOrZero(
        player.price,
      ),

    form:
      numberOrZero(
        player.form,
      ),

    totalPoints:
      numberOrZero(
        player.totalPoints,
      ),

    status:
      player.status,

    news:
      player.news || "",

    fixture:
      player.fixture,

    prediction:
      player.prediction,

    multiGameweek:
      player.multiGameweek,
  };
}

export function findWeakestTransferCandidate(
  squadPlayers,
  horizon = 1,
) {
  if (
    !Array.isArray(
      squadPlayers,
    ) ||
    squadPlayers.length === 0
  ) {
    return null;
  }

  return [...squadPlayers].sort(
    (a, b) =>
      getProjectionTotal(
        a,
        horizon,
      ) -
      getProjectionTotal(
        b,
        horizon,
      ),
  )[0];
}

function calculateGain(
  incoming,
  outgoing,
  horizon,
) {
  return Number(
    (
      getProjectionTotal(
        incoming,
        horizon,
      ) -
      getProjectionTotal(
        outgoing,
        horizon,
      )
    ).toFixed(1),
  );
}

export function recommendTransfers({
  squadPlayers,
  candidatePlayers,
  outgoingPlayerId,
  remainingBudget = 0,
  horizon = 1,
  limit = 10,
}) {
  const outgoingPlayer =
    squadPlayers.find(
      (player) =>
        player.id ===
        Number(
          outgoingPlayerId,
        ),
    );

  if (!outgoingPlayer) {
    throw new Error(
      "Outgoing player is not part of the current squad.",
    );
  }

  const outgoingPosition =
    getPosition(
      outgoingPlayer,
    );

  const availableBudget =
    numberOrZero(
      remainingBudget,
    ) +
    numberOrZero(
      outgoingPlayer.price,
    );

  const remainingSquad =
    squadPlayers.filter(
      (player) =>
        player.id !==
        outgoingPlayer.id,
    );

  const existingIds =
    new Set(
      squadPlayers.map(
        (player) =>
          player.id,
      ),
    );

  const clubCounts =
    countPlayersByClub(
      remainingSquad,
    );

  const recommendations =
    candidatePlayers
      .filter(
        (candidate) => {
          if (
            existingIds.has(
              candidate.id,
            )
          ) {
            return false;
          }

          if (
            getPosition(
              candidate,
            ) !==
            outgoingPosition
          ) {
            return false;
          }

          if (
            numberOrZero(
              candidate.price,
            ) >
            availableBudget
          ) {
            return false;
          }

          const candidateClub =
            getClubId(
              candidate,
            );

          const clubCount =
            clubCounts.get(
              candidateClub,
            ) || 0;

          if (
            clubCount >= 3
          ) {
            return false;
          }

          if (
            candidate.status &&
            !["a", "d"].includes(
              candidate.status,
            )
          ) {
            return false;
          }

          return true;
        },
      )
      .map(
        (candidate) => {
          const costDifference =
            numberOrZero(
              candidate.price,
            ) -
            numberOrZero(
              outgoingPlayer.price,
            );

          const newRemainingBudget =
            remainingBudget -
            costDifference;

          const gains = {
            1:
              calculateGain(
                candidate,
                outgoingPlayer,
                1,
              ),

            3:
              calculateGain(
                candidate,
                outgoingPlayer,
                3,
              ),

            5:
              calculateGain(
                candidate,
                outgoingPlayer,
                5,
              ),
          };

          return {
            outgoingPlayer:
              simplifyTransferPlayer(
                outgoingPlayer,
              ),

            incomingPlayer:
              simplifyTransferPlayer(
                candidate,
              ),

            horizon,

            predictedGain:
              gains[horizon],

            gains,

            outgoingProjection:
              Number(
                getProjectionTotal(
                  outgoingPlayer,
                  horizon,
                ).toFixed(1),
              ),

            incomingProjection:
              Number(
                getProjectionTotal(
                  candidate,
                  horizon,
                ).toFixed(1),
              ),

            costDifference:
              Number(
                costDifference.toFixed(
                  1,
                ),
              ),

            remainingBudget:
              Number(
                newRemainingBudget.toFixed(
                  1,
                ),
              ),

            recommendationScore:
              Number(
                calculateRecommendationScore({
                  candidate,

                  outgoingPlayer,

                  horizon,
                }).toFixed(3),
              ),
          };
        },
      )
      .sort(
        (a, b) => {
          if (
            b.recommendationScore !==
            a.recommendationScore
          ) {
            return (
              b.recommendationScore -
              a.recommendationScore
            );
          }

          return (
            b.predictedGain -
            a.predictedGain
          );
        },
      )
      .slice(0, limit);

  return {
    horizon,

    outgoingPlayer:
      simplifyTransferPlayer(
        outgoingPlayer,
      ),

    availableBudget:
      Number(
        availableBudget.toFixed(
          1,
        ),
      ),

    currentProjection:
      Number(
        getProjectionTotal(
          outgoingPlayer,
          horizon,
        ).toFixed(1),
      ),

    recommendations,
  };
}