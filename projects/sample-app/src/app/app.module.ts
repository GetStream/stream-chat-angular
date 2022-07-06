import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';

import { AppComponent } from './app.component';
import { CustomMessageComponent } from './custom-message/custom-message.component';
import { StreamChatModule, textareaInjectionToken } from 'stream-chat-angular';
import { EmojiPickerComponent } from './emoji-picker/emoji-picker.component';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { TextareaComponent } from './textarea/textarea.component';

@NgModule({
  declarations: [
    AppComponent,
    CustomMessageComponent,
    EmojiPickerComponent,
    TextareaComponent,
  ],
  imports: [
    BrowserModule,
    TranslateModule.forRoot(),
    // No need for this module as we will provide our own textarea implementation
    // StreamAutocompleteTextareaModule,
    StreamChatModule,
    PickerModule,
  ],
  providers: [
    // Provide injector for the textarea component
    {
      provide: textareaInjectionToken,
      useValue: TextareaComponent,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
