// Storage keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  USER_SESSION: 'user_session',
  CURRENT_SESSION: 'current_session',
  THEME: 'theme'
} as const;

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    CALLBACK: '/auth/oauth/callback',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    REFRESH: '/auth/refresh-token',
    VERIFY: '/auth/verify-token',
    REINSTALL: '/auth/settings/reinstall',
    REVOKE: '/auth/settings/revoke'
  },
  GITHUB: {
    INSTALLATIONS: '/github/installations',
    REPOSITORIES: '/github/repositories'
  },
  README: {
    GENERATE: '/readme/generate',
    REFINE: '/readme/refine',
    TEMPLATES: '/readme/sections',
    SAVE: '/readme/save',
    DOWNLOAD: '/readme/download'
  }
} as const;

// Routes
export const ROUTES = {
  LANDING: '',
  DASHBOARD: 'dashboard',
  SETTINGS: 'settings',
  README_GENERATE: 'readme-generate',
  AUTH_CALLBACK: 'auth/callback'
} as const;

// Default values
export const DEFAULTS = {
  BADGE_STYLE: 'flat',
  BADGE_STYLES: ['flat', 'plastic', 'flat-square', 'for-the-badge', 'social'],
  PAGINATION: {
    PAGE_SIZE: 6,
    INITIAL_PAGE: 1
  },
  COMMIT_MESSAGE: 'Add generated README.md',
  BRANCH: 'main',
  README_PATH: 'README.md'
} as const;

// Error messages
export const ERROR_MESSAGES = {
  AUTH: {
    LOGIN_FAILED: 'Failed to initiate login. Please try again.',
    LOGOUT_FAILED: 'Logout failed. Please try again.',
    USER_LOAD_FAILED: 'Failed to load user information.',
    SESSION_EXPIRED: 'Your session has expired. Please login again.',
    UNAUTHORIZED: 'You are not authorized to perform this action.'
  },
  README: {
    GENERATION_FAILED: 'Failed to generate README. Please try again.',
    DOWNLOAD_FAILED: 'Failed to download README. Please try again.',
    SAVE_FAILED: 'Failed to save README to GitHub. Please try again.',
    TEMPLATES_LOAD_FAILED: 'Failed to load section templates.'
  },
  GITHUB: {
    INSTALLATIONS_LOAD_FAILED: 'Failed to load GitHub installations.',
    REPOSITORIES_LOAD_FAILED: 'Failed to load repositories.',
    APP_REINSTALL_FAILED: 'Failed to reinstall GitHub App.',
    APP_REVOKE_FAILED: 'Failed to revoke GitHub App.'
  },
  GENERAL: {
    NETWORK_ERROR: 'Network error. Please check your connection.',
    UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
    VALIDATION_ERROR: 'Please check your input and try again.'
  }
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  AUTH: {
    LOGIN_SUCCESS: 'Successfully logged in!',
    LOGOUT_SUCCESS: 'Successfully logged out!',
    APP_REINSTALL_SUCCESS: 'GitHub App reinstall initiated successfully',
    APP_REVOKE_SUCCESS: 'GitHub App revoked successfully'
  },
  README: {
    GENERATION_SUCCESS: 'README generated successfully!',
    DOWNLOAD_SUCCESS: 'README downloaded successfully!',
    SAVE_SUCCESS: 'README saved to GitHub successfully!'
  }
} as const;
