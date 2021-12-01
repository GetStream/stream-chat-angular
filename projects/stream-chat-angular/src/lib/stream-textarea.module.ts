import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { TextareaComponent } from './message-input/textarea/textarea.component';
import { textareaInjectionToken } from './injection-tokens';

@NgModule({
  declarations: [TextareaComponent],
  imports: [CommonModule, TranslateModule],
  exports: [TextareaComponent],
  providers: [
    {
      provide: textareaInjectionToken,
      useValue: TextareaComponent,
    },
  ],
})
export class StreamTextareaModule {}
