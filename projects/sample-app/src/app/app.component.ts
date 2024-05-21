import {
  AfterViewInit,
  Component,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  ChatClientService,
  ChannelService,
  StreamI18nService,
  EmojiPickerContext,
  CustomTemplatesService,
  ThemeService,
  AvatarContext,
} from 'stream-chat-angular';
import { environment } from '../environments/environment';
import names from 'starwars-names';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements AfterViewInit {
  isMenuOpen = false;
  isThreadOpen = false;
  @ViewChild('emojiPickerTemplate')
  emojiPickerTemplate!: TemplateRef<EmojiPickerContext>;
  @ViewChild('avatar') avatarTemplate!: TemplateRef<AvatarContext>;
  themeVersion: '1' | '2';
  theme$: Observable<string>;
  counter = 0;

  constructor(
    private chatService: ChatClientService,
    private channelService: ChannelService,
    private streamI18nService: StreamI18nService,
    private customTemplateService: CustomTemplatesService,
    themeService: ThemeService
  ) {
    const isDynamicUser = environment.userId === '<dynamic user>';
    const userId = isDynamicUser ? uuidv4() : environment.userId;
    void this.chatService.init(
      environment.apiKey,
      isDynamicUser ? { id: userId, name: names.random() } : userId,
      environment.tokenUrl
        ? async () => {
            const url = environment.tokenUrl.replace(
              environment.userId,
              userId
            );
            const response = await fetch(url);
            const body = (await response.json()) as { token: string };

            return body.token;
          }
        : environment.userToken
    );
    void this.channelService.init(
      environment.channelsFilter || {
        type: 'messaging',
        members: { $in: [environment.userId] },
      }
    );
    this.streamI18nService.setTranslation();
    this.channelService.activeParentMessage$
      .pipe(map((m) => !!m))
      .subscribe((isThreadOpen) => (this.isThreadOpen = isThreadOpen));
    this.themeVersion = themeService.themeVersion;
    this.theme$ = themeService.theme$;
  }

  ngAfterViewInit(): void {
    this.customTemplateService.emojiPickerTemplate$.next(
      this.emojiPickerTemplate
    );
  }

  closeMenu() {
    this.isMenuOpen = false;
  }
}
