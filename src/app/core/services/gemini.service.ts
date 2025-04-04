import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private apiUrl = '/api/gemini'; // This will be proxied to your backend service
  
  constructor(private http: HttpClient) {}
  
  /**
   * Generate README content based on repository information
   * @param repoInfo Repository information including code snippets, structure, etc.
   * @returns Observable with the generated README content
   */
  generateReadme(repoInfo: any): Observable<string> {
    // In production, this would call your backend API which integrates with Gemini
    return this.http.post<{content: string}>(`${this.apiUrl}/generate`, { repoInfo }).pipe(
      map(response => response.content),
      catchError(error => {
        console.error('Error generating README:', error);
        return throwError(() => new Error('Failed to generate README. Please try again.'));
      })
    );
  }
  
  /**
   * Mock implementation for development before backend integration
   * This can be used during initial development to simulate responses
   */
  mockGenerateReadme(repoInfo: any): Observable<string> {
    // Sample template README
    const mockReadme = `# ${repoInfo.name || 'Project Name'}

## Overview
${repoInfo.description || 'A comprehensive project for generating README files using AI.'}

## Features
- GitHub Integration
- AI-Powered README Generation
- Markdown Export
- Customizable Templates

## Installation
\`\`\`bash
git clone ${repoInfo.url || 'https://github.com/username/repo.git'}
cd ${repoInfo.name || 'project-name'}
npm install
\`\`\`

## Usage
1. Connect your GitHub account
2. Select a repository
3. Configure generation options
4. Generate your README
5. Edit and download

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## License
This project is licensed under the MIT License - see the LICENSE file for details.`;

    // Simulate API delay
    return of(mockReadme);
  }
}