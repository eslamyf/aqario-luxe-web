import { Component, Input, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { AdminService } from '../../admin.service';

@Component({
  selector: 'app-transactions-table',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe],
  template: `
    <div class="transactions-panel">
      <div class="panel-header">
        <h3>Recent Transactions</h3>
        <a routerLink="/admin/bookings" class="view-all">VIEW ALL</a>
      </div>
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>USER</th>
              <th>PROPERTY</th>
              <th>DATE</th>
              <th>STATUS</th>
              <th>AMOUNT</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let txn of transactions">
              <td>
                <div class="user-cell">
                  <div class="avatar">{{ getInitials(txn.user_id?.name) }}</div>
                  <span>{{ txn.user_id?.name || 'Unknown User' }}</span>
                </div>
              </td>
              <td class="property-name">{{ txn.booking_id?.property_id?.title || 'Property #' + txn.booking_id?.property_id?.toString().slice(-4) }}</td>
              <td>{{ txn.createdAt | date:'mediumDate' }}</td>
              <td>
                <span class="status-badge" [class.confirmed]="txn.status === 'completed'" [class.pending]="txn.status !== 'completed'" [class.refunded]="txn.status === 'refunded'">
                  {{ getStatusLabel(txn.status) }}
                </span>
              </td>
              <td class="amount">{{ txn.totalAmount | currency:'USD':'symbol':'1.0-0' }}</td>
              <td>
                <button 
                  *ngIf="txn.status === 'completed' && !isProcessingRefund(txn._id)"
                  class="refund-btn"
                  (click)="initiateRefund(txn)"
                  data-cursor-hover>
                  REFUND
                </button>
                <span *ngIf="isProcessingRefund(txn._id)" class="processing">Processing...</span>
              </td>
            </tr>
            <tr *ngIf="!transactions?.length">
              <td colspan="6" class="empty-state">No recent transactions found.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .transactions-panel {
      background: var(--obsidian-3);
      border-radius: 12px;
      padding: 2rem;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    .panel-header h3 {
      font-family: var(--font-display);
      font-size: 1.5rem;
      margin: 0;
      color: var(--white);
    }
    .view-all {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--gold);
      text-decoration: none;
      letter-spacing: 2px;
      transition: color 0.3s ease;
    }
    .view-all:hover {
      color: var(--white);
    }
    .table-responsive {
      width: 100%;
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    th {
      font-family: var(--font-mono);
      font-size: 10px;
      color: rgba(250, 250, 248, 0.4);
      letter-spacing: 2px;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    td {
      padding: 1.25rem 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      font-family: var(--font-body);
      font-size: 14px;
      color: var(--mist);
      vertical-align: middle;
    }
    tr:last-child td {
      border-bottom: none;
    }
    .user-cell {
      display: flex;
      align-items: center;
      gap: 12px;
      color: var(--white);
    }
    .avatar {
      width: 32px;
      height: 32px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--white);
    }
    .property-name {
      max-width: 200px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .status-badge {
      font-family: var(--font-mono);
      font-size: 10px;
      padding: 4px 8px;
      border-radius: 4px;
      letter-spacing: 1px;
    }
    .status-badge.confirmed {
      background: rgba(16, 185, 129, 0.1);
      color: #10b981;
    }
    .status-badge.pending {
      background: rgba(201, 169, 110, 0.1);
      color: var(--gold);
    }
    .status-badge.refunded {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }
    .refund-btn {
      font-family: var(--font-mono);
      font-size: 10px;
      padding: 6px 12px;
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.3s ease;
      letter-spacing: 1px;
    }
    .refund-btn:hover {
      background: rgba(239, 68, 68, 0.2);
      border-color: #ef4444;
    }
    .processing {
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--gold);
      letter-spacing: 1px;
    }
    .empty-state {
      text-align: center;
      color: rgba(250, 250, 248, 0.4);
      padding: 3rem 0;
    }
  `]
})
export class TransactionsTableComponent {
  @Input() transactions: any[] = [];

  private adminService = inject(AdminService);
  private processingRefunds = new Set<string>();

  getInitials(name: string): string {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'completed': return 'CONFIRMED';
      case 'refunded': return 'REFUNDED';
      case 'pending': return 'PENDING';
      case 'failed': return 'FAILED';
      case 'expired': return 'EXPIRED';
      default: return status.toUpperCase();
    }
  }

  isProcessingRefund(paymentId: string): boolean {
    return this.processingRefunds.has(paymentId);
  }

  initiateRefund(txn: any): void {
    if (confirm(`Are you sure you want to refund $${txn.totalAmount} to ${txn.user_id?.name}?`)) {
      this.processingRefunds.add(txn._id);
      
      this.adminService.refundPayment(txn._id, 'Admin initiated refund').subscribe({
        next: () => {
          // Update the transaction status locally
          txn.status = 'refunded';
          this.processingRefunds.delete(txn._id);
        },
        error: () => {
          this.processingRefunds.delete(txn._id);
        }
      });
    }
  }
}
