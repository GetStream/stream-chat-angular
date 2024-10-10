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
import { MessageResponse } from 'stream-chat';

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
  messageResults: MessageResponse[] = [];
  baseQuery = { type: 'messaging', members: { $in: [environment.userId] } };

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
    void this.channelService.init(this.baseQuery);
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

  async search(text: string) {
    if (text.length === 0) {
      this.messageResults = [];
      this.channelService.reset();
      this.channelService.init(this.baseQuery);
      return;
    }
    // search for channels
    this.channelService.reset();
    this.channelService.init({
      ...this.baseQuery,
      $or: [
        { name: { $autocomplete: text } },
        {
          ['member.user.name']: {
            $autocomplete: text,
          },
        },
      ],
    });

    // search for messages
    const response = await this.chatService.chatClient.search(
      this.baseQuery,
      text
    );
    this.messageResults = response.results.map((r) => r.message);
  }

  async openMessage(message: MessageResponse) {
    const channel = this.chatService.chatClient.channel(
      message.channel!.type,
      message.channel!.id
    );
    await channel.watch();
    this.channelService.setAsActiveChannel(channel);
    this.channelService.jumpToMessage(message.id, message.parent_id);
  }
}
