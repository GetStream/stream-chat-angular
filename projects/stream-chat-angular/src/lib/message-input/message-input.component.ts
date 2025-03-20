import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ComponentFactoryResolver,
  ComponentRef,
  ContentChild,
  ElementRef,
  EventEmitter,
  HostBinding,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Optional,
  Output,
  SimpleChanges,
  TemplateRef,
  Type,
  ViewChild,
} from '@angular/core';
import { combineLatest, Observable, Subject, Subscription, timer } from 'rxjs';
import { first, map, take, tap } from 'rxjs/operators';
import { Attachment, Channel, UserResponse } from 'stream-chat';
import { AttachmentService } from '../attachment.service';
import { ChannelService } from '../channel.service';
import { textareaInjectionToken } from '../injection-tokens';
import { NotificationService } from '../notification.service';
import {
  AttachmentPreviewListContext,
  AttachmentUpload,
  AudioRecording,
  CustomAttachmentUploadContext,
  EmojiPickerContext,
  MessageTextContext,
  StreamMessage,
} from '../types';
import { MessageInputConfigService } from './message-input-config.service';
import { TextareaDirective } from './textarea.directive';
import { TextareaInterface } from './textarea.interface';
import { EmojiInputService } from './emoji-input.service';
import { CustomTemplatesService } from '../custom-templates.service';
import { v4 as uuidv4 } from 'uuid';
import { MessageActionsService } from '../message-actions.service';
import { VoiceRecorderService } from './voice-recorder.service';
import { AudioRecorderService } from '../voice-recorder/audio-recorder.service';

/**
 * The `MessageInput` component displays an input where users can type their messages and upload files, and sends the message to the active channel. The component can be used to compose new messages or update existing ones. To send messages, the chat user needs to have the necessary [channel capability](/chat/docs/javascript/channel_capabilities/).
 */
