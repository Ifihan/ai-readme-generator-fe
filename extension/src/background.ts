/// <reference types="chrome" />

const GITHUB_HOST = "github.com";
const API_BASE_URL = "https://ai-readme-generator-be-912048666815.us-central1.run.app";
const FRONTEND_HOST_URL = "https://ai-readme-generator-912048666815.us-central1.run.app";
const REPOSITORIES_STORAGE_KEY = "userRepositories";

// --- State for the side panel handshake ---
let pendingReadmeRepo: UserRepository | null = null;

// (Keep all your interfaces: AuthTokens, UserRepository, etc.)
// ...

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
  | { type: "SHOW_SIDE_PANEL_FOR_REPO"; payload: { repo: UserRepository } }
  | { type: "SIDE_PANEL_READY" } // <-- New message from the side panel
  | { type: "GET_PENDING_REPO" } // <-- New message from the side panel
  | { type: "FETCH_README_TEMPLATES" }
  | { type: "GENERATE_README"; payload: GenerateReadmeRequestPayload }
  | { type: "SAVE_README"; payload: SaveReadmeRequestPayload }
  | { type: "FETCH_BRANCHES"; payload: { repository_url: string } }
  | { type: "CREATE_BRANCH"; payload: { repository_url: string; branch_name: string } };

// (Keep all other interfaces)
// ...
interface AuthStatusResponse {
  tokens?: AuthTokens;
  repositories?: UserRepository[];
  totalCount?: number;
}
interface SectionTemplate {
  id: string;
  name: string;
  description: string;
  is_default: boolean;
  order: number;
}
interface GenerateReadmeRequestPayload {
  repository_url: string;
  sections: GenerateReadmeSectionPayload[];
  include_badges: boolean;
  badge_style: string;
}
interface GenerateReadmeSectionPayload {
  name: string;
  description: string;
  required: boolean;
  order: number;
}
interface SaveReadmeRequestPayload {
  repository_url: string;
  content: string;
  path: string;
  commit_message: string;
  branch: string;
}
interface GenerateReadmeResponsePayload {
  content: string;
  sections_generated: string[];
  entry_id: string;
}
interface SaveReadmeResponsePayload {
  message: string;
}
interface GithubBranchModel {
  name: string;
  sha: string;
  protected: boolean;
  is_default: boolean;
}
interface RepoBranchResponse {
  repository: string;
  branches: GithubBranchModel[];
  total_count: number;
}
interface GenericBackgroundResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}
interface AuthStartResponse {
  ok: boolean;
  error?: string;
}


let pendingAuthTabId: number | null = null;
let pendingAuthWindowId: number | null = null;

// --- Context menu identifiers ---
const MENU_ID_LOGIN = "readme-ai-login";
const MENU_ID_LOGOUT = "readme-ai-logout";
const MENU_ID_DASHBOARD = "readme-ai-dashboard";
const MENU_ID_HISTORY = "readme-ai-history";
const MENU_ID_SETTINGS = "readme-ai-settings";
const MENU_ID_SEPARATOR = "readme-ai-separator";

chrome.runtime.onInstalled.addListener(async () => {
  const keysToRemove = ["legacyAuthToken", REPOSITORIES_STORAGE_KEY];
  if (keysToRemove.length > 0) {
    await chrome.storage.local.remove(keysToRemove);
  }
  await createOrRefreshContextMenus();
  await updateContextMenuVisibility(false);
});

chrome.runtime.onStartup.addListener(async () => {
  await createOrRefreshContextMenus();
  const tokens = await getStoredTokens();
  await updateContextMenuVisibility(!!tokens);
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  switch (info.menuItemId) {
    case MENU_ID_DASHBOARD:
      chrome.tabs.create({ url: `${FRONTEND_HOST_URL}/dashboard` });
      break;
    case MENU_ID_HISTORY:
      chrome.tabs.create({ url: `${FRONTEND_HOST_URL}/history` });
      break;
    case MENU_ID_SETTINGS:
      chrome.tabs.create({ url: `${FRONTEND_HOST_URL}/settings` });
      break;
    case MENU_ID_LOGIN:
      await handleContextMenuLogin();
      break;
    case MENU_ID_LOGOUT:
      await handleContextMenuLogout();
      break;
    default:
      break;
  }
});

