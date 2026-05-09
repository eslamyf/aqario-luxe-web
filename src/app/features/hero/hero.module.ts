import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { HeroComponent } from './hero.component';
import { SearchBarComponent } from './search-bar/search-bar.component';
import { HomeSectionsComponent } from './home-sections/home-sections.component';

const routes: Routes = [
  { path: '', component: HeroComponent },
];

@NgModule({
  declarations: [
    HeroComponent,
    SearchBarComponent,
    HomeSectionsComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
  ],
})
export class HeroModule {}
