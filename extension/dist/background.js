"use strict";
/// <reference types="chrome" />
const GITHUB_HOST = "github.com";
// Backend REST API base used for obtaining OAuth redirect URLs.
const API_BASE_URL = "https://ai-readme-generator-be-912048666815.us-central1.run.app";
// Frontend host used during the OAuth completion step (where tokens land in localStorage).
const FRONTEND_HOST_URL = "https://ai-readme-generator-912048666815.us-central1.run.app";
let pendingAuthTabId = null;
let pendingAuthWindowId = null;
chrome.runtime.onInstalled.addListener(async () => {
    // Ensure we start with a clean slate if previous builds stored legacy keys.
    const keysToRemove = ["legacyAuthToken"];
    if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
    }
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== "complete" || !tab.url)
        return;
    try {
        const url = new URL(tab.url);
        if (url.hostname === GITHUB_HOST) {
            void sendCheckAuthWithRetry(tabId);
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
            }
            catch { /* ignore */ }
            return;
        }
        await delay(initialDelayMs * attempt); // simple linear backoff
    }
}
function sendCheckAuthOnce(tabId) {
    return new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, { type: "CHECK_AUTH" }, () => {
            const err = chrome.runtime.lastError;
            if (err) {
                // Silently retry without spamming the console.
                resolve(false);
            }
            else {
                resolve(true);
            }
        });
    });
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || typeof message.type !== "string") {
        return undefined;
    }
    if (message.type === "GET_AUTH_STATUS") {
        void getStoredTokens().then((tokens) => {
            sendResponse({ tokens });
        });
        return true;
    }
    if (message.type === "START_AUTH") {
        void startAuthFlow()
            .then(() => {
            void broadcastAuthSuccess();
            sendResponse({ ok: true });
        })
            .catch((error) => {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            console.error("README AI extension: auth flow failed", errorMessage);
            void broadcastToGithubTabs({ type: "AUTH_FAILURE", error: errorMessage });
            sendResponse({ ok: false, error: errorMessage });
        });
        return true;
    }
    return undefined;
});
// Auth flow: call backend /api/v1/auth/login to get oauth_url, open a popup window
// where the web app handles OAuth and stores access_token in localStorage. When the
// popup redirects back to the frontend, we poll localStorage for the token and persist
// it in extension storage.
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
                console.log("[README AI] Poll: Found localStorage:", storage);
                if (storage["access_token"]) {
                    console.log("[README AI] SUCCESS: Found key 'access_token'");
                    return storage["access_token"];
                }
                if (storage["token"]) {
                    console.log("[README AI] SUCCESS: Found key 'token'");
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
// Legacy helper retained for potential future use if switching back to launchWebAuthFlow.
function extractTokens(responseUrl) {
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
    return { accessToken, refreshToken, expiresAt };
}
async function getStoredTokens() {
    const { authTokens } = await chrome.storage.local.get("authTokens");
    return authTokens;
}
async function setStoredTokens(tokens) {
    await chrome.storage.local.set({ authTokens: tokens });
}
async function broadcastAuthSuccess() {
    await broadcastToGithubTabs({ type: "AUTH_SUCCESS" });
}
async function broadcastToGithubTabs(message) {
    const tabs = await chrome.tabs.query({ url: "https://github.com/*" });
    await Promise.all(tabs
        .map((tab) => tab.id)
        .filter((tabId) => typeof tabId === "number")
        .map((tabId) => new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, message, () => {
            // Ignore errors when the tab no longer exists or the content script is not injected.
            void chrome.runtime.lastError;
            resolve();
        });
    })));
}
