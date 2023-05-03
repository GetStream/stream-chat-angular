import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';

import { AppComponent } from './app.component';
import {
  StreamChatModule,
  StreamAutocompleteTextareaModule,
} from 'stream-chat-angular';
import { EmojiPickerComponent } from './emoji-picker/emoji-picker.component';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { MessageActionComponent } from './message-action/message-action.component';
import { ThreadHeaderComponent } from './thread-header/thread-header.component';
import { IconComponent } from './icon/icon.component';
import { MessageActionsComponent } from './message-actions/message-actions.component';

@NgModule({
  declarations: [
    AppComponent,
    EmojiPickerComponent,
    MessageActionComponent,
    ThreadHeaderComponent,
    IconComponent,
    MessageActionsComponent,
  ],
  imports: [
    BrowserModule,
    TranslateModule.forRoot(),
    StreamAutocompleteTextareaModule,
    StreamChatModule,
    PickerModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
