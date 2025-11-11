"use strict";
/// <reference types="chrome" />
const CTA_CONTAINER_ID = "readme-ai-cta-container";
const CTA_STYLE_ID = "readme-ai-cta-style";
const CTA_DEFAULT_LABEL = "Try README AI";
const CTA_LOADING_LABEL = "Opening…";
const CTA_SUCCESS_LABEL = "Connected to README AI";
const CTA_ERROR_LABEL = "We could not connect. Try again.";
let ctaButton;
let ctaMessage;
let hideTimeout;
if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", handleInitialLoad, { once: true });
}
else {
    void handleInitialLoad();
}
chrome.runtime.onMessage.addListener((message) => {
    if (!message || typeof message.type !== "string") {
        return undefined;
    }
    switch (message.type) {
        case "CHECK_AUTH":
            void evaluateAuthState("runtime-message");
            break;
        case "AUTH_SUCCESS":
            showSuccessState();
            break;
        case "AUTH_FAILURE":
            showErrorState(message.error);
            break;
        default:
            break;
    }
    return undefined;
});
// Also support window-based messaging from background (dispatched via executeScript).
// This avoids extension messaging port races when the content script hasn't finished init.
window.addEventListener("message", (event) => {
    // Only accept messages from same page context
    if (event.source !== window)
        return;
    const data = event.data;
    if (!data || data.source !== "readme-ai")
        return;
    if (data.type === "CHECK_AUTH") {
        void evaluateAuthState("runtime-message");
    }
    else if (data.type === "AUTH_SUCCESS") {
        showSuccessState();
    }
    else if (data.type === "AUTH_FAILURE") {
        showErrorState(typeof data.payload === "string" ? data.payload : undefined);
    }
});
async function handleInitialLoad() {
    ensureCtaStyles();
    await evaluateAuthState("initial-load");
}
async function evaluateAuthState(trigger) {
    const tokens = await requestAuthStatus();
    if (tokens) {
        removeCta();
    }
    else if (document.body) {
        ensureCta();
    }
    else if (trigger === "initial-load") {
        // The DOM is still booting; retry shortly.
        window.setTimeout(() => {
            void evaluateAuthState("initial-load");
        }, 250);
    }
}
async function requestAuthStatus() {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "GET_AUTH_STATUS" }, (response) => {
            if (chrome.runtime.lastError) {
                console.debug("README AI extension: unable to fetch auth status", chrome.runtime.lastError.message);
                resolve(undefined);
                return;
            }
            resolve(response?.tokens);
        });
    });
}
async function startAuthFromContent() {
    setCtaState("loading");
    try {
        await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ type: "START_AUTH" }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                if (!response || !response.ok) {
                    reject(new Error(response?.error ?? "Auth flow failed"));
                    return;
                }
                resolve();
            });
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : undefined;
        showErrorState(message);
    }
}
function ensureCta() {
    const existing = document.getElementById(CTA_CONTAINER_ID);
    if (existing) {
        return;
    }
    const container = document.createElement("div");
    container.id = CTA_CONTAINER_ID;
    container.className = "readme-ai-cta";
    // Detect GitHub theme from html[data-color-mode] or body class for dark mode.
    try {
        const html = document.documentElement;
        const colorMode = html.getAttribute("data-color-mode") || html.getAttribute("data-theme");
        const isDark = (colorMode || "").toLowerCase().includes("dark") || document.body.classList.contains("dark");
        if (isDark) {
            container.setAttribute("data-theme", "dark");
        }
    }
    catch {
        // Silent fail; default theme remains.
    }
    const heading = document.createElement("span");
    heading.textContent = "Try README AI";
    heading.className = "readme-ai-cta__heading";
    const body = document.createElement("p");
    body.textContent = "Generate polished READMEs automatically.";
    body.className = "readme-ai-cta__description";
    ctaMessage = body;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "readme-ai-cta__button";
    button.textContent = CTA_DEFAULT_LABEL;
    button.addEventListener("click", () => {
        void startAuthFromContent();
    });
    ctaButton = button;
    container.append(heading, body, button);
    if (document.body) {
        document.body.appendChild(container);
    }
    setCtaState("idle");
}
function removeCta() {
    if (hideTimeout) {
        window.clearTimeout(hideTimeout);
        hideTimeout = undefined;
    }
    const container = document.getElementById(CTA_CONTAINER_ID);
    if (container?.parentElement) {
        container.parentElement.removeChild(container);
    }
    ctaButton = undefined;
    ctaMessage = undefined;
}
function showSuccessState() {
    setCtaState("success");
    hideTimeout = window.setTimeout(() => {
        removeCta();
    }, 2000);
}
function showErrorState(errorMessage) {
    setCtaState("error", errorMessage);
}
function setCtaState(state, errorMessage) {
    if (!ctaButton || !ctaMessage) {
        return;
    }
    ctaButton.disabled = state === "loading";
    switch (state) {
        case "idle":
            ctaButton.textContent = CTA_DEFAULT_LABEL;
            ctaMessage.textContent = "Generate polished READMEs automatically.";
            ctaButton.classList.remove("readme-ai-cta__button--success", "readme-ai-cta__button--error");
            break;
        case "loading":
            ctaButton.textContent = CTA_LOADING_LABEL;
            ctaMessage.textContent = "Connecting to README AI…";
            ctaButton.classList.remove("readme-ai-cta__button--success", "readme-ai-cta__button--error");
            break;
        case "success":
            ctaButton.textContent = CTA_SUCCESS_LABEL;
            ctaMessage.textContent = "You can now open README AI from the extension.";
            ctaButton.classList.add("readme-ai-cta__button--success");
            ctaButton.classList.remove("readme-ai-cta__button--error");
            ctaButton.disabled = true;
            break;
        case "error":
            ctaButton.textContent = CTA_DEFAULT_LABEL;
            ctaMessage.textContent = errorMessage ?? CTA_ERROR_LABEL;
            ctaButton.classList.add("readme-ai-cta__button--error");
            ctaButton.classList.remove("readme-ai-cta__button--success");
            break;
        default:
            break;
    }
}
function ensureCtaStyles() {
    if (document.getElementById(CTA_STYLE_ID)) {
        return;
    }
    const style = document.createElement("style");
    style.id = CTA_STYLE_ID;
    style.textContent = `
    #${CTA_CONTAINER_ID} {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 16px;
      border-radius: 12px;
      background: var(--bg-secondary);
      color: var(--text-primary);
      box-shadow: var(--shadow-lg);
      max-width: 280px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      border: 1px solid var(--border);
      backdrop-filter: blur(12px);
    }
    #${CTA_CONTAINER_ID}[data-theme="dark"] {
      background: var(--bg-secondary);
      color: var(--text-primary);
      border-color: var(--border);
    }
    /* Inject app theme variables locally (light) */
    #${CTA_CONTAINER_ID} {
      --bg-primary: #fafbfc;
      --bg-secondary: #ffffff;
      --text-primary: #1a1a1a;
      --text-secondary: #586069;
      --primary: #8a2be2;
      --primary-hover: #7928ca;
      --primary-light: #a855f7;
      --border: #e1e4e8;
      --shadow-sm: 0 1px 3px rgba(0,0,0,0.06);
      --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
      --shadow-lg: 0 8px 24px rgba(0,0,0,0.12);
    }
    /* Dark mode variable overrides */
    #${CTA_CONTAINER_ID}[data-theme="dark"] {
      --bg-primary: #0d1117;
      --bg-secondary: #161b22;
      --text-primary: #e6edf3;
      --text-secondary: #8b949e;
      --primary: #a855f7;
      --primary-hover: #c084fc;
      --primary-light: #d8b4fe;
      --border: #30363d;
      --shadow-sm: 0 1px 3px rgba(0,0,0,0.4);
      --shadow-md: 0 4px 12px rgba(0,0,0,0.5);
      --shadow-lg: 0 8px 24px rgba(0,0,0,0.6);
    }
    .readme-ai-cta__heading {
      font-weight: 600;
      font-size: 16px;
      line-height: 1.3;
    }
    .readme-ai-cta__description {
      margin: 0;
      font-size: 13px;
      color: var(--text-secondary, rgba(240, 246, 252, 0.85));
      line-height: 1.4;
    }
    .readme-ai-cta__button {
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      color: var(--text-button, var(--text-primary));
      background: var(--primary);
      transition: background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
      box-shadow: var(--shadow-sm);
    }
    #${CTA_CONTAINER_ID}[data-theme="dark"] .readme-ai-cta__button { color: #ffffff; background: var(--primary); }
    .readme-ai-cta__button:hover:not(:disabled) {
      background: var(--primary-hover);
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }
    .readme-ai-cta__button:disabled {
      cursor: default;
      opacity: 0.75;
    }
    .readme-ai-cta__button--success {
      background: var(--primary-light);
      color: #ffffff;
    }
    .readme-ai-cta__button--error {
      background: #f85149;
      color: #ffffff;
    }
  `;
    document.head.appendChild(style);
}
