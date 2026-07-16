import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { TextareaComponent } from './message-input/textarea/textarea.component';
import { textareaInjectionToken } from './injection-tokens';

@NgModule({
  declarations: [TextareaComponent],
  imports: [CommonModule, TranslatePipe],
  exports: [TextareaComponent],
  providers: [
    {
      provide: textareaInjectionToken,
      useValue: TextareaComponent,
    },
  ],
})
export class StreamTextareaModule {}
