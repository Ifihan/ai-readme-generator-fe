/// <reference types="chrome" />
// IMPORTANT: include .js extension so MV3 service worker can resolve the compiled file.
import { ReadmeConstants } from "./shared/constants.js";
const { hosts: { github: GITHUB_HOST, apiBaseUrl: API_BASE_URL, frontendBaseUrl: FRONTEND_HOST_URL }, storage: { repositoriesKey: REPOSITORIES_STORAGE_KEY }, contextMenuIds: MENU_IDS, messages: MESSAGE_DEFINITIONS } = ReadmeConstants;
const { login: MENU_ID_LOGIN, logout: MENU_ID_LOGOUT, dashboard: MENU_ID_DASHBOARD, history: MENU_ID_HISTORY, settings: MENU_ID_SETTINGS, separator: MENU_ID_SEPARATOR } = MENU_IDS;
const { toBackground: MESSAGE_TO_BACKGROUND, broadcast: BROADCAST_MESSAGES } = MESSAGE_DEFINITIONS;
const { getAuthStatus: MSG_GET_AUTH_STATUS, startAuth: MSG_START_AUTH, showSidePanelForRepo: MSG_SHOW_SIDE_PANEL_FOR_REPO, getPendingRepo: MSG_GET_PENDING_REPO, fetchReadmeTemplates: MSG_FETCH_README_TEMPLATES, generateReadme: MSG_GENERATE_README, saveReadme: MSG_SAVE_README, fetchBranches: MSG_FETCH_BRANCHES, createBranch: MSG_CREATE_BRANCH } = MESSAGE_TO_BACKGROUND;
const { checkAuth: MSG_CHECK_AUTH, authSuccess: MSG_AUTH_SUCCESS, authFailure: MSG_AUTH_FAILURE } = BROADCAST_MESSAGES;
// --- State for the side panel handshake ---
let pendingReadmeRepo = null;
let pendingAuthTabId = null;
let pendingAuthWindowId = null;
const REPO_CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes
chrome.runtime.onInstalled.addListener(async (details) => {
    const keysToRemove = ["legacyAuthToken", REPOSITORIES_STORAGE_KEY];
    if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
    }
    await createOrRefreshContextMenus();
    await updateContextMenuVisibility(false);
    if (details.reason === "install") {
        const onboardingUrl = chrome.runtime.getURL("onboarding.html");
        await chrome.tabs.create({ url: onboardingUrl });
    }
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
            // This is now the one true source for logging out
            await handleLogout("You have been logged out.");
            break;
        default:
            break;
    }
});
async function createOrRefreshContextMenus() {
    await new Promise((resolve) => {
        chrome.contextMenus.removeAll(() => {
            void chrome.runtime.lastError;
            const createMenu = (properties, onDone) => {
                chrome.contextMenus.create(properties, () => {
                    const err = chrome.runtime.lastError;
                    if (err && typeof err.message === "string" && !err.message.includes("duplicate id")) {
                        console.warn("README AI extension: failed to create context menu", properties.id ?? properties.title, err.message);
                    }
                    if (onDone)
                        onDone();
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
async function updateContextMenuVisibility(isLoggedIn) {
    const updates = [
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
function updateContextMenuItemVisibility(menuId, visible) {
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
async function handleContextMenuLogin() {
    try {
        await startAuthFlow();
        await updateContextMenuVisibility(true);
        await broadcastAuthSuccess();
    }
    catch (error) {
        await updateContextMenuVisibility(false);
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("README AI extension: auth flow failed from context menu", errorMessage);
        await broadcastToGithubTabs({ type: MSG_AUTH_FAILURE, error: errorMessage });
    }
}
// --- NEW: Central Logout/Auth Failure Function ---
/**
 * Clears all auth data, updates menus, and notifies content scripts.
 */
async function handleLogout(errorMessage) {
    await chrome.storage.local.clear();
    if (chrome.storage.session) {
        await chrome.storage.session.clear();
    }
    pendingReadmeRepo = null;
    await updateContextMenuVisibility(false);
    await broadcastToGithubTabs({ type: MSG_AUTH_FAILURE, error: errorMessage });
}
// --- END NEW ---
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
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status !== "complete" || !tab.url)
        return;
    try {
        const url = new URL(tab.url);
        if (url.hostname === GITHUB_HOST) {
            await chrome.sidePanel.setOptions({ tabId, path: "sidebar.html", enabled: true });
            void sendCheckAuthWithRetry(tabId);
        }
        else {
            await chrome.sidePanel.setOptions({ tabId, enabled: false });
        }
    }
    catch (error) {
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
    }
    catch {
        // ignore
    }
});
async function sendCheckAuthWithRetry(tabId, maxAttempts = 5, initialDelayMs = 200) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const ok = await sendCheckAuthOnce(tabId);
        if (ok)
            return;
        if (attempt === maxAttempts) {
            try {
                await chrome.scripting.executeScript({
                    target: { tabId },
                    world: "MAIN",
                    func: (messageType) => {
                        window.postMessage({ source: "readme-ai", type: messageType }, "*");
                    },
                    args: [MSG_CHECK_AUTH]
                });
            }
            catch { /* ignore */ }
            return;
        }
        await delay(initialDelayMs * attempt);
    }
}
function sendCheckAuthOnce(tabId) {
    return new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, { type: MSG_CHECK_AUTH }, () => {
            const err = chrome.runtime.lastError;
            resolve(!err);
        });
    });
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || typeof message.type !== "string") {
        return undefined;
    }
    if (message.type === MSG_GET_AUTH_STATUS) {
        void (async () => {
            const tokens = await getStoredTokens();
            await updateContextMenuVisibility(!!tokens);
            if (!tokens) {
                sendResponse({ tokens: undefined });
                return;
            }
            const cached = await ensureRepositories(tokens.accessToken, false);
            sendResponse({
                tokens,
                repositories: cached?.repositories,
                totalCount: cached?.totalCount
            });
        })();
        return true;
    }
    if (message.type === MSG_START_AUTH) {
        void startAuthFlow()
            .then(async () => {
            await updateContextMenuVisibility(true);
            void broadcastAuthSuccess();
            sendResponse({ ok: true });
        })
            .catch((error) => {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            console.error("README AI extension: auth flow failed", errorMessage);
            void broadcastToGithubTabs({ type: MSG_AUTH_FAILURE, error: errorMessage });
            void updateContextMenuVisibility(false);
            sendResponse({ ok: false, error: errorMessage });
        });
        return true;
    }
    if (message.type === MSG_SHOW_SIDE_PANEL_FOR_REPO) {
        void (async () => {
            const tabId = sender.tab?.id;
            if (tabId) {
                pendingReadmeRepo = message.payload.repo;
                await chrome.sidePanel.open({ tabId });
            }
        })();
        return;
    }
    if (message.type === MSG_GET_PENDING_REPO) {
        if (pendingReadmeRepo) {
            sendResponse({ ok: true, data: { repo: pendingReadmeRepo } });
            pendingReadmeRepo = null;
        }
        else {
            sendResponse({ ok: false, error: "No repository was pending." });
        }
        return true;
    }
    if (message.type === MSG_FETCH_README_TEMPLATES) {
        void handleFetchReadmeTemplates(sendResponse);
        return true;
    }
    if (message.type === MSG_GENERATE_README) {
        void handleGenerateReadme(message.payload, sendResponse);
        return true;
    }
    if (message.type === MSG_SAVE_README) {
        void handleSaveReadme(message.payload, sendResponse);
        return true;
    }
    if (message.type === MSG_FETCH_BRANCHES) {
        void handleFetchBranches(message.payload.repository_url, sendResponse);
        return true;
    }
    if (message.type === MSG_CREATE_BRANCH) {
        void handleCreateBranch(message.payload.repository_url, message.payload.branch_name, sendResponse);
        return true;
    }
    return undefined;
});
// --- NEW: Central API Fetch Wrapper ---
/**
 * A wrapper for fetch that automatically adds auth and handles 401 errors.
 */
async function apiFetch(url, options = {}) {
    const accessToken = await requireAccessToken();
    const response = await fetch(url.toString(), {
        ...options,
        headers: {
            ...options.headers,
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        }
    });
    if (response.status === 401) {
        // Auth token expired or invalid
        await handleLogout("Your session has expired. Please log in again.");
        throw new Error("Your session has expired. Please log in again.");
    }
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status}. Response: ${errorText}`);
    }
    return response.json();
}
// --- END NEW ---
async function handleFetchReadmeTemplates(sendResponse) {
    try {
        // --- MODIFIED: Use apiFetch wrapper ---
        const templates = await apiFetch(new URL("/api/v1/readme/sections", API_BASE_URL));
        sendResponse({ ok: true, data: { templates: Array.isArray(templates) ? templates : [] } });
    }
    catch (error) {
        sendResponse({ ok: false, error: toErrorMessage(error) });
    }
}
async function handleGenerateReadme(payload, sendResponse) {
    if (!payload) {
        sendResponse({ ok: false, error: "Missing generate payload" });
        return;
    }
    try {
        // --- MODIFIED: Use apiFetch wrapper ---
        const response = await apiFetch(new URL("/api/v1/readme/generate", API_BASE_URL), {
            method: "POST",
            body: JSON.stringify(payload)
        });
        sendResponse({ ok: true, data: response });
    }
    catch (error) {
        sendResponse({ ok: false, error: toErrorMessage(error) });
    }
}
async function handleSaveReadme(payload, sendResponse) {
    if (!payload) {
        sendResponse({ ok: false, error: "Missing save payload" });
        return;
    }
    try {
        // --- MODIFIED: Use apiFetch wrapper ---
        const response = await apiFetch(new URL("/api/v1/readme/save", API_BASE_URL), {
            method: "POST",
            body: JSON.stringify(payload)
        });
        sendResponse({ ok: true, data: response });
    }
    catch (error) {
        sendResponse({ ok: false, error: toErrorMessage(error) });
    }
}
async function handleFetchBranches(repositoryUrl, sendResponse) {
    if (!repositoryUrl) {
        sendResponse({ ok: false, error: "Missing repository URL" });
        return;
    }
    try {
        // --- MODIFIED: Use apiFetch wrapper ---
        const { owner, repo } = parseRepositoryUrl(repositoryUrl);
        const json = await apiFetch(new URL(`/api/v1/readme/branches/${owner}/${repo}`, API_BASE_URL));
        sendResponse({ ok: true, data: { branches: Array.isArray(json?.branches) ? json.branches : [] } });
    }
    catch (error) {
        sendResponse({ ok: false, error: toErrorMessage(error) });
    }
}
async function handleCreateBranch(repositoryUrl, branchName, sendResponse) {
    if (!repositoryUrl || !branchName) {
        sendResponse({ ok: false, error: "Missing branch parameters" });
        return;
    }
    try {
        // --- MODIFIED: Use apiFetch wrapper ---
        const { owner, repo } = parseRepositoryUrl(repositoryUrl);
        await apiFetch(new URL(`/api/v1/readme/branches/${owner}/${repo}?branch_name=${encodeURIComponent(branchName)}`, API_BASE_URL), {
            method: "POST",
            body: JSON.stringify({})
        });
        sendResponse({ ok: true });
    }
    catch (error) {
        sendResponse({ ok: false, error: toErrorMessage(error) });
    }
}
// --- REMOVED: Redundant API functions (now handled by apiFetch) ---
// - fetchReadmeSectionTemplates
// - generateReadmeWithApi
// - saveReadmeWithApi
// - fetchBranchesWithApi
// - createBranchWithApi
// --- END REMOVED ---
async function requireAccessToken() {
    const tokens = await getStoredTokens();
    if (!tokens?.accessToken) {
        // This will now be caught by apiFetch, but good to keep as a fallback.
        await handleLogout("Not authenticated. Please log in.");
        throw new Error("Not authenticated");
    }
    return tokens.accessToken;
}
function parseRepositoryUrl(repositoryUrl) {
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
    }
    catch {
        throw new Error("Invalid GitHub repository URL");
    }
}
function toErrorMessage(error) {
    if (error instanceof Error && typeof error.message === "string") {
        return error.message;
    }
    return "Unexpected error";
}
async function startAuthFlow() {
    const loginUrl = new URL("/api/v1/auth/login", API_BASE_URL).toString();
    const res = await fetch(loginUrl, { method: "GET", credentials: "omit" });
    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Login endpoint failed: ${res.status}. Response: ${errorText}`);
    }
    const json = (await res.json());
    if (json.status !== "oauth_redirect" || !json.oauth_url) {
        throw new Error("Unexpected login response shape");
    }
    const { tabId, windowId } = await openAuthWindow(json.oauth_url, 500, 650, true);
    pendingAuthTabId = tabId;
    pendingAuthWindowId = windowId;
    let onUpdatedListener;
    let onWindowRemovedListener;
    try {
        const tokenPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error("Auth flow timed out after 3 minutes"));
            }, 180000);
            onUpdatedListener = async (updatedTabId, changeInfo, tab) => {
                if (updatedTabId !== tabId || changeInfo.status !== "complete" || !tab.url)
                    return;
                if (tab.url.startsWith(FRONTEND_HOST_URL)) {
                    console.log("[README AI] Auth tab reached frontend; polling for token...");
                    try {
                        const token = await waitForAccessTokenFromTab(tabId, 30000, 1500);
                        if (token) {
                            clearTimeout(timeout);
                            resolve(token);
                        }
                    }
                    catch (pollError) {
                        console.warn("[README AI] Polling failed", pollError);
                    }
                }
            };
            chrome.tabs.onUpdated.addListener(onUpdatedListener);
        });
        const windowClosedPromise = new Promise((_resolve, reject) => {
            onWindowRemovedListener = (closedWindowId) => {
                if (closedWindowId === windowId) {
                    reject(new Error("Authentication cancelled by user"));
                }
            };
            chrome.windows.onRemoved.addListener(onWindowRemovedListener);
        });
        const token = await Promise.race([tokenPromise, windowClosedPromise]);
        await setStoredTokens({ accessToken: token });
        await ensureRepositories(token, true);
    }
    finally {
        if (onUpdatedListener)
            chrome.tabs.onUpdated.removeListener(onUpdatedListener);
        if (onWindowRemovedListener)
            chrome.windows.onRemoved.removeListener(onWindowRemovedListener);
        try {
            if (pendingAuthWindowId)
                await chrome.windows.remove(pendingAuthWindowId);
        }
        catch { /* ignore */ }
        pendingAuthTabId = null;
        pendingAuthWindowId = null;
    }
}
async function openAuthWindow(url, width = 500, height = 650, focused = true) {
    return new Promise((resolve, reject) => {
        chrome.windows.create({ url, type: "popup", width, height, focused }, (win) => {
            const lastErr = chrome.runtime.lastError;
            if (lastErr || !win || typeof win.id !== "number") {
                reject(new Error(lastErr?.message || "Failed to create auth window"));
                return;
            }
            const windowId = win.id;
            const tabId = (win.tabs && win.tabs[0] && typeof win.tabs[0].id === "number") ? win.tabs[0].id : -1;
            if (tabId === -1) {
                reject(new Error("No tab found in created window"));
                return;
            }
            resolve({ tabId, windowId });
        });
    });
}
async function waitForAccessTokenFromTab(tabId, timeoutMs = 30000, intervalMs = 1500) {
    console.log(`[README AI] Starting ${timeoutMs / 1000}s poll for token in tab ${tabId}...`);
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            const execResults = await chrome.scripting.executeScript({
                target: { tabId },
                world: "MAIN",
                func: () => {
                    try {
                        return JSON.parse(JSON.stringify(window.localStorage));
                    }
                    catch {
                        return null;
                    }
                }
            });
            const storage = (execResults?.[0]?.result);
            if (storage) {
                // console.log("[README AI] Poll: Found localStorage:", storage);
                if (storage["access_token"]) {
                    // console.log("[README AI] SUCCESS: Found key 'access_token'");
                    return storage["access_token"];
                }
                if (storage["token"]) {
                    // console.log("[README AI] SUCCESS: Found key 'token'");
                    return storage["token"];
                }
            }
            else {
                console.log("[README AI] Poll: localStorage not found or empty.");
            }
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            if (!msg.includes("No target with given id") && !msg.includes("Cannot access")) {
                console.warn(`[README AI] Poll failed (normal if navigating): ${msg}`);
            }
        }
        await delay(intervalMs);
    }
    console.error(`[README AI] Poll finished after ${timeoutMs / 1000}s. NO TOKEN FOUND.`);
    return null;
}
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
async function getStoredTokens() {
    const { authTokens } = await chrome.storage.local.get("authTokens");
    return authTokens;
}
async function setStoredTokens(tokens) {
    await chrome.storage.local.set({ authTokens: tokens });
}
async function ensureRepositories(accessToken, forceRefresh = false) {
    const cached = await getStoredRepositories();
    if (!forceRefresh &&
        cached &&
        Array.isArray(cached.repositories) &&
        cached.repositories.length > 0 &&
        (Date.now() - cached.fetchedAt < REPO_CACHE_DURATION_MS)) {
        return cached;
    }
    try {
        // --- MODIFIED: Use apiFetch wrapper ---
        const fetched = await fetchRepositoriesFromApi(accessToken); // Keep passing token here for the first call
        if (!fetched.repositories) {
            return cached;
        }
        const stored = {
            repositories: fetched.repositories,
            totalCount: fetched.totalCount,
            fetchedAt: Date.now()
        };
        await setStoredRepositories(stored);
        return stored;
    }
    catch (error) {
        console.error("README AI extension: failed to fetch repositories", error);
        // If auth failed, handleLogout would have already been called by apiFetch
        return cached;
    }
}
async function fetchRepositoriesFromApi(accessToken) {
    // --- MODIFIED: Use apiFetch wrapper ---
    // This is the only function that needs to pass the token manually,
    // as it's part of the auth-check flow itself.
    const response = await fetch(new URL("/api/v1/auth/repositories", API_BASE_URL).toString(), {
        method: "GET",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        }
    });
    if (response.status === 401) {
        await handleLogout("Your session has expired. Please log in again.");
        throw new Error("Your session has expired. Please log in again.");
    }
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Repositories endpoint failed: ${response.status}. Response: ${errorText}`);
    }
    const json = (await response.json());
    return {
        repositories: json.repositories ?? [],
        totalCount: json.total_count
    };
}
async function getStoredRepositories() {
    const stored = await chrome.storage.local.get(REPOSITORIES_STORAGE_KEY);
    return stored[REPOSITORIES_STORAGE_KEY];
}
async function setStoredRepositories(payload) {
    await chrome.storage.local.set({ [REPOSITORIES_STORAGE_KEY]: payload });
}
async function broadcastAuthSuccess() {
    await broadcastToGithubTabs({ type: MSG_AUTH_SUCCESS });
}
async function broadcastToGithubTabs(message) {
    const tabs = await chrome.tabs.query({ url: "https://github.com/*" });
    await Promise.all(tabs
        .map((tab) => tab.id)
        .filter((tabId) => typeof tabId === "number")
        .map((tabId) => new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, message, () => {
            void chrome.runtime.lastError;
            resolve();
        });
    })));
}
