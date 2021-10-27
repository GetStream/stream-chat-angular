import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';

import { AppComponent } from './app.component';
import { CustomMessageComponent } from './custom-message/custom-message.component';
import { StreamChatModule } from 'stream-chat-angular';

@NgModule({
  declarations: [AppComponent, CustomMessageComponent],
  imports: [BrowserModule, TranslateModule.forRoot(), StreamChatModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
