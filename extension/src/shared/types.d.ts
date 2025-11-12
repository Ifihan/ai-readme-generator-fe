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

type GeneratedSectionOrder = number;

type ExtensionInboundMessage =
  | { type: "GET_AUTH_STATUS" }
  | { type: "START_AUTH" }
  | { type: "SHOW_SIDE_PANEL_FOR_REPO"; payload: { repo: UserRepository } }
  | { type: "GET_PENDING_REPO" }
  | { type: "FETCH_README_TEMPLATES" }
  | { type: "GENERATE_README"; payload: GenerateReadmeRequestPayload }
  | { type: "SAVE_README"; payload: SaveReadmeRequestPayload }
  | { type: "FETCH_BRANCHES"; payload: { repository_url: string } }
  | { type: "CREATE_BRANCH"; payload: { repository_url: string; branch_name: string } };

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

interface GenerateReadmeSectionPayload {
  name: string;
  description: string;
  required: boolean;
  order: GeneratedSectionOrder;
}

interface GenerateReadmeRequestPayload {
  repository_url: string;
  sections: GenerateReadmeSectionPayload[];
  include_badges: boolean;
  badge_style: string;
}

interface GenerateReadmeResponsePayload {
  content: string;
  sections_generated: string[];
  entry_id: string;
}

interface SaveReadmeRequestPayload {
  repository_url: string;
  content: string;
  path: string;
  commit_message: string;
  branch: string;
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

type BackgroundMessage =
  | { type: "CHECK_AUTH" }
  | { type: "AUTH_SUCCESS" }
  | { type: "AUTH_FAILURE"; error?: string };
