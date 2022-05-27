import { Component } from '@angular/core';
import { map } from 'rxjs/operators';
import {
  ChatClientService,
  ChannelService,
  StreamI18nService,
} from 'stream-chat-angular';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  isMenuOpen = false;
  isThreadOpen = false;
  constructor(
    private chatService: ChatClientService,
    private channelService: ChannelService,
    private streamI18nService: StreamI18nService
  ) {
    void this.chatService.init(
      environment.apiKey,
      environment.userId,
      environment.userToken
    );
    void this.channelService.init({
      type: 'messaging',
      members: { $in: [environment.userId] },
    });
    this.streamI18nService.setTranslation();
    this.channelService.activeParentMessage$
      .pipe(map((m) => !!m))
      .subscribe((isThreadOpen) => (this.isThreadOpen = isThreadOpen));
  }

  closeMenu() {
    this.isMenuOpen = false;
  }
}
