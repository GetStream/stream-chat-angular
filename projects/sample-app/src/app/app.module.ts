import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { StreamChatAngularModule } from 'stream-chat-angular';

import { AppComponent } from './app.component';
import { CustomMessageComponent } from './custom-message/custom-message.component';

@NgModule({
  declarations: [AppComponent, CustomMessageComponent],
  imports: [BrowserModule, StreamChatAngularModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