async function createOrRefreshContextMenus(): Promise<void> {
  await new Promise<void>((resolve) => {
    chrome.contextMenus.removeAll(() => {
      void chrome.runtime.lastError;
      const createMenu = (properties: chrome.contextMenus.CreateProperties, onDone?: () => void) => {
        chrome.contextMenus.create(properties, () => {
          const err = chrome.runtime.lastError;
          if (err && typeof err.message === "string" && !err.message.includes("duplicate id")) {
            console.warn("README AI extension: failed to create context menu", properties.id ?? properties.title, err.message);
          }
          if (onDone) onDone();
        });
      };

      createMenu({
        id: MENU_ID_DASHBOARD,
        title: "View in App (Dashboard)",
        contexts: ["action"]
      });

      createMenu({
        id: MENU_ID_HISTORY,
        title: "View History",
        contexts: ["action"]
      });

      createMenu({
        id: MENU_ID_SETTINGS,
        title: "View Settings",
        contexts: ["action"]
      });

      createMenu({
        id: MENU_ID_SEPARATOR,
        type: "separator",
        contexts: ["action"]
      });

      createMenu({
        id: MENU_ID_LOGIN,
        title: "Login",
        contexts: ["action"]
      });

      createMenu({
        id: MENU_ID_LOGOUT,
        title: "Logout",
        contexts: ["action"]
      }, resolve);
    });
  });
}

async function updateContextMenuVisibility(isLoggedIn: boolean): Promise<void> {
  const updates: Array<[string, boolean]> = [
    [MENU_ID_LOGIN, !isLoggedIn],
    [MENU_ID_LOGOUT, isLoggedIn],
    [MENU_ID_DASHBOARD, isLoggedIn],
    [MENU_ID_HISTORY, isLoggedIn],
    [MENU_ID_SETTINGS, isLoggedIn],
    [MENU_ID_SEPARATOR, isLoggedIn]
  ];

  const results = await Promise.all(updates.map(([menuId, visible]) => updateContextMenuItemVisibility(menuId, visible)));
  if (results.includes(false)) {
    await createOrRefreshContextMenus();
    await Promise.all(updates.map(([menuId, visible]) => updateContextMenuItemVisibility(menuId, visible)));
  }
}

function updateContextMenuItemVisibility(menuId: string, visible: boolean): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.contextMenus.update(menuId, { visible }, () => {
      const err = chrome.runtime.lastError;
      if (err) {
        if (typeof err.message === "string" && err.message.includes("Cannot find menu item")) {
          resolve(false);
          return;
        }
        console.warn(`README AI extension: failed to update context menu ${menuId}`, err.message);
      }
      resolve(true);
    });
  });
}

async function handleContextMenuLogin(): Promise<void> {
  try {
    await startAuthFlow();
    await updateContextMenuVisibility(true);
    await broadcastAuthSuccess();
  } catch (error) {
    await updateContextMenuVisibility(false);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("README AI extension: auth flow failed from context menu", errorMessage);
    await broadcastToGithubTabs({ type: "AUTH_FAILURE", error: errorMessage });
  }
}

async function handleContextMenuLogout(): Promise<void> {
  await chrome.storage.local.clear();
  if (chrome.storage.session) {
    await chrome.storage.session.clear();
  }
  pendingReadmeRepo = null;
  await updateContextMenuVisibility(false);
  await broadcastToGithubTabs({ type: "AUTH_FAILURE", error: "You have been logged out." });
}

void (async () => {
  await createOrRefreshContextMenus();
  const tokens = await getStoredTokens();
  await updateContextMenuVisibility(!!tokens);
})();

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    await chrome.sidePanel.open({ tabId: tab.id });
  }
});

chrome.tabs.onUpdated.addListener(async (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
  if (changeInfo.status !== "complete" || !tab.url) return;
  try {
    const url = new URL(tab.url);
    if (url.hostname === GITHUB_HOST) {
      await chrome.sidePanel.setOptions({ tabId, path: "sidebar.html", enabled: true });
      void sendCheckAuthWithRetry(tabId);
    } else {
      await chrome.sidePanel.setOptions({ tabId, enabled: false });
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
    await delay(initialDelayMs * attempt);
  }
}

function sendCheckAuthOnce(tabId: number): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: "CHECK_AUTH" }, () => {
      const err = chrome.runtime.lastError;
      resolve(!err);
    });
  });
}

