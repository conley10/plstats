function numberOrZero(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function getPosition(player) {
  return (
    player.position?.shortName ??
    player.position ??
    null
  );
}

function getClubId(player) {
  return (
    player.team?.id ??
    player.teamId ??
    player.team ??
    null
  );
}

function getProjection(
  player,
  horizon = 3,
) {
  const multi =
    player.multiGameweek?.totals;

  if (
    multi &&
    multi[horizon] !== undefined
  ) {
    return numberOrZero(
      multi[horizon],
    );
  }

  return numberOrZero(
    player.prediction?.predictedPoints,
  );
}

function simplifyPlayer(
  player,
) {
  return {
    id: player.id,

    name: player.name,

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

    prediction:
      player.prediction,

    multiGameweek:
      player.multiGameweek,
  };
}

function countClubs(
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

function isClubCombinationLegal(
  remainingSquad,
  incomingPlayers,
) {
  const counts =
    countClubs(
      remainingSquad,
    );

  for (const incoming of incomingPlayers) {
    const clubId =
      getClubId(
        incoming,
      );

    if (!clubId) {
      continue;
    }

    const nextCount =
      (counts.get(clubId) ||
        0) + 1;

    if (nextCount > 3) {
      return false;
    }

    counts.set(
      clubId,
      nextCount,
    );
  }

  return true;
}

function createTransfer({
  outgoing,
  incoming,
  horizon,
}) {
  const outgoingProjection =
    getProjection(
      outgoing,
      horizon,
    );

  const incomingProjection =
    getProjection(
      incoming,
      horizon,
    );

  return {
    outgoingPlayer:
      simplifyPlayer(
        outgoing,
      ),

    incomingPlayer:
      simplifyPlayer(
        incoming,
      ),

    outgoingProjection:
      Number(
        outgoingProjection.toFixed(
          1,
        ),
      ),

    incomingProjection:
      Number(
        incomingProjection.toFixed(
          1,
        ),
      ),

    projectedGain:
      Number(
        (
          incomingProjection -
          outgoingProjection
        ).toFixed(1),
      ),

    costDifference:
      Number(
        (
          numberOrZero(
            incoming.price,
          ) -
          numberOrZero(
            outgoing.price,
          )
        ).toFixed(1),
      ),
  };
}

export function optimiseTwoTransfers({
  squadPlayers,
  candidatePlayers,
  remainingBudget = 0,
  horizon = 3,
  limit = 10,
}) {
  if (
    !Array.isArray(
      squadPlayers,
    ) ||
    squadPlayers.length !== 15
  ) {
    throw new Error(
      "A complete 15-player squad is required.",
    );
  }

  /*
   * We do not need to test every
   * combination of every squad player.
   *
   * Focus on the weakest eight players
   * across the chosen planning horizon.
   */
  const outgoingPool =
    [...squadPlayers]
      .sort(
        (a, b) =>
          getProjection(
            a,
            horizon,
          ) -
          getProjection(
            b,
            horizon,
          ),
      )
      .slice(0, 8);

  /*
   * Candidate pools are also trimmed.
   *
   * The route already supplies sensible
   * candidates, but this protects us
   * against excessive combinations.
   */
  const candidateByPosition =
    new Map();

  for (const candidate of candidatePlayers) {
    const position =
      getPosition(
        candidate,
      );

    if (!position) {
      continue;
    }

    if (
      candidate.status &&
      !["a", "d"].includes(
        candidate.status,
      )
    ) {
      continue;
    }

    if (
      !candidateByPosition.has(
        position,
      )
    ) {
      candidateByPosition.set(
        position,
        [],
      );
    }

    candidateByPosition
      .get(position)
      .push(candidate);
  }

  for (const [
    position,
    players,
  ] of candidateByPosition.entries()) {
    candidateByPosition.set(
      position,
      players
        .sort(
          (a, b) =>
            getProjection(
              b,
              horizon,
            ) -
            getProjection(
              a,
              horizon,
            ),
        )
        .slice(0, 25),
    );
  }

  const existingIds =
    new Set(
      squadPlayers.map(
        (player) =>
          player.id,
      ),
    );

  const plans = [];

  /*
   * Select every pair of outgoing
   * players from the weaker part of
   * the squad.
   */
  for (
    let firstIndex = 0;
    firstIndex <
    outgoingPool.length - 1;
    firstIndex += 1
  ) {
    for (
      let secondIndex =
        firstIndex + 1;
      secondIndex <
      outgoingPool.length;
      secondIndex += 1
    ) {
      const outgoingOne =
        outgoingPool[
          firstIndex
        ];

      const outgoingTwo =
        outgoingPool[
          secondIndex
        ];

      const positionOne =
        getPosition(
          outgoingOne,
        );

      const positionTwo =
        getPosition(
          outgoingTwo,
        );

      const candidatesOne =
        candidateByPosition.get(
          positionOne,
        ) || [];

      const candidatesTwo =
        candidateByPosition.get(
          positionTwo,
        ) || [];

      const remainingSquad =
        squadPlayers.filter(
          (player) =>
            player.id !==
              outgoingOne.id &&
            player.id !==
              outgoingTwo.id,
        );

      const outgoingValue =
        numberOrZero(
          outgoingOne.price,
        ) +
        numberOrZero(
          outgoingTwo.price,
        );

      const availableBudget =
        outgoingValue +
        numberOrZero(
          remainingBudget,
        );

      for (const incomingOne of candidatesOne) {
        if (
          existingIds.has(
            incomingOne.id,
          )
        ) {
          continue;
        }

        for (const incomingTwo of candidatesTwo) {
          if (
            incomingOne.id ===
            incomingTwo.id
          ) {
            continue;
          }

          if (
            existingIds.has(
              incomingTwo.id,
            )
          ) {
            continue;
          }

          const incomingCost =
            numberOrZero(
              incomingOne.price,
            ) +
            numberOrZero(
              incomingTwo.price,
            );

          if (
            incomingCost >
            availableBudget + 0.001
          ) {
            continue;
          }

          if (
            !isClubCombinationLegal(
              remainingSquad,
              [
                incomingOne,
                incomingTwo,
              ],
            )
          ) {
            continue;
          }

          const transferOne =
            createTransfer({
              outgoing:
                outgoingOne,

              incoming:
                incomingOne,

              horizon,
            });

          const transferTwo =
            createTransfer({
              outgoing:
                outgoingTwo,

              incoming:
                incomingTwo,

              horizon,
            });

          const currentProjection =
            transferOne.outgoingProjection +
            transferTwo.outgoingProjection;

          const newProjection =
            transferOne.incomingProjection +
            transferTwo.incomingProjection;

          const totalGain =
            newProjection -
            currentProjection;

          const bankAfter =
            availableBudget -
            incomingCost;

          plans.push({
            transfers: [
              transferOne,
              transferTwo,
            ],

            horizon,

            currentProjection:
              Number(
                currentProjection.toFixed(
                  1,
                ),
              ),

            newProjection:
              Number(
                newProjection.toFixed(
                  1,
                ),
              ),

            projectedGain:
              Number(
                totalGain.toFixed(
                  1,
                ),
              ),

            totalOutgoingCost:
              Number(
                outgoingValue.toFixed(
                  1,
                ),
              ),

            totalIncomingCost:
              Number(
                incomingCost.toFixed(
                  1,
                ),
              ),

            bankAfter:
              Number(
                bankAfter.toFixed(
                  1,
                ),
              ),
          });
        }
      }
    }
  }

  /*
   * Remove duplicate plans.
   *
   * This matters when two outgoing
   * players share the same position.
   */
  const uniquePlans =
    new Map();

  for (const plan of plans) {
    const key =
      plan.transfers
        .map(
          (transfer) =>
            `${transfer.outgoingPlayer.id}-${transfer.incomingPlayer.id}`,
        )
        .sort()
        .join("|");

    const existing =
      uniquePlans.get(
        key,
      );

    if (
      !existing ||
      plan.projectedGain >
        existing.projectedGain
    ) {
      uniquePlans.set(
        key,
        plan,
      );
    }
  }

  const rankedPlans =
    [...uniquePlans.values()]
      .sort(
        (a, b) =>
          b.projectedGain -
          a.projectedGain,
      )
      .slice(0, limit);

  return {
    horizon,

    plans:
      rankedPlans,

    combinationsChecked:
      plans.length,

    outgoingPoolSize:
      outgoingPool.length,
  };
}