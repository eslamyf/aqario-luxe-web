import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  template: `
    <div class="not-found-page">
      <div class="not-found-container">
        <div class="gold-badge">
          <span class="warning-icon">⚠️</span>
          <span>404 • خطأ في المسار</span>
        </div>

        <div class="brand-logo-wrap">
          <img src="assets/images/logo.png" alt="AQARIO LUXE" class="brand-logo" />
        </div>

        <h1 class="not-found-title">الصفحة أو المسار غير موجود</h1>

        <p class="not-found-desc">
          المسار <code class="attempted-path">{{ currentPath }}</code> لا يطابق أي صفحة معتمدة داخل منصة عقاريو لوكس.
        </p>

        <div class="actions-wrap">
          <a routerLink="/" class="btn-home-action">
            <i class="fa-solid fa-house"></i>
            <span>العودة إلى الصفحة الرئيسية</span>
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .not-found-page {
      min-height: calc(100vh - 160px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 6rem 1.5rem 4rem;
      background: var(--bg-base);
      color: var(--text-main);
      position: relative;
      overflow: hidden;
    }

    .not-found-container {
      max-width: 580px;
      width: 100%;
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 24px;
      padding: 3rem 2.5rem;
      text-align: center;
      box-shadow: var(--shadow-pop, 0 20px 40px rgba(0, 0, 0, 0.4));
      backdrop-filter: blur(16px);
      position: relative;
      z-index: 2;
    }

    .gold-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--brand-gold-soft, rgba(201, 169, 110, 0.15));
      border: 1px solid var(--brand-gold, #C9A96E);
      color: var(--brand-gold, #C9A96E);
      padding: 0.4rem 1.2rem;
      border-radius: 9999px;
      font-size: 0.88rem;
      font-weight: 700;
      margin-bottom: 1.5rem;
    }

    .warning-icon {
      font-size: 1rem;
    }

    .brand-logo-wrap {
      margin-bottom: 1.25rem;
    }

    .brand-logo {
      height: 52px;
      width: auto;
      object-fit: contain;
    }

    .not-found-title {
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--text-main);
      margin-bottom: 0.75rem;
      line-height: 1.3;
    }

    .not-found-desc {
      color: var(--text-muted);
      font-size: 1.05rem;
      line-height: 1.6;
      margin-bottom: 2.25rem;
    }

    .attempted-path {
      display: inline-block;
      direction: ltr;
      font-family: 'Space Mono', monospace, sans-serif;
      background: var(--bg-input, rgba(255, 255, 255, 0.05));
      border: 1px solid var(--border-color);
      color: var(--brand-gold, #C9A96E);
      padding: 0.2rem 0.6rem;
      border-radius: 6px;
      font-size: 0.92rem;
      font-weight: 600;
      word-break: break-all;
    }

    .actions-wrap {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-top: 0.5rem;
    }

    .btn-home-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 0.9rem 2.2rem;
      background: linear-gradient(135deg, var(--brand-gold, #C9A96E) 0%, var(--brand-gold-dark, #8B6914) 100%);
      color: #0A0B0E;
      border: none;
      border-radius: 14px;
      font-size: 1.05rem;
      font-weight: 700;
      text-decoration: none;
      box-shadow: 0 8px 24px rgba(201, 169, 110, 0.25);
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
    }

    .btn-home-action i {
      font-size: 1.15rem;
      color: #0A0B0E;
      transition: transform 0.2s;
    }

    .btn-home-action:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 28px rgba(201, 169, 110, 0.4);
    }

    .btn-home-action:hover i {
      transform: scale(1.15);
    }

    @media (max-width: 600px) {
      .not-found-container {
        padding: 2rem 1.5rem;
      }
      .not-found-title {
        font-size: 1.4rem;
      }
      .btn-home-action {
        width: 100%;
      }
    }
  `]
})
export class NotFoundComponent {
  private router = inject(Router);

  get currentPath(): string {
    return this.router.url || window.location.pathname;
  }
}
