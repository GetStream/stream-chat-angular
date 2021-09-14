import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { StreamChatAngularModule } from 'stream-chat-angular';

import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, StreamChatAngularModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
