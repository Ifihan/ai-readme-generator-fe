import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Repository {
  id: number;
  name: string;
  fullName: string;
  description: string;
  private: boolean;
  htmlUrl: string;
  language: string;
  defaultBranch: string;
  owner: {
    login: string;
    avatarUrl: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class GithubService {
  private apiUrl = 'https://api.github.com';
  
  // Mock stats for development
  githubStats = {
    stars: 256,
    forks: 42,
    contributors: 12
  };
  
  constructor(private http: HttpClient) {}
  
  getUserRepositories(): Observable<Repository[]> {
    return this.http.get<any[]>(`${this.apiUrl}/user/repos`).pipe(
      map(repos => repos.map(repo => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        private: repo.private,
        htmlUrl: repo.html_url,
        language: repo.language,
        defaultBranch: repo.default_branch,
        owner: {
          login: repo.owner.login,
          avatarUrl: repo.owner.avatar_url
        }
      })))
    );
  }
  
  getRepositoryContent(owner: string, repo: string, path: string = ''): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/repos/${owner}/${repo}/contents/${path}`);
  }
  
  // Method to create or update a file in a repository
  createOrUpdateFile(
    owner: string, 
    repo: string, 
    path: string, 
    content: string, 
    message: string, 
    sha?: string
  ): Observable<any> {
    const endpoint = `${this.apiUrl}/repos/${owner}/${repo}/contents/${path}`;
    const body = {
      message,
      content: btoa(content), // Base64 encode content
      sha // Include sha for updates, omit for creation
    };
    
    return this.http.put<any>(endpoint, body);
  }
  
  // Get GitHub project stats (stars, forks, etc)
  getProjectStats(): Observable<any> {
    // In production, make an actual API call
    return of(this.githubStats);
  }
}