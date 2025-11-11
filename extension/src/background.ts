/// <reference types="chrome" />

const GITHUB_HOST = "github.com";
// Backend REST API base used for obtaining OAuth redirect URLs.
const API_BASE_URL = "https://ai-readme-generator-be-912048666815.us-central1.run.app";
// Frontend host used during the OAuth completion step (where tokens land in localStorage).
const FRONTEND_HOST_URL = "https://ai-readme-generator-912048666815.us-central1.run.app";
const REPOSITORIES_STORAGE_KEY = "userRepositories";

interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

interface UserRepository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  private: boolean;
}

interface StoredRepositories {
  repositories: UserRepository[];
  totalCount?: number;
  fetchedAt: number;
}

type ExtensionInboundMessage =
  | { type: "GET_AUTH_STATUS" }
  | { type: "START_AUTH" }
  | { type: string };

interface AuthStatusResponse {
  tokens?: AuthTokens;
  repositories?: UserRepository[];
  totalCount?: number;
}

interface AuthStartResponse {
  ok: boolean;
  error?: string;
}

let pendingAuthTabId: number | null = null;
let pendingAuthWindowId: number | null = null;

chrome.runtime.onInstalled.addListener(async () => {
  // Ensure we start with a clean slate if previous builds stored legacy keys.
  const keysToRemove = ["legacyAuthToken", REPOSITORIES_STORAGE_KEY];
  if (keysToRemove.length > 0) {
    await chrome.storage.local.remove(keysToRemove);
  }
});

chrome.tabs.onUpdated.addListener((tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
  if (changeInfo.status !== "complete" || !tab.url) return;
  try {
    const url = new URL(tab.url);
    if (url.hostname === GITHUB_HOST) {
      void sendCheckAuthWithRetry(tabId);
    }
  } catch (error) {
    console.warn("README AI extension: failed to parse tab URL", error);
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab.url) {
      const url = new URL(tab.url);
      if (url.hostname === GITHUB_HOST) {
        void sendCheckAuthWithRetry(tabId);
      }
    }
  } catch {
    // ignore
  }
});

async function sendCheckAuthWithRetry(tabId: number, maxAttempts = 5, initialDelayMs = 200): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const ok = await sendCheckAuthOnce(tabId);
    if (ok) return;
    // Try window.postMessage injection as fallback on last attempt.
    if (attempt === maxAttempts) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          world: "MAIN",
          func: () => {
            window.postMessage({ source: "readme-ai", type: "CHECK_AUTH" }, "*");
          }
        });
      } catch { /* ignore */ }
      return;
    }
    await delay(initialDelayMs * attempt); // simple linear backoff
  }
}

