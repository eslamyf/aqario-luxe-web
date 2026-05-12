// ─────────────────────────────────────────────────────────────────────────────
// LUXE ESTATES — Auctions Component
// Author: مينا — Auctions Module
// Tasks: 01 (Auction Cards) + 02 (Countdown) + 03 (Place Bid)
// Branch: feature/mina-auctions
// ─────────────────────────────────────────────────────────────────────────────

import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ChangeDetectorRef,
  ElementRef,
  ViewChild,
  ViewChildren,
  QueryList,
} from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { interval, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

import { AuthService }          from '../../core/auth/auth.service';
import { SocketService }        from '../../core/services/socket.service';
import { NotificationService }  from '../../shared/services/notification.service';
import { MockDataService, Auction } from '../../shared/services/mock-data.service';
import { environment }          from '../../../environments/environment';

@Component({
  selector: 'app-auctions',
  templateUrl: './auctions.component.html',
  styleUrls: ['./auctions.component.scss'],
})
export class AuctionsComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('sectionRef') sectionRef!: ElementRef;
  @ViewChildren('revealElement') revealElements!: QueryList<ElementRef>;

  auctions: Auction[]       = [];
  featuredAuction: Auction | null = null;
  otherAuctions: Auction[]  = [];

  // One FormControl per auction bid input, keyed by _id
  bidInputs: { [key: string]: FormControl } = {};
  isPlacingBid: { [key: string]: boolean }  = {};

  private timerSub!: Subscription;
  private observer!: IntersectionObserver;

  constructor(
    private authService:         AuthService,
    private socketService:       SocketService,
    private notificationService: NotificationService,
    private mockDataService:     MockDataService,
    private http:                HttpClient,
    private cdr:                 ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadAuctions();

    // interval(1000) + detectChanges() keeps the impure CountdownPipe ticking
    this.timerSub = interval(1000).subscribe(() => this.cdr.detectChanges());
  }

  ngAfterViewInit(): void {
    this.initScrollReveal();

    // Re-observe if the list of elements changes (e.g., data loaded from API)
    this.revealElements.changes.subscribe(() => {
      this.reobserveElements();
    });
  }

  ngOnDestroy(): void {
    if (this.timerSub) this.timerSub.unsubscribe();
    if (this.observer) this.observer.disconnect();

    // Leave all auction rooms and disconnect
    this.auctions.forEach(a => this.socketService.leaveAuction(a._id));
    this.socketService.disconnect();
  }

  // ── Load Auctions ──────────────────────────────────────────────────────────
  loadAuctions(): void {
    this.http.get<any>(`${environment.apiUrl}/auctions`).pipe(
      map(res => Array.isArray(res) ? res : res.data)
    ).subscribe({
      next:  (data) => this.processAuctions(data),
      error: ()     => this.processAuctions(this.mockDataService.getAuctions()),
    });
  }

  private processAuctions(data: Auction[]): void {
    this.auctions        = data;
    this.featuredAuction = data[0] || null;
    this.otherAuctions   = data.slice(1);

    // Initialize Socket Connection if authenticated
    const token = this.authService.getToken();
    if (token) {
      this.socketService.connect(token);
    }

    data.forEach((a) => {
      this.bidInputs[a._id]    = new FormControl('', [Validators.required, Validators.min(1)]);
      this.isPlacingBid[a._id] = false;

      // Join room and listen for real-time updates
      this.socketService.joinAuction(a._id);
      
      this.socketService.onNewBid(a._id).subscribe((payload: any) => {
        const auction = this.auctions.find(item => item._id === a._id);
        if (auction) {
          auction.currentBid = payload.currentBid;
          if (auction.bidders !== undefined) auction.bidders++;
          this.cdr.detectChanges();
        }
      });

      this.socketService.onAuctionClosed(a._id).subscribe((payload: any) => {
        const auction = this.auctions.find(item => item._id === a._id);
        if (auction) {
          auction.status = 'closed';
          if (payload.finalBid) {
            auction.currentBid = payload.finalBid;
          }
          this.cdr.detectChanges();
        }
        this.notificationService.show(`Auction ${a.title} has closed!`, 'info');
      });
    });

    // Scroll reveal automatically triggers via ViewChildren.changes subscription
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  isEnded(endsAt: Date): boolean {
    return new Date(endsAt).getTime() <= Date.now();
  }

  countdownParts(endsAt: Date): { value: string; label: string }[] {
    const diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 0) return [];

    const pad = (n: number) => n.toString().padStart(2, '0');
    return [
      { value: pad(Math.floor(diff / 86400000)),             label: 'DAYS'  },
      { value: pad(Math.floor((diff % 86400000) / 3600000)), label: 'HOURS' },
      { value: pad(Math.floor((diff % 3600000)  / 60000)),   label: 'MINS'  },
      { value: pad(Math.floor((diff % 60000)    / 1000)),    label: 'SECS'  },
    ];
  }

  formatPrice(price: number): string {
    return price >= 1_000_000
      ? '$' + (price / 1_000_000).toFixed(1) + 'M'
      : '$' + price.toLocaleString();
  }

  // ── Place Bid — Task 03 ───────────────────────────────────────────────────
  placeBid(auction: Auction): void {
    // 1) Auth guard
    if (!this.authService.isAuthenticated()) {
      this.authService.openModal('login');
      this.notificationService.show('Please sign in to place bids', 'error');
      return;
    }
    // 2) Auction must still be live
    if (this.isEnded(auction.endsAt)) {
      this.notificationService.show('This auction has ended', 'error');
      return;
    }

    const amount = parseFloat(this.bidInputs[auction._id].value);

    // 3) Must be a positive number
    if (!amount || isNaN(amount) || amount <= 0) {
      this.notificationService.show('Please enter a valid bid amount', 'error');
      return;
    }
    // 4) Must exceed current bid
    if (amount <= auction.currentBid) {
      this.notificationService.show(
        `Bid must be higher than current bid (${this.formatPrice(auction.currentBid)})`,
        'error',
      );
      return;
    }

    this.isPlacingBid[auction._id] = true;

    this.http.post(`${environment.apiUrl}/bids`, { auctionId: auction._id, amount }).subscribe({
      next:  () => this.handleBidSuccess(auction, amount),
      error: () => this.handleBidSuccess(auction, amount), // demo-mode fallback
    });
  }

  private handleBidSuccess(auction: Auction, amount: number): void {
    auction.currentBid = amount;
    if (auction.bidders !== undefined) auction.bidders++;
    this.bidInputs[auction._id].reset();
    this.isPlacingBid[auction._id] = false;
    this.notificationService.show('Bid placed successfully! ✓', 'success');
    this.cdr.detectChanges();
  }

  // ── Scroll Reveal ─────────────────────────────────────────────────────────
  private initScrollReveal(): void {
    this.observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('visible'); this.observer.unobserve(e.target); }
      }),
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' },
    );

    // Initial check for immediately rendered elements
    this.reobserveElements();
  }

  private reobserveElements(): void {
    if (!this.observer || !this.revealElements) return;
    
    this.revealElements.forEach(el => {
      this.observer.observe(el.nativeElement);
    });
  }
}
