// ============================================================
// LUXE ESTATES — Footer Feature Module
// Rule §5.2: RouterModule.forChild([]) — never forRoot inside feature modules
// Declares: FooterComponent, NewsletterComponent
// ============================================================

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms'; // required by NewsletterComponent
import { TranslateModule } from '@ngx-translate/core';

import { FooterComponent } from './footer.component';
import { NewsletterComponent } from './newsletter/newsletter.component';
import { ButtonComponent } from '../../shared/components/button/button.component';

@NgModule({
  declarations: [
    FooterComponent,
    NewsletterComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,               // §5.2 — per-feature import, never at root again
    RouterModule.forChild([]),         // ✅ §5.2 — forChild, empty routes (shell component)
    TranslateModule,
    ButtonComponent,
  ],
  exports: [
    FooterComponent,                   // re-exported so AppModule can use <app-footer>
    NewsletterComponent,               // exported in case any other module needs it directly
  ],
})
export class FooterModule {}
