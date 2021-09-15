import { Component } from '@angular/core';
import { ChatClientService, ChannelService } from 'stream-chat-angular';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  constructor(
    private chatService: ChatClientService,
    private channelService: ChannelService
  ) {
    this.chatService.init(
      environment.apiKey,
      environment.userId,
      environment.userToken
    );
    void this.channelService.init();
  }
}
