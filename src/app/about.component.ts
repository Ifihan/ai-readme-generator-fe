import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="about-page">
      <button class="back-button" onclick="window.history.back()">← Back to Application</button>
      <div class="about-container">
        <div class="profile-image-container">
          <img src="assets/images/ifihan.png" alt="Ifihan" class="profile-image">
        </div>
        <h1 class="greeting"><span class="hi-text">Hi! </span><span class="name-text">I'm Ifihan</span>.</h1>
        <p class="description">
          I'm a Software and Machine Learning Engineer with a passion for building scalable solutions using cutting-edge technologies. I'm also a dedicated researcher, with a primary focus on computer vision and bio-inspired computing. My expertise spans Backend Engineering, Artificial Intelligence, and Technical Writing, and I'm proficient in both Python (Flask and Django) and the Julia programming language. My active involvement in open-source projects highlights my commitment to giving back and contributing meaningfully to the tech community.
        </p>
        <p class="description">
          Beyond my technical abilities, I'm known for my deep love for the tech community and my consistent efforts to support and give back to the community I hold dear.
        </p>
        <p class="description">
          You can contact me through the following for collaboration: <a href="https://x.com/ifihan" target="_blank" class="contact-link">X (Twitter)</a> and <a href="https://linkedin.com/in/ifihanagbara" target="_blank" class="contact-link">LinkedIn</a>.
        </p>
      </div>
    </div>
  `,
  styles: [`
    .about-page {
      min-height: 100vh;
      padding: 40px;
      background-color: var(--bg-primary);
      position: relative;
    }

    .back-button {
      position: absolute;
      top: 20px;
      left: 20px;
      padding: 8px 16px;
      background: white;
      color: black;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-weight: 500;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .back-button:hover {
      background: #f5f5f5;
      border-color: #bbb;
    }

    .about-container {
      max-width: 800px;
      margin: 80px auto 0;
      padding: 0 20px;
      text-align: left;
    }

    .profile-image-container {
      margin-bottom: 40px;
    }

    .profile-image {
      width: 250px;
      height: 250px;
      border-radius: 50%;
      object-fit: cover;
      border: 1px solid #000;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
    }

    .greeting {
      font-size: 56px;
      font-weight: 700;
      margin-bottom: 32px;
      color: var(--text-primary);
    }

    .hi-text, .name-text {
      background: linear-gradient(90deg, #8a2be2, #663399);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .description {
      font-size: 24px;
      line-height: 1.6;
      color: var(--text-secondary);
      margin: 0 0 24px 0;
      width: 100%;
    }

    .contact-link {
      color: #8a2be2;
      text-decoration: none;
      font-weight: 500;
      transition: color 0.3s ease;
    }

    .contact-link:hover {
      color: #663399;
      text-decoration: underline;
    }

    @media (max-width: 600px) {
      .about-page {
        padding: 20px;
      }
      
      .about-container {
        margin-top: 60px;
      }
      
      .profile-image {
        width: 180px;
        height: 180px;
      }
      
      .greeting {
        font-size: 42px;
      }
      
      .description {
        font-size: 20px;
      }
    }
  `]
})
export class AboutComponent {}