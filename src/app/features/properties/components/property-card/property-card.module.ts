import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { PropertyCardComponent } from './property-card.component';

@NgModule({
  declarations: [PropertyCardComponent],
  imports: [CommonModule, RouterModule, TranslateModule],
  exports: [PropertyCardComponent],
})
export class PropertyCardModule {}
