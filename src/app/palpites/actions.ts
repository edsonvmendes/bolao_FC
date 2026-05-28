"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function joinPool(formData: FormData) {
  const poolId = String(formData.get("pool_id") ?? "");
  const supabase = await createClient();

  if (!poolId) redirect("/palpites?error=pool_not_found");

  const { error } = await supabase.rpc("join_pool", {
    target_pool_id: poolId,
  });

  if (error) redirect(`/palpites?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/palpites");
  redirect("/palpites");
}

export async function savePredictions(formData: FormData) {
  const supabase = await createClient();
  const poolId = String(formData.get("pool_id") ?? "");
  const matchIds = formData.getAll("match_id").map(String);

  if (!poolId || matchIds.length === 0) {
    redirect("/palpites?error=missing_predictions");
  }

  const predictions = matchIds
    .map((matchId) => {
      const homeValue = formData.get(`home_${matchId}`);
      const awayValue = formData.get(`away_${matchId}`);

      if (typeof homeValue !== "string" || typeof awayValue !== "string") return null;
      if (!homeValue.trim() || !awayValue.trim()) return null;

      const home = Number(homeValue);
      const away = Number(awayValue);

      if (!Number.isInteger(home) || !Number.isInteger(away)) return null;
      if (home < 0 || away < 0) return null;

      return {
        match_id: matchId,
        home_score: home,
        away_score: away,
      };
    })
    .filter(Boolean);

  const { error } = await supabase.rpc("save_my_predictions", {
    target_pool_id: poolId,
    predictions,
  });

  if (error) redirect(`/palpites?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/palpites");
  revalidatePath("/ranking");
  redirect("/ranking?saved=1");
}
