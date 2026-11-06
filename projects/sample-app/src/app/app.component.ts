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
import { ChannelFilters } from 'stream-chat';
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
  @ViewChild('pollTemplate') pollTemplate!: TemplateRef<{
    pollId: string;
    messageId: string;
    isQuote: boolean;
  }>;
  @ViewChild('pollComposerTemplate')
  pollComposerTemplate!: TemplateRef<{
    pollCompose: (pollId: string) => void;
    cancel: () => void;
  }>;
  theme$: Observable<string>;
  counter = 0;

  constructor(
    chatService: ChatClientService,
    channelService: ChannelService,
    streamI18nService: StreamI18nService,
    private customTemplateService: CustomTemplatesService,
    themeService: ThemeService
  ) {
    const isDynamicUser = environment.userId === '<dynamic user>';
    const userIdFromQuery = isDynamicUser
      ? new URLSearchParams(window.location.search).get('user_id')
      : null;
    const userId = isDynamicUser
      ? userIdFromQuery || uuidv4()
      : environment.userId;
    void chatService.init(
      environment.apiKey,
      isDynamicUser
        ? { id: userId, name: userIdFromQuery || names.random() }
        : userId,
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
        : environment.userToken,
      { client: { axiosRequestConfig: { timeout: 10000 } } }
    );
    chatService.chatClient.polls.registerSubscriptions();
    let channelsFilter: ChannelFilters = environment.channelsFilter || {
      type: 'messaging',
      members: { $in: [userId] },
    };
    const membersFilter = channelsFilter.members as
      | { $in?: unknown }
      | undefined;
    if (isDynamicUser && Array.isArray(membersFilter?.$in)) {
      // Replace the "<dynamic user>" placeholder with the connected user's id
      channelsFilter = {
        ...channelsFilter,
        members: {
          ...membersFilter,
          $in: (membersFilter.$in as string[]).map((id) =>
            id === environment.userId ? userId : id
          ),
        },
      };
    }
    void channelService.init(channelsFilter, undefined, { limit: 10 });
    streamI18nService.setTranslation();
    channelService.activeParentMessage$
      .pipe(map((m) => !!m))
      .subscribe((isThreadOpen) => (this.isThreadOpen = isThreadOpen));
    this.theme$ = themeService.theme$;
  }

  ngAfterViewInit(): void {
    this.customTemplateService.emojiPickerTemplate$.next(
      this.emojiPickerTemplate
    );
    this.customTemplateService.pollTemplate$.next(this.pollTemplate);
    this.customTemplateService.pollComposerTemplate$.next(
      this.pollComposerTemplate
    );
  }

  closeMenu(event: Event) {
    if ((event.target as HTMLElement).closest('stream-channel-preview')) {
      this.isMenuOpen = false;
    }
  }
}
