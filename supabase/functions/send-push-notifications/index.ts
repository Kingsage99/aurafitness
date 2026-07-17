import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Sends real Web Push notifications (RFC 8291 message encryption + RFC 8292
// VAPID). No third-party push library — implemented directly with Deno's
// native crypto.subtle, since `web-push` (npm) assumes a Node runtime.
//
// Six modes, chosen by the caller via body.check, each scheduled on its own
// pg_cron job (fixed UTC times — see the migration that schedules them):
//   "calorie-outcome"   — morning. Yesterday's calorie log vs target; if
//                         actually missed (logged but off-target — matches
//                         checkCaloriePenalty exactly; not_logged is NOT a
//                         miss) and the user still has lives, applies the
//                         life-loss mutation directly to profiles.gamification
//                         (ported from loseLife/checkCaloriePenalty in
//                         src/utils/gamification.js) so the death/lost-a-life
//                         notification lands even if the app is never opened.
//                         If the client already processed this day first
//                         (lastCalorieDate already equals yesterday), this is
//                         a no-op — the dedup guard is the same field the
//                         client itself uses, so whichever side gets there
//                         first "wins" and the other silently skips.
//   "workout-nudge"     — morning. Heads-up naming today's scheduled session
//                         when it's a training day.
//   "quest-check"       — midday. Nudges about today's unfinished daily
//                         quests and the gems left on the table.
//   "daily-engagement"  — evening. Un-logged workout (escalates to a streak-
//                         risk warning once workoutStreak >= 2) or un-logged
//                         meals today.
//   "weekly-summary"    — Monday morning. Last week's workout count + a
//                         teaser of this week's scheduled training days.
//   "pet-checkin"       — re-engagement ping for accounts with zero activity
//                         (no workout/meal/post) in the last 3 days.
//
// Every check is gated by TWO independent things before it ever reaches the
// send step: (1) profile_data.notificationsEnabled (master kill switch) and
// profile_data.notificationPrefs.<category> (per-category opt-out, default
// on), both read fresh per profile; (2) the notification_log table, so a
// re-run or a slightly-early/late cron fire can't double-send the same
// category within its dedup window.
//
// Auth: this function has no end-user JWT (it's invoked by pg_cron), so it's
// deployed with verify_jwt=false and instead gated by a shared secret header
// (X-Cron-Secret) checked against the CRON_SECRET secret.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const DAY_IDS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

// % of that week's earned gems lost when all 3 lives are gone — mirrors
// LIFE_PENALTY_PCT in src/utils/gamification.js (must stay in sync).
const LIFE_PENALTY_PCT = 0.25;

// ─── base64url helpers ──────────────────────────────────────────────────────

function b64urlToBytes(b64url: string): Uint8Array {
  const padding = "=".repeat((4 - (b64url.length % 4)) % 4);
  const b64 = (b64url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) { out.set(p, offset); offset += p.length; }
  return out;
}

// ─── VAPID (RFC 8292) ───────────────────────────────────────────────────────

async function importVapidPrivateKey(publicKeyB64url: string, privateKeyB64url: string): Promise<CryptoKey> {
  const publicBytes = b64urlToBytes(publicKeyB64url); // 65 bytes: 0x04 || X(32) || Y(32)
  const jwk = {
    kty: "EC",
    crv: "P-256",
    x: bytesToB64url(publicBytes.slice(1, 33)),
    y: bytesToB64url(publicBytes.slice(33, 65)),
    d: privateKeyB64url,
    ext: true,
  };
  return crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}

async function buildVapidHeader(endpoint: string, vapidPrivateKey: CryptoKey, vapidPublicKeyB64url: string, subject: string): Promise<string> {
  const aud = new URL(endpoint).origin;
  const header = { typ: "JWT", alg: "ES256" };
  const payload = { aud, exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, sub: subject };
  const enc = new TextEncoder();
  const headerB64 = bytesToB64url(enc.encode(JSON.stringify(header)));
  const payloadB64 = bytesToB64url(enc.encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    vapidPrivateKey,
    enc.encode(signingInput),
  );
  const jwt = `${signingInput}.${bytesToB64url(new Uint8Array(signature))}`;
  return `vapid t=${jwt}, k=${vapidPublicKeyB64url}`;
}

// ─── Payload encryption (RFC 8291 "aes128gcm") ─────────────────────────────

async function encryptPayload(
  payloadJson: string,
  subscriberPublicKeyB64url: string,
  subscriberAuthB64url: string,
): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const subscriberPublicBytes = b64urlToBytes(subscriberPublicKeyB64url); // 65 bytes raw EC point
  const authSecret = b64urlToBytes(subscriberAuthB64url); // 16 bytes

  // 1. Ephemeral ECDH keypair for this message.
  const ephemeralKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"],
  ) as CryptoKeyPair;
  const ephemeralPublicRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", ephemeralKeyPair.publicKey),
  );

  // 2. ECDH shared secret with the subscriber's public key.
  const subscriberPublicKey = await crypto.subtle.importKey(
    "raw", subscriberPublicBytes, { name: "ECDH", namedCurve: "P-256" }, false, [],
  );
  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: subscriberPublicKey }, ephemeralKeyPair.privateKey, 256,
  );
  const ecdhSecretKey = await crypto.subtle.importKey("raw", sharedSecretBits, "HKDF", false, ["deriveBits"]);

  // 3. Derive IKM: HKDF(ikm=ecdh_secret, salt=auth_secret,
  //    info="WebPush: info"||0x00||ua_public||as_public, length=32).
  const keyInfo = concatBytes(
    enc.encode("WebPush: info"), new Uint8Array([0]),
    subscriberPublicBytes, ephemeralPublicRaw,
  );
  const ikmBits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: authSecret, info: keyInfo }, ecdhSecretKey, 256,
  );
  const ikmKey = await crypto.subtle.importKey("raw", ikmBits, "HKDF", false, ["deriveBits"]);

  // 4. Fresh 16-byte salt for this message; derive CEK (16 bytes) + NONCE (12 bytes).
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cekInfo = concatBytes(enc.encode("Content-Encoding: aes128gcm"), new Uint8Array([0]));
  const nonceInfo = concatBytes(enc.encode("Content-Encoding: nonce"), new Uint8Array([0]));
  const cekBits = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info: cekInfo }, ikmKey, 128);
  const nonceBits = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info: nonceInfo }, ikmKey, 96);

  const cekKey = await crypto.subtle.importKey("raw", cekBits, "AES-GCM", false, ["encrypt"]);

  // 5. Encrypt: plaintext || 0x02 (last-record delimiter, RFC 8188 §2.1).
  const plaintext = concatBytes(enc.encode(payloadJson), new Uint8Array([2]));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: new Uint8Array(nonceBits) }, cekKey, plaintext),
  );

  // 6. RFC 8188 header: salt(16) || record_size(4, big-endian) || idlen(1) || keyid(65).
  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096, false);
  const header = concatBytes(salt, recordSize, new Uint8Array([ephemeralPublicRaw.length]), ephemeralPublicRaw);

  return concatBytes(header, ciphertext);
}

