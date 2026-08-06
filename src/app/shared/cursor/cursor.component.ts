import { Component, OnInit, OnDestroy, NgZone, ElementRef, ViewChild, Renderer2 } from '@angular/core';

@Component({
  selector: 'app-cursor',
  templateUrl: './cursor.component.html',
  styleUrls: ['./cursor.component.scss'],
})
export class CursorComponent implements OnInit, OnDestroy {
  @ViewChild('dot') dotRef!: ElementRef;
  @ViewChild('follower') followerRef!: ElementRef;

  isMobile = false;
  private animationFrame: number | null = null;
  private targetX = 0;
  private targetY = 0;
  private followerX = 0;
  private followerY = 0;
  private dotX = 0;
  private dotY = 0;

  constructor(
    private ngZone: NgZone,
    private renderer: Renderer2
  ) {}

  ngOnInit(): void {
    this.isMobile = !window.matchMedia('(hover: hover)').matches;

    if (!this.isMobile) {
      // Custom cursor disabled in favor of standard pointer
      
      // Run listeners outside the Zone for performance optimization
      this.ngZone.runOutsideAngular(() => {
        window.addEventListener('mousemove', this.onMouseMove.bind(this));
        window.addEventListener('mouseover', this.onMouseOver.bind(this));
        window.addEventListener('mouseout', this.onMouseOut.bind(this));
        this.animate();
      });
    }
  }

  ngOnDestroy(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
    }
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseover', this.onMouseOver);
    window.removeEventListener('mouseout', this.onMouseOut);
    this.renderer.removeStyle(document.body, 'cursor');
  }

  private onMouseMove(event: MouseEvent): void {
    this.targetX = event.clientX;
    this.targetY = event.clientY;
  }

  private onMouseOver(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest && target.closest('button, a, .card, [data-cursor-hover], .dropdown-item')) {
      this.renderer.addClass(this.followerRef.nativeElement, 'hovering');
    }
  }

  private onMouseOut(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest && target.closest('button, a, .card, [data-cursor-hover], .dropdown-item')) {
      this.renderer.removeClass(this.followerRef.nativeElement, 'hovering');
    }
  }

  private animate(): void {
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const tick = () => {
      // Smoothing the movement
      this.dotX = lerp(this.dotX, this.targetX, 0.35);
      this.dotY = lerp(this.dotY, this.targetY, 0.35);
      
      this.followerX = lerp(this.followerX, this.targetX, 0.15);
      this.followerY = lerp(this.followerY, this.targetY, 0.15);

      if (this.dotRef && this.dotRef.nativeElement) {
        this.dotRef.nativeElement.style.transform = `translate3d(${this.dotX - 6}px, ${this.dotY - 6}px, 0)`;
      }

      if (this.followerRef && this.followerRef.nativeElement) {
        this.followerRef.nativeElement.style.transform = `translate3d(${this.followerX - 20}px, ${this.followerY - 20}px, 0)`;
      }

      this.animationFrame = requestAnimationFrame(tick);
    };

    tick();
  }
}
