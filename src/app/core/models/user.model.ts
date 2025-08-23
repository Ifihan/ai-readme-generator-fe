export interface User {
  id: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  githubId?: string;
}

export interface UserResponse {
  username: string;
  installation_id: number;
  expires: number;
  user_data: {
    id: string;
    username: string;
    installation_id: number;
    email: string | null;
    full_name: string;
    avatar_url: string;
    github_id: number;
    public_repos: number;
    company: string | null;
    created_at: string;
    last_login: string;
  };
}
