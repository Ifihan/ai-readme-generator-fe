/// <reference types="chrome" />
/// <reference path="./shared/constants.ts" />

const {
  cta: {
    containerId: CTA_CONTAINER_ID,
    styleId: CTA_STYLE_ID,
    repoContainerId: REPO_CTA_CONTAINER_ID,
    labels: {
      default: CTA_DEFAULT_LABEL,
      loading: CTA_LOADING_LABEL,
      success: CTA_SUCCESS_LABEL,
      error: CTA_ERROR_LABEL
    }
  },
  storage: { repoListLocalKey: REPO_STORAGE_KEY },
  messages: MESSAGE_DEFINITIONS
} = ReadmeConstants;

const {
  toBackground: MESSAGE_TO_BACKGROUND,
  broadcast: MESSAGE_BROADCAST
} = MESSAGE_DEFINITIONS;

const {
  getAuthStatus: MSG_GET_AUTH_STATUS,
  startAuth: MSG_START_AUTH,
  showSidePanelForRepo: MSG_SHOW_SIDE_PANEL_FOR_REPO,
  fetchReadmeTemplates: MSG_FETCH_README_TEMPLATES,
  generateReadme: MSG_GENERATE_README,
  saveReadme: MSG_SAVE_README,
  fetchBranches: MSG_FETCH_BRANCHES,
  createBranch: MSG_CREATE_BRANCH,
  getPendingRepo: MSG_GET_PENDING_REPO
} = MESSAGE_TO_BACKGROUND;

const {
  checkAuth: MSG_CHECK_AUTH,
  authSuccess: MSG_AUTH_SUCCESS,
  authFailure: MSG_AUTH_FAILURE
} = MESSAGE_BROADCAST;

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
      type: MSG_SHOW_SIDE_PANEL_FOR_REPO,
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
  if (message.type === MSG_CHECK_AUTH) {
    void evaluateAuthState("runtime-message");
  } else if (message.type === MSG_AUTH_SUCCESS) {
    setCtaState("success");
    void evaluateAuthState("runtime-message");
  } else if (message.type === MSG_AUTH_FAILURE) {
    // --- MODIFICATION: Handle auth failure immediately ---
    removeRepoCta(); // Remove the repo-specific button
    ensureCta(); // Show the main login CTA
    // Show error on main CTA, defaulting to a helpful message
    const error = message.error || "Your session has expired. Please log in.";
    setCtaState("error", error);
    // --- END MODIFICATION ---
  }
  return undefined;
});

