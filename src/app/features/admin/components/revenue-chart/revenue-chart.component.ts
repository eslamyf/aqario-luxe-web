import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-revenue-chart',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="chart-container">
      <svg viewBox="0 0 1000 300" preserveAspectRatio="none">
        <defs>
          <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(201, 169, 110, 0.4)" />
            <stop offset="100%" stop-color="rgba(201, 169, 110, 0)" />
          </linearGradient>
        </defs>
        <!-- Fill Area -->
        <polygon [attr.points]="fillPoints" fill="url(#goldGradient)" />
        <!-- Line -->
        <polyline [attr.points]="linePoints" fill="none" stroke="var(--gold)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <div class="x-axis">
        <span *ngFor="let label of labels">{{ label | translate }}</span>
      </div>
    </div>
  `,
  styles: [`
    .chart-container {
      width: 100%;
      height: 350px;
      position: relative;
      margin-top: 2rem;
    }
    svg {
      width: 100%;
      height: 300px;
      overflow: visible;
    }
    .x-axis {
      display: flex;
      justify-content: space-between;
      margin-top: 1rem;
      padding: 0 1rem;
      color: rgba(250, 250, 248, 0.5);
      font-family: var(--font-mono);
      font-size: 11px;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
  `]
})
export class RevenueChartComponent implements OnChanges {
  @Input() data: { _id: { year: number, month?: number }, totalRevenue: number }[] = [];
  
  linePoints: string = '';
  fillPoints: string = '';
  labels: string[] = [];

  ngOnChanges() {
    this.drawChart();
  }

  private drawChart() {
    if (!this.data || this.data.length === 0) {
      this.linePoints = '';
      this.fillPoints = '';
      this.labels = [];
      return;
    }

    const width = 1000;
    const height = 300;
    const maxRevenue = Math.max(...this.data.map(d => d.totalRevenue), 1); // Avoid division by zero
    
    const stepX = width / (this.data.length > 1 ? this.data.length - 1 : 1);
    
    const points = this.data.map((point, index) => {
      const x = index * stepX;
      // y is inverted because SVG origin is top-left
      const y = height - ((point.totalRevenue / maxRevenue) * (height * 0.8)); // 0.8 to leave some top padding
      return { x, y, revenue: point.totalRevenue, month: point._id.month };
    });

    this.linePoints = points.map(p => `${p.x},${p.y}`).join(' ');
    
    // For the polygon fill, we start at bottom left, go through points, then drop to bottom right, and back to bottom left.
    if (points.length > 0) {
      const firstX = points[0].x;
      const lastX = points[points.length - 1].x;
      this.fillPoints = `${firstX},${height} ${this.linePoints} ${lastX},${height}`;
    }

    const monthKeys = [
      'COMMON.MONTHS.JAN', 'COMMON.MONTHS.FEB', 'COMMON.MONTHS.MAR', 'COMMON.MONTHS.APR',
      'COMMON.MONTHS.MAY', 'COMMON.MONTHS.JUN', 'COMMON.MONTHS.JUL', 'COMMON.MONTHS.AUG',
      'COMMON.MONTHS.SEP', 'COMMON.MONTHS.OCT', 'COMMON.MONTHS.NOV', 'COMMON.MONTHS.DEC'
    ];
    this.labels = points.map(p => p.month ? monthKeys[p.month - 1] : '');
  }
}