// ─── Sending ────────────────────────────────────────────────────────────────

async function sendPushToSubscription(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url?: string },
  vapidPrivateKey: CryptoKey,
  vapidPublicKeyB64url: string,
  vapidSubject: string,
): Promise<{ ok: boolean; status: number }> {
  const body = await encryptPayload(JSON.stringify(payload), sub.p256dh, sub.auth);
  const vapidHeader = await buildVapidHeader(sub.endpoint, vapidPrivateKey, vapidPublicKeyB64url, vapidSubject);

  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      "TTL": "86400",
      "Authorization": vapidHeader,
    },
    body,
  });
  return { ok: res.ok, status: res.status };
}

// ─── Domain logic — ported from src/utils/gamification.js and
// src/utils/nutrition.js, which Deno can't import directly (Vite client
// code) — this mirrors the existing calorieGoalStatus/isTrainingDayToday
// duplication pattern already in this file, not new debt.

function calorieGoalStatus(dailyCalorieTarget: number | null | undefined, dayLog: { calories?: number } | null): "no_target" | "not_logged" | "missed" | "hit" {
  if (!dailyCalorieTarget || dailyCalorieTarget <= 0) return "no_target";
  if (!dayLog) return "not_logged";
  const calories = dayLog.calories || 0;
  const threshold = dailyCalorieTarget * 0.2;
  return Math.abs(calories - dailyCalorieTarget) > threshold ? "missed" : "hit";
}

function isTrainingDayToday(profileData: Record<string, unknown>, customSchedule: Record<string, unknown> | null, todayDayId: string): boolean {
  if (profileData?.planningMode === "custom") {
    return !!(customSchedule && customSchedule[todayDayId]);
  }
  const trainingDays = (profileData?.trainingDays as string[]) || [];
  return trainingDays.includes(todayDayId);
}

// A user-set schedule override (routine's per-date entry, or custom_schedule's
// per-weekday entry) carries its own label directly — no need to replicate
// the client's algorithmic buildWeeklyPlan generation to get it. When there's
// no override (a purely algorithmic plan), we fall back to generic copy
// rather than guess a split name server-side.
function todaysWorkoutLabel(profile: { routine?: Record<string, unknown>; custom_schedule?: Record<string, unknown> }, todayKey: string, todayDayId: string): string | null {
  const routineEntry = profile.routine?.[todayKey] as { label?: string; name?: string } | undefined;
  if (routineEntry?.label) return routineEntry.label;
  if (routineEntry?.name) return routineEntry.name;
  const customEntry = profile.custom_schedule?.[todayDayId] as { label?: string } | undefined;
  if (customEntry?.label) return customEntry.label;
  return null;
}

function countTrainingDaysThisWeek(profileData: Record<string, unknown>, customSchedule: Record<string, unknown> | null): number {
  if (profileData?.planningMode === "custom") {
    return Object.keys(customSchedule || {}).length;
  }
  return ((profileData?.trainingDays as string[]) || []).length;
}

// QUEST_POOL + getDailyQuests ported verbatim from src/utils/gamification.js
// — must stay byte-for-byte identical so the 3 quests this function names
// are the same 3 the client shows.
const QUEST_POOL = [
  { id: "complete_workout", label: "Complete today's workout", reward: 15 },
  { id: "log_breakfast", label: "Log breakfast", reward: 5 },
  { id: "log_lunch", label: "Log lunch", reward: 5 },
  { id: "log_dinner", label: "Log dinner", reward: 5 },
  { id: "hit_calories", label: "Hit your calorie goal", reward: 20 },
  { id: "log_3_meals", label: "Log 3 meals today", reward: 20 },
  { id: "maintain_streak", label: "Keep your streak alive", reward: 10 },
  { id: "hit_protein", label: "Hit your protein goal", reward: 15 },
];

function getDailyQuests(dateStr: string) {
  const seed = dateStr.replace(/-/g, "").split("").reduce((acc, c) => acc * 31 + c.charCodeAt(0), 1);
  const indices: number[] = [];
  let s = seed;
  while (indices.length < 3) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const idx = Math.abs(s) % QUEST_POOL.length;
    if (!indices.includes(idx)) indices.push(idx);
  }
  return indices.map((i) => QUEST_POOL[i]);
}

// ─── Notification prefs + dedup log ─────────────────────────────────────────

function categoryEnabled(profileData: Record<string, unknown>, category: string): boolean {
  if (profileData?.notificationsEnabled === false) return false;
  const prefs = (profileData?.notificationPrefs as Record<string, boolean>) || {};
  return prefs[category] !== false;
}

// Short window — this only guards against the SAME scheduled job accidentally
// firing twice (a retry, a manual re-invoke), not against legitimate distinct
// nudges later the same day (a morning workout-nudge and an evening
// daily-engagement reminder are different messages and both should land).
// weekly-summary gets a long window since it really is meant to be weekly.
const DEDUP_WINDOW_HOURS: Record<string, number> = {
  weeklySummary: 144,
};
const DEFAULT_DEDUP_WINDOW_HOURS = 3;

// deno-lint-ignore no-explicit-any
async function alreadySentRecently(supabase: any, userId: string, category: string): Promise<boolean> {
  const hours = DEDUP_WINDOW_HOURS[category] ?? DEFAULT_DEDUP_WINDOW_HOURS;
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
  const { data } = await supabase
    .from("notification_log")
    .select("id")
    .eq("user_id", userId)
    .eq("category", category)
    .gte("sent_at", since)
    .limit(1);
  return !!(data && data.length);
}

// deno-lint-ignore no-explicit-any
async function logSent(supabase: any, userId: string, category: string) {
  await supabase.from("notification_log").insert({ user_id: userId, category });
}

type Msg = { title: string; body: string; url?: string };
type Result = { category: string; message: Msg } | null;

// deno-lint-ignore no-explicit-any
type Profile = any;

// deno-lint-ignore no-explicit-any
async function evalCalorieOutcome(supabase: any, profile: Profile, ctx: Ctx): Promise<Result> {
  const g = profile.gamification || {};
  // Same field, same dedup rule the client's checkCaloriePenalty already
  // uses — whichever side (this cron, or the user opening the app) gets to
  // a given "yesterday" first wins; the other sees it's already set and
  // no-ops. Prevents double life-loss without any locking.
  if (g.lastCalorieDate === ctx.yesterdayKey) return null;

  const profileData = profile.profile_data || {};
  const dailyCalorieTarget = profileData.dailyCalorieTarget as number | undefined;
  const yesterdayLog = profile.daily_log_date === ctx.yesterdayKey ? (profile.daily_log as { calories?: number }) : null;
  const status = calorieGoalStatus(dailyCalorieTarget, yesterdayLog);
  // Matches checkCaloriePenalty exactly: only a logged-but-off-target day
  // costs a life. Forgetting to log entirely ("not_logged") never does —
  // don't punish silence harder than a genuine miss.
  if (status !== "missed") return null;

  const lives = typeof g.lives === "number" ? g.lives : 3;
  if (lives <= 0) return null; // already dead — reviving is a Store purchase, not this check's job

  const newLives = lives - 1;
  const died = newLives === 0;
  let updatedG: Record<string, unknown> = { ...g, lives: newLives, lastCalorieDate: ctx.yesterdayKey, calorieGoalStreak: 0 };
  if (died) {
    // Mirrors loseLife() in src/utils/gamification.js: losing the last life
    // also costs a cut of this week's earned gems.
    const penalty = Math.floor(((g.weeklyGemsEarned as number) || 0) * LIFE_PENALTY_PCT);
    updatedG = { ...updatedG, gems: Math.max(0, ((g.gems as number) || 0) - penalty) };
  }

  const { error } = await supabase.from("profiles").update({ gamification: updatedG }).eq("id", profile.id);
  if (error) {
    console.error("calorie-outcome life-loss write failed:", error.message);
    return null;
  }

  const message = died
    ? { title: "💀 Your pet has died", body: "Your pet ran out of lives — revive it in the Store to bring it back.", url: "/" }
    : { title: "💔 Your pet lost a life", body: "You missed yesterday's calorie goal.", url: "/" };
  return { category: "petCare", message };
}

function evalWorkoutNudge(profile: Profile, ctx: Ctx): Result {
  const profileData = profile.profile_data || {};
  if (!isTrainingDayToday(profileData, profile.custom_schedule, ctx.todayDayId)) return null;
  const label = todaysWorkoutLabel(profile, ctx.todayKey, ctx.todayDayId);
  return {
    category: "workoutReminders",
    message: {
      title: label ? `Today's session: ${label} 💪` : "Training day today 💪",
      body: label ? `${label} is on your schedule — go get it.` : "You've got a workout scheduled today.",
      url: "/",
    },
  };
}

function evalQuestCheck(profile: Profile, ctx: Ctx): Result {
  const g = profile.gamification || {};
  const todays = getDailyQuests(ctx.todayKey);
  const completed: string[] = (g.dailyQuests?.date === ctx.todayKey) ? (g.dailyQuests.completed || []) : [];
  const remaining = todays.filter((q) => !completed.includes(q.id));
  if (remaining.length === 0) return null;
  const gemsLeft = remaining.reduce((s, q) => s + q.reward, 0);
  return {
    category: "questsAndChallenges",
    message: {
      title: `${remaining.length} quest${remaining.length > 1 ? "s" : ""} still up for grabs`,
      body: `${gemsLeft} 💎 waiting — ${remaining.map((q) => q.label).join(", ")}.`,
      url: "/",
    },
  };
}

