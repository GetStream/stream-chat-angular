import {
  AfterViewInit,
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
import { distinctUntilChanged, first, map, take, tap } from 'rxjs/operators';
import {
  Attachment,
  Channel,
  DraftMessagePayload,
  DraftResponse,
  UserResponse,
} from 'stream-chat';
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
})
export class MessageInputComponent
  implements OnInit, OnChanges, OnDestroy, AfterViewInit
{
  /**
   * If file upload is enabled, the user can open a file selector from the input. Please note that the user also needs to have the necessary [channel capability](/chat/docs/javascript/channel_capabilities/). If no value is provided, it is set from the [`MessageInputConfigService`](/chat/docs/sdk/angular/services/MessageInputConfigService/).
   */
  @Input() isFileUploadEnabled: boolean | undefined;
  /**
   * If true, users can mention other users in messages. You also [need to use the `AutocompleteTextarea`](/chat/docs/sdk/angular/concepts/opt-in-architecture/) for this feature to work. If no value is provided, it is set from the [`MessageInputConfigService`](/chat/docs/sdk/angular/services/MessageInputConfigService/).
   */
  @Input() areMentionsEnabled: boolean | undefined;
  /**
   * The scope for user mentions, either members of the current channel of members of the application. If no value is provided, it is set from the [`MessageInputConfigService`](/chat/docs/sdk/angular/services/MessageInputConfigService/).
   */
  @Input() mentionScope: 'channel' | 'application' | undefined;
  /**
   * Determines if the message is being dispalyed in a channel or in a [thread](/chat/docs/javascript/threads/).
   */
  @Input() mode: 'thread' | 'main' = 'main';
  /**
   * If true, users can select multiple files to upload. If no value is provided, it is set from the [`MessageInputConfigService`](/chat/docs/sdk/angular/services/MessageInputConfigService/).
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
   * In `desktop` mode the `Enter` key will trigger message sending, in `mobile` mode the `Enter` key will insert a new line to the message input. If no value is provided, it is set from the [`MessageInputConfigService`](/chat/docs/sdk/angular/services/MessageInputConfigService/).
   */
  @Input() inputMode: 'desktop' | 'mobile';
  /**
   * Enables or disables auto focus on the textarea element
   */
  @Input() autoFocus = true;
  /**
   * By default the input will react to changes in `messageToEdit$` from [`MessageActionsService`](/chat/docs/sdk/angular/services/MessageActionsService/) and display the message to be edited (taking into account the current `mode`).
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
   * You can enable/disable polls with this input
   */
  @Input() displayPollCreateButton = false;
  /**
   * Emits when a message was successfuly sent or updated
   */
  @Output() readonly messageUpdate = new EventEmitter<{
    message: StreamMessage;
  }>();
  /**
   * Emits the messsage draft whenever the composed message changes.
   * - If the user clears the message input, or sends the message, undefined is emitted.
   * - If active channel changes, nothing is emitted.
   *
   * To save and fetch message drafts, you can use the [Stream message drafts API](https://getstream.io/chat/docs/javascript/drafts/).
   *
   * Message draft only works for new messages, nothing is emitted when input is in edit mode (if `message` input is set).
   */
  @Output() readonly messageDraftChange = new EventEmitter<
    DraftMessagePayload | undefined
  >();
  @ContentChild(TemplateRef) voiceRecorderRef:
    | TemplateRef<{ service: VoiceRecorderService }>
    | undefined;
  @HostBinding() class = 'str-chat__message-input-angular-host';
  isVoiceRecording = true;
  isFileUploadAuthorized: boolean | undefined;
  canSendLinks: boolean | undefined;
  canSendMessages: boolean | undefined;
  canSendPolls: boolean | undefined;
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
  isComposerOpen = false;
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
  private pollId: string | undefined;
  private isChannelChangeResetInProgress = false;
  private isSendingMessage = false;
  private isLoadingDraft = false;

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
    @Optional() public audioRecorder?: AudioRecorderService
  ) {
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
      this.attachmentService.attachmentUploads$
        .pipe(
          distinctUntilChanged(
            (prev, current) =>
              prev.filter((v) => v.state === 'success').length ===
              current.filter((v) => v.state === 'success').length
          )
        )
        .subscribe(() => {
          this.updateMessageDraft();
        })
    );
    this.subscriptions.push(
      this.attachmentService.customAttachments$.subscribe(() => {
        this.updateMessageDraft();
      })
    );
    this.subscriptions.push(
      this.channelService.activeChannel$.subscribe((channel) => {
        if (channel && this.channel && channel.id !== this.channel.id) {
          this.textareaValue = '';
          this.attachmentService.resetAttachmentUploads();
          this.pollId = undefined;
          this.voiceRecorderService.isRecorderVisible$.next(false);
          // Preemptively deselect quoted message, to avoid unwanted draft emission
          this.channelService.selectMessageToQuote(undefined);
        }
        const capabilities = channel?.data?.own_capabilities as string[];
        if (capabilities) {
          this.isFileUploadAuthorized =
            capabilities.indexOf('upload-file') !== -1;
          this.canSendLinks = capabilities.indexOf('send-links') !== -1;
          this.canSendPolls = capabilities.indexOf('send-poll') !== -1;
          this.channel = channel;
          this.setCanSendMessages();
        }
      })
    );
    this.subscriptions.push(
      this.channelService.channelSwitchState$.subscribe((state) => {
        this.isChannelChangeResetInProgress = state === 'start';
      })
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
          this.updateMessageDraft();
        }
      })
    );
    this.subscriptions.push(
      this.messageActionsService.messageToEdit$.subscribe((message) => {
        this.messageToEdit = message;
        this.checkIfInEditMode();
      })
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
        () => void this.channelService.typingStarted(this.parentMessageId)
      )
    );
    this.subscriptions.push(
      this.voiceRecorderService.isRecorderVisible$.subscribe((isVisible) => {
        this.isVoiceRecording = isVisible;
      })
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
              Channel | undefined
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
    this.subscriptions.push(
      this.voiceRecorderService.recording$.subscribe((recording) => {
        if (recording) {
          void this.voiceRecordingReady(recording);
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
    this.isSendingMessage = true;
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
      (!attachments || attachments.length === 0) &&
      !this.pollId
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
    const pollId = this.pollId;
    if (!this.isUpdate) {
      this.textareaValue = '';
      this.pollId = undefined;
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
            undefined,
            pollId
          ));
      this.messageUpdate.emit({ message });
      if (this.isUpdate) {
        this.deselectMessageToEdit();
      } else {
        this.attachmentService.resetAttachmentUploads();
      }
    } catch (error) {
      this.isSendingMessage = false;
      if (this.isUpdate) {
        this.notificationService.addTemporaryNotification(
          'streamChat.Edit message request failed'
        );
      }
    } finally {
      this.isSendingMessage = false;
      this.updateMessageDraft();
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

  openPollComposer() {
    this.isComposerOpen = true;
  }

  closePollComposer = () => {
    this.isComposerOpen = false;
  };

  addPoll = (pollId: string) => {
    this.isComposerOpen = false;
    this.pollId = pollId;
    this.updateMessageDraft();
    void this.messageSent();
  };

  userMentionsChanged(userMentions: UserResponse[]) {
    if (
      userMentions.map((u) => u.id).join(',') !==
      this.mentionedUsers.map((u) => u.id).join(',')
    ) {
      this.mentionedUsers = userMentions;
      this.updateMessageDraft();
    }
  }

  updateMessageDraft() {
    if (
      this.isLoadingDraft ||
      this.isSendingMessage ||
      this.isChannelChangeResetInProgress ||
      this.isUpdate
    ) {
      return;
    }
    const attachments = this.attachmentService.mapToAttachments();

    if (
      !this.textareaValue &&
      !this.mentionedUsers.length &&
      !attachments?.length &&
      !this.pollId &&
      !this.quotedMessage?.id
    ) {
      this.messageDraftChange.emit(undefined);
    } else {
      this.messageDraftChange.emit({
        text: this.textareaValue,
        attachments: this.attachmentService.mapToAttachments(),
        mentioned_users: this.mentionedUsers.map((user) => user.id),
        poll_id: this.pollId,
        parent_id: this.parentMessageId,
        quoted_message_id: this.quotedMessage?.id,
      });
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

  /**
   *
   * @param draft DraftResponse to load into the message input.
   * - Draft messages are only supported for new messages, input is ignored in edit mode (if `message` input is set).
   * - If channel id doesn't match the active channel id, the draft is ignored.
   * - If a thread message is loaded, and the input isn't in thread mode or parent ids don't match, the draft is ignored.
   */
  loadDraft(draft: DraftResponse) {
    if (
      this.channel?.cid !== draft.channel?.cid ||
      draft?.message?.parent_id !== this.parentMessageId ||
      this.isUpdate
    ) {
      return;
    }
    this.isLoadingDraft = true;
    this.channelService.selectMessageToQuote(draft.quoted_message);

    this.textareaValue = draft.message?.text || '';
    this.mentionedUsers =
      draft?.message?.mentioned_users?.map((id) => ({ id })) || [];
    this.pollId = draft?.message?.poll_id;
    this.attachmentService.createFromAttachments(
      draft?.message?.attachments || []
    );
    this.isLoadingDraft = false;
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
        componentFactory
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
          this.mode === 'main' ? 'send-message' : 'send-reply'
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
      })
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
        this.cdRef.detectChanges();
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
        this.cdRef.detectChanges();
      }
    }
  }

  private messageToUpdateChanged() {
    this.attachmentService.resetAttachmentUploads();
    this.setCanSendMessages();
    if (this.isUpdate) {
      this.attachmentService.createFromAttachments(
        this.message!.attachments || []
      );
      this.textareaValue = this.message!.text || '';
      this.pollId = this.message!.poll_id;
    } else {
      this.textareaValue = '';
      this.pollId = undefined;
    }
  }
}