chrome.runtime.onMessage.addListener((message: ExtensionInboundMessage, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void): boolean | void => {
  if (!message || typeof message.type !== "string") {
    return undefined;
  }

  if (message.type === "GET_AUTH_STATUS") {
    void (async () => {
      const tokens = await getStoredTokens();
      await updateContextMenuVisibility(!!tokens);
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
      .then(async () => {
        await updateContextMenuVisibility(true);
        void broadcastAuthSuccess();
        sendResponse({ ok: true } satisfies AuthStartResponse);
      })
      .catch((error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("README AI extension: auth flow failed", errorMessage);
        void broadcastToGithubTabs({ type: "AUTH_FAILURE", error: errorMessage });
        void updateContextMenuVisibility(false);
        sendResponse({ ok: false, error: errorMessage } satisfies AuthStartResponse);
      });
    return true;
  }

  // --- UPDATED HANDLER ---
  if (message.type === "SHOW_SIDE_PANEL_FOR_REPO") {
    void (async () => {
      const tabId = sender.tab?.id;
      if (tabId) {
        // 1. Store the repo in the temporary variable
        pendingReadmeRepo = message.payload.repo;
        // 2. Open the side panel. This is the first await, so it works.
        await chrome.sidePanel.open({ tabId });
        // We no longer use session storage for this
      }
    })();
    return; // No response needed
  }

  // --- NEW HANDLER ---
  if (message.type === "GET_PENDING_REPO") {
    // The side panel is ready and asking for the repo
    if (pendingReadmeRepo) {
      sendResponse({ ok: true, data: { repo: pendingReadmeRepo } });
      pendingReadmeRepo = null; // Clear it after it's been sent
    } else {
      sendResponse({ ok: false, error: "No repository was pending." });
    }
    return true; // Keep message port open for async response
  }
  // --- END NEW HANDLER ---

  if (message.type === "FETCH_README_TEMPLATES") {
    void handleFetchReadmeTemplates(sendResponse);
    return true;
  }

  if (message.type === "GENERATE_README") {
    void handleGenerateReadme(message.payload, sendResponse);
    return true;
  }

  if (message.type === "SAVE_README") {
    void handleSaveReadme(message.payload, sendResponse);
    return true;
  }

  if (message.type === "FETCH_BRANCHES") {
    void handleFetchBranches(message.payload.repository_url, sendResponse);
    return true;
  }

  if (message.type === "CREATE_BRANCH") {
    void handleCreateBranch(message.payload.repository_url, message.payload.branch_name, sendResponse);
    return true;
  }

  return undefined;
});

// ... (All other functions from your original background.ts remain unchanged) ...
// (handleFetchReadmeTemplates, handleGenerateReadme, all API functions, auth flow, etc.)

async function handleFetchReadmeTemplates(sendResponse: (response: GenericBackgroundResponse<{ templates: SectionTemplate[] }>) => void): Promise<void> {
  try {
    const templates = await fetchReadmeSectionTemplates();
    sendResponse({ ok: true, data: { templates } });
  } catch (error) {
    sendResponse({ ok: false, error: toErrorMessage(error) });
  }
}
async function handleGenerateReadme(payload: GenerateReadmeRequestPayload | undefined, sendResponse: (response: GenericBackgroundResponse<GenerateReadmeResponsePayload>) => void): Promise<void> {
  if (!payload) {
    sendResponse({ ok: false, error: "Missing generate payload" });
    return;
  }
  try {
    const response = await generateReadmeWithApi(payload);
    sendResponse({ ok: true, data: response });
  } catch (error) {
    sendResponse({ ok: false, error: toErrorMessage(error) });
  }
}
async function handleSaveReadme(payload: SaveReadmeRequestPayload | undefined, sendResponse: (response: GenericBackgroundResponse<SaveReadmeResponsePayload>) => void): Promise<void> {
  if (!payload) {
    sendResponse({ ok: false, error: "Missing save payload" });
    return;
  }
  try {
    const response = await saveReadmeWithApi(payload);
    sendResponse({ ok: true, data: response });
  } catch (error) {
    sendResponse({ ok: false, error: toErrorMessage(error) });
  }
}
async function handleFetchBranches(repositoryUrl: string | undefined, sendResponse: (response: GenericBackgroundResponse<{ branches: GithubBranchModel[] }>) => void): Promise<void> {
  if (!repositoryUrl) {
    sendResponse({ ok: false, error: "Missing repository URL" });
    return;
  }
  try {
    const branches = await fetchBranchesWithApi(repositoryUrl);
    sendResponse({ ok: true, data: { branches } });
  } catch (error) {
    sendResponse({ ok: false, error: toErrorMessage(error) });
  }
}
async function handleCreateBranch(repositoryUrl: string | undefined, branchName: string | undefined, sendResponse: (response: GenericBackgroundResponse) => void): Promise<void> {
  if (!repositoryUrl || !branchName) {
    sendResponse({ ok: false, error: "Missing branch parameters" });
    return;
  }
  try {
    await createBranchWithApi(repositoryUrl, branchName);
    sendResponse({ ok: true });
  } catch (error) {
    sendResponse({ ok: false, error: toErrorMessage(error) });
  }
}
async function fetchReadmeSectionTemplates(): Promise<SectionTemplate[]> {
  const accessToken = await requireAccessToken();
  const response = await fetch(new URL("/api/v1/readme/sections", API_BASE_URL).toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    }
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch section templates: ${response.status}. Response: ${errorText}`);
  }
  const templates = (await response.json()) as SectionTemplate[];
  return Array.isArray(templates) ? templates : [];
}
async function generateReadmeWithApi(payload: GenerateReadmeRequestPayload): Promise<GenerateReadmeResponsePayload> {
  const accessToken = await requireAccessToken();
  const response = await fetch(new URL("/api/v1/readme/generate", API_BASE_URL).toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to generate README: ${response.status}. Response: ${errorText}`);
  }
  return (await response.json()) as GenerateReadmeResponsePayload;
}
async function saveReadmeWithApi(payload: SaveReadmeRequestPayload): Promise<SaveReadmeResponsePayload> {
  const accessToken = await requireAccessToken();
  const response = await fetch(new URL("/api/v1/readme/save", API_BASE_URL).toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to save README: ${response.status}. Response: ${errorText}`);
  }
  return (await response.json()) as SaveReadmeResponsePayload;
}
async function fetchBranchesWithApi(repositoryUrl: string): Promise<GithubBranchModel[]> {
  const { owner, repo } = parseRepositoryUrl(repositoryUrl);
  const accessToken = await requireAccessToken();
  const response = await fetch(new URL(`/api/v1/readme/branches/${owner}/${repo}`, API_BASE_URL).toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    }
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch branches: ${response.status}. Response: ${errorText}`);
  }
  const json = (await response.json()) as RepoBranchResponse;
  return Array.isArray(json?.branches) ? json.branches : [];
}
async function createBranchWithApi(repositoryUrl: string, branchName: string): Promise<void> {
  const { owner, repo } = parseRepositoryUrl(repositoryUrl);
  const accessToken = await requireAccessToken();
  const response = await fetch(new URL(`/api/v1/readme/branches/${owner}/${repo}?branch_name=${encodeURIComponent(branchName)}`, API_BASE_URL).toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({})
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create branch: ${response.status}. Response: ${errorText}`);
  }
}
async function requireAccessToken(): Promise<string> {
  const tokens = await getStoredTokens();
  if (!tokens?.accessToken) {
    throw new Error("Not authenticated");
  }
  return tokens.accessToken;
}
function parseRepositoryUrl(repositoryUrl: string): { owner: string; repo: string } {
  try {
    const url = new URL(repositoryUrl);
    if (url.hostname !== GITHUB_HOST) {
      throw new Error();
    }
    const parts = url.pathname.split("/").filter(Boolean);
    const owner = parts[0];
    const repo = parts[1]?.replace(/\.git$/i, "");
    if (!owner || !repo) {
      throw new Error();
    }
    return { owner, repo };
  } catch {
    throw new Error("Invalid GitHub repository URL");
  }
}
function toErrorMessage(error: unknown): string {
  if (error instanceof Error && typeof error.message === "string") {
    return error.message;
  }
  return "Unexpected error";
}
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
            void chrome.runtime.lastError;
            resolve();
          });
        })
      )
  );
}
