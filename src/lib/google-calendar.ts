"use client";

import { App, type URLOpenListenerEvent } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { addDays } from "./dates";
import type { DatedItem, Plan } from "./scheduler";

/**
 * Direct Google Calendar sync, using the OAuth 2.0 "native app" PKCE flow
 * (https://developers.google.com/identity/protocols/oauth2/native-app):
 * no client secret, no backend — just an Android OAuth Client ID registered
 * against this app's package name + signing certificate. The system browser
 * (Chrome Custom Tabs via @capacitor/browser) handles the actual Google
 * sign-in/consent UI; the result comes back to the app via a custom-scheme
 * deep link that @capacitor/app's `appUrlOpen` listener picks up.
 *
 * This is additive to (not a replacement for) the .ics export in ics.ts —
 * that keeps working with zero setup; this pushes the same events straight
 * into the signed-in user's real Google Calendar.
 */

// From Google Cloud Console → APIs & Services → Credentials → the "Android"
// OAuth client created for package `com.diningcar.app`. Android client IDs
// aren't secret (there's no client_secret for this client type) — this is
// safe to ship in client code. NOTE: the reversed form of this exact ID is
// also baked into android/app/src/main/AndroidManifest.xml as the deep-link
// scheme that catches the OAuth redirect — the two must be changed together.
export const GOOGLE_OAUTH_CLIENT_ID = "1025433500830-ssp3pbce4bfha8f02el1vogt4ug9kdts.apps.googleusercontent.com";

const SCOPE = "https://www.googleapis.com/auth/calendar.events";
const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

function redirectUri(): string {
  const scheme = "com.googleusercontent.apps." + GOOGLE_OAUTH_CLIENT_ID.replace(/\.apps\.googleusercontent\.com$/, "");
  return `${scheme}:/oauth2redirect`;
}

// ---- PKCE + tiny token store (localStorage) ------------------------------

interface StoredTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // epoch ms
}

const TOKENS_KEY = "dining-car:google-tokens";
const VERIFIER_KEY = "dining-car:google-pkce-verifier";
const EVENT_MAP_KEY = "dining-car:google-event-map"; // our uid -> Google event id, for idempotent re-sync

function loadTokens(): StoredTokens | null {
  try {
    const raw = localStorage.getItem(TOKENS_KEY);
    return raw ? (JSON.parse(raw) as StoredTokens) : null;
  } catch {
    return null;
  }
}

function saveTokens(tokens: StoredTokens | null) {
  if (tokens) localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
  else localStorage.removeItem(TOKENS_KEY);
}

