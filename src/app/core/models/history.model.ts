export interface HistoryEntry {
  id: string;
  repository_name: string;
  repository_url: string;
  username: string;
  created_at: string;
  file_size: number;
  generation_type: string;
  sections_generated: string[];
}

export interface HistoryResponse {
  entries: HistoryEntry[];
  page: number;
  page_size: number;
  total_count: number;
}
