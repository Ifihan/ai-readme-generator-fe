const constantDefinition = {
  hosts: {
    github: "github.com",
    apiBaseUrl: "https://ai-readme-generator-be-912048666815.us-central1.run.app",
    frontendBaseUrl: "https://ai-readme-generator-912048666815.us-central1.run.app"
  },
  storage: {
    repositoriesKey: "userRepositories",
    repoListLocalKey: "readme-ai.repositories"
  },
  ui: {
    defaultCommitMessage: "docs: add generated README"
  },
  cta: {
    containerId: "readme-ai-cta-container",
    styleId: "readme-ai-cta-style",
    repoContainerId: "readme-ai-repo-cta",
    labels: {
      default: "Try README AI",
      loading: "Opening…",
      success: "Connected to README AI",
      error: "We could not connect. Try again."
    }
  },
  contextMenuIds: {
    login: "readme-ai-login",
    logout: "readme-ai-logout",
    dashboard: "readme-ai-dashboard",
    history: "readme-ai-history",
    settings: "readme-ai-settings",
    separator: "readme-ai-separator"
  },
  messages: {
    toBackground: {
      getAuthStatus: "GET_AUTH_STATUS",
      startAuth: "START_AUTH",
      showSidePanelForRepo: "SHOW_SIDE_PANEL_FOR_REPO",
      getPendingRepo: "GET_PENDING_REPO",
      fetchReadmeTemplates: "FETCH_README_TEMPLATES",
      generateReadme: "GENERATE_README",
      saveReadme: "SAVE_README",
      fetchBranches: "FETCH_BRANCHES",
      createBranch: "CREATE_BRANCH"
    },
    broadcast: {
      checkAuth: "CHECK_AUTH",
      authSuccess: "AUTH_SUCCESS",
      authFailure: "AUTH_FAILURE"
    }
  }
} as const;

export const ReadmeConstants = Object.freeze(constantDefinition);

type GlobalConstants = typeof ReadmeConstants;

declare global {
  // eslint-disable-next-line no-var
  var ReadmeConstants: GlobalConstants;
}

if (typeof globalThis !== "undefined") {
  (globalThis as typeof globalThis & { ReadmeConstants?: GlobalConstants }).ReadmeConstants = ReadmeConstants;
}