// Also support window-based messaging from background (dispatched via executeScript).
// This avoids extension messaging port races when the content script hasn't finished init.
window.addEventListener("message", (event: MessageEvent) => {
  if (event.source !== window) return;
  const data = event.data as { source?: string; type?: string; payload?: unknown } | undefined;
  if (!data || data.source !== "readme-ai") return;
  if (data.type === MSG_CHECK_AUTH) {
    void evaluateAuthState("runtime-message");
  } else if (data.type === MSG_AUTH_SUCCESS) {
    setCtaState("success");
  } else if (data.type === MSG_AUTH_FAILURE) {
    // --- MODIFICATION: Handle auth failure immediately ---
    removeRepoCta();
    ensureCta();
    const error = (typeof data.payload === "string" ? data.payload : undefined) || "Your session has expired. Please log in.";
    setCtaState("error", error);
    // --- END MODIFICATION ---
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
    chrome.runtime.sendMessage({ type: MSG_GET_AUTH_STATUS }, (response?: AuthStatusResponse) => {
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
      chrome.runtime.sendMessage({ type: MSG_START_AUTH }, (response?: AuthStartResponse) => {
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

  // Header with logo
  const header = document.createElement("div");
  header.className = "readme-ai-cta__header";

  const logo = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  logo.setAttribute("class", "readme-ai-cta__logo");
  logo.setAttribute("viewBox", "0 0 220 180");
  logo.setAttribute("role", "img");
  logo.setAttribute("aria-label", "README AI logo");
  logo.innerHTML = `
    <defs>
      <style>
        .logo-icon { fill: none; stroke: currentColor; stroke-width: 3; }
        .logo-text { fill: currentColor; font-family: monospace; font-weight: bold; text-anchor: middle; }
        .logo-subtext { fill: currentColor; font-family: monospace; text-anchor: middle; opacity: 0.85; }
      </style>
    </defs>
    <path class="logo-icon" d="M40,20 H140 L180,60 V160 H40 Z"/>
    <polyline class="logo-icon" points="140,20 140,60 180,60"/>
    <text class="logo-text" x="110" y="90" font-size="36">AI</text>
    <text class="logo-subtext" x="110" y="130" font-size="16">readme.md</text>
  `;

  const heading = document.createElement("span");
  heading.textContent = "README AI";
  heading.className = "readme-ai-cta__heading";

  header.append(logo, heading);

  const body = document.createElement("p");
  body.textContent = "Generate polished READMEs automatically with AI-powered insights.";
  body.className = "readme-ai-cta__description";
  ctaMessage = body;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "readme-ai-cta__button";
  const buttonText = document.createElement("span");
  buttonText.textContent = CTA_DEFAULT_LABEL;
  button.appendChild(buttonText);
  button.addEventListener("click", () => {
    void startAuthFromContent();
  });
  ctaButton = button;

  container.append(header, body, button);

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

    // Header with logo
    const header = document.createElement("div");
    header.className = "readme-ai-cta__header";

    const logo = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    logo.setAttribute("class", "readme-ai-cta__logo");
    logo.setAttribute("viewBox", "0 0 220 180");
    logo.setAttribute("role", "img");
    logo.setAttribute("aria-label", "README AI logo");
    logo.innerHTML = `
      <defs>
        <style>
          .logo-icon { fill: none; stroke: currentColor; stroke-width: 3; }
          .logo-text { fill: currentColor; font-family: monospace; font-weight: bold; text-anchor: middle; }
          .logo-subtext { fill: currentColor; font-family: monospace; text-anchor: middle; opacity: 0.85; }
        </style>
      </defs>
      <path class="logo-icon" d="M40,20 H140 L180,60 V160 H40 Z"/>
      <polyline class="logo-icon" points="140,20 140,60 180,60"/>
      <text class="logo-text" x="110" y="90" font-size="36">AI</text>
      <text class="logo-subtext" x="110" y="130" font-size="16">readme.md</text>
    `;

    const heading = document.createElement("span");
    heading.className = "readme-ai-cta__heading";
    heading.textContent = "README AI";

    header.append(logo, heading);

    const description = document.createElement("p");
    description.className = "readme-ai-cta__description";
    description.textContent = "This repository is connected to README AI.";

    // Repository name with proper truncation handling
    const repoName = document.createElement("span");
    repoName.className = "readme-ai-cta__repo-name";
    repoName.textContent = repo.full_name || repo.name;
    repoName.title = repo.full_name || repo.name; // Tooltip for full name
    description.appendChild(repoName);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "readme-ai-cta__button";
    repoCtaButton = button;

    container.append(header, description, button);
    repoCtaContainer = container;

    document.body?.appendChild(container);
  }

  if (!repoCtaContainer) {
    repoCtaContainer = container ?? undefined;
  }

  // Smart button text based on repository name length
  const displayName = repo.name.length > 20 ? repo.name.substring(0, 20) + '…' : repo.name;
  const buttonLabel = `Generate README for ${displayName}`;

  if (repoCtaButton) {
    const buttonText = document.createElement("span");
    buttonText.textContent = buttonLabel;
    repoCtaButton.innerHTML = '';
    repoCtaButton.appendChild(buttonText);
    repoCtaButton.title = `Generate README for ${repo.full_name || repo.name}`; // Full tooltip
    repoCtaButton.onclick = () => openReadmePanel(repo);
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
    // If the CTA doesn't exist (e.g., was removed), this call might
    // be from an auth failure. We should ensure the CTA exists if
    // we're in an error state.
    if (state === 'error') {
      ensureCta();
      // If ctaButton is still not defined after ensureCta(), then abort.
      if (!ctaButton || !ctaMessage) return;
    } else {
      return;
    }
  }

  ctaButton.disabled = state === "loading";

  // Reset classes
  ctaButton.classList.remove("readme-ai-cta__button--success", "readme-ai-cta__button--error", "readme-ai-cta__button--loading");

  const buttonText = ctaButton.querySelector("span");
  if (!buttonText) return; // Should not happen if ensureCta works

  switch (state) {
    case "idle":
      buttonText.textContent = CTA_DEFAULT_LABEL;
      ctaMessage.textContent = "Generate polished READMEs automatically with AI-powered insights.";
      break;
    case "loading":
      buttonText.textContent = CTA_LOADING_LABEL;
      ctaMessage.textContent = "Connecting to README AI…";
      ctaButton.classList.add("readme-ai-cta__button--loading");
      break;
    case "success":
      buttonText.textContent = CTA_SUCCESS_LABEL;
      ctaMessage.textContent = "You can now open README AI from the extension.";
      ctaButton.classList.add("readme-ai-cta__button--success");
      ctaButton.disabled = true;
      break;
    case "error":
      buttonText.textContent = CTA_DEFAULT_LABEL; // Reset to default label to invite click
      ctaMessage.textContent = errorMessage ?? CTA_ERROR_LABEL;
      ctaButton.classList.add("readme-ai-cta__button--error");
      ctaButton.disabled = false; // Ensure button is clickable to re-authenticate
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
      gap: 12px;
      padding: 20px;
      border-radius: 16px;
      background: var(--bg-secondary);
      color: var(--text-primary);
      box-shadow: var(--shadow-lg);
      max-width: 320px;
      min-width: 280px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      border: 1px solid var(--border);
      backdrop-filter: blur(12px);
      animation: slideInBounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
      opacity: 0;
      transform: translateY(100px) scale(0.8);
    }

    @keyframes slideInBounce {
      0% {
        opacity: 0;
        transform: translateY(100px) scale(0.8);
      }
      70% {
        opacity: 1;
        transform: translateY(-8px) scale(1.02);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes logoFloat {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-3px); }
    }

    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    .readme-ai-cta[data-theme="dark"] {
      background: var(--bg-secondary);
      color: var(--text-primary);
      border-color: var(--border);
    }

    /* Enhanced theme variables */
    .readme-ai-cta {
      --bg-primary: #fafbfc;
      --bg-secondary: rgba(255, 255, 255, 0.95);
      --text-primary: #1a1a1a;
      --text-secondary: #586069;
      --text-tertiary: #8b949e;
      --primary: #8a2be2;
      --primary-hover: #7928ca;
      --primary-light: #a855f7;
      --border: rgba(225, 228, 232, 0.8);
      --accent: #0969da;
      --success: #2ea043;
      --shadow-sm: 0 1px 3px rgba(0,0,0,0.06);
      --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
      --shadow-lg: 0 8px 24px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.05);
    }

    .readme-ai-cta[data-theme="dark"] {
      --bg-primary: #0d1117;
      --bg-secondary: rgba(22, 27, 34, 0.95);
      --text-primary: #e6edf3;
      --text-secondary: #8b949e;
      --text-tertiary: #656d76;
      --primary: #a855f7;
      --primary-hover: #c084fc;
      --primary-light: #d8b4fe;
      --border: rgba(48, 54, 61, 0.8);
      --accent: #58a6ff;
      --success: #3fb950;
      --shadow-sm: 0 1px 3px rgba(0,0,0,0.4);
      --shadow-md: 0 4px 12px rgba(0,0,0,0.5);
      --shadow-lg: 0 8px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1);
    }

    .readme-ai-cta__header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 4px;
    }

    .readme-ai-cta__logo {
      width: 32px;
      height: 32px;
      flex-shrink: 0;
      animation: logoFloat 3s ease-in-out infinite;
      filter: drop-shadow(0 2px 4px rgba(138, 43, 226, 0.2));
    }

    .readme-ai-cta__heading {
      font-weight: 700;
      font-size: 18px;
      line-height: 1.2;
      background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .readme-ai-cta__description {
      margin: 0;
      font-size: 14px;
      color: var(--text-secondary);
      line-height: 1.5;
      font-weight: 400;
    }

    .readme-ai-cta__button {
      border: none;
      border-radius: 10px;
      padding: 12px 18px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      color: #ffffff;
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: var(--shadow-md);
      position: relative;
      overflow: hidden;
    }

    .readme-ai-cta__button::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
      transition: left 0.6s ease;
    }

    .readme-ai-cta__button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(138, 43, 226, 0.4);
      background: linear-gradient(135deg, var(--primary-hover) 0%, var(--primary-light) 100%);
    }

    .readme-ai-cta__button:hover:not(:disabled)::before {
      left: 100%;
    }

    .readme-ai-cta__button:active {
      transform: translateY(0);
    }

    .readme-ai-cta__button:disabled {
      cursor: default;
      opacity: 0.7;
      transform: none !important;
    }

    .readme-ai-cta__button--success {
      background: linear-gradient(135deg, var(--success) 0%, #22c55e 100%);
      animation: successPulse 2s ease-in-out infinite;
    }

    .readme-ai-cta__button--success:hover:not(:disabled) {
      box-shadow: 0 8px 25px rgba(46, 160, 67, 0.4);
    }

    .readme-ai-cta__button--error {
      background: linear-gradient(135deg, #f85149 0%, #ef4444 100%);
      animation: errorShake 0.5s ease-in-out;
    }

    @keyframes successPulse {
      0%, 100% { box-shadow: 0 4px 12px rgba(46, 160, 67, 0.3); }
      50% { box-shadow: 0 4px 20px rgba(46, 160, 67, 0.5); }
    }

    @keyframes errorShake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-4px); }
      75% { transform: translateX(4px); }
    }

    /* Repository CTA specific styles */
    .readme-ai-cta--repo {
      animation: slideInFromRight 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
      background: var(--bg-secondary);
      border-left: 4px solid var(--primary);
    }

    .readme-ai-cta--repo .readme-ai-cta__heading {
      font-size: 16px;
    }

    .readme-ai-cta--repo .readme-ai-cta__description {
      font-size: 13px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .readme-ai-cta--repo .readme-ai-cta__repo-name {
      font-weight: 600;
      color: var(--text-primary);
      display: block;
      margin-top: 4px;
      font-size: 14px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 100%;
    }

    @keyframes slideInFromRight {
      0% {
        opacity: 0;
        transform: translateX(100px);
      }
      100% {
        opacity: 1;
        transform: translateX(0);
      }
    }

    /* Loading state */
    .readme-ai-cta__button--loading {
      background: linear-gradient(135deg, var(--text-tertiary) 0%, var(--text-secondary) 100%);
      position: relative;
    }

    .readme-ai-cta__button--loading::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 16px;
      height: 16px;
      margin: -8px 0 0 -8px;
      border: 2px solid transparent;
      border-top: 2px solid #ffffff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .readme-ai-cta__button--loading span {
      opacity: 0;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .readme-ai-cta {
        bottom: 16px;
        right: 16px;
        max-width: 280px;
        min-width: 260px;
      }
    }

    @media (max-width: 480px) {
      .readme-ai-cta {
        left: 16px;
        right: 16px;
        max-width: none;
        min-width: auto;
      }
    }
  `;

  document.head.appendChild(style);
}
