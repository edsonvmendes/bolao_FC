"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type ScoringRules = {
  exact_score_points: number;
  outcome_points: number;
  one_team_score_points: number;
  goal_difference_points: number;
};

type MatchScore = {
  id: string;
  home_score: number | null;
  away_score: number | null;
};

type PredictionScore = {
  id: string;
  match_id: string;
  predicted_home_score: number;
  predicted_away_score: number;
};

function outcome(value: number) {
  if (value > 0) return 1;
  if (value < 0) return -1;
  return 0;
}

function calculatePoints(
  prediction: PredictionScore,
  match: MatchScore,
  rules: ScoringRules,
) {
  const realHome = match.home_score ?? 0;
  const realAway = match.away_score ?? 0;

  if (
    prediction.predicted_home_score === realHome &&
    prediction.predicted_away_score === realAway
  ) {
    return {
      points: rules.exact_score_points,
      exact_score_hit: true,
      outcome_hit: true,
      one_team_score_hits: 2,
      goal_difference_hit: true,
    };
  }

  const outcomeHit =
    outcome(prediction.predicted_home_score - prediction.predicted_away_score) ===
    outcome(realHome - realAway);
  const oneTeamScoreHits =
    Number(prediction.predicted_home_score === realHome) +
    Number(prediction.predicted_away_score === realAway);
  const goalDifferenceHit =
    prediction.predicted_home_score - prediction.predicted_away_score ===
    realHome - realAway;

  return {
    points:
      (outcomeHit ? rules.outcome_points : 0) +
      oneTeamScoreHits * rules.one_team_score_points +
      (goalDifferenceHit ? rules.goal_difference_points : 0),
    exact_score_hit: false,
    outcome_hit: outcomeHit,
    one_team_score_hits: oneTeamScoreHits,
    goal_difference_hit: goalDifferenceHit,
  };
}

export async function setPayment(formData: FormData) {
  const supabase = await createClient();
  const participantId = String(formData.get("participant_id") ?? "");
  const paid = String(formData.get("paid") ?? "") === "true";

  const { error } = await supabase.rpc("admin_set_payment", {
    target_participant_id: participantId,
    paid,
  });

  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin");
  redirect("/admin");
}

export async function setMatchResult(formData: FormData) {
  const supabase = await createClient();
  const matchId = String(formData.get("match_id") ?? "");
  const homeGoals = Number(formData.get("home_score"));
  const awayGoals = Number(formData.get("away_score"));

  const { error } = await supabase.rpc("admin_set_match_result", {
    target_match_id: matchId,
    home_goals: homeGoals,
    away_goals: awayGoals,
  });

  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin");
  redirect("/admin");
}

export async function recalculatePool(formData: FormData) {
  const supabase = await createClient();
  const poolId = String(formData.get("pool_id") ?? "");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") redirect("/admin?error=admin_required");

  try {
    const admin = createAdminClient();

    const { data: rules, error: rulesError } = await admin
      .from("scoring_rules")
      .select(
        "exact_score_points, outcome_points, one_team_score_points, goal_difference_points",
      )
      .eq("pool_id", poolId)
      .single<ScoringRules>();

    if (rulesError) throw rulesError;

    const { data: matches, error: matchesError } = await admin
      .from("matches")
      .select("id, home_score, away_score")
      .eq("pool_id", poolId)
      .not("home_score", "is", null)
      .not("away_score", "is", null)
      .returns<MatchScore[]>();

    if (matchesError) throw matchesError;

    const { data: predictions, error: predictionsError } = await admin
      .from("predictions")
      .select("id, match_id, predicted_home_score, predicted_away_score")
      .eq("pool_id", poolId)
      .returns<PredictionScore[]>();

    if (predictionsError) throw predictionsError;

    const matchesById = new Map(matches.map((match) => [match.id, match]));
    const updates = predictions
      .map((prediction) => {
        const match = matchesById.get(prediction.match_id);
        if (!match) return null;

        return admin
          .from("predictions")
          .update(calculatePoints(prediction, match, rules))
          .eq("id", prediction.id);
      })
      .filter(Boolean);

    const results = await Promise.all(updates);
    const updateError = results.find((result) => result?.error)?.error;

    if (updateError) throw updateError;
  } catch (error) {
    const message = error instanceof Error ? error.message : "recalculate_failed";
    redirect(`/admin?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/admin");
  revalidatePath("/ranking");
  redirect("/admin?recalculated=1");
}
