import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { PropertyCardModule } from './components/property-card/property-card.module';
import { PropertiesPageComponent } from './components/properties-page/properties-page.component';
import { PropertyModalComponent } from './components/property-modal/property-modal.component';
import { PropertyDetailComponent } from './components/property-detail/property-detail.component';

// ─────────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────────
const routes: Routes = [
  { path: '', component: PropertiesPageComponent },
  { path: ':id', component: PropertyDetailComponent },
];

// ─────────────────────────────────────────────────────────────────────────────
// Module
// ─────────────────────────────────────────────────────────────────────────────
@NgModule({
  declarations: [
    PropertiesPageComponent,
    PropertyModalComponent,
    PropertyDetailComponent,
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    TranslateModule,
    PropertyCardModule,
  ],
  exports: [
    PropertyCardModule,
    RouterModule,
  ],
})
export class PropertiesModule { }
