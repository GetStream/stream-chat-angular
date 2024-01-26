import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';

import { AppComponent } from './app.component';
import { CustomMessageComponent } from './custom-message/custom-message.component';
import {
  StreamAutocompleteTextareaModule,
  StreamChatModule,
} from 'stream-chat-angular';
import { EmojiPickerComponent } from './emoji-picker/emoji-picker.component';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { CustomChannelListComponent } from './custom-channel-list/custom-channel-list.component';

@NgModule({
  declarations: [
    AppComponent,
    CustomMessageComponent,
    EmojiPickerComponent,
    CustomChannelListComponent,
  ],
  imports: [
    BrowserModule,
    TranslateModule.forRoot(),
    StreamChatModule,
    PickerModule,
    StreamAutocompleteTextareaModule,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
