import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ComponentFactoryResolver,
  ComponentRef,
  ElementRef,
  EventEmitter,
  HostBinding,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  TemplateRef,
  Type,
  ViewChild,
} from '@angular/core';
import { ChatClientService } from '../chat-client.service';
import { combineLatest, Observable, Subject, Subscription, timer } from 'rxjs';
import { first, map, take, tap } from 'rxjs/operators';
import { AppSettings, Channel, UserResponse } from 'stream-chat';
import { AttachmentService } from '../attachment.service';
import { ChannelService } from '../channel.service';
import { textareaInjectionToken } from '../injection-tokens';
import { NotificationService } from '../notification.service';
import {
  AttachmentPreviewListContext,
  AttachmentUpload,
  CustomAttachmentUploadContext,
  DefaultStreamChatGenerics,
  EmojiPickerContext,
  StreamMessage,
} from '../types';
import { MessageInputConfigService } from './message-input-config.service';
import { TextareaDirective } from './textarea.directive';
import { TextareaInterface } from './textarea.interface';
import { isImageFile } from '../is-image-file';
import { EmojiInputService } from './emoji-input.service';
import { CustomTemplatesService } from '../custom-templates.service';
import { ThemeService } from '../theme.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * The `MessageInput` component displays an input where users can type their messages and upload files, and sends the message to the active channel. The component can be used to compose new messages or update existing ones. To send messages, the chat user needs to have the necessary [channel capability](https://getstream.io/chat/docs/javascript/channel_capabilities/?language=javascript).
 */
