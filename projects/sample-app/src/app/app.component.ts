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
  theme$: Observable<string>;
  counter = 0;

  constructor(
    private chatService: ChatClientService,
    private channelService: ChannelService,
    private streamI18nService: StreamI18nService,
    private customTemplateService: CustomTemplatesService,
    themeService: ThemeService
  ) {
    const urlParams = new URLSearchParams(window.location.search);
    const user = urlParams.get('user');
    const userId = user === 'user2' ? environment.userId1 : environment.userId2;
    void this.chatService.init(
      environment.apiKey,
      userId,
      user === 'user2' ? environment.userToken1 : environment.userToken2
    );
    void this.channelService.init({
      type: 'messaging',
      members: { $in: [userId] },
    });
    this.streamI18nService.setTranslation();
    this.channelService.activeParentMessage$
      .pipe(map((m) => !!m))
      .subscribe((isThreadOpen) => (this.isThreadOpen = isThreadOpen));
    this.theme$ = themeService.theme$;
  }

  ngAfterViewInit(): void {
    this.customTemplateService.emojiPickerTemplate$.next(
      this.emojiPickerTemplate
    );
  }

  closeMenu(event: Event) {
    if ((event.target as HTMLElement).closest('stream-channel-preview')) {
      this.isMenuOpen = false;
    }
  }
}
