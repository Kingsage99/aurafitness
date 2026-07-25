import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Server-authoritative gem awards/spends. The `protect_billing_columns_trigger`
// on `profiles` (added to stop gems being self-granted via a raw profile
// update) reverts `gamification.gems` on ANY write that isn't made as
// service_role — which correctly blocks cheating, but ALSO blocks the app's
// own legitimate reward paths (quests, weekly challenges, workout/meal
// completion, badges) and Store purchases, since those were all writing
// gems the same way: a plain client-authenticated `.update({gamification})`.
// This function is the one place gems actually change: it recomputes the
// amount itself from the same tables/formulas src/utils/gamification.js
// uses (never trusts a client-supplied amount or cost), then writes via a
// service-role client so the trigger's own check passes. Everything else in
// `gamification` (streaks, badges array, dailyQuests, purchasedItems, XP,
// etc.) is NOT gem-protected and keeps persisting exactly as it already did
// through the client's normal debounced autosave -- this function only ever
// touches `gems` plus the specific claimed/purchased marker needed so the
// SAME quest/challenge/item can't be replayed for repeat gems.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

// ─── Reward / price tables — kept in lockstep with src/utils/gamification.js
// and src/screens/StoreScreen.jsx. These are intentionally duplicated rather
// than imported (see notify-user's own comment: this project's edge
// functions deploy independently and stay self-contained on purpose) --
// if either source changes, mirror the change here too.

const QUEST_POOL: Record<string, number> = {
  complete_workout: 15, log_breakfast: 5, log_lunch: 5, log_dinner: 5,
  hit_calories: 20, log_3_meals: 20, maintain_streak: 10, hit_protein: 15,
  post_workout_or_meal: 15, react_10_posts: 15,
};

const WEEKLY_CHALLENGES: Record<string, { reward: number; target: number; progressField: "weeklyWorkoutsDone" | "weeklyGemsEarned" }> = {
  workouts_3: { reward: 60, target: 3, progressField: "weeklyWorkoutsDone" },
  gems_100: { reward: 50, target: 100, progressField: "weeklyGemsEarned" },
};

const BADGE_IDS = new Set([
  "first_step", "fuelled_up", "sweat_session",
  "streak_bronze", "streak_silver", "streak_gold",
  "workouts_bronze", "workouts_silver", "workouts_gold",
  "nutrition_bronze", "nutrition_silver", "nutrition_gold",
  "cookbook_bronze", "cookbook_silver", "cookbook_gold",
  "community_bronze", "community_silver", "community_gold",
  "perfect_week",
]);
const BADGE_GEM_REWARD = 50;
const MAX_BADGES_PER_CALL = 6; // generous headroom over the max plausible simultaneous unlocks

const WORKOUT_STREAK_MILESTONES: Record<number, number> = { 3: 25, 7: 75, 30: 300, 60: 500 };

const ITEM_COSTS: Record<string, number> = {
  // Lives/consumables (SHOP_ITEMS)
  extra_life: 50, revive_pet: 120, streak_freeze: 75,
  // Borders (STORE_BORDERS) -- frame_pro is subscription-granted, not purchasable here
  frame_default: 0, frame_neon: 200, frame_flame: 150, frame_rose: 250, frame_gold: 300, frame_crystal: 500,
  frame_cat: 400, frame_devil: 400, frame_fox: 400, frame_glitch: 400, frame_love: 400,
  frame_plant: 400, frame_reindeer: 400, frame_unicorn: 400, frame_witch: 400,
  // Banners (STORE_BANNERS)
  banner_none: 0, banner_default: 75, banner_sunset: 100, banner_beach: 150, banner_mountain: 150, banner_cat: 250,
  // Themes (STORE_THEMES)
  theme_default: 0, theme_dark: 200, theme_rose: 150, theme_ocean: 175,
};

type Gamification = {
  gems?: number;
  dailyQuests?: { date: string; completed: string[]; claimed: string[] };
  weeklyWorkoutsDone?: number;
  weeklyGemsEarned?: number;
  purchasedItems?: string[];
  // Written only by this function -- separate from dailyQuests.claimed /
  // weeklyChallenges.claimed (which the client also writes optimistically
  // for the UI) specifically so idempotency checks can't race a client write.
  gemsAwardedQuests?: { date: string; ids: string[] };
  gemsAwardedChallenges?: { week: string; ids: string[] };
  gemsAwardedBadges?: string[];
  [key: string]: unknown;
};

