// ─────────────────────────────────────────────────────────────────────────────
// LUXE ESTATES — Agents Component
// Author: مينا — Agents Module
// Tasks: 04 (Agents Grid) + 05 (Agent Card Stats & Social Buttons)
// Branch: feature/mina-auctions
// ─────────────────────────────────────────────────────────────────────────────

import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
  ViewChildren,
  QueryList,
} from '@angular/core';
import { NotificationService }      from '../../shared/services/notification.service';
import { MockDataService }          from '../../shared/services/mock-data.service';
import { AgentService, Agent }      from './agent.service';
import { environment }              from '../../../environments/environment';

@Component({
  selector: 'app-agents',
  templateUrl: './agents.component.html',
  styleUrls: ['./agents.component.scss'],
})
export class AgentsComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('sectionRef') sectionRef!: ElementRef;
  @ViewChildren('agentCard') agentCards!: QueryList<ElementRef>;

  agents: Agent[] = [];

  private observer!: IntersectionObserver;
  private contactTimeouts: any[] = [];

  constructor(
    private notificationService: NotificationService,
    private mockDataService:     MockDataService,
    private agentService:        AgentService,
  ) {}

  ngOnInit(): void {
    this.loadAgents();
  }

  ngAfterViewInit(): void {
    this.initScrollReveal();

    // Re-observe if the list of agent cards changes (e.g. data loaded from API)
    this.agentCards.changes.subscribe(() => {
      this.reobserveCards();
    });
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    
    // Clean up ghost timeouts
    this.contactTimeouts.forEach(t => clearTimeout(t));
  }

  // ── Load Agents ───────────────────────────────────────────────────────────
  loadAgents(): void {
    this.agentService.getAgents().subscribe({
      next: (data) => {
        this.agents = data;
      },
      error: (err) => {
        console.error('Failed to load agents from API:', err);
      },
    });
  }

  // ── Task 05: Social Buttons ───────────────────────────────────────────────
  onContactEmail(agent: Agent): void {
    this.notificationService.show(`Connecting you with ${agent.name}...`, 'info');
    const t = setTimeout(() => {
      this.notificationService.show(`${agent.name} will contact you shortly!`, 'success');
    }, 1500);
    this.contactTimeouts.push(t);
  }

  onContactPhone(agent: Agent): void {
    this.notificationService.show(`Connecting you with ${agent.name}...`, 'info');
    const t = setTimeout(() => {
      this.notificationService.show(`${agent.name} will contact you shortly!`, 'success');
    }, 1500);
    this.contactTimeouts.push(t);
  }

  onLinkedIn(agent: Agent): void {
    this.notificationService.show(`Opening ${agent.name}'s LinkedIn profile...`, 'info');
  }

  // ── Scroll Reveal ─────────────────────────────────────────────────────────
  private initScrollReveal(): void {
    this.observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('visible'); this.observer.unobserve(e.target); }
      }),
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' },
    );

    // Initial check (header)
    const section = this.sectionRef?.nativeElement;
    if (section) {
      const header = section.querySelector('.section-header');
      if (header) this.observer.observe(header);
    }
    
    this.reobserveCards();
  }

  private reobserveCards(): void {
    if (!this.observer || !this.agentCards) return;
    
    this.agentCards.forEach(card => {
      this.observer.observe(card.nativeElement);
    });
  }
}
