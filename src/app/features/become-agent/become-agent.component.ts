import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-become-agent',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="redirect-container" style="display: flex; justify-content: center; align-items: center; min-height: 100vh; background: var(--bg-base); color: var(--text-main); font-family: var(--font-body);">
      <div class="spinner" style="border: 2px solid rgba(201, 169, 110, 0.1); border-left-color: var(--brand-gold); border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite;"></div>
    </div>
  `,
  styles: [`
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class BecomeAgentComponent implements OnInit {
  private router = inject(Router);

  ngOnInit(): void {
    // Securely redirect to the unified KYC verification system
    this.router.navigate(['/kyc'], { replaceUrl: true });
  }
}

