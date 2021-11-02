import { Component } from '@angular/core';
import {
  ChatClientService,
  ChannelService,
  StreamI18nService,
  ThemeService,
} from 'stream-chat-angular';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  constructor(
    private chatService: ChatClientService,
    private channelService: ChannelService,
    private streamI18nService: StreamI18nService,
    private themeService: ThemeService
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
    this.themeService.customLightThemeVariables = {
      '--primary-color': 'lightgreen',
    };
    this.themeService.customDarkThemeVariables = {
      '--primary-color': 'darkgreen',
    };
    this.themeService.theme$.next('dark');
  }
}