@Component({
  selector: 'stream-message-input',
  templateUrl: './message-input.component.html',
  styles: [],
  providers: [AttachmentService, EmojiInputService, VoiceRecorderService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageInputComponent
  implements OnInit, OnChanges, OnDestroy, AfterViewInit
{
  /**
   * If file upload is enabled, the user can open a file selector from the input. Please note that the user also needs to have the necessary [channel capability](/chat/docs/javascript/channel_capabilities/). If no value is provided, it is set from the [`MessageInputConfigService`](/chat/docs/sdk/angular/v6-rc/services/MessageInputConfigService/).
   */
  @Input() isFileUploadEnabled: boolean | undefined;
  /**
   * If true, users can mention other users in messages. You also [need to use the `AutocompleteTextarea`](/chat/docs/sdk/angular/v6-rc/concepts/opt-in-architecture/) for this feature to work. If no value is provided, it is set from the [`MessageInputConfigService`](/chat/docs/sdk/angular/v6-rc/services/MessageInputConfigService/).
   */
  @Input() areMentionsEnabled: boolean | undefined;
  /**
   * The scope for user mentions, either members of the current channel of members of the application. If no value is provided, it is set from the [`MessageInputConfigService`](/chat/docs/sdk/angular/v6-rc/services/MessageInputConfigService/).
   */
  @Input() mentionScope: 'channel' | 'application' | undefined;
  /**
   * Determines if the message is being dispalyed in a channel or in a [thread](/chat/docs/javascript/threads/).
   */
  @Input() mode: 'thread' | 'main' = 'main';
  /**
   * If true, users can select multiple files to upload. If no value is provided, it is set from the [`MessageInputConfigService`](/chat/docs/sdk/angular/v6-rc/services/MessageInputConfigService/).
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
   * In `desktop` mode the `Enter` key will trigger message sending, in `mobile` mode the `Enter` key will insert a new line to the message input. If no value is provided, it is set from the [`MessageInputConfigService`](/chat/docs/sdk/angular/v6-rc/services/MessageInputConfigService/).
   */
  @Input() inputMode: 'desktop' | 'mobile';
  /**
   * Enables or disables auto focus on the textarea element
   */
  @Input() autoFocus = true;
  /**
   * By default the input will react to changes in `messageToEdit$` from [`MessageActionsService`](/chat/docs/sdk/angular/v6-rc/services/MessageActionsService/) and display the message to be edited (taking into account the current `mode`).
   *
   * If you don't need that behavior, you can turn this of with this flag. In that case you should create your own edit message UI.
   */
  @Input() watchForMessageToEdit = true;
  /**
   * Use this input to control wether a send button is rendered or not. If you don't render a send button, you can still trigger message send using the `sendMessage$` input.
   */
  @Input() displaySendButton = true;
  /**
   * You can enable/disable voice recordings with this input
   */
  @Input() displayVoiceRecordingButton = false;
  /**
   * Emits when a message was successfuly sent or updated
   */
  @Output() readonly messageUpdate = new EventEmitter<{
    message: StreamMessage;
  }>();
  @ContentChild(TemplateRef) voiceRecorderRef:
    | TemplateRef<{ service: VoiceRecorderService }>
    | undefined;
  @HostBinding() class = 'str-chat__message-input-angular-host';
  isVoiceRecording = true;
  isFileUploadAuthorized: boolean | undefined;
  canSendLinks: boolean | undefined;
  canSendMessages: boolean | undefined;
  attachmentUploads$: Observable<AttachmentUpload[]>;
  customAttachments$: Observable<Attachment[]>;
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
  fileInputId = uuidv4();
  @ViewChild('fileInput') private fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild(TextareaDirective, { static: false })
  private textareaAnchor!: TextareaDirective;
  private subscriptions: Subscription[] = [];
  private hideNotification: (() => void) | undefined;
  private isViewInited = false;
  private channel: Channel | undefined;
  private sendMessageSubcription: Subscription | undefined;
  private readonly defaultTextareaPlaceholder = 'streamChat.Type your message';
  private readonly slowModeTextareaPlaceholder = 'streamChat.Slow Mode ON';
  private messageToEdit?: StreamMessage;

  constructor(
    private channelService: ChannelService,
    private notificationService: NotificationService,
    public readonly attachmentService: AttachmentService,
    private configService: MessageInputConfigService,
    @Inject(textareaInjectionToken)
    private textareaType: Type<TextareaInterface>,
    private componentFactoryResolver: ComponentFactoryResolver,
    private cdRef: ChangeDetectorRef,
    private emojiInputService: EmojiInputService,
    readonly customTemplatesService: CustomTemplatesService,
    private messageActionsService: MessageActionsService,
    public readonly voiceRecorderService: VoiceRecorderService,
    @Optional() public audioRecorder?: AudioRecorderService,
  ) {
    this.textareaPlaceholder = this.defaultTextareaPlaceholder;
    this.subscriptions.push(
      this.attachmentService.attachmentUploadInProgressCounter$.subscribe(
        (counter) => {
          if (counter === 0 && this.hideNotification) {
            this.hideNotification();
            this.hideNotification = undefined;
            if (this.isViewInited) {
              this.cdRef.markForCheck();
            }
          }
        },
      ),
    );
    this.subscriptions.push(
      this.channelService.activeChannel$.subscribe((channel) => {
        if (channel && this.channel && channel.id !== this.channel.id) {
          this.textareaValue = '';
          this.attachmentService.resetAttachmentUploads();
          this.voiceRecorderService.isRecorderVisible$.next(false);
        }
        const capabilities = channel?.data?.own_capabilities as string[];
        if (capabilities) {
          this.isFileUploadAuthorized =
            capabilities.indexOf('upload-file') !== -1;
          this.canSendLinks = capabilities.indexOf('send-links') !== -1;
          this.channel = channel;
          this.setCanSendMessages();
        }
        if (this.isViewInited) {
          this.cdRef.markForCheck();
        }
      }),
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
          if (this.isViewInited) {
            this.cdRef.markForCheck();
          }
        }
      }),
    );
    this.subscriptions.push(
      this.messageActionsService.messageToEdit$.subscribe((message) => {
        this.messageToEdit = message;
        this.checkIfInEditMode();
        if (this.isViewInited) {
          this.cdRef.markForCheck();
        }
      }),
    );
    this.attachmentUploads$ = this.attachmentService.attachmentUploads$;
    this.customAttachments$ = this.attachmentService.customAttachments$;
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
        () => void this.channelService.typingStarted(this.parentMessageId),
      ),
    );
    this.subscriptions.push(
      this.voiceRecorderService.isRecorderVisible$.subscribe((isVisible) => {
        if (isVisible !== this.isVoiceRecording) {
          this.isVoiceRecording = isVisible;
          if (this.isViewInited) {
            this.cdRef.markForCheck();
          }
        }
      }),
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
              Channel | undefined,
            ] => [latestMessages[channel?.cid || ''], channel!],
          ),
        )
        .subscribe(([latestMessageDate, channel]) => {
          const cooldown =
            (channel?.data?.cooldown as number) &&
            latestMessageDate &&
            Math.round(
              (channel?.data?.cooldown as number) -
                (new Date().getTime() - latestMessageDate.getTime()) / 1000,
            );
          if (
            cooldown &&
            cooldown > 0 &&
            (channel?.data?.own_capabilities as string[]).includes('slow-mode')
          ) {
            this.startCooldown(cooldown);
            if (this.isViewInited) {
              this.cdRef.markForCheck();
            }
          } else if (this.isCooldownInProgress) {
            this.stopCooldown();
            if (this.isViewInited) {
              this.cdRef.markForCheck();
            }
          }
        }),
    );
    this.subscriptions.push(
      this.voiceRecorderService.recording$.subscribe((recording) => {
        if (recording) {
          void this.voiceRecordingReady(recording);
          if (this.isViewInited) {
            this.cdRef.markForCheck();
          }
        }
      }),
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.message) {
      this.messageToUpdateChanged();
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
      this.checkIfInEditMode();
    }
    if (changes.watchForMessageToEdit) {
      this.checkIfInEditMode();
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
          () => void this.messageSent(),
        );
      }
    }
  }

  ngOnInit(): void {
    this.subscriptions.push(
      this.customTemplatesService.emojiPickerTemplate$.subscribe((template) => {
        this.emojiPickerTemplate = template;
        this.cdRef.markForCheck();
      }),
    );
    this.subscriptions.push(
      this.customTemplatesService.attachmentPreviewListTemplate$.subscribe(
        (template) => {
          this.attachmentPreviewListTemplate = template;
          this.cdRef.markForCheck();
        },
      ),
    );
    this.subscriptions.push(
      this.customTemplatesService.customAttachmentUploadTemplate$.subscribe(
        (template) => {
          this.customAttachmentUploadTemplate = template;
          this.cdRef.markForCheck();
        },
      ),
    );
  }

  ngAfterViewInit(): void {
    this.isViewInited = true;
    this.initTextarea();
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
            'streamChat.Wait until all attachments have uploaded',
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
        'streamChat.Sending links is not allowed in this conversation',
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
            this.quotedMessage?.id,
          ));
      this.messageUpdate.emit({ message });
      if (this.isUpdate) {
        this.deselectMessageToEdit();
      } else {
        this.attachmentService.resetAttachmentUploads();
      }
    } catch (error) {
      if (this.isUpdate) {
        this.notificationService.addTemporaryNotification(
          'streamChat.Edit message request failed',
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
      this.textareaValue,
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

  itemsPasted(event: ClipboardEvent) {
    if (this.configService.customPasteEventHandler) {
      this.configService.customPasteEventHandler(event, this);
    } else {
      if (event.clipboardData?.files && event.clipboardData?.files.length > 0) {
        event.preventDefault();
        void this.filesSelected(event.clipboardData?.files);
      }
    }
  }

  async filesSelected(fileList: FileList | null) {
    await this.attachmentService.filesSelected(fileList);
    this.clearFileInput();
  }

  deselectMessageToQuote() {
    this.channelService.selectMessageToQuote(undefined);
  }

  deselectMessageToEdit() {
    this.messageActionsService.messageToEdit$.next(undefined);
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
      service: this.attachmentService,
    };
  }

  getAttachmentUploadContext(): CustomAttachmentUploadContext {
    return {
      isMultipleFileUploadEnabled: this.isMultipleFileUploadEnabled,
      attachmentService: this.attachmentService,
    };
  }

  getQuotedMessageTextContext(): MessageTextContext {
    return {
      message: this.quotedMessage,
      isQuoted: true,
      shouldTranslate: true,
    };
  }

  async startVoiceRecording() {
    await this.audioRecorder?.start();
    if (this.audioRecorder?.isRecording) {
      this.voiceRecorderService.isRecorderVisible$.next(true);
    }
  }

  async voiceRecordingReady(recording: AudioRecording) {
    try {
      await this.attachmentService.uploadVoiceRecording(recording);
      if (this.configService.sendVoiceRecordingImmediately) {
        await this.messageSent();
      }
    } finally {
      this.voiceRecorderService.isRecorderVisible$.next(false);
    }
  }

  get isUpdate() {
    return !!this.message;
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
      this.textareaAnchor.viewContainerRef.createComponent<TextareaInterface>(
        componentFactory,
      );
    this.cdRef.detectChanges();
  }

  private setCanSendMessages() {
    const capabilities = this.channel?.data?.own_capabilities as string[];
    if (!capabilities) {
      this.canSendMessages = false;
    } else {
      this.canSendMessages =
        capabilities.indexOf(
          this.mode === 'main' ? 'send-message' : 'send-reply',
        ) !== -1 || this.isUpdate;
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
      }),
    );
  }

  private stopCooldown() {
    this.cooldown$ = undefined;
    this.isCooldownInProgress = false;
    this.textareaPlaceholder = this.defaultTextareaPlaceholder;
  }

  private checkIfInEditMode() {
    if (!this.watchForMessageToEdit) {
      return;
    }
    if (!this.messageToEdit && this.message) {
      this.message = undefined;
      this.messageToUpdateChanged();
      if (this.isViewInited) {
        this.cdRef.markForCheck();
      }
    }
    if (
      this.messageToEdit &&
      ((this.mode === 'main' && !this.messageToEdit.parent_id) ||
        (this.mode === 'thread' && this.messageToEdit.parent_id))
    ) {
      this.message = this.messageToEdit;
      this.messageToUpdateChanged();
      if (this.isViewInited) {
        this.cdRef.markForCheck();
      }
    }
  }

  private messageToUpdateChanged() {
    this.attachmentService.resetAttachmentUploads();
    this.setCanSendMessages();
    if (this.isUpdate) {
      this.attachmentService.createFromAttachments(
        this.message!.attachments || [],
      );
      this.textareaValue = this.message!.text || '';
    } else {
      this.textareaValue = '';
    }
  }
}
