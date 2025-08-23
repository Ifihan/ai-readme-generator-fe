import { Injectable, isDevMode } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoggerService {

  debug(message: string, ...args: any[]): void {
    if (isDevMode()) {
      console.debug(message, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (isDevMode()) {
      console.info(message, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (isDevMode()) {
      console.warn(message, ...args);
    }
    // In production, you might want to send this to an external logging service
  }

  error(message: string, error?: any, ...args: any[]): void {
    if (isDevMode()) {
      console.error(message, error, ...args);
    }
    // In production, you might want to send this to an external logging service
    // Example: this.sendToExternalService('error', message, error);
  }

  // Method to send logs to external service in production
  private sendToExternalService(level: string, message: string, data?: any): void {
    // Implementation for external logging service
    // Example: Sentry, LogRocket, etc.
  }
}
