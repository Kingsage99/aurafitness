import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Client-triggered push for events the calling user's own session just
// witnessed (e.g. "your pet just died right now") — distinct from
// send-push-notifications (cron-only, shared-secret auth, batch-checks all
// users) and notify-friend-post (DB-webhook-only). This one is called
// directly from the browser with the user's own Supabase session, so it's
// secured by verify_jwt=true instead of a shared secret, and can ONLY ever
// send to the caller's own account — there's no target_user_id input, so
// there's no cross-user spam vector to worry about.
//
// VAPID/Web Push crypto helpers duplicated from send-push-notifications /
// notify-friend-post rather than shared via an import map — same rationale
// as notify-friend-post's own comment: these deploy independently, and
// keeping each self-contained is simpler than wiring shared-module imports
// for three small functions.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

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

async function importVapidPrivateKey(publicKeyB64url: string, privateKeyB64url: string): Promise<CryptoKey> {
  const publicBytes = b64urlToBytes(publicKeyB64url);
  const jwk = {
    kty: "EC", crv: "P-256",
    x: bytesToB64url(publicBytes.slice(1, 33)),
    y: bytesToB64url(publicBytes.slice(33, 65)),
    d: privateKeyB64url, ext: true,
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
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, vapidPrivateKey, enc.encode(signingInput));
  const jwt = `${signingInput}.${bytesToB64url(new Uint8Array(signature))}`;
  return `vapid t=${jwt}, k=${vapidPublicKeyB64url}`;
}

async function encryptPayload(payloadJson: string, subscriberPublicKeyB64url: string, subscriberAuthB64url: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const subscriberPublicBytes = b64urlToBytes(subscriberPublicKeyB64url);
  const authSecret = b64urlToBytes(subscriberAuthB64url);

  const ephemeralKeyPair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]) as CryptoKeyPair;
  const ephemeralPublicRaw = new Uint8Array(await crypto.subtle.exportKey("raw", ephemeralKeyPair.publicKey));

  const subscriberPublicKey = await crypto.subtle.importKey("raw", subscriberPublicBytes, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const sharedSecretBits = await crypto.subtle.deriveBits({ name: "ECDH", public: subscriberPublicKey }, ephemeralKeyPair.privateKey, 256);
  const ecdhSecretKey = await crypto.subtle.importKey("raw", sharedSecretBits, "HKDF", false, ["deriveBits"]);

  const keyInfo = concatBytes(enc.encode("WebPush: info"), new Uint8Array([0]), subscriberPublicBytes, ephemeralPublicRaw);
  const ikmBits = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: authSecret, info: keyInfo }, ecdhSecretKey, 256);
  const ikmKey = await crypto.subtle.importKey("raw", ikmBits, "HKDF", false, ["deriveBits"]);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cekInfo = concatBytes(enc.encode("Content-Encoding: aes128gcm"), new Uint8Array([0]));
  const nonceInfo = concatBytes(enc.encode("Content-Encoding: nonce"), new Uint8Array([0]));
  const cekBits = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info: cekInfo }, ikmKey, 128);
  const nonceBits = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info: nonceInfo }, ikmKey, 96);
  const cekKey = await crypto.subtle.importKey("raw", cekBits, "AES-GCM", false, ["encrypt"]);

  const plaintext = concatBytes(enc.encode(payloadJson), new Uint8Array([2]));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: new Uint8Array(nonceBits) }, cekKey, plaintext));

  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096, false);
  const header = concatBytes(salt, recordSize, new Uint8Array([ephemeralPublicRaw.length]), ephemeralPublicRaw);
  return concatBytes(header, ciphertext);
}

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
    headers: { "Content-Type": "application/octet-stream", "Content-Encoding": "aes128gcm", "TTL": "86400", "Authorization": vapidHeader },
    body,
  });
  return { ok: res.ok, status: res.status };
}

function categoryEnabled(profileData: Record<string, unknown>, category: string): boolean {
  if (profileData?.notificationsEnabled === false) return false;
  const prefs = (profileData?.notificationPrefs as Record<string, boolean>) || {};
  return prefs[category] !== false;
}

const ALLOWED_CATEGORIES = ["petCare", "workoutReminders", "mealReminders", "streakAlerts", "socialActivity", "questsAndChallenges", "weeklySummary"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: jsonHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401, headers: jsonHeaders });
  }

  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKeyRaw = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!vapidPublicKey || !vapidPrivateKeyRaw || !vapidSubject || !supabaseUrl || !anonKey || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Server not configured (missing secrets)" }), { status: 500, headers: jsonHeaders });
  }

  // Identify the caller from their own JWT — this is what makes self-only
  // targeting safe: there is no way to pass a different user's id in.
  const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData?.user) {
    return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: jsonHeaders });
  }
  const userId = userData.user.id;

  let body: { title?: string; body?: string; url?: string; category?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: jsonHeaders });
  }
  const { title, body: messageBody, url, category } = body;
  if (!title || !messageBody || !category || !ALLOWED_CATEGORIES.includes(category)) {
    return new Response(JSON.stringify({ error: `title, body, and a valid category (${ALLOWED_CATEGORIES.join(", ")}) are required` }), { status: 400, headers: jsonHeaders });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("profile_data")
    .eq("id", userId)
    .single();
  if (profileError) {
    return new Response(JSON.stringify({ error: profileError.message }), { status: 500, headers: jsonHeaders });
  }
  const profileData = (profile?.profile_data as Record<string, unknown>) || {};
  if (!categoryEnabled(profileData, category)) {
    return new Response(JSON.stringify({ sent: 0, skipped: "category disabled" }), { status: 200, headers: jsonHeaders });
  }

  const { data: subs, error: subsError } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (subsError) {
    return new Response(JSON.stringify({ error: subsError.message }), { status: 500, headers: jsonHeaders });
  }
  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ sent: 0, skipped: "no subscriptions" }), { status: 200, headers: jsonHeaders });
  }

  const vapidPrivateKey = await importVapidPrivateKey(vapidPublicKey, vapidPrivateKeyRaw);
  const message = { title, body: messageBody, url: url || "/" };

  let sent = 0;
  const staleEndpoints: string[] = [];
  for (const sub of subs) {
    try {
      const res = await sendPushToSubscription(sub, message, vapidPrivateKey, vapidPublicKey, vapidSubject);
      if (res.ok) sent++;
      else if (res.status === 404 || res.status === 410) staleEndpoints.push(sub.endpoint);
    } catch (err) {
      console.error("push send failed:", (err as Error).message);
    }
  }
  if (staleEndpoints.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", staleEndpoints);
  }
  if (sent > 0) {
    await supabase.from("notification_log").insert({ user_id: userId, category });
  }

  return new Response(JSON.stringify({ sent, staleRemoved: staleEndpoints.length }), { status: 200, headers: jsonHeaders });
});
