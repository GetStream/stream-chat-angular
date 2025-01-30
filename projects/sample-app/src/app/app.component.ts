import {
  AfterViewInit,
  Component,
  OnDestroy,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
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
import { LogLevel } from 'stream-chat';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements AfterViewInit, OnDestroy {
  isMenuOpen = false;
  isThreadOpen = false;
  @ViewChild('emojiPickerTemplate')
  emojiPickerTemplate!: TemplateRef<EmojiPickerContext>;
  @ViewChild('avatar') avatarTemplate!: TemplateRef<AvatarContext>;
  theme$: Observable<string>;
  counter = 0;
  subscriptions: { unsubscribe: () => void }[] = [];

  constructor(
    private chatService: ChatClientService,
    private channelService: ChannelService,
    private streamI18nService: StreamI18nService,
    private customTemplateService: CustomTemplatesService,
    themeService: ThemeService
  ) {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('user') ?? '';
    void this.chatService.init(
      environment.apiKey,
      userId,
      this.getTokenGenerator(userId),
      {
        timeout: 10000,
        logger: (
          logLevel: LogLevel,
          message: string,
          extraData?: Record<string, unknown>
        ) => {
          if (message.includes('channel:watch()')) {
            console.log(
              '[stream]',
              logLevel,
              message,
              `- ${new Date().toISOString()}`
            );
          }
          if (logLevel === 'error') {
            console.log(
              '[stream]',
              logLevel,
              message,
              `- ${new Date().toISOString()}`,
              JSON.stringify(extraData)
            );
          }
        },
      }
    );
    void this.channelService.init(
      {
        type: 'messaging',
        members: { $in: [userId] },
      },
      { has_unread: -1 },
      { limit: 10 }
    );
    this.subscriptions.push(
      this.chatService.chatClient.on('message.new', (event) =>
        console.log(
          '[stream]',
          `message.new in ${event.cid} from ${event.message?.user?.id} at ${
            event.received_at ? new Date(event.received_at).toISOString() : '-'
          }, message id: ${event.message?.id}`
        )
      )
    );
    this.subscriptions.push(
      this.chatService.chatClient.on('notification.message_new', (event) =>
        console.log(
          '[stream]',
          `notification.message_new in ${event.cid} from ${
            event.message?.user?.id
          } at ${
            event.received_at ? new Date(event.received_at).toISOString() : '-'
          }, message id: ${event.message?.id}`
        )
      )
    );
    this.subscriptions.push(
      this.chatService.chatClient.on('connection.changed', (event) =>
        console.log(
          `[stream] connection changed, online: ${event.online} at ${
            event.received_at ? new Date(event.received_at).toISOString() : '-'
          }`
        )
      )
    );
    this.subscriptions.push(
      this.channelService.channels$.subscribe((channels) => {
        console.log(
          `[stream] Currently watched channels: ${channels
            ?.map((c) => c.id)
            .join(', ')} - ${new Date().toISOString()}`
        );
      })
    );
    this.streamI18nService.setTranslation();
    this.channelService.activeParentMessage$
      .pipe(map((m) => !!m))
      .subscribe((isThreadOpen) => (this.isThreadOpen = isThreadOpen));
    this.theme$ = themeService.theme$;
    this.chatService.user$
      .pipe(
        map((u) => Number(u?.unread_count ?? 0)),
        distinctUntilChanged()
      )
      .subscribe((unreadCount) => {
        if (unreadCount > 0) {
          document.title = `(${unreadCount}) Stream Chat Angular Sample App`;
        } else {
          document.title = `Stream Chat Angular Sample App`;
        }
      });
  }

  getTokenGenerator(userId: string) {
    const oneDay = 24 * 60 * 60;
    return async () => {
      const response = await fetch(
        `${environment.tokenUrl}&user_id=${userId}&exp=${oneDay}`
      );
      const body = (await response.json()) as { token: string };

      return body.token;
    };
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
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
