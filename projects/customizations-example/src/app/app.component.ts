import {
  AfterViewInit,
  Component,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import {
  ChatClientService,
  ChannelService,
  StreamI18nService,
  MentionAutcompleteListItemContext,
  CustomTemplatesService,
  CommandAutocompleteListItemContext,
  ChannelPreviewContext,
  MessageInputContext,
  EmojiPickerContext,
  MentionTemplateContext,
  MessageContext,
  TypingIndicatorContext,
  ChannelActionsContext,
} from 'stream-chat-angular';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements AfterViewInit {
  @ViewChild('mentionAutocompleteItemTemplate')
  private mentionAutocompleteItemTemplate!: TemplateRef<MentionAutcompleteListItemContext>;
  @ViewChild('commandAutocompleteItemTemplate')
  private commandAutocompleteItemTemplate!: TemplateRef<CommandAutocompleteListItemContext>;
  @ViewChild('channelPreviewTemplate')
  private channelPreviewTemplate!: TemplateRef<ChannelPreviewContext>;
  @ViewChild('customMessageInputTemplate')
  private customMessageInputTemplate!: TemplateRef<MessageInputContext>;
  @ViewChild('mentionTemplate')
  private mentionTemplate!: TemplateRef<MentionTemplateContext>;
  @ViewChild('emojiPickerTemplate')
  private emojiPickerTemplate!: TemplateRef<EmojiPickerContext>;
  @ViewChild('typingIndicator')
  private typingIndicatorTemplate!: TemplateRef<TypingIndicatorContext>;
  @ViewChild('messageTemplate')
  private messageTemplate!: TemplateRef<MessageContext>;
  @ViewChild('channelActionsTemplate')
  private channelActionsTemplate!: TemplateRef<ChannelActionsContext>;

  constructor(
    private chatService: ChatClientService,
    public channelService: ChannelService,
    private streamI18nService: StreamI18nService,
    private customTemplatesService: CustomTemplatesService
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
  }

  ngAfterViewInit(): void {
    this.customTemplatesService.mentionAutocompleteItemTemplate$.next(
      this.mentionAutocompleteItemTemplate
    );
    this.customTemplatesService.commandAutocompleteItemTemplate$.next(
      this.commandAutocompleteItemTemplate
    );
    this.customTemplatesService.channelPreviewTemplate$.next(
      this.channelPreviewTemplate
    );
    this.customTemplatesService.messageInputTemplate$.next(
      this.customMessageInputTemplate
    );
    this.customTemplatesService.mentionTemplate$.next(this.mentionTemplate);
    this.customTemplatesService.emojiPickerTemplate$.next(
      this.emojiPickerTemplate
    );
    this.customTemplatesService.typingIndicatorTemplate$.next(
      this.typingIndicatorTemplate
    );
    this.customTemplatesService.messageTemplate$.next(this.messageTemplate);
    this.customTemplatesService.channelActionsTemplate$.next(
      this.channelActionsTemplate
    );
  }
}