@Component({
  selector: 'stream-message-input',
  templateUrl: './message-input.component.html',
  styles: [],
  providers: [AttachmentService, EmojiInputService],
})
export class MessageInputComponent
  implements OnInit, OnChanges, OnDestroy, AfterViewInit
{
  /**
   * If file upload is enabled, the user can open a file selector from the input. Please note that the user also needs to have the necessary [channel capability](https://getstream.io/chat/docs/javascript/channel_capabilities/?language=javascript). If no value is provided, it is set from the [`MessageInputConfigService`](../services/MessageInputConfigService.mdx).
   */
  @Input() isFileUploadEnabled: boolean | undefined;
  /**
   * If true, users can mention other users in messages. You also [need to use the `AutocompleteTextarea`](../concepts/opt-in-architecture.mdx) for this feature to work. If no value is provided, it is set from the [`MessageInputConfigService`](../services/MessageInputConfigService.mdx).
   */
  @Input() areMentionsEnabled: boolean | undefined;
  /**
   * The scope for user mentions, either members of the current channel of members of the application. If no value is provided, it is set from the [`MessageInputConfigService`](../services/MessageInputConfigService.mdx).
   */
  @Input() mentionScope: 'channel' | 'application' | undefined;
  /**
   * Determines if the message is being dispalyed in a channel or in a [thread](https://getstream.io/chat/docs/javascript/threads/?language=javascript).
   */
  @Input() mode: 'thread' | 'main' = 'main';
  /**
   * If true, users can select multiple files to upload. If no value is provided, it is set from the [`MessageInputConfigService`](../services/MessageInputConfigService.mdx).
   */
  @Input() isMultipleFileUploadEnabled: boolean | undefined;
  /**
   * The message to edit
   */
  @Input() message: StreamMessage | undefined;
  /**
   * An observable that can be used to trigger message sending from the outside
   */
  @Input() sendMessage$: Observable<void> | undefined;
  /**
   * In `desktop` mode the `Enter` key will trigger message sending, in `mobile` mode the `Enter` key will insert a new line to the message input. If no value is provided, it is set from the [`MessageInputConfigService`](../services/MessageInputConfigService.mdx).
   */
  @Input() inputMode: 'desktop' | 'mobile';
  /**
   * Enables or disables auto focus on the textarea element
   */
  @Input() autoFocus = true;
  /**
   * Emits when a message was successfuly sent or updated
   */
  @Output() readonly messageUpdate = new EventEmitter<{
    message: StreamMessage;
  }>();
  @HostBinding() class = 'str-chat__message-input-angular-host';
  isFileUploadAuthorized: boolean | undefined;
  canSendLinks: boolean | undefined;
  canSendMessages: boolean | undefined;
  attachmentUploads$: Observable<AttachmentUpload[]>;
  attachmentUploadInProgressCounter$: Observable<number>;
  textareaValue = '';
  textareaRef: ComponentRef<TextareaInterface & Partial<OnChanges>> | undefined;
  mentionedUsers: UserResponse[] = [];
  quotedMessage: undefined | StreamMessage;
  typingStart$ = new Subject<void>();
  cooldown$: Observable<number> | undefined;
  isCooldownInProgress = false;
  emojiPickerTemplate: TemplateRef<EmojiPickerContext> | undefined;
  customAttachmentUploadTemplate:
    | TemplateRef<CustomAttachmentUploadContext>
    | undefined;
  attachmentPreviewListTemplate:
    | TemplateRef<AttachmentPreviewListContext>
    | undefined;
  textareaPlaceholder: string;
  themeVersion: '1' | '2';
  fileInputId = uuidv4();
  @ViewChild('fileInput') private fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild(TextareaDirective, { static: false })
  private textareaAnchor!: TextareaDirective;
  private subscriptions: Subscription[] = [];
  private hideNotification: Function | undefined;
  private isViewInited = false;
  private appSettings: AppSettings | undefined;
  private channel: Channel<DefaultStreamChatGenerics> | undefined;
  private sendMessageSubcription: Subscription | undefined;
  private readonly defaultTextareaPlaceholder = 'streamChat.Type your message';
  private readonly slowModeTextareaPlaceholder = 'streamChat.Slow Mode ON';
  constructor(
    private channelService: ChannelService,
    private notificationService: NotificationService,
    private attachmentService: AttachmentService,
    private configService: MessageInputConfigService,
    @Inject(textareaInjectionToken)
    private textareaType: Type<TextareaInterface>,
    private componentFactoryResolver: ComponentFactoryResolver,
    private cdRef: ChangeDetectorRef,
    private chatClient: ChatClientService,
    private emojiInputService: EmojiInputService,
    private customTemplatesService: CustomTemplatesService,
    themeService: ThemeService
  ) {
    this.themeVersion = themeService.themeVersion;
    this.textareaPlaceholder = this.defaultTextareaPlaceholder;
    this.subscriptions.push(
      this.attachmentService.attachmentUploadInProgressCounter$.subscribe(
        (counter) => {
          if (counter === 0 && this.hideNotification) {
            this.hideNotification();
            this.hideNotification = undefined;
          }
        }
      )
    );
    this.subscriptions.push(
      this.channelService.activeChannel$.subscribe((channel) => {
        if (channel && this.channel && channel.id !== this.channel.id) {
          this.textareaValue = '';
          this.attachmentService.resetAttachmentUploads();
        }
        const capabilities = channel?.data?.own_capabilities as string[];
        if (capabilities) {
          this.isFileUploadAuthorized =
            capabilities.indexOf('upload-file') !== -1;
          this.canSendLinks = capabilities.indexOf('send-links') !== -1;
          this.channel = channel;
          this.setCanSendMessages();
        }
      })
    );
    this.subscriptions.push(
      this.chatClient.appSettings$.subscribe(
        (appSettings) => (this.appSettings = appSettings)
      )
    );
    this.subscriptions.push(
      this.channelService.messageToQuote$.subscribe((m) => {
        const isThreadReply = m && m.parent_id;
        if (
          (this.mode === 'thread' && isThreadReply) ||
          (this.mode === 'thread' && this.quotedMessage && !m) ||
          (this.mode === 'main' && !isThreadReply)
        ) {
          this.quotedMessage = m;
        }
      })
    );
    this.attachmentUploads$ = this.attachmentService.attachmentUploads$;
    this.attachmentUploadInProgressCounter$ =
      this.attachmentService.attachmentUploadInProgressCounter$;
    this.isFileUploadEnabled = this.configService.isFileUploadEnabled;
    this.isMultipleFileUploadEnabled =
      this.configService.isMultipleFileUploadEnabled;
    this.areMentionsEnabled = this.configService.areMentionsEnabled;
    this.mentionScope = this.configService.mentionScope;
    this.inputMode = this.configService.inputMode;

    this.subscriptions.push(
      this.typingStart$.subscribe(
        () => void this.channelService.typingStarted(this.parentMessageId)
      )
    );

    this.subscriptions.push(
      combineLatest([
        this.channelService.latestMessageDateByUserByChannels$,
        this.channelService.activeChannel$,
      ])
        .pipe(
          map(
            ([latestMessages, channel]): [
              Date | undefined,
              Channel<DefaultStreamChatGenerics> | undefined
            ] => [latestMessages[channel?.cid || ''], channel!]
          )
        )
        .subscribe(([latestMessageDate, channel]) => {
          const cooldown =
            (channel?.data?.cooldown as number) &&
            latestMessageDate &&
            Math.round(
              (channel?.data?.cooldown as number) -
                (new Date().getTime() - latestMessageDate.getTime()) / 1000
            );
          if (
            cooldown &&
            cooldown > 0 &&
            (channel?.data?.own_capabilities as string[]).includes('slow-mode')
          ) {
            this.startCooldown(cooldown);
          } else if (this.isCooldownInProgress) {
            this.stopCooldown();
          }
        })
    );
  }

  ngOnInit(): void {
    this.subscriptions.push(
      this.customTemplatesService.emojiPickerTemplate$.subscribe((template) => {
        this.emojiPickerTemplate = template;
        this.cdRef.detectChanges();
      })
    );
    this.subscriptions.push(
      this.customTemplatesService.attachmentPreviewListTemplate$.subscribe(
        (template) => {
          this.attachmentPreviewListTemplate = template;
          this.cdRef.detectChanges();
        }
      )
    );
    this.subscriptions.push(
      this.customTemplatesService.customAttachmentUploadTemplate$.subscribe(
        (template) => {
          this.customAttachmentUploadTemplate = template;
          this.cdRef.detectChanges();
        }
      )
    );
  }

  ngAfterViewInit(): void {
    this.isViewInited = true;
    this.initTextarea();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.message) {
      this.attachmentService.resetAttachmentUploads();
      if (this.isUpdate) {
        this.attachmentService.createFromAttachments(
          this.message!.attachments || []
        );
        this.textareaValue = this.message!.text || '';
      }
    }
    if (changes.isFileUploadEnabled) {
      this.configService.isFileUploadEnabled = this.isFileUploadEnabled;
    }
    if (changes.isMultipleFileUploadEnabled) {
      this.configService.isMultipleFileUploadEnabled =
        this.isMultipleFileUploadEnabled;
    }
    if (changes.areMentionsEnabled) {
      this.configService.areMentionsEnabled = this.areMentionsEnabled;
    }
    if (changes.mentionScope) {
      this.configService.mentionScope = this.mentionScope;
    }
    if (changes.mode) {
      this.setCanSendMessages();
    }
    if (changes.inputMode) {
      this.configService.inputMode = this.inputMode;
    }
    if (changes.sendMessage$) {
      if (this.sendMessageSubcription) {
        this.sendMessageSubcription.unsubscribe();
      }
      if (this.sendMessage$) {
        this.sendMessageSubcription = this.sendMessage$.subscribe(
          () => void this.messageSent()
        );
      }
    }
  }

  ngOnDestroy(): void {
    if (this.sendMessageSubcription) {
      this.sendMessageSubcription.unsubscribe();
    }
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  async messageSent() {
    if (this.isCooldownInProgress) {
      return;
    }
    let attachmentUploadInProgressCounter!: number;
    this.attachmentService.attachmentUploadInProgressCounter$
      .pipe(first())
      .subscribe((counter) => (attachmentUploadInProgressCounter = counter));
    if (attachmentUploadInProgressCounter > 0) {
      if (!this.hideNotification) {
        this.hideNotification =
          this.notificationService.addPermanentNotification(
            'streamChat.Wait until all attachments have uploaded'
          );
      }
      return;
    }
    const attachments = this.attachmentService.mapToAttachments();
    let text = this.textareaValue;
    text = text.replace(/^\n+/g, ''); // leading empty lines
    text = text.replace(/\n+$/g, ''); // ending empty lines
    const textContainsOnlySpaceChars = !text.replace(/ /g, ''); //spcae
    if (
      (!text || textContainsOnlySpaceChars) &&
      (!attachments || attachments.length === 0)
    ) {
      return;
    }
    if (textContainsOnlySpaceChars) {
      text = '';
    }
    if (this.containsLinks && !this.canSendLinks) {
      this.notificationService.addTemporaryNotification(
        'streamChat.Sending links is not allowed in this conversation'
      );
      return;
    }
    if (!this.isUpdate) {
      this.textareaValue = '';
    }
    try {
      const message = await (this.isUpdate
        ? this.channelService.updateMessage({
            ...this.message!,
            text: text,
            attachments: attachments,
          })
        : this.channelService.sendMessage(
            text,
            attachments,
            this.mentionedUsers,
            this.parentMessageId,
            this.quotedMessage?.id
          ));
      this.messageUpdate.emit({ message });
      if (!this.isUpdate) {
        this.attachmentService.resetAttachmentUploads();
      }
    } catch (error) {
      if (this.isUpdate) {
        this.notificationService.addTemporaryNotification(
          'streamChat.Edit message request failed'
        );
      }
    }
    void this.channelService.typingStopped(this.parentMessageId);
    if (this.quotedMessage) {
      this.deselectMessageToQuote();
    }
  }

  get containsLinks() {
    return /(?:(?:https?|ftp):\/\/)?[\w/\-?=%.]+\.[\w/\-&?=%.]+/.test(
      this.textareaValue
    );
  }

  get quotedMessageAttachments() {
    const originalAttachments = this.quotedMessage?.attachments;
    return originalAttachments && originalAttachments.length
      ? [originalAttachments[0]]
      : [];
  }

  get disabledTextareaText() {
    if (!this.canSendMessages) {
      return this.mode === 'thread'
        ? "streamChat.You can't send thread replies in this channel"
        : "streamChat.You can't send messages in this channel";
    }
    return '';
  }

  async filesSelected(fileList: FileList | null) {
    if (!(await this.areAttachemntsValid(fileList))) {
      return;
    }
    await this.attachmentService.filesSelected(fileList);
    this.clearFileInput();
  }

  deselectMessageToQuote() {
    this.channelService.selectMessageToQuote(undefined);
  }

  getEmojiPickerContext(): EmojiPickerContext {
    return {
      emojiInput$: this.emojiInputService.emojiInput$,
    };
  }

  getAttachmentPreviewListContext(): AttachmentPreviewListContext {
    return {
      attachmentUploads$: this.attachmentService.attachmentUploads$,
      deleteUploadHandler: this.deleteUpload.bind(this),
      retryUploadHandler: this.retryUpload.bind(this),
    };
  }

  getAttachmentUploadContext(): CustomAttachmentUploadContext {
    return {
      isMultipleFileUploadEnabled: this.isMultipleFileUploadEnabled,
      attachmentService: this.attachmentService,
    };
  }

  private deleteUpload(upload: AttachmentUpload) {
    if (this.isUpdate) {
      // Delay delete to avoid modal detecting this click as outside click
      setTimeout(() => {
        void this.attachmentService.deleteAttachment(upload);
      });
    } else {
      void this.attachmentService.deleteAttachment(upload);
    }
  }

  private retryUpload(file: File) {
    void this.attachmentService.retryAttachmentUpload(file);
  }

  private clearFileInput() {
    this.fileInput.nativeElement.value = '';
  }

  private get isUpdate() {
    return !!this.message;
  }

  private initTextarea() {
    // cleanup previously built textarea
    if (!this.canSendMessages) {
      this.textareaRef = undefined;
    }

    if (!this.canSendMessages || this.textareaRef || !this.textareaAnchor) {
      return;
    }

    const componentFactory =
      this.componentFactoryResolver.resolveComponentFactory(this.textareaType);
    this.textareaRef =
      this.textareaAnchor.viewContainerRef.createComponent<any>(
        componentFactory
      );
    this.cdRef.detectChanges();
  }

  private async areAttachemntsValid(fileList: FileList | null) {
    if (!fileList) {
      return true;
    }
    if (!this.appSettings) {
      await this.chatClient.getAppSettings();
    }
    let isValid = true;
    Array.from(fileList).forEach((f) => {
      let hasBlockedExtension: boolean;
      let hasBlockedMimeType: boolean;
      let hasNotAllowedExtension: boolean;
      let hasNotAllowedMimeType: boolean;
      if (isImageFile(f)) {
        hasBlockedExtension =
          !!this.appSettings?.image_upload_config?.blocked_file_extensions?.find(
            (ext) => f.name.endsWith(ext)
          );
        hasBlockedMimeType =
          !!this.appSettings?.image_upload_config?.blocked_mime_types?.find(
            (type) => f.type === type
          );
        hasNotAllowedExtension =
          !!this.appSettings?.image_upload_config?.allowed_file_extensions
            ?.length &&
          !this.appSettings?.image_upload_config?.allowed_file_extensions?.find(
            (ext) => f.name.endsWith(ext)
          );
        hasNotAllowedMimeType =
          !!this.appSettings?.image_upload_config?.allowed_mime_types?.length &&
          !this.appSettings?.image_upload_config?.allowed_mime_types?.find(
            (type) => f.type === type
          );
      } else {
        hasBlockedExtension =
          !!this.appSettings?.file_upload_config?.blocked_file_extensions?.find(
            (ext) => f.name.endsWith(ext)
          );
        hasBlockedMimeType =
          !!this.appSettings?.file_upload_config?.blocked_mime_types?.find(
            (type) => f.type === type
          );
        hasNotAllowedExtension =
          !!this.appSettings?.file_upload_config?.allowed_file_extensions
            ?.length &&
          !this.appSettings?.file_upload_config?.allowed_file_extensions?.find(
            (ext) => f.name.endsWith(ext)
          );
        hasNotAllowedMimeType =
          !!this.appSettings?.file_upload_config?.allowed_mime_types?.length &&
          !this.appSettings?.file_upload_config?.allowed_mime_types?.find(
            (type) => f.type === type
          );
      }
      if (
        hasBlockedExtension ||
        hasBlockedMimeType ||
        hasNotAllowedExtension ||
        hasNotAllowedMimeType
      ) {
        this.notificationService.addTemporaryNotification(
          'streamChat.Error uploading file, extension not supported',
          undefined,
          undefined,
          { name: f.name, ext: f.type }
        );
        isValid = false;
      }
    });
    return isValid;
  }

  private setCanSendMessages() {
    const capabilities = this.channel?.data?.own_capabilities as string[];
    if (!capabilities) {
      this.canSendMessages = false;
    } else {
      this.canSendMessages =
        capabilities.indexOf(
          this.mode === 'main' ? 'send-message' : 'send-reply'
        ) !== -1;
    }
    if (this.isViewInited) {
      this.cdRef.detectChanges();
      this.initTextarea();
    }
  }

  private get parentMessageId() {
    let parentMessageId: string | undefined = undefined;
    if (this.mode === 'thread') {
      this.channelService.activeParentMessageId$
        .pipe(first())
        .subscribe((id) => (parentMessageId = id));
    }

    return parentMessageId;
  }

  private startCooldown(cooldown: number) {
    this.textareaPlaceholder = this.slowModeTextareaPlaceholder;
    this.isCooldownInProgress = true;
    this.cooldown$ = timer(0, 1000).pipe(
      take(cooldown + 1),
      map((v) => cooldown - v),
      tap((v) => {
        if (v === 0) {
          this.stopCooldown();
        }
      })
    );
  }

  private stopCooldown() {
    this.cooldown$ = undefined;
    this.isCooldownInProgress = false;
    this.textareaPlaceholder = this.defaultTextareaPlaceholder;
  }
}