function sendCheckAuthOnce(tabId: number): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: "CHECK_AUTH" }, () => {
      const err = chrome.runtime.lastError;
      if (err) {
        // Silently retry without spamming the console.
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

chrome.runtime.onMessage.addListener((message: ExtensionInboundMessage, sender: chrome.runtime.MessageSender, sendResponse: (response: AuthStatusResponse | AuthStartResponse | void) => void): boolean | void => {
  if (!message || typeof message.type !== "string") {
    return undefined;
  }

  if (message.type === "GET_AUTH_STATUS") {
    void (async () => {
      const tokens = await getStoredTokens();
      if (!tokens) {
        sendResponse({ tokens: undefined } satisfies AuthStatusResponse);
        return;
      }

      const cached = await ensureRepositories(tokens.accessToken, true);
      sendResponse({
        tokens,
        repositories: cached?.repositories,
        totalCount: cached?.totalCount
      } satisfies AuthStatusResponse);
    })();
    return true;
  }

  if (message.type === "START_AUTH") {
    void startAuthFlow()
      .then(() => {
        void broadcastAuthSuccess();
        sendResponse({ ok: true } satisfies AuthStartResponse);
      })
      .catch((error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("README AI extension: auth flow failed", errorMessage);
        void broadcastToGithubTabs({ type: "AUTH_FAILURE", error: errorMessage });
        sendResponse({ ok: false, error: errorMessage } satisfies AuthStartResponse);
      });
    return true;
  }

  return undefined;
});

// Auth flow: call backend /api/v1/auth/login to get oauth_url, open a popup window
// where the web app handles OAuth and stores access_token in localStorage. When the
// popup redirects back to the frontend, we poll localStorage for the token and persist
// it in extension storage.
async function startAuthFlow(): Promise<void> {
  const loginUrl = new URL("/api/v1/auth/login", API_BASE_URL).toString();
  const res = await fetch(loginUrl, { method: "GET", credentials: "omit" });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Login endpoint failed: ${res.status}. Response: ${errorText}`);
  }

  const json = (await res.json()) as { status?: string; oauth_url?: string };
  if (json.status !== "oauth_redirect" || !json.oauth_url) {
    throw new Error("Unexpected login response shape");
  }

  const { tabId, windowId } = await openAuthWindow(json.oauth_url, 500, 650, true);
  pendingAuthTabId = tabId;
  pendingAuthWindowId = windowId;

  let onUpdatedListener: ((tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => void) | undefined;
  let onWindowRemovedListener: ((closedWindowId: number) => void) | undefined;

  try {
    const tokenPromise = new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Auth flow timed out after 3 minutes"));
      }, 180_000);

      onUpdatedListener = async (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
        if (updatedTabId !== tabId || changeInfo.status !== "complete" || !tab.url) return;

        if (tab.url.startsWith(FRONTEND_HOST_URL)) {
          console.log("[README AI] Auth tab reached frontend; polling for token...");
          try {
            const token = await waitForAccessTokenFromTab(tabId, 30_000, 1_500);
            if (token) {
              clearTimeout(timeout);
              resolve(token);
            }
          } catch (pollError) {
            console.warn("[README AI] Polling failed", pollError);
          }
        }
      };
      chrome.tabs.onUpdated.addListener(onUpdatedListener);
    });

    const windowClosedPromise = new Promise<never>((_resolve, reject) => {
      onWindowRemovedListener = (closedWindowId: number) => {
        if (closedWindowId === windowId) {
          reject(new Error("Authentication cancelled by user"));
        }
      };
      chrome.windows.onRemoved.addListener(onWindowRemovedListener);
    });

    const token = await Promise.race([tokenPromise, windowClosedPromise]);
    await setStoredTokens({ accessToken: token });
    await ensureRepositories(token, true);
  } finally {
    if (onUpdatedListener) chrome.tabs.onUpdated.removeListener(onUpdatedListener);
    if (onWindowRemovedListener) chrome.windows.onRemoved.removeListener(onWindowRemovedListener);
    try {
      if (pendingAuthWindowId) await chrome.windows.remove(pendingAuthWindowId);
    } catch { /* ignore */ }
    pendingAuthTabId = null;
    pendingAuthWindowId = null;
  }
}

async function openAuthWindow(url: string, width = 500, height = 650, focused = true): Promise<{ tabId: number; windowId: number; }> {
  return new Promise((resolve, reject) => {
    chrome.windows.create(
      { url, type: "popup", width, height, focused },
      (win) => {
        const lastErr = chrome.runtime.lastError;
        if (lastErr || !win || typeof win.id !== "number") {
          reject(new Error(lastErr?.message || "Failed to create auth window"));
          return;
        }
        const windowId = win.id;
        const tabId = (win.tabs && win.tabs[0] && typeof win.tabs[0].id === "number") ? (win.tabs[0].id as number) : -1;
        if (tabId === -1) {
          reject(new Error("No tab found in created window"));
          return;
        }
        resolve({ tabId, windowId });
      }
    );
  });
}

async function waitForAccessTokenFromTab(tabId: number, timeoutMs = 30_000, intervalMs = 1_500): Promise<string | null> {
  console.log(`[README AI] Starting ${timeoutMs / 1_000}s poll for token in tab ${tabId}...`);
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const execResults = await chrome.scripting.executeScript({
        target: { tabId },
        world: "MAIN",
        func: () => {
          try {
            return JSON.parse(JSON.stringify(window.localStorage));
          } catch {
            return null;
          }
        }
      });

      const storage = (execResults?.[0]?.result) as Record<string, string> | null;

      if (storage) {
        console.log("[README AI] Poll: Found localStorage:", storage);

        if (storage["access_token"]) {
          console.log("[README AI] SUCCESS: Found key 'access_token'");
          return storage["access_token"];
        }

        if (storage["token"]) {
          console.log("[README AI] SUCCESS: Found key 'token'");
          return storage["token"];
        }
      } else {
        console.log("[README AI] Poll: localStorage not found or empty.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("No target with given id") && !msg.includes("Cannot access")) {
        console.warn(`[README AI] Poll failed (normal if navigating): ${msg}`);
      }
    }

    await delay(intervalMs);
  }

  console.error(`[README AI] Poll finished after ${timeoutMs / 1_000}s. NO TOKEN FOUND.`);
  return null;
}


function delay(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }



// Legacy helper retained for potential future use if switching back to launchWebAuthFlow.
function extractTokens(responseUrl: string): AuthTokens {
  const url = new URL(responseUrl);

  if (url.hash && !url.search) {
    // Some providers return data in the hash fragment.
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
    hashParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });
  }

  const accessToken = url.searchParams.get("access_token");
  const refreshToken = url.searchParams.get("refresh_token") ?? undefined;
  const expiresIn = Number(url.searchParams.get("expires_in") ?? "0");

  if (!accessToken) {
    throw new Error("Missing access token in auth response");
  }

  const expiresAt = Number.isFinite(expiresIn) && expiresIn > 0 ? Date.now() + expiresIn * 1000 : undefined;
  return { accessToken, refreshToken, expiresAt } satisfies AuthTokens;
}

async function getStoredTokens(): Promise<AuthTokens | undefined> {
  const { authTokens } = await chrome.storage.local.get("authTokens");
  return authTokens as AuthTokens | undefined;
}

async function setStoredTokens(tokens: AuthTokens): Promise<void> {
  await chrome.storage.local.set({ authTokens: tokens });
}

async function ensureRepositories(accessToken: string, forceRefresh = false): Promise<StoredRepositories | undefined> {
  const cached = await getStoredRepositories();
  if (!forceRefresh && cached && Array.isArray(cached.repositories) && cached.repositories.length > 0) {
    return cached;
  }

  try {
    const fetched = await fetchRepositoriesFromApi(accessToken);
    if (!fetched.repositories) {
      return cached;
    }

    const stored: StoredRepositories = {
      repositories: fetched.repositories,
      totalCount: fetched.totalCount,
      fetchedAt: Date.now()
    };
    await setStoredRepositories(stored);
    return stored;
  } catch (error) {
    console.error("README AI extension: failed to fetch repositories", error);
    return cached;
  }
}

async function fetchRepositoriesFromApi(accessToken: string): Promise<{ repositories?: UserRepository[]; totalCount?: number; }> {
  const requestUrl = new URL("/api/v1/auth/repositories", API_BASE_URL).toString();
  const res = await fetch(requestUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    }
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Repositories endpoint failed: ${res.status}. Response: ${errorText}`);
  }

  const json = (await res.json()) as { repositories?: UserRepository[]; total_count?: number };
  return {
    repositories: json.repositories ?? [],
    totalCount: json.total_count
  };
}

async function getStoredRepositories(): Promise<StoredRepositories | undefined> {
  const stored = await chrome.storage.local.get(REPOSITORIES_STORAGE_KEY);
  return stored[REPOSITORIES_STORAGE_KEY] as StoredRepositories | undefined;
}

async function setStoredRepositories(payload: StoredRepositories): Promise<void> {
  await chrome.storage.local.set({ [REPOSITORIES_STORAGE_KEY]: payload });
}

async function broadcastAuthSuccess(): Promise<void> {
  await broadcastToGithubTabs({ type: "AUTH_SUCCESS" });
}

async function broadcastToGithubTabs(message: unknown): Promise<void> {
  const tabs = await chrome.tabs.query({ url: "https://github.com/*" });
  await Promise.all(
    tabs
      .map((tab) => tab.id)
      .filter((tabId): tabId is number => typeof tabId === "number")
      .map((tabId) =>
        new Promise<void>((resolve) => {
          chrome.tabs.sendMessage(tabId, message, () => {
            // Ignore errors when the tab no longer exists or the content script is not injected.
            void chrome.runtime.lastError;
            resolve();
          });
        })
      )
  );
}
