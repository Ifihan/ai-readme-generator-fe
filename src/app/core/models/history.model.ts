export interface HistoryEntry {
  id: string;
  repository_name: string;
  repository_url: string;
  username: string;
  content: string;
  created_at: string;
  file_size: number;
  generation_type: string;
  sections_generated: string[];
  showContent?: boolean; // UI state property
  isDeletedFromView?: boolean
  isDisabled?: boolean
}

export interface HistoryResponse {
  entries: HistoryEntry[];
  page: number;
  page_size: number;
  total_count: number;
}
