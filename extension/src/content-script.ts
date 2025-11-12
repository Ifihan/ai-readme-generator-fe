/// <reference types="chrome" />

const CTA_CONTAINER_ID = "readme-ai-cta-container";
const CTA_STYLE_ID = "readme-ai-cta-style";
const CTA_DEFAULT_LABEL = "Try README AI";
const CTA_LOADING_LABEL = "Opening…";
const CTA_SUCCESS_LABEL = "Connected to README AI";
const CTA_ERROR_LABEL = "We could not connect. Try again.";
const REPO_CTA_CONTAINER_ID = "readme-ai-repo-cta";
const REPO_STORAGE_KEY = "readme-ai.repositories";

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

interface AuthStatusResponse {
  tokens?: AuthTokens;
  repositories?: UserRepository[];
  totalCount?: number;
}

interface AuthStartResponse {
  ok: boolean;
  error?: string;
}

type BackgroundMessage =
  | { type: "CHECK_AUTH" }
  | { type: "AUTH_SUCCESS" }
  | { type: "AUTH_FAILURE"; error?: string };

let ctaButton: HTMLButtonElement | undefined;
let ctaMessage: HTMLParagraphElement | undefined;
let hideTimeout: number | undefined;
let repoCtaContainer: HTMLDivElement | undefined;
let repoCtaButton: HTMLButtonElement | undefined;

// --- THIS FUNCTION IS NOW FIXED ---
// It no longer accesses storage. It just sends the repo data.
async function openReadmePanel(repo: UserRepository): Promise<void> {
  try {
    // 1. Tell the background to save the repo and show the panel
    await chrome.runtime.sendMessage({
      type: "SHOW_SIDE_PANEL_FOR_REPO",
      payload: { repo }
    });
  } catch (e) {
    console.error('README AI: Failed to send open side panel message', e);
  }
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", handleInitialLoad, { once: true });
} else {
  void handleInitialLoad();
}

chrome.runtime.onMessage.addListener((message: BackgroundMessage) => {
  if (!message || typeof message.type !== "string") return undefined;
  if (message.type === "CHECK_AUTH") {
    void evaluateAuthState("runtime-message");
  } else if (message.type === "AUTH_SUCCESS") {
    setCtaState("success");
    void evaluateAuthState("runtime-message");
  } else if (message.type === "AUTH_FAILURE") {
    setCtaState("error", message.error);
    removeRepoCta();
  }
  return undefined;
});

// Also support window-based messaging from background (dispatched via executeScript).
// This avoids extension messaging port races when the content script hasn't finished init.
window.addEventListener("message", (event: MessageEvent) => {
  if (event.source !== window) return;
  const data = event.data as { source?: string; type?: string; payload?: unknown } | undefined;
  if (!data || data.source !== "readme-ai") return;
  if (data.type === "CHECK_AUTH") {
    void evaluateAuthState("runtime-message");
  } else if (data.type === "AUTH_SUCCESS") {
    setCtaState("success");
  } else if (data.type === "AUTH_FAILURE") {
    setCtaState("error", typeof data.payload === "string" ? data.payload : undefined);
  }
});

async function handleInitialLoad(): Promise<void> {
  ensureCtaStyles();
  await evaluateAuthState("initial-load");
}

async function evaluateAuthState(trigger: "initial-load" | "runtime-message"): Promise<void> {
  const status = await requestAuthStatus();
  const tokens = status?.tokens;
  const repositories = status?.repositories;
  if (tokens) {
    removeCta();
    persistRepositoriesToLocalStorage(repositories);
    maybeShowRepositoryCta(repositories);
  } else if (document.body) {
    ensureCta();
    removeRepoCta();
  } else if (trigger === "initial-load") {
    window.setTimeout(() => void evaluateAuthState("initial-load"), 250);
  }
}

// Background auth status helper
async function requestAuthStatus(): Promise<AuthStatusResponse | undefined> {
  return new Promise<AuthStatusResponse | undefined>((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_AUTH_STATUS" }, (response?: AuthStatusResponse) => {
      if (chrome.runtime.lastError) {
        resolve(undefined);
        return;
      }
      resolve(response);
    });
  });
}

