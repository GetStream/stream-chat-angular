import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AutocompleteTextareaComponent } from './message-input/autocomplete-textarea/autocomplete-textarea.component';
import { TranslateModule } from '@ngx-translate/core';
import { MentionModule } from 'angular-mentions';
import { StreamAvatarModule } from './stream-avatar.module';
import { textareaInjectionToken } from './injection-tokens';

@NgModule({
  declarations: [AutocompleteTextareaComponent],
  imports: [CommonModule, TranslateModule, MentionModule, StreamAvatarModule],
  exports: [AutocompleteTextareaComponent],
  providers: [
    {
      provide: textareaInjectionToken,
      useValue: AutocompleteTextareaComponent,
    },
  ],
})
export class StreamAutocompleteTextareaModule {}
