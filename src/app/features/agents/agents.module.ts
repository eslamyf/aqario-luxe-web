// ─────────────────────────────────────────────────────────────────────────────
// LUXE ESTATES — Agents Module
// Author: مينا — feature/mina-auctions
// ─────────────────────────────────────────────────────────────────────────────

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { AgentsComponent } from './agents.component';

const routes: Routes = [
  { path: '', component: AgentsComponent },
];

@NgModule({
  declarations: [
    AgentsComponent,
  ],
  imports: [
    CommonModule,
    TranslateModule,
    RouterModule.forChild(routes),  // ← forChild, NOT forRoot
  ],
})
export class AgentsModule {}
