export type Score = {
  homeScore: number;
  awayScore: number;
};

export type ScoringRules = {
  exactScorePoints: number;
  outcomePoints: number;
  oneTeamScorePoints: number;
  goalDifferencePoints: number;
};

export const defaultScoringRules: ScoringRules = {
  exactScorePoints: 10,
  outcomePoints: 5,
  oneTeamScorePoints: 2,
  goalDifferencePoints: 2,
};

function outcome(score: Score) {
  if (score.homeScore > score.awayScore) return "home";
  if (score.homeScore < score.awayScore) return "away";
  return "draw";
}

export function calculateMatchPoints(
  prediction: Score,
  result: Score,
  rules: ScoringRules = defaultScoringRules,
) {
  const exactScore =
    prediction.homeScore === result.homeScore &&
    prediction.awayScore === result.awayScore;

  if (exactScore) return rules.exactScorePoints;

  let points = 0;

  if (outcome(prediction) === outcome(result)) points += rules.outcomePoints;
  if (prediction.homeScore === result.homeScore) {
    points += rules.oneTeamScorePoints;
  }
  if (prediction.awayScore === result.awayScore) {
    points += rules.oneTeamScorePoints;
  }
  if (
    prediction.homeScore - prediction.awayScore ===
    result.homeScore - result.awayScore
  ) {
    points += rules.goalDifferencePoints;
  }

  return points;
}

export function calculatePrizePool(
  paidParticipants: number,
  entryFee: number,
  split = { first: 70, second: 20, third: 10 },
) {
  const total = paidParticipants * entryFee;

  return {
    total,
    first: total * (split.first / 100),
    second: total * (split.second / 100),
    third: total * (split.third / 100),
  };
}