// --- START_AUTH Integration ---
async function startAuthFromContent(): Promise<void> {
  setCtaState("loading");
  try {
    await new Promise<void>((resolve, reject) => {
      chrome.runtime.sendMessage({ type: "START_AUTH" }, (response?: AuthStartResponse) => {
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
    // Note: The 'AUTH_SUCCESS' message from background will trigger the state change
  } catch (error) {
    const message = error instanceof Error ? error.message : undefined;
    showErrorState(message);
  }
}

function ensureCta(): void {
  const existing = document.getElementById(CTA_CONTAINER_ID);
  if (existing) {
    return;
  }
  const container = document.createElement("div");
  container.id = CTA_CONTAINER_ID;
  container.className = "readme-ai-cta";
  try {
    const html = document.documentElement;
    const colorMode = html.getAttribute("data-color-mode") || html.getAttribute("data-theme");
    const isDark = (colorMode || "").toLowerCase().includes("dark") || document.body.classList.contains("dark");
    if (isDark) {
      container.setAttribute("data-theme", "dark");
    }
  } catch {
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
// --- END AUTH CTA ---

function removeCta(): void {
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

function persistRepositoriesToLocalStorage(repositories?: UserRepository[] | null): void {
  if (!repositories || repositories.length === 0) {
    try {
      window.localStorage.removeItem(REPO_STORAGE_KEY);
    } catch {
      // ignore storage removal errors
    }
    return;
  }
  try {
    window.localStorage.setItem(REPO_STORAGE_KEY, JSON.stringify(repositories));
  } catch (error) {
    console.debug("README AI extension: failed to persist repositories to localStorage", error);
  }
}

function loadRepositoriesFromLocalStorage(): UserRepository[] | undefined {
  try {
    const raw = window.localStorage.getItem(REPO_STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return undefined;
    return parsed as UserRepository[];
  } catch {
    return undefined;
  }
}

function maybeShowRepositoryCta(repositories?: UserRepository[] | null): void {
  const repoList = repositories && repositories.length > 0 ? repositories : loadRepositoriesFromLocalStorage();
  if (!repoList || repoList.length === 0) {
    removeRepoCta();
    return;
  }

  const currentUrl = normalizeRepoUrl(window.location.href);
  const match = repoList.find(repo => normalizeRepoUrl(repo.html_url) === currentUrl);

  if (match) {
    ensureRepoCta(match);
  } else {
    removeRepoCta();
  }
}

function ensureRepoCta(repo: UserRepository): void {
  let container = repoCtaContainer ?? document.getElementById(REPO_CTA_CONTAINER_ID) as HTMLDivElement | null;
  if (!container) {
    container = document.createElement("div");
    container.id = REPO_CTA_CONTAINER_ID;
    container.className = "readme-ai-cta readme-ai-cta--repo";

    try {
      const html = document.documentElement;
      const colorMode = html.getAttribute("data-color-mode") || html.getAttribute("data-theme");
      const isDark = (colorMode || "").toLowerCase().includes("dark") || document.body.classList.contains("dark");
      if (isDark) {
        container.setAttribute("data-theme", "dark");
      }
    } catch {
      // ignore theme detection errors
    }

    const heading = document.createElement("span");
    heading.className = "readme-ai-cta__heading";
    heading.textContent = "README AI";

    const description = document.createElement("p");
    description.className = "readme-ai-cta__description";
    description.textContent = "This repository is connected to README AI.";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "readme-ai-cta__button";
    repoCtaButton = button;

    container.append(heading, description, button);
    repoCtaContainer = container;

    document.body?.appendChild(container);
  }

  if (!repoCtaContainer) {
    repoCtaContainer = container ?? undefined;
  }

  const buttonLabel = `Generate README for ${repo.name}`;
  if (repoCtaButton) {
    repoCtaButton.textContent = buttonLabel;
    repoCtaButton.onclick = () => openReadmePanel(repo); // This now calls the fixed function
  }
}

function removeRepoCta(): void {
  if (repoCtaContainer?.parentElement) {
    repoCtaContainer.parentElement.removeChild(repoCtaContainer);
  }
  repoCtaContainer = undefined;
  repoCtaButton = undefined;
}

function normalizeRepoUrl(value: string): string {
  try {
    const parsed = new URL(value, window.location.origin);
    const normalizedPath = parsed.pathname.replace(/\/$/, "");
    return `${parsed.origin}${normalizedPath}`.toLowerCase();
  } catch {
    return value.trim().replace(/\/$/, "").toLowerCase();
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function showSuccessState(): void {
  setCtaState("success");
  hideTimeout = window.setTimeout(() => {
    removeCta();
  }, 2000);
}

function showErrorState(errorMessage?: string): void {
  setCtaState("error", errorMessage);
}

type CtaState = "idle" | "loading" | "success" | "error";

function setCtaState(state: CtaState, errorMessage?: string): void {
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

function ensureCtaStyles(): void {
  if (document.getElementById(CTA_STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = CTA_STYLE_ID;
  style.textContent = `
    .readme-ai-cta {
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
    .readme-ai-cta[data-theme="dark"] {
      background: var(--bg-secondary);
      color: var(--text-primary);
      border-color: var(--border);
    }
    /* Inject app theme variables locally (light) */
    .readme-ai-cta {
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
    .readme-ai-cta[data-theme="dark"] {
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
    .readme-ai-cta[data-theme="dark"] .readme-ai-cta__button { color: #ffffff; background: var(--primary); }
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
