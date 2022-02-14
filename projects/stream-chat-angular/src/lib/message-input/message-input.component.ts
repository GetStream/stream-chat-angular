import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ComponentFactoryResolver,
  ComponentRef,
  ElementRef,
  EventEmitter,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  TemplateRef,
  Type,
  ViewChild,
} from '@angular/core';
import { ChatClientService } from '../chat-client.service';
import { Observable, Subscription } from 'rxjs';
import { first } from 'rxjs/operators';
import { AppSettings, Channel, UserResponse } from 'stream-chat';
import { AttachmentService } from '../attachment.service';
import { ChannelService } from '../channel.service';
import { textareaInjectionToken } from '../injection-tokens';
import { NotificationService } from '../notification.service';
import {
  AttachmentUpload,
  CommandAutocompleteListItemContext,
  MentionAutcompleteListItemContext,
  StreamMessage,
} from '../types';
import { MessageInputConfigService } from './message-input-config.service';
import { TextareaDirective } from './textarea.directive';
import { TextareaInterface } from './textarea.interface';
import { isImageFile } from '../is-image-file';
import { EmojiInputService } from './emoji-input.service';

@Component({
  selector: 'stream-message-input',
  templateUrl: './message-input.component.html',
  styles: [],
  providers: [AttachmentService, EmojiInputService],
})
export class MessageInputComponent
  implements OnChanges, OnDestroy, AfterViewInit
{
  @Input() isFileUploadEnabled: boolean | undefined;
  @Input() areMentionsEnabled: boolean | undefined;
  @Input() mentionScope: 'channel' | 'application' | undefined;
  @Input() mentionAutocompleteItemTemplate:
    | TemplateRef<MentionAutcompleteListItemContext>
    | undefined;
  @Input() commandAutocompleteItemTemplate:
    | TemplateRef<CommandAutocompleteListItemContext>
    | undefined;
  @Input() emojiPickerTemplate: TemplateRef<void> | undefined;
  @Input() mode: 'thread' | 'main' = 'main';
  /**
   * @deprecated https://getstream.io/chat/docs/sdk/angular/components/message-input/#caution-acceptedfiletypes
   */
  @Input() acceptedFileTypes: string[] | undefined;
  @Input() isMultipleFileUploadEnabled: boolean | undefined;
  @Input() message: StreamMessage | undefined;
  @Output() readonly messageUpdate = new EventEmitter<void>();
  isFileUploadAuthorized: boolean | undefined;
  canSendLinks: boolean | undefined;
  canSendMessages: boolean | undefined;
  attachmentUploads$: Observable<AttachmentUpload[]>;
  textareaValue = '';
  textareaRef: ComponentRef<TextareaInterface> | undefined;
  mentionedUsers: UserResponse[] = [];
  quotedMessage: undefined | StreamMessage;
  @ViewChild('fileInput') private fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild(TextareaDirective, { static: false })
  private textareaAnchor!: TextareaDirective;
  private subscriptions: Subscription[] = [];
  private hideNotification: Function | undefined;
  private isViewInited = false;
  private appSettings: AppSettings | undefined;
  private channel: Channel | undefined;
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
    public emojiInputService: EmojiInputService
  ) {
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
        this.textareaValue = '';
        this.attachmentService.resetAttachmentUploads();
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
    this.isFileUploadEnabled = this.configService.isFileUploadEnabled;
    this.acceptedFileTypes = this.configService.acceptedFileTypes;
    this.isMultipleFileUploadEnabled =
      this.configService.isMultipleFileUploadEnabled;
    this.areMentionsEnabled = this.configService.areMentionsEnabled;
    this.mentionAutocompleteItemTemplate =
      this.configService.mentionAutocompleteItemTemplate;
    this.mentionScope = this.configService.mentionScope;
    this.commandAutocompleteItemTemplate =
      this.configService.commandAutocompleteItemTemplate;
    this.emojiPickerTemplate = this.configService.emojiPickerTemplate;
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
    if (changes.acceptedFileTypes) {
      this.configService.acceptedFileTypes = this.acceptedFileTypes;
    }
    if (changes.isMultipleFileUploadEnabled) {
      this.configService.isMultipleFileUploadEnabled =
        this.isMultipleFileUploadEnabled;
    }
    if (changes.areMentionsEnabled) {
      this.configService.areMentionsEnabled = this.areMentionsEnabled;
    }
    if (changes.mentionAutocompleteItemTemplate) {
      this.configService.mentionAutocompleteItemTemplate =
        this.mentionAutocompleteItemTemplate;
    }
    if (changes.commandAutocompleteItemTemplate) {
      this.configService.commandAutocompleteItemTemplate =
        this.commandAutocompleteItemTemplate;
    }
    if (changes.mentionScope) {
      this.configService.mentionScope = this.mentionScope;
    }
    if (changes.emojiPickerTemplate) {
      this.configService.emojiPickerTemplate = this.emojiPickerTemplate;
    }
    if (changes.mode) {
      this.setCanSendMessages();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  async messageSent() {
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
    const text = this.textareaValue;
    if (!text && (!attachments || attachments.length === 0)) {
      return;
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
    let parentMessageId: string | undefined = undefined;
    if (this.mode === 'thread') {
      this.channelService.activeParentMessageId$
        .pipe(first())
        .subscribe((id) => (parentMessageId = id));
    }
    try {
      await (this.isUpdate
        ? this.channelService.updateMessage({
            ...this.message!,
            text: text,
            attachments: attachments,
          })
        : this.channelService.sendMessage(
            text,
            attachments,
            this.mentionedUsers,
            parentMessageId,
            this.quotedMessage?.id
          ));
      this.messageUpdate.emit();
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
    if (this.quotedMessage) {
      this.deselectMessageToQuote();
    }
  }

  get containsLinks() {
    return /(?:(?:https?|ftp):\/\/)?[\w/\-?=%.]+\.[\w/\-&?=%.]+/.test(
      this.textareaValue
    );
  }

  get accept() {
    return this.acceptedFileTypes ? this.acceptedFileTypes?.join(',') : '';
  }

  get quotedMessageAttachments() {
    const originalAttachments = this.quotedMessage?.attachments;
    return originalAttachments && originalAttachments.length
      ? [originalAttachments[0]]
      : [];
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

  private clearFileInput() {
    this.fileInput.nativeElement.value = '';
  }

  private get isUpdate() {
    return !!this.message;
  }

  private initTextarea() {
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
    if (!fileList || this.acceptedFileTypes) {
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
          'streamChat.Unsupported file type: {{type}}',
          undefined,
          undefined,
          { type: f.type }
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
}
