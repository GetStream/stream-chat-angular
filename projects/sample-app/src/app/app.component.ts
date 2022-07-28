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
} from 'stream-chat-angular';
import { environment } from '../environments/environment';

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
  themeVersion: '1' | '2';
  theme$: Observable<string>;
  levels = [
    'No customization',
    'Theme variables',
    'Component variables',
    'Custom CSS code',
  ];
  selectedLevelIndex = 0;

  constructor(
    private chatService: ChatClientService,
    private channelService: ChannelService,
    private streamI18nService: StreamI18nService,
    private customTemplateService: CustomTemplatesService,
    themeService: ThemeService
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
