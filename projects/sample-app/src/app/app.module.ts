import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';

import { AppComponent } from './app.component';
import { CustomMessageComponent } from './custom-message/custom-message.component';
import {
  StreamAutocompleteTextareaModule,
  StreamChatModule,
  VoiceRecorderModule,
} from 'stream-chat-angular';
import { EmojiPickerComponent } from './emoji-picker/emoji-picker.component';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { PollComponent } from './poll/poll.component';

@NgModule({
  declarations: [
    AppComponent,
    CustomMessageComponent,
    EmojiPickerComponent,
    PollComponent,
  ],
  imports: [
    BrowserModule,
    TranslateModule.forRoot(),
    StreamChatModule,
    PickerModule,
    VoiceRecorderModule,
    StreamAutocompleteTextareaModule,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