// deno-lint-ignore no-explicit-any
async function evalDailyEngagement(supabase: any, profile: Profile, ctx: Ctx): Promise<Result> {
  const profileData = profile.profile_data || {};
  const g = profile.gamification || {};
  if (isTrainingDayToday(profileData, profile.custom_schedule, ctx.todayDayId)) {
    const { count } = await supabase
      .from("workout_history")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .gte("completed_at", `${ctx.todayKey}T00:00:00Z`);
    if (!count) {
      const streak = g.workoutStreak || 0;
      const label = todaysWorkoutLabel(profile, ctx.todayKey, ctx.todayDayId);
      if (streak >= 2) {
        return {
          category: "streakAlerts",
          message: {
            title: `🔥 Don't lose your ${streak}-day streak!`,
            body: label ? `You haven't done ${label} yet today.` : "You haven't worked out yet today.",
            url: "/",
          },
        };
      }
      return {
        category: "workoutReminders",
        message: {
          title: "Time for your workout 💪",
          body: label ? `Today's ${label} — let's get it done.` : "Today's a training day — let's get it done.",
          url: "/",
        },
      };
    }
  }
  const { count: mealCount } = await supabase
    .from("nutrition_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .eq("date", ctx.todayKey);
  if (!mealCount) {
    return {
      category: "mealReminders",
      message: { title: "Don't forget to log your meals 🥗", body: "Keep your nutrition tracking on point today.", url: "/" },
    };
  }
  return null;
}

// deno-lint-ignore no-explicit-any
async function evalWeeklySummary(supabase: any, profile: Profile, ctx: Ctx): Promise<Result> {
  const g = profile.gamification || {};
  const profileData = profile.profile_data || {};
  const { count } = await supabase
    .from("workout_history")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .gte("completed_at", `${ctx.lastMondayKey}T00:00:00Z`)
    .lt("completed_at", `${ctx.thisMondayKey}T00:00:00Z`);
  const streak = g.workoutStreak || 0;
  const trainingDaysCount = countTrainingDaysThisWeek(profileData, profile.custom_schedule);
  const workouts = count || 0;
  return {
    category: "weeklySummary",
    message: {
      title: `Last week: ${workouts} workout${workouts === 1 ? "" : "s"} 🎉`,
      body: streak > 0
        ? `${streak}-day streak going strong. ${trainingDaysCount} session${trainingDaysCount === 1 ? "" : "s"} on deck this week.`
        : `${trainingDaysCount} session${trainingDaysCount === 1 ? "" : "s"} on deck this week — let's start a new streak.`,
      url: "/",
    },
  };
}

// deno-lint-ignore no-explicit-any
async function evalPetCheckin(supabase: any, profile: Profile, ctx: Ctx): Promise<Result> {
  const since = ctx.threeDaysAgoIso;
  const { count: recentWorkouts } = await supabase.from("workout_history").select("id", { count: "exact", head: true }).eq("user_id", profile.id).gte("completed_at", since);
  if (recentWorkouts) return null;
  const { count: recentMeals } = await supabase.from("nutrition_log").select("id", { count: "exact", head: true }).eq("user_id", profile.id).gte("logged_at", since);
  if (recentMeals) return null;
  const { count: recentPosts } = await supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", profile.id).gte("created_at", since);
  if (recentPosts) return null;
  return {
    category: "petCare",
    message: { title: "🥺 Your pet misses you", body: "It's been a few days — come back and check in!", url: "/" },
  };
}

interface Ctx {
  todayKey: string;
  yesterdayKey: string;
  todayDayId: string;
  lastMondayKey: string;
  thisMondayKey: string;
  threeDaysAgoIso: string;
}

const CHECK_TYPES = ["calorie-outcome", "workout-nudge", "quest-check", "daily-engagement", "weekly-summary", "pet-checkin"] as const;
type CheckType = typeof CHECK_TYPES[number];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: jsonHeaders });
  }

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
  }

  // Note: this is a plain "VAPID_PUBLIC_KEY" secret, distinct from the client's
  // VITE_VAPID_PUBLIC_KEY env var — the VITE_ prefix is a Vite-bundling
  // convention only, meaningless (and not auto-injected) in this Deno runtime.
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKeyRaw = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!vapidPublicKey || !vapidPrivateKeyRaw || !vapidSubject || !supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Server not configured (missing secrets)" }), { status: 500, headers: jsonHeaders });
  }

  let body: { check?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: jsonHeaders });
  }
  const check = body.check as CheckType;
  if (!CHECK_TYPES.includes(check)) {
    return new Response(JSON.stringify({ error: `body.check must be one of: ${CHECK_TYPES.join(", ")}` }), { status: 400, headers: jsonHeaders });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const vapidPrivateKey = await importVapidPrivateKey(vapidPublicKey, vapidPrivateKeyRaw);

  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const yesterday = new Date(now); yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);
  const todayDayId = DAY_IDS[(now.getUTCDay() + 6) % 7];
  const thisMonday = new Date(now); thisMonday.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7));
  const thisMondayKey = thisMonday.toISOString().slice(0, 10);
  const lastMonday = new Date(thisMonday); lastMonday.setUTCDate(thisMonday.getUTCDate() - 7);
  const lastMondayKey = lastMonday.toISOString().slice(0, 10);
  const threeDaysAgo = new Date(now); threeDaysAgo.setUTCDate(now.getUTCDate() - 3);
  const ctx: Ctx = { todayKey, yesterdayKey, todayDayId, lastMondayKey, thisMondayKey, threeDaysAgoIso: threeDaysAgo.toISOString() };

  // Only users who have at least one push subscription are worth checking.
  const { data: subs, error: subsError } = await supabase
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth");
  if (subsError) {
    return new Response(JSON.stringify({ error: subsError.message }), { status: 500, headers: jsonHeaders });
  }
  const userIds = [...new Set((subs || []).map((s) => s.user_id))];
  if (userIds.length === 0) {
    return new Response(JSON.stringify({ sent: 0, checked: 0 }), { status: 200, headers: jsonHeaders });
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, profile_data, gamification, daily_log_date, daily_log, custom_schedule, routine")
    .in("id", userIds);
  if (profilesError) {
    return new Response(JSON.stringify({ error: profilesError.message }), { status: 500, headers: jsonHeaders });
  }

  let sent = 0;
  let skippedPrefs = 0;
  let skippedDedup = 0;
  const staleEndpoints: string[] = [];

  for (const profile of profiles || []) {
    const profileData = (profile.profile_data as Record<string, unknown>) || {};

    let result: Result;
    switch (check) {
      case "calorie-outcome": result = await evalCalorieOutcome(supabase, profile, ctx); break;
      case "workout-nudge": result = evalWorkoutNudge(profile, ctx); break;
      case "quest-check": result = evalQuestCheck(profile, ctx); break;
      case "daily-engagement": result = await evalDailyEngagement(supabase, profile, ctx); break;
      case "weekly-summary": result = await evalWeeklySummary(supabase, profile, ctx); break;
      case "pet-checkin": result = await evalPetCheckin(supabase, profile, ctx); break;
    }
    if (!result) continue;

    if (!categoryEnabled(profileData, result.category)) { skippedPrefs++; continue; }
    if (await alreadySentRecently(supabase, profile.id, result.category)) { skippedDedup++; continue; }

    const userSubs = (subs || []).filter((s) => s.user_id === profile.id);
    let deliveredAny = false;
    for (const sub of userSubs) {
      try {
        const res = await sendPushToSubscription(sub, result.message, vapidPrivateKey, vapidPublicKey, vapidSubject);
        if (res.ok) { sent++; deliveredAny = true; }
        else if (res.status === 404 || res.status === 410) staleEndpoints.push(sub.endpoint);
      } catch (err) {
        console.error("push send failed:", (err as Error).message);
      }
    }
    if (deliveredAny) await logSent(supabase, profile.id, result.category);
  }

  if (staleEndpoints.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", staleEndpoints);
  }

  return new Response(
    JSON.stringify({ sent, checked: (profiles || []).length, skippedPrefs, skippedDedup, staleRemoved: staleEndpoints.length }),
    { status: 200, headers: jsonHeaders },
  );
});