function getMondayDate(iso: string): string {
  const d = new Date(iso);
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: jsonHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401, headers: jsonHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Server not configured (missing secrets)" }), { status: 500, headers: jsonHeaders });
  }

  // Identify the caller from their own JWT -- there is no user_id input, so
  // there is no way to act on anyone's gems but your own.
  const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData?.user) {
    return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: jsonHeaders });
  }
  const userId = userData.user.id;

  let body: { action?: string; payload?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: jsonHeaders });
  }
  const { action, payload = {} } = body;
  if (!action) {
    return new Response(JSON.stringify({ error: "Missing action" }), { status: 400, headers: jsonHeaders });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: row, error: fetchError } = await supabase
    .from("profiles")
    .select("gamification")
    .eq("id", userId)
    .single();
  if (fetchError || !row) {
    return new Response(JSON.stringify({ error: fetchError?.message || "Profile not found" }), { status: 404, headers: jsonHeaders });
  }
  const g: Gamification = row.gamification || {};
  const currentGems = g.gems || 0;
  const todayKey = new Date().toISOString().slice(0, 10);

  let newGems = currentGems;
  let update: Record<string, unknown> = {};
  let amount = 0;
  let ok = true;
  let error: string | undefined;

  if (action === "claim_quest") {
    // Idempotency uses its OWN field (gemsAwardedQuests), never dailyQuests
    // itself -- the client also writes dailyQuests.claimed optimistically
    // (via its own debounced autosave, for the UI checkmark) for instant
    // feedback, and that write can race this one and land first. Checking
    // against a field only this function ever writes avoids that race
    // making a legitimate claim look like a replay.
    const questId = String(payload.questId || "");
    const reward = QUEST_POOL[questId];
    const dq = g.dailyQuests || { date: "", completed: [], claimed: [] };
    const awarded = g.gemsAwardedQuests?.date === todayKey ? g.gemsAwardedQuests.ids : [];
    if (!reward) { ok = false; error = "Unknown quest"; }
    else if (dq.date !== todayKey || !dq.completed.includes(questId) || awarded.includes(questId)) { ok = false; error = "Quest not claimable"; }
    else {
      amount = reward;
      newGems = currentGems + amount;
      update = { gems: newGems, gemsAwardedQuests: { date: todayKey, ids: [...awarded, questId] } };
    }
  } else if (action === "claim_challenge") {
    const challengeId = String(payload.challengeId || "");
    const ch = WEEKLY_CHALLENGES[challengeId];
    const thisMonday = getMondayDate(new Date().toISOString());
    const progress = ch ? (g[ch.progressField] as number) || 0 : 0;
    const awardedWk = g.gemsAwardedChallenges?.week === thisMonday ? g.gemsAwardedChallenges.ids : [];
    if (!ch) { ok = false; error = "Unknown challenge"; }
    else if (awardedWk.includes(challengeId) || progress < ch.target) { ok = false; error = "Challenge not claimable"; }
    else {
      amount = ch.reward;
      newGems = currentGems + amount;
      update = { gems: newGems, gemsAwardedChallenges: { week: thisMonday, ids: [...awardedWk, challengeId] } };
    }
  } else if (action === "award_action") {
    const kind = String(payload.kind || "");
    let base = 0;
    if (kind === "workout") {
      const setsCompleted = Number(payload.setsCompleted) || 0;
      const totalSets = Number(payload.totalSets) || 0;
      const ratio = totalSets > 0 ? setsCompleted / totalSets : 1;
      base = Math.max(10, Math.round(30 * Math.min(1, Math.max(0, ratio))));
      const workoutStreak = Number(payload.workoutStreak) || 0;
      base += WORKOUT_STREAK_MILESTONES[workoutStreak] || 0;
      if (payload.allWeekDone) base += 60;
    } else if (kind === "meal") {
      base = 5;
    } else if (kind === "onboarding") {
      base = 50;
    } else if (kind === "calorie_goal") {
      base = 20;
    } else if (kind === "badge_only") {
      base = 0;
    } else {
      ok = false; error = "Unknown award kind";
    }
    if (ok) {
      // Badges only ever pay out once, ever -- checked against this
      // function's own permanent record (gemsAwardedBadges), not the badges
      // array the client also writes, for the same race reason as quests/
      // challenges above. Otherwise the same badge could be reported as
      // "newly earned" on repeat calls and paid out every time.
      const alreadyAwarded = new Set(g.gemsAwardedBadges || []);
      const newBadgeIds = Array.isArray(payload.newBadgeIds) ? (payload.newBadgeIds as unknown[]).map(String) : [];
      const validBadges = [...new Set(newBadgeIds.filter(id => BADGE_IDS.has(id) && !alreadyAwarded.has(id)))].slice(0, MAX_BADGES_PER_CALL);
      amount = base + validBadges.length * BADGE_GEM_REWARD;
      newGems = currentGems + amount;
      update = validBadges.length > 0
        ? { gems: newGems, gemsAwardedBadges: [...alreadyAwarded, ...validBadges] }
        : { gems: newGems };
    }
  } else if (action === "apply_penalty") {
    // Both life-loss paths (missed calorie goal, broken workout streak) use
    // the same 25%-of-weeklyGemsEarned formula as loseLife() in
    // gamification.js -- no client-supplied amount, recomputed from the
    // server's own read of weeklyGemsEarned.
    const weeklyGemsEarned = Number(g.weeklyGemsEarned) || 0;
    const penalty = Math.floor(weeklyGemsEarned * 0.25);
    amount = penalty;
    newGems = Math.max(0, currentGems - penalty);
    update = { gems: newGems };
  } else if (action === "purchase_item") {
    const itemId = String(payload.itemId || "");
    const cost = ITEM_COSTS[itemId];
    if (cost === undefined) { ok = false; error = "Unknown item"; }
    else if (currentGems < cost) { ok = false; error = "Not enough gems"; }
    else {
      amount = cost;
      newGems = currentGems - cost;
      const purchased = g.purchasedItems || [];
      update = { gems: newGems, purchasedItems: purchased.includes(itemId) ? purchased : [...purchased, itemId] };
    }
  } else {
    ok = false; error = "Unknown action";
  }

  if (!ok) {
    return new Response(JSON.stringify({ ok: false, error, gems: currentGems }), { status: 400, headers: jsonHeaders });
  }

  // `profiles` has a single `gamification` jsonb column -- `update` above only
  // holds the specific fields this action changed, so merge them into the
  // full object we already read rather than writing them as top-level columns.
  const { error: updateError } = await supabase.from("profiles").update({ gamification: { ...g, ...update } }).eq("id", userId);
  if (updateError) {
    return new Response(JSON.stringify({ ok: false, error: updateError.message, gems: currentGems }), { status: 500, headers: jsonHeaders });
  }

  return new Response(JSON.stringify({ ok: true, gems: newGems, amount }), { status: 200, headers: jsonHeaders });
});
