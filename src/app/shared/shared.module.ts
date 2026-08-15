import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from './components/button/button.component';
import { TranslatePayloadPipe } from './pipes/translate-payload.pipe';

@NgModule({
  imports: [
    CommonModule,
    ButtonComponent,
    TranslatePayloadPipe
  ],
  exports: [
    ButtonComponent,
    TranslatePayloadPipe
  ]
})
export class SharedModule { }