function loadEventMap(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(EVENT_MAP_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveEventMap(map: Record<string, string>) {
  localStorage.setItem(EVENT_MAP_KEY, JSON.stringify(map));
}

export function isConnected(): boolean {
  return loadTokens() !== null;
}

export function disconnect() {
  saveTokens(null);
  localStorage.removeItem(EVENT_MAP_KEY);
}

function base64url(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function randomVerifier(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64url(bytes.buffer);
}

async function challengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(digest);
}

/** Kicks off sign-in: opens the system browser to Google's consent screen. */
export async function connect(): Promise<void> {
  const verifier = randomVerifier();
  localStorage.setItem(VERIFIER_KEY, verifier);
  const challenge = await challengeFor(verifier);

  const params = new URLSearchParams({
    client_id: GOOGLE_OAUTH_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPE,
    code_challenge: challenge,
    code_challenge_method: "S256",
    access_type: "offline",
    prompt: "consent",
  });
  await Browser.open({ url: `${AUTH_ENDPOINT}?${params.toString()}` });
}

/** Call once at app startup: catches the OAuth redirect and finishes sign-in. */
export function registerRedirectListener(onResult: (ok: boolean, message?: string) => void) {
  return App.addListener("appUrlOpen", (event: URLOpenListenerEvent) => {
    if (!event.url.startsWith("com.googleusercontent.apps.")) return;
    void handleRedirect(event.url).then(
      () => onResult(true),
      (err) => onResult(false, (err as Error).message)
    );
    void Browser.close().catch(() => {});
  });
}

async function handleRedirect(url: string): Promise<void> {
  const code = new URL(url).searchParams.get("code");
  const verifier = localStorage.getItem(VERIFIER_KEY);
  if (!code || !verifier) throw new Error("Sign-in was cancelled or returned no authorization code.");

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_OAUTH_CLIENT_ID,
      code,
      code_verifier: verifier,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google sign-in failed (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number };
  saveTokens({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  });
  localStorage.removeItem(VERIFIER_KEY);
}

async function refreshAccessToken(tokens: StoredTokens): Promise<StoredTokens> {
  if (!tokens.refreshToken) throw new Error("Google Calendar connection expired — reconnect from the header button.");
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_OAUTH_CLIENT_ID,
      refresh_token: tokens.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Couldn't refresh the Google Calendar connection (${res.status}).`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  const next: StoredTokens = { ...tokens, accessToken: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  saveTokens(next);
  return next;
}

async function ensureAccessToken(): Promise<string> {
  let tokens = loadTokens();
  if (!tokens) throw new Error("Not connected to Google Calendar yet.");
  if (Date.now() > tokens.expiresAt - 60_000) tokens = await refreshAccessToken(tokens);
  return tokens.accessToken;
}

// ---- Event building (mirrors ics.ts) + sync -------------------------------

interface CalEvent {
  uid: string;
  resource: Record<string, unknown>;
}

/** Same three event kinds as buildCalendar() in ics.ts, as Calendar API resources. */
function buildEvents(items: DatedItem[], plan: Plan): CalEvent[] {
  const events: CalEvent[] = [];

  for (const item of items) {
    if (item.staple || !item.eatBy || (item.daysLeft ?? 0) < 0) continue;
    events.push({
      uid: `eatby-${item.id}`,
      resource: {
        summary: `${item.emoji} ${item.displayName} — eat by`,
        description: `Bought ${item.purchaseDate} for $${item.price.toFixed(2)}. Stored in the ${item.storage}. Source: USDA FoodKeeper.`,
        start: { date: item.eatBy },
        end: { date: addDays(item.eatBy, 1) },
        reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 15 * 60 }] },
        extendedProperties: { private: { diningCarUid: `eatby-${item.id}` } },
      },
    });
  }

  for (const night of plan.nights) {
    if (!night.recipe) continue;
    const label = night.dayOffset === 0 ? "Tonight" : "Dinner";
    events.push({
      uid: `dinner-${night.date}`,
      resource: {
        summary: `${night.recipe.emoji} ${label}: ${night.recipe.title}`,
        description: night.recipe.steps.join("\n"),
        start: { dateTime: `${night.date}T18:30:00`, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        end: { dateTime: `${night.date}T19:30:00`, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        extendedProperties: { private: { diningCarUid: `dinner-${night.date}` } },
      },
    });
  }

  for (const decision of plan.decisions) {
    if (decision.kind !== "freeze") continue;
    events.push({
      uid: `freeze-${decision.item.id}`,
      resource: {
        summary: `🧊 Freeze the ${decision.item.displayName.toLowerCase()} today`,
        description: `Frozen, it keeps until ${decision.goodUntil}.`,
        start: { date: decision.freezeBy },
        end: { date: addDays(decision.freezeBy, 1) },
        extendedProperties: { private: { diningCarUid: `freeze-${decision.item.id}` } },
      },
    });
  }

  return events;
}

export interface SyncResult {
  created: number;
  updated: number;
  failed: number;
}

/**
 * Pushes eat-by alerts, dinner plans, and freeze reminders straight into the
 * signed-in user's primary Google Calendar. Re-running it updates
 * previously-created events in place (tracked by a local uid -> event-id
 * map) instead of duplicating them, so it's safe to call every time the
 * plan changes.
 */
export async function syncToGoogleCalendar(items: DatedItem[], plan: Plan): Promise<SyncResult> {
  const token = await ensureAccessToken();
  const events = buildEvents(items, plan);
  const map = loadEventMap();
  const result: SyncResult = { created: 0, updated: 0, failed: 0 };

  for (const { uid, resource } of events) {
    const existingId = map[uid];
    try {
      if (existingId) {
        const res = await fetch(`${CALENDAR_API}/${existingId}`, {
          method: "PATCH",
          headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
          body: JSON.stringify(resource),
        });
        if (res.status === 404) {
          // The user deleted it on their end — recreate it.
          delete map[uid];
        } else if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        } else {
          result.updated++;
          continue;
        }
      }
      const res = await fetch(CALENDAR_API, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify(resource),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const created = (await res.json()) as { id: string };
      map[uid] = created.id;
      result.created++;
    } catch {
      result.failed++;
    }
  }

  saveEventMap(map);
  return result;
}
