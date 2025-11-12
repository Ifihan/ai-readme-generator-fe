import { Component } from '@angular/core';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [],
  template: `
    <div class="privacy-policy">
      <div class="container">
        <header class="policy-header">
          <h1>Privacy Policy</h1>
          <p class="last-updated">Last updated: November 12, 2025</p>
        </header>

        <div class="policy-content">
          <section class="intro">
            <p>
              At README AI, we take your privacy seriously. This Privacy Policy explains how we collect, use,
              and protect your information when you use our web application and browser extension.
            </p>
          </section>

          <section class="policy-section">
            <h2>Information We Collect</h2>

            <h3>GitHub Account Information</h3>
            <p>
              When you authenticate with GitHub, we receive and store:
            </p>
            <ul>
              <li>Your GitHub username and profile information</li>
              <li>Your public repositories list</li>
              <li>Repository metadata (name, description, language, etc.)</li>
              <li>Access tokens for API interactions (securely encrypted)</li>
            </ul>

            <h3>Generated Content</h3>
            <p>
              We store the README files you generate to provide history and improve our service:
            </p>
            <ul>
              <li>Generated README content</li>
              <li>Repository information for which READMEs were created</li>
              <li>Generation timestamps and preferences</li>
            </ul>

            <h3>Browser Extension Data</h3>
            <p>
              Our Chrome extension stores minimal data locally:
            </p>
            <ul>
              <li>Authentication tokens (stored securely in browser storage)</li>
              <li>Your repository list for quick access</li>
              <li>Extension preferences and settings</li>
            </ul>
          </section>

          <section class="policy-section">
            <h2>How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul>
              <li><strong>Generate README files:</strong> Analyze your repositories to create relevant documentation</li>
              <li><strong>Provide authentication:</strong> Securely connect to your GitHub account</li>
              <li><strong>Store your history:</strong> Keep track of previously generated READMEs</li>
              <li><strong>Improve our service:</strong> Understand usage patterns to enhance functionality</li>
              <li><strong>Provide support:</strong> Help resolve any issues you may encounter</li>
            </ul>
          </section>

          <section class="policy-section">
            <h2>Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your data:
            </p>
            <ul>
              <li><strong>Encryption:</strong> All data is encrypted in transit and at rest</li>
              <li><strong>Secure storage:</strong> Authentication tokens are stored using secure browser APIs</li>
              <li><strong>Limited access:</strong> We only request minimal GitHub permissions needed for functionality</li>
              <li><strong>Regular security audits:</strong> Our systems undergo regular security reviews</li>
            </ul>
          </section>

          <section class="policy-section">
            <h2>Data Sharing and Third Parties</h2>
            <p>
              We do not sell, trade, or share your personal information with third parties, except:
            </p>
            <ul>
              <li><strong>GitHub API:</strong> We communicate with GitHub's API to access your repositories</li>
              <li><strong>AI Services:</strong> Repository analysis may use AI services to generate content (no personal data is shared)</li>
              <li><strong>Legal requirements:</strong> If required by law or to protect our rights</li>
            </ul>
          </section>

          <section class="policy-section">
            <h2>Browser Extension Specific Practices</h2>
            <p>
              Our Chrome extension follows strict privacy practices:
            </p>
            <ul>
              <li><strong>Local storage only:</strong> Sensitive data stays in your browser</li>
              <li><strong>Minimal permissions:</strong> We only request necessary browser permissions</li>
              <li><strong>No tracking:</strong> We don't track your browsing activity outside of GitHub</li>
              <li><strong>Secure communication:</strong> All communication with our servers uses HTTPS</li>
            </ul>
          </section>

          <section class="policy-section">
            <h2>Your Rights and Control</h2>
            <p>You have the right to:</p>
            <ul>
              <li><strong>Access your data:</strong> View all data we have stored about you</li>
              <li><strong>Delete your data:</strong> Request complete deletion of your account and data</li>
              <li><strong>Update information:</strong> Modify or correct any stored information</li>
              <li><strong>Revoke access:</strong> Disconnect your GitHub account at any time</li>
              <li><strong>Export data:</strong> Download your generated READMEs and history</li>
            </ul>
            <p>
              To exercise these rights, contact us at
        <a href="https://github.com/Ifihan" class="social-link" target="_blank">Github</a>

            </p>
          </section>

          <section class="policy-section">
            <h2>Cookies and Local Storage</h2>
            <p>
              We use minimal cookies and local storage for:
            </p>
            <ul>
              <li>Maintaining your login session</li>
              <li>Storing user preferences</li>
              <li>Caching repository data for better performance</li>
            </ul>
            <p>
              You can clear this data through your browser settings at any time.
            </p>
          </section>

          <section class="policy-section">
            <h2>Data Retention</h2>
            <p>
              We retain your data for as long as your account is active. When you delete your account:
            </p>
            <ul>
              <li>All personal data is permanently deleted within 30 days</li>
              <li>Generated content may be retained in anonymized form for service improvement</li>
              <li>Access tokens are immediately revoked and deleted</li>
            </ul>
          </section>

          <section class="policy-section">
            <h2>Children's Privacy</h2>
            <p>
              Our service is not intended for children under 13. We do not knowingly collect
              personal information from children under 13. If we become aware that we have
              collected such information, we will take steps to delete it immediately.
            </p>
          </section>

          <section class="policy-section">
            <h2>Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any
              material changes by:
            </p>
            <ul>
              <li>Posting the new policy on this page</li>
              <li>Updating the "Last updated" date</li>
              <li>Sending you an email notification (if you have an account)</li>
            </ul>
          </section>

          <section class="policy-section">
            <h2>Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or our practices, please contact us:
            </p>
            <div class="contact-info">
                   <a href="https://github.com/Ifihan" class="social-link" target="_blank">Github</a>
            </div>
          </section>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./privacy-policy.component.css']
})
export class PrivacyPolicyComponent {
}
