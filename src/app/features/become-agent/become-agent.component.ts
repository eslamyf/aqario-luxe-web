import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-become-agent',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './become-agent.component.html',
  styleUrls: ['./become-agent.component.scss']
})
export class BecomeAgentComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);

  upgradeForm!: FormGroup;
  isLoading = false;
  submitError: string | null = null;

  selectedIdCard: File | null = null;
  selectedLogo: File | null = null;

  ngOnInit(): void {
    this.buildForm();
  }

  private buildForm(): void {
    this.upgradeForm = this.fb.group({
      companyName: ['', Validators.required],
      phone: ['', [Validators.required, Validators.pattern(/^(\+?[0-9][0-9\s-]{8,19})$/)]],
      iban: ['', [Validators.required, Validators.pattern(/^[A-Z0-9\s]{15,40}$/i)]],
      bio: ['', [Validators.required, Validators.minLength(20)]]
    });
  }

  onFileSelected(event: Event, fileType: 'idCard' | 'logo'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.match(/image\/*/)) {
      this.showNotification('Please upload valid image files only.', 'error');
      input.value = '';
      return;
    }

    if (fileType === 'idCard') {
      this.selectedIdCard = file;
    } else {
      this.selectedLogo = file;
    }
  }

  onSubmit(): void {
    this.submitError = null;

    if (this.upgradeForm.invalid || !this.selectedIdCard || !this.selectedLogo) {
      this.upgradeForm.markAllAsTouched();
      this.submitError = this.getSubmitErrorMessage();
      this.showNotification(this.submitError, 'error');
      return;
    }

    this.isLoading = true;

    const formData = new FormData();
    const companyName = String(this.upgradeForm.value.companyName ?? '').trim();
    const phone = String(this.upgradeForm.value.phone ?? '').trim();
    const iban = String(this.upgradeForm.value.iban ?? '').replace(/\s+/g, '').toUpperCase();
    const bio = String(this.upgradeForm.value.bio ?? '').trim();

    formData.append('companyName', companyName);
    formData.append('phone', phone);
    formData.append('iban', iban);
    formData.append('bio', bio);
    formData.append('idCard', this.selectedIdCard);
    formData.append('logo', this.selectedLogo);

    setTimeout(() => {
      this.isLoading = false;
      this.showNotification('Welcome to the Elite! Your account is now upgraded to agent.', 'success');

      const userData = localStorage.getItem('luxe_user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        parsedUser.role = 'agent';
        localStorage.setItem('luxe_user', JSON.stringify(parsedUser));
      }

      this.router.navigate(['/add-property']);
    }, 2000);
  }

  isFieldInvalid(field: string): boolean {
    const ctrl = this.upgradeForm.get(field);
    return !!(ctrl && ctrl.invalid && ctrl.touched);
  }

  private getSubmitErrorMessage(): string {
    const missing: string[] = [];
    const controls = this.upgradeForm.controls;

    if (controls['companyName']?.invalid) missing.push('agency/company name');
    if (controls['phone']?.invalid) missing.push('phone number');
    if (controls['bio']?.invalid) missing.push('bio');
    if (controls['iban']?.invalid) missing.push('IBAN');
    if (!this.selectedIdCard) missing.push('government ID');
    if (!this.selectedLogo) missing.push('agency logo');

    return missing.length
      ? `Please complete: ${missing.join(', ')}.`
      : 'Please review the form and try again.';
  }

  private showNotification(message: string, type: 'success' | 'error'): void {
    const el = document.createElement('div');
    const color = type === 'success' ? '#27AE60' : '#C0392B';
    const icon = type === 'success' ? '✓' : '✕';

    el.className = 'luxe-toast';
    el.style.cssText = `
      position: fixed; top: 100px; right: 24px; background: rgba(10, 10, 15, 0.98);
      border: 1px solid #333; border-left: 3px solid ${color}; color: #FAFAF8;
      padding: 16px 20px; display: flex; align-items: center; justify-content: space-between;
      min-width: 320px; z-index: 100000; font-family: 'DM Sans', sans-serif;
      font-size: 14px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      animation: slideInRight 0.4s cubic-bezier(0.25, 1, 0.5, 1) forwards;
    `;
    el.innerHTML = `<div style="display: flex; align-items: center; gap: 12px;"><span style="color: ${color}; font-weight: bold; font-size: 16px;">${icon}</span><span>${message}</span></div>`;
    document.body.appendChild(el);
    setTimeout(() => {
      if (document.body.contains(el)) {
        el.remove();
      }
    }, 4000);
  }
}
