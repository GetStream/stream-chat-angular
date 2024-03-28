import {
  AfterViewInit,
  Component,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import {
  AttachmentService,
  ChannelHeaderInfoContext,
} from 'projects/stream-chat-angular/src/public-api';
import { Attachment, Channel } from 'stream-chat';
import {
  ChatClientService,
  ChannelService,
  StreamI18nService,
  MentionAutcompleteListItemContext,
  CustomTemplatesService,
  CommandAutocompleteListItemContext,
  MessageInputContext,
  EmojiPickerContext,
  MentionTemplateContext,
  MessageContext,
  TypingIndicatorContext,
  ChannelActionsContext,
  AttachmentListContext,
  AvatarContext,
  AttachmentPreviewListContext,
  IconContext,
  LoadingIndicatorContext,
  MessageActionBoxItemContext,
  MessageActionsBoxContext,
  MessageReactionsContext,
  ModalContext,
  NotificationContext,
  ThreadHeaderContext,
  CustomAttachmentUploadContext,
  DateSeparatorContext,
  MessageActionsService,
  ChannelPreviewInfoContext,
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
  @ViewChild('channelPreviewInfo')
  private channelPreviewInfoTemplate!: TemplateRef<ChannelPreviewInfoContext>;
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
  @ViewChild('attachmentListTemplate')
  private attachmentListTemplate!: TemplateRef<AttachmentListContext>;
  @ViewChild('attachmentPreviewListTemplate')
  private attachmentPreviewListTemplate!: TemplateRef<AttachmentPreviewListContext>;
  @ViewChild('avatarTemplate')
  private avatarTemplate!: TemplateRef<AvatarContext>;
  @ViewChild('iconTemplate')
  private iconTemplate!: TemplateRef<IconContext>;
  @ViewChild('loadingIndicatorTemplate')
  private loadingIndicatorTemplate!: TemplateRef<LoadingIndicatorContext>;
  @ViewChild('messageActionsBoxTemplate')
  private messageActionsBoxTemplate!: TemplateRef<MessageActionsBoxContext>;
  @ViewChild('messageActionItemTemplate')
  private messageActionItemTemplate!: TemplateRef<MessageActionBoxItemContext>;
  @ViewChild('messageReactionsTemplate')
  private messageReactionsTemplate!: TemplateRef<MessageReactionsContext>;
  @ViewChild('modalTemplate')
  private modalTemplate!: TemplateRef<ModalContext>;
  @ViewChild('notificationTemplate')
  private notificationTemplate!: TemplateRef<NotificationContext>;
  @ViewChild('threadHeaderTemplate')
  private threadHeaderTemplate!: TemplateRef<ThreadHeaderContext>;
  @ViewChild('customChannelInfo')
  private chstomChannelInfoTemplate!: TemplateRef<ChannelHeaderInfoContext>;
  @ViewChild('customAttachmentUpload')
  private customAttachmentUploadTemplate!: TemplateRef<CustomAttachmentUploadContext>;
  @ViewChild('dateSeparator')
  private dateSeparatorTemplate!: TemplateRef<DateSeparatorContext>;
  @ViewChild('emptyMainMessageList')
  private emptyMainMessageListTemplate!: TemplateRef<void>;
  @ViewChild('emptyThreadMessageList')
  private emptyThreadMessageListTemplate!: TemplateRef<void>;

  constructor(
    private chatService: ChatClientService,
    public channelService: ChannelService,
    private streamI18nService: StreamI18nService,
    private customTemplatesService: CustomTemplatesService,
    private messageActionsService: MessageActionsService
  ) {
    this.messageActionsService.customActions$.next([
      {
        actionName: 'forward',
        actionLabelOrTranslationKey: 'Forward',
        isVisible: this.isVisible,
        actionHandler: this.actionHandler,
      },
    ]);
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
    this.customTemplatesService.channelPreviewInfoTemplate$.next(
      this.channelPreviewInfoTemplate
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
    this.customTemplatesService.attachmentListTemplate$.next(
      this.attachmentListTemplate
    );
    this.customTemplatesService.attachmentPreviewListTemplate$.next(
      this.attachmentPreviewListTemplate
    );
    this.customTemplatesService.avatarTemplate$.next(this.avatarTemplate);
    this.customTemplatesService.iconTemplate$.next(this.iconTemplate);
    this.customTemplatesService.loadingIndicatorTemplate$.next(
      this.loadingIndicatorTemplate
    );
    this.customTemplatesService.messageActionsBoxTemplate$.next(
      this.messageActionsBoxTemplate
    );
    this.customTemplatesService.messageActionsBoxItemTemplate$.next(
      this.messageActionItemTemplate
    );
    this.customTemplatesService.messageReactionsTemplate$.next(
      this.messageReactionsTemplate
    );
    this.customTemplatesService.modalTemplate$.next(this.modalTemplate);
    this.customTemplatesService.notificationTemplate$.next(
      this.notificationTemplate
    );
    this.customTemplatesService.threadHeaderTemplate$.next(
      this.threadHeaderTemplate
    );
    this.customTemplatesService.channelHeaderInfoTemplate$.next(
      this.chstomChannelInfoTemplate
    );
    this.customTemplatesService.customAttachmentUploadTemplate$.next(
      this.customAttachmentUploadTemplate
    );
    this.customTemplatesService.dateSeparatorTemplate$.next(
      this.dateSeparatorTemplate
    );
    this.customTemplatesService.emptyMainMessageListPlaceholder$.next(
      this.emptyMainMessageListTemplate
    );
    this.customTemplatesService.emptyThreadMessageListPlaceholder$.next(
      this.emptyThreadMessageListTemplate
    );
  }

  inviteClicked(channel: Channel) {
    alert(
      `You can add channel actions to the channel header to manage the ${
        channel.data?.name || (channel.data?.id as string)
      } channel`
    );
  }

  filesSelected(files: FileList | null, attachmentService: AttachmentService) {
    if (!files) {
      return;
    }
    void attachmentService.filesSelected(files);
  }

  addRandomImage(attachmentService: AttachmentService) {
    const customAttachment: Attachment = {
      type: 'image',
      image_url: 'https://picsum.photos/200/300',
      fallback: 'Just a random image',
    };
    attachmentService.addAttachment(customAttachment);
  }

  isVisible() {
    return true;
  }

  actionHandler() {
    /* eslint-disable-next-line no-console */
    console.log('forwarded');
  }
}
