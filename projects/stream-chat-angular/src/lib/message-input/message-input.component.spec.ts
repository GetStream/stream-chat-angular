import { CUSTOM_ELEMENTS_SCHEMA, SimpleChange } from '@angular/core';
import {
  ComponentFixture,
  discardPeriodicTasks,
  fakeAsync,
  flush,
  TestBed,
  tick,
} from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { AppSettings, Channel, UserResponse } from 'stream-chat';
import { AttachmentService } from '../attachment.service';
import { ChannelService } from '../channel.service';
import { ChatClientService } from '../chat-client.service';
import { textareaInjectionToken } from '../injection-tokens';
import { generateMockChannels, mockCurrentUser, mockMessage } from '../mocks';
import { NotificationService } from '../notification.service';
import {
  AttachmentUpload,
  DefaultStreamChatGenerics,
  StreamMessage,
} from '../types';
import { MessageInputComponent } from './message-input.component';
import { TextareaDirective } from './textarea.directive';
import { AutocompleteTextareaComponent } from './autocomplete-textarea/autocomplete-textarea.component';
import { AvatarComponent } from '../avatar/avatar.component';
import { AttachmentListComponent } from '../attachment-list/attachment-list.component';
import { AvatarPlaceholderComponent } from '../avatar-placeholder/avatar-placeholder.component';
import { AttachmentPreviewListComponent } from '../attachment-preview-list/attachment-preview-list.component';
import { ThemeService } from '../theme.service';

describe('MessageInputComponent', () => {
  let nativeElement: HTMLElement;
  let component: MessageInputComponent;
  let fixture: ComponentFixture<MessageInputComponent>;
  let queryTextarea: () => AutocompleteTextareaComponent | null;
  let querySendButton: () => HTMLButtonElement | null;
  let queryattachmentUploadButton: () => HTMLElement | null;
  let queryFileInput: () => HTMLInputElement | null;
  let queryCooldownTimer: () => HTMLElement | null;
  let queryAttachmentPreviewList: () => AttachmentPreviewListComponent;
  let mockActiveChannel$: BehaviorSubject<Channel<DefaultStreamChatGenerics>>;
  let mockActiveParentMessageId$: BehaviorSubject<string | undefined>;
  let sendMessageSpy: jasmine.Spy;
  let updateMessageSpy: jasmine.Spy;
  let channel: Channel<DefaultStreamChatGenerics>;
  let user: UserResponse;
  let attachmentService: {
    attachmentUploadInProgressCounter$: Subject<number>;
    attachmentUploads$: Subject<AttachmentUpload[]>;
    resetAttachmentUploads: jasmine.Spy;
    filesSelected: jasmine.Spy;
    mapToAttachments: jasmine.Spy;
    createFromAttachments: jasmine.Spy;
    deleteAttachment: jasmine.Spy;
    retryAttachmentUpload: jasmine.Spy;
  };
  let appSettings$: Subject<AppSettings>;
  let getAppSettings: jasmine.Spy;
  let mockMessageToQuote$: BehaviorSubject<undefined | StreamMessage>;
  let selectMessageToQuoteSpy: jasmine.Spy;
  let typingStartedSpy: jasmine.Spy;
  let typingStoppedSpy: jasmine.Spy;
  let latestMessageDateByUserByChannels$: BehaviorSubject<{
    [key: string]: Date;
  }>;

  beforeEach(() => {
    appSettings$ = new Subject<AppSettings>();
    channel = generateMockChannels(1)[0];
    mockActiveChannel$ = new BehaviorSubject(channel);
    mockActiveParentMessageId$ = new BehaviorSubject<string | undefined>(
      undefined
    );
    user = mockCurrentUser();
    sendMessageSpy = jasmine.createSpy();
    updateMessageSpy = jasmine.createSpy();
    typingStartedSpy = jasmine.createSpy();
    typingStoppedSpy = jasmine.createSpy();
    attachmentService = {
      resetAttachmentUploads: jasmine.createSpy(),
      attachmentUploadInProgressCounter$: new BehaviorSubject(0),
      attachmentUploads$: new BehaviorSubject<AttachmentUpload[]>([]),
      filesSelected: jasmine.createSpy(),
      mapToAttachments: jasmine.createSpy(),
      createFromAttachments: jasmine.createSpy(),
      deleteAttachment: jasmine.createSpy(),
      retryAttachmentUpload: jasmine.createSpy(),
    };
    getAppSettings = jasmine.createSpy();
    mockMessageToQuote$ = new BehaviorSubject<undefined | StreamMessage>(
      undefined
    );
    latestMessageDateByUserByChannels$ = new BehaviorSubject({});
    selectMessageToQuoteSpy = jasmine.createSpy();
    TestBed.overrideComponent(MessageInputComponent, {
      set: {
        providers: [
          {
            provide: AttachmentService,
            useValue: attachmentService,
          },
          {
            provide: textareaInjectionToken,
            useValue: AutocompleteTextareaComponent,
          },
        ],
      },
    });
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      declarations: [
        MessageInputComponent,
        TextareaDirective,
        AutocompleteTextareaComponent,
        AvatarComponent,
        AttachmentListComponent,
        AvatarPlaceholderComponent,
        AttachmentPreviewListComponent,
      ],
      providers: [
        {
          provide: ChannelService,
          useValue: {
            activeChannel$: mockActiveChannel$,
            sendMessage: sendMessageSpy,
            updateMessage: updateMessageSpy,
            autocompleteMembers: jasmine.createSpy().and.resolveTo([]),
            activeParentMessageId$: mockActiveParentMessageId$,
            messageToQuote$: mockMessageToQuote$,
            selectMessageToQuote: selectMessageToQuoteSpy,
            typingStarted: typingStartedSpy,
            typingStopped: typingStoppedSpy,
            latestMessageDateByUserByChannels$,
          },
        },
        {
          provide: ChatClientService,
          useValue: {
            user$: of(user),
            chatClient: { user },
            appSettings$,
            getAppSettings,
          },
        },
        {
          provide: ThemeService,
          useValue: { themeVersion: '2' },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    });
    fixture = TestBed.createComponent(MessageInputComponent);
    component = fixture.componentInstance;
    spyOn(component, 'messageSent').and.callThrough();
    nativeElement = fixture.nativeElement as HTMLElement;
    queryTextarea = () =>
      fixture.debugElement.query(By.directive(AutocompleteTextareaComponent))
        ?.componentInstance as AutocompleteTextareaComponent;
    querySendButton = () =>
      nativeElement.querySelector('[data-testid="send-button"]');
    queryattachmentUploadButton = () =>
      nativeElement.querySelector('[data-testid="file-upload-button"]');
    queryFileInput = () =>
      nativeElement.querySelector('[data-testid="file-input"]');
    queryCooldownTimer = () =>
      nativeElement.querySelector('[data-testid="cooldown-timer"]');
    queryAttachmentPreviewList = () =>
      fixture.debugElement.query(By.directive(AttachmentPreviewListComponent))
        .componentInstance as AttachmentPreviewListComponent;
    fixture.detectChanges();
  });

  it('should display textarea', () => {
    component.textareaValue = 'Hi';
    component.areMentionsEnabled = true;
    fixture.detectChanges();
    const textarea = queryTextarea();

    expect(textarea?.value).toEqual('Hi');
    expect(textarea?.areMentionsEnabled).toBeTrue();
    expect(textarea?.inputMode).toBe(component.inputMode);
    expect(textarea?.autoFocus).toBe(component.autoFocus);

    textarea?.valueChange.next('Hi, how are you?');
    fixture.detectChanges();

    expect(component.textareaValue).toBe('Hi, how are you?');
  });

  it('should send message if send is triggered from textarea', () => {
    const textarea = queryTextarea();
    textarea?.send.next();
    fixture.detectChanges();

    expect(component.messageSent).toHaveBeenCalledWith();
  });

  it('should update message send is triggered and #message is provided', () => {
    component.message = mockMessage();
    fixture.detectChanges();
    const textarea = queryTextarea();
    const message = 'This is my new message';
    component.textareaValue = message;
    textarea?.send.next();
    fixture.detectChanges();

    expect(updateMessageSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({ id: component.message.id, text: message })
    );
  });

  it('should show error message if message update failed', async () => {
    const notificationService = TestBed.inject(NotificationService);
    spyOn(notificationService, 'addTemporaryNotification');
    const spy = jasmine.createSpy();
    component.messageUpdate.subscribe(spy);
    component.message = mockMessage();
    component.ngOnChanges({ message: {} as any as SimpleChange });
    fixture.detectChanges();
    updateMessageSpy.and.rejectWith(new Error('Error'));
    await component.messageSent();

    expect(notificationService.addTemporaryNotification).toHaveBeenCalledWith(
      'streamChat.Edit message request failed'
    );

    expect(spy).not.toHaveBeenCalledWith();
  });

  it(`shouldn't display send button in edit mode`, () => {
    component.message = mockMessage();
    component.ngOnChanges({ message: {} as any as SimpleChange });
    fixture.detectChanges();

    expect(querySendButton()).toBeNull();
  });

  it('should emit #messageUpdate event if message update was successful', async () => {
    component.message = mockMessage();
    component.ngOnChanges({ message: {} as any as SimpleChange });
    fixture.detectChanges();
    const spy = jasmine.createSpy();
    component.messageUpdate.subscribe(spy);
    updateMessageSpy.and.resolveTo({ id: component.message.id });
    await component.messageSent();

    expect(spy).toHaveBeenCalledWith({
      message: jasmine.objectContaining({ id: component.message.id }),
    });
  });

  it('should send message if button is clicked', () => {
    const textarea = queryTextarea();
    const message = 'This is my message';
    textarea?.valueChange.emit(message);
    fixture.detectChanges();
    querySendButton()?.click();
    fixture.detectChanges();

    expect(component.messageSent).toHaveBeenCalledWith();
  });

  it('should send message', async () => {
    const message = 'This is my message';
    component.textareaValue = message;
    attachmentService.mapToAttachments.and.returnValue([]);
    const mentionedUsers = [{ id: 'john', name: 'John' }];
    component.mentionedUsers = mentionedUsers;
    await component.messageSent();
    fixture.detectChanges();

    expect(sendMessageSpy).toHaveBeenCalledWith(
      message,
      [],
      mentionedUsers,
      undefined,
      undefined
    );

    expect(typingStoppedSpy).toHaveBeenCalledWith(undefined);
  });

  it('reset textarea after message is sent', () => {
    const message = 'This is my message';
    component.textareaValue = message;
    void component.messageSent();
    fixture.detectChanges();

    expect(component.textareaValue).toBe('');
  });

  it('should display file upload button, if #isFileUploadEnabled is true and has permission to upload file', () => {
    expect(queryattachmentUploadButton()).not.toBeNull();

    mockActiveChannel$.next({
      ...channel,
      data: { own_capabilities: [] },
    } as any as Channel<DefaultStreamChatGenerics>);
    fixture.detectChanges();

    expect(queryattachmentUploadButton()).toBeNull();
  });

  it(`shouldn't display file upload button, if #isFileUploadEnabled is false`, () => {
    component.isFileUploadEnabled = false;
    fixture.detectChanges();

    expect(queryattachmentUploadButton()).toBeNull();
  });

  it('should set multiple attribute on file upload', () => {
    const attachmentUpload = queryFileInput();

    expect(attachmentUpload?.hasAttribute('multiple')).toBeTrue();

    component.isMultipleFileUploadEnabled = false;
    fixture.detectChanges();

    expect(attachmentUpload?.hasAttribute('multiple')).toBeFalse();
  });

  it('should upload files', async () => {
    const imageFiles = [{ type: 'image/png' }, { type: 'image/jpg' }];
    const dataFiles = [
      { type: 'image/vnd.adobe.photoshop' },
      { type: 'plain/text' },
    ];
    const files = [...imageFiles, ...dataFiles];
    attachmentService.filesSelected.and.resolveTo([
      { file: imageFiles[0], state: 'success', url: 'url1', type: 'image' },
      { file: imageFiles[1], state: 'success', url: 'url2', type: 'image' },
      { file: dataFiles[0], state: 'success', url: 'url3', type: 'file' },
      { file: dataFiles[1], state: 'success', url: 'url4', type: 'file' },
    ]);
    await component.filesSelected(files as any as FileList);

    expect(attachmentService.filesSelected).toHaveBeenCalledWith(files);
    expect(queryFileInput()?.value).toBe('');
  });

  it('should reset files, after message is sent', async () => {
    const file = { name: 'my_image.png', type: 'image/png' };
    attachmentService.filesSelected.and.resolveTo([
      { file, state: 'success', url: 'http://url/to/image' },
    ]);
    const files = [file];
    component.textareaValue = 'my message';
    await component.filesSelected(files as any as FileList);
    await component.messageSent();

    expect(attachmentService.resetAttachmentUploads).toHaveBeenCalledWith();
  });

  it(`shouldn't send message, if file uploads are in progress`, async () => {
    const notificationService = TestBed.inject(NotificationService);
    spyOn(notificationService, 'addPermanentNotification');
    attachmentService.attachmentUploadInProgressCounter$.next(1);
    await component.messageSent();

    expect(sendMessageSpy).not.toHaveBeenCalled();
    expect(notificationService.addPermanentNotification).toHaveBeenCalledWith(
      'streamChat.Wait until all attachments have uploaded'
    );
  });

  it('should hide "Wait for upload" notification, if upload is finished', () => {
    const notificationService = TestBed.inject(NotificationService);
    const removeNotificationSpy = jasmine.createSpy();
    spyOn(notificationService, 'addPermanentNotification').and.returnValue(
      removeNotificationSpy
    );
    attachmentService.attachmentUploadInProgressCounter$.next(1);
    void component.messageSent();
    attachmentService.attachmentUploadInProgressCounter$.next(0);

    expect(removeNotificationSpy).toHaveBeenCalledWith();
  });

  it(`should send message, if file uploads are completed`, async () => {
    const file1 = { name: 'my_image.png', type: 'image/png' };
    const file2 = {
      name: 'homework.pdf',
      type: 'application/pdf',
      size: 3272969,
    };
    attachmentService.filesSelected.and.resolveTo([
      {
        file: file1,
        state: 'success',
        url: 'http://url/to/image',
        type: 'image',
      },
      { file: file2, state: 'success', url: 'http://url/to/pdf', type: 'file' },
    ]);
    const attachments = [
      {
        fallback: 'my_image.png',
        image_url: 'http://url/to/image',
        type: 'image',
      },
      {
        title: 'homework.pdf',
        asset_url: 'http://url/to/pdf',
        type: 'file',
        file_size: 3272969,
      },
    ];
    attachmentService.mapToAttachments.and.returnValue(attachments);
    await component.filesSelected([file1, file2] as any as FileList);
    void component.messageSent();

    expect(sendMessageSpy).toHaveBeenCalledWith(
      jasmine.any(String),
      attachments,
      [],
      undefined,
      undefined
    );
  });

  it('should handle channel change', () => {
    attachmentService.attachmentUploads$.next([
      {
        file: { name: 'img.png' } as any as File,
        state: 'uploading',
        type: 'image',
      },
    ]);
    component.textareaValue = 'text';
    mockActiveChannel$.next({
      getConfig: () => ({ commands: [] }),
    } as any as Channel<DefaultStreamChatGenerics>);
    fixture.detectChanges();

    expect(component.textareaValue).toBe('');
    expect(attachmentService.resetAttachmentUploads).toHaveBeenCalledWith();
  });

  it('should not reset textarea and attachments if channel id remains the same', () => {
    attachmentService.attachmentUploads$.next([
      {
        file: { name: 'img.png' } as any as File,
        state: 'uploading',
        type: 'image',
      },
    ]);
    component.textareaValue = 'text';
    mockActiveChannel$.next({
      ...mockActiveChannel$.getValue(),
      getConfig: () => ({ commands: [] }),
    } as any as Channel<DefaultStreamChatGenerics>);
    fixture.detectChanges();

    expect(component.textareaValue).toBe('text');
    expect(attachmentService.resetAttachmentUploads).not.toHaveBeenCalled();
  });

  it('should accept #message as input', () => {
    component.message = mockMessage();
    component.ngOnChanges({ message: {} as any as SimpleChange });
    fixture.detectChanges();

    expect(queryTextarea()?.value).toBe(component.message.text);
  });

  it('should display attachments of #message', () => {
    const attachments = [
      { fallback: 'flower.png', image_url: 'http://url/to/img', type: 'image' },
      {
        title: 'note.txt',
        file_size: 3272969,
        asset_url: 'http://url/to/data',
        type: 'file',
      },
    ];
    component.message = { ...mockMessage(), attachments };
    component.ngOnChanges({ message: {} as any as SimpleChange });
    fixture.detectChanges();

    expect(attachmentService.resetAttachmentUploads).toHaveBeenCalledWith();
    expect(attachmentService.createFromAttachments).toHaveBeenCalledWith(
      attachments
    );
  });

  it(`shouldn't send empty message`, () => {
    const textarea = queryTextarea();
    textarea?.send.next();
    fixture.detectChanges();

    expect(sendMessageSpy).not.toHaveBeenCalled();
  });

  it(`shouldn't send messages with only spaces`, () => {
    const textarea = queryTextarea();
    component.textareaValue = ' '; // single space
    textarea?.send.next();
    fixture.detectChanges();

    expect(sendMessageSpy).not.toHaveBeenCalled();
  });

  it(`should remove text if attachments are uploaded, but text contains only space characters`, () => {
    attachmentService.mapToAttachments.and.returnValue([
      {
        type: 'image',
        img_url: 'url',
      },
    ]);
    const textarea = queryTextarea();
    component.textareaValue = '    '; // multiple spaces
    textarea?.send.next();
    fixture.detectChanges();

    expect(sendMessageSpy).toHaveBeenCalledWith(
      '',
      jasmine.any(Array),
      jasmine.any(Object),
      undefined,
      undefined
    );
  });

  it('should set #canSendLinks', async () => {
    expect(component.canSendLinks).toBeTrue();

    mockActiveChannel$.next({
      data: { own_capabilities: [] },
      getConfig: () => ({ commands: [] }),
    } as any as Channel<DefaultStreamChatGenerics>);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.canSendLinks).toBeFalse();
  });

  it(`shouldn't send message if user can't send links, and message contains link`, () => {
    const message = 'This is my message with a link https://getstream.io/';
    component.textareaValue = message;
    component.canSendLinks = false;
    const notificationService = TestBed.inject(NotificationService);
    spyOn(notificationService, 'addTemporaryNotification');
    void component.messageSent();

    expect(sendMessageSpy).not.toHaveBeenCalled();
    expect(notificationService.addTemporaryNotification).toHaveBeenCalledWith(
      'streamChat.Sending links is not allowed in this conversation'
    );

    component.canSendLinks = true;
    void component.messageSent();

    expect(sendMessageSpy).toHaveBeenCalledWith(
      message,
      undefined,
      [],
      undefined,
      undefined
    );
  });

  it('should determine if message contains links', () => {
    component.textareaValue =
      'This is my message with a link https://getstream.io/';

    expect(component.containsLinks).toBeTrue();

    component.textareaValue = 'szuperaz@gmail.com';

    expect(component.containsLinks).toBeTrue();

    component.textareaValue = 'This is my webpage: malnamarket.io';

    expect(component.containsLinks).toBeTrue();

    component.textareaValue = 'Visit this page: www.facebook.com';

    expect(component.containsLinks).toBeTrue();

    component.textareaValue = 'HTTP://getstream.io';

    expect(component.containsLinks).toBeTrue();

    component.textareaValue = `This message doesn't contains a link HTTP www https .com`;

    expect(component.containsLinks).toBeFalse();
  });

  it('should set #canSendMessages', () => {
    expect(component.canSendMessages).toBeTrue();

    mockActiveChannel$.next({
      data: { own_capabilities: [] },
      getConfig: () => ({ commands: [] }),
    } as any as Channel<DefaultStreamChatGenerics>);

    expect(component.canSendMessages).toBeFalse();
  });

  it(`shouldn't display textarea component if user can't send messages`, () => {
    expect(queryTextarea()).toBeDefined();

    component.canSendMessages = false;
    fixture.detectChanges();

    expect(queryTextarea()).toBeUndefined();
  });

  it('should check uploaded attachments', async () => {
    const notificationService = TestBed.inject(NotificationService);
    spyOn(notificationService, 'addTemporaryNotification');
    appSettings$.next({
      file_upload_config: {
        allowed_file_extensions: [],
        allowed_mime_types: [],
      },
      image_upload_config: {
        allowed_file_extensions: [],
        allowed_mime_types: [],
      },
    });
    let files = [{ name: 'test.pdf', type: 'application/pdf' }];
    await component.filesSelected(files as any as FileList);

    expect(attachmentService.filesSelected).toHaveBeenCalledWith(files);

    attachmentService.filesSelected.calls.reset();
    appSettings$.next({
      file_upload_config: {
        blocked_file_extensions: ['.doc'],
      },
      image_upload_config: {
        blocked_mime_types: ['image/png'],
      },
    });
    files = [
      { name: 'test.pdf', type: 'application/pdf' },
      { name: 'test2.doc', type: 'application/msword' },
      { name: 'test3.png', type: 'image/png' },
    ];
    await component.filesSelected(files as any as FileList);

    expect(attachmentService.filesSelected).not.toHaveBeenCalled();
    expect(notificationService.addTemporaryNotification).toHaveBeenCalledTimes(
      2
    );

    attachmentService.filesSelected.calls.reset();
    (notificationService.addTemporaryNotification as jasmine.Spy).calls.reset();
    appSettings$.next({
      file_upload_config: {
        allowed_mime_types: ['application/msword'],
      },
      image_upload_config: {
        allowed_file_extensions: ['.jpg', '.png'],
      },
    });
    files = [
      { name: 'test.pdf', type: 'application/pdf' },
      { name: 'test2.doc', type: 'application/msword' },
      { name: 'test3.png', type: 'image/png' },
      { name: 'test4.txt', type: 'application/text' },
    ];
    await component.filesSelected(files as any as FileList);

    expect(attachmentService.filesSelected).not.toHaveBeenCalled();
    expect(notificationService.addTemporaryNotification).toHaveBeenCalledTimes(
      2
    );
  });

  it('should load app settings, if not yet loaded', async () => {
    const files = [{ name: 'test.pdf', type: 'application/pdf' }];
    await component.filesSelected(files as any as FileList);

    expect(getAppSettings).toHaveBeenCalledWith();
  });

  it('should send parent message id if in thread mode', async () => {
    component.mode = 'thread';
    mockActiveParentMessageId$.next('parent message');
    const message = 'This is my message';
    component.textareaValue = message;
    attachmentService.mapToAttachments.and.returnValue([]);
    const quotedMessage = mockMessage();
    quotedMessage.parent_id = 'parent-message';
    quotedMessage.id = 'message-to-quote';
    mockMessageToQuote$.next(quotedMessage);
    component.mentionedUsers = [];
    await component.messageSent();
    fixture.detectChanges();

    expect(sendMessageSpy).toHaveBeenCalledWith(
      message,
      [],
      [],
      'parent message',
      'message-to-quote'
    );

    expect(typingStoppedSpy).toHaveBeenCalledWith('parent message');
  });

  it(`shouldn't allow message send if in thread mode and "send-reply" capability is missing`, () => {
    expect(component.canSendMessages).toBeTrue();

    component.mode = 'thread';
    component.ngOnChanges({ mode: {} as SimpleChange });

    expect(component.canSendMessages).toBeFalse();

    mockActiveChannel$.next({
      data: { own_capabilities: ['send-message'] },
      getConfig: () => ({ commands: [] }),
    } as any as Channel<DefaultStreamChatGenerics>);

    expect(component.canSendMessages).toBeFalse();
  });

  it('should deselect quoted message, after message sent', async () => {
    const message = 'This is my message';
    component.textareaValue = message;
    attachmentService.mapToAttachments.and.returnValue([]);
    sendMessageSpy.and.resolveTo();
    mockMessageToQuote$.next(mockMessage());
    await component.messageSent();
    fixture.detectChanges();

    expect(selectMessageToQuoteSpy).toHaveBeenCalledWith(undefined);
  });

  it('should deselect quoted message, even if message send failed', async () => {
    const message = 'This is my message';
    component.textareaValue = message;
    attachmentService.mapToAttachments.and.returnValue([]);
    sendMessageSpy.and.rejectWith();
    mockMessageToQuote$.next(mockMessage());
    await component.messageSent();
    fixture.detectChanges();

    expect(selectMessageToQuoteSpy).toHaveBeenCalledWith(undefined);
  });

  it('should display quoted message', () => {
    const quotedMessageContainerSelector =
      '[data-testid="quoted-message-container"]';
    const message = mockMessage();
    message.attachments = [{ id: '1' }, { id: '2' }];
    mockMessageToQuote$.next(message);
    fixture.detectChanges();

    expect(
      nativeElement.querySelector(quotedMessageContainerSelector)
    ).not.toBeNull();
    const avatar = fixture.debugElement
      .query(By.css(quotedMessageContainerSelector))
      .query(By.directive(AvatarPlaceholderComponent))
      .componentInstance as AvatarPlaceholderComponent;
    const attachments = fixture.debugElement
      .query(By.css(quotedMessageContainerSelector))
      .query(By.directive(AttachmentListComponent))
      .componentInstance as AttachmentListComponent;

    expect(avatar.name).toBe(message.user!.name);
    expect(avatar.imageUrl).toBe(message.user!.image);
    expect(avatar.type).toBe('user');
    expect(avatar.location).toBe('quoted-message-sender');
    expect(avatar.user).toBe(message.user!);
    expect(attachments.attachments).toEqual([{ id: '1' }]);
    expect(
      nativeElement.querySelector('[data-testid="quoted-message-text"]')
        ?.innerHTML
    ).toContain(message.text);

    mockMessageToQuote$.next(undefined);
    fixture.detectChanges();

    expect(
      nativeElement.querySelector(quotedMessageContainerSelector)
    ).toBeNull();
  });

  it('should deselect message to quote when close button clicked', () => {
    mockMessageToQuote$.next(mockMessage());
    fixture.detectChanges();
    (
      nativeElement.querySelector(
        '[data-testid="remove-quote"]'
      ) as HTMLButtonElement
    )?.click();
    fixture.detectChanges();

    expect(selectMessageToQuoteSpy).toHaveBeenCalledWith(undefined);
  });

  it('should display message to quote in thread mode, but only if selected message is thread reply', () => {
    component.mode = 'thread';
    mockMessageToQuote$.next(mockMessage());
    fixture.detectChanges();
    const quotedMessageContainerSelector =
      '[data-testid="quoted-message-container"]';

    expect(
      nativeElement.querySelector(quotedMessageContainerSelector)
    ).toBeNull();

    const threadReply = mockMessage();
    threadReply.parent_id = 'parentId';
    mockMessageToQuote$.next(threadReply);
    fixture.detectChanges();

    expect(
      nativeElement.querySelector(quotedMessageContainerSelector)
    ).not.toBeNull();
  });

  it('should deselect message to quote in thread mode', () => {
    component.mode = 'thread';
    const threadReply = mockMessage();
    threadReply.parent_id = 'parentId';
    mockMessageToQuote$.next(threadReply);
    mockMessageToQuote$.next(undefined);

    expect(component.quotedMessage).toBeUndefined();
  });

  it('should send typing start events - main mode', () => {
    const textarea = queryTextarea();
    textarea?.valueChange.next('H');
    textarea?.valueChange.next('i');

    expect(typingStartedSpy).toHaveBeenCalledTimes(2);
  });

  it('should send typing start events - thread mode', () => {
    component.mode = 'thread';
    mockActiveParentMessageId$.next('parentMessage');
    fixture.detectChanges();
    const textarea = queryTextarea();
    textarea?.valueChange.next('H');

    expect(typingStartedSpy).toHaveBeenCalledWith('parentMessage');
  });

  it(`shouldn't activate cooldown for users without 'slow-mode' restriction`, () => {
    const channel = generateMockChannels(1)[0];
    channel.data!.own_capabilities = [];
    channel.data!.cooldown = 3;
    mockActiveChannel$.next(channel);
    latestMessageDateByUserByChannels$.next({
      [channel.cid]: new Date(),
    });

    expect(component.isCooldownInProgress).toBeFalse();
  });

  it('should activate cooldown timer', fakeAsync(() => {
    const channel = generateMockChannels(1)[0];
    channel.data!.own_capabilities = ['slow-mode'];
    channel.data!.cooldown = 30;
    mockActiveChannel$.next(channel);
    latestMessageDateByUserByChannels$.next({
      [channel.cid]: new Date(),
    });
    const spy = jasmine.createSpy();
    component.cooldown$?.subscribe(spy);
    tick(1);

    expect(spy).toHaveBeenCalledWith(30);

    tick(1000);

    expect(spy).toHaveBeenCalledWith(29);

    tick(1000);

    expect(spy).toHaveBeenCalledWith(28);

    spy.calls.reset();
    tick(28000);

    expect(spy).toHaveBeenCalledWith(0);

    discardPeriodicTasks();
  }));

  it(`shouldn't send message during cooldown`, fakeAsync(() => {
    const channel = generateMockChannels(1)[0];
    channel.data!.own_capabilities = ['slow-mode', 'send-message'];
    channel.data!.cooldown = 30;
    mockActiveChannel$.next(channel);
    latestMessageDateByUserByChannels$.next({
      [channel.cid]: new Date(),
    });
    fixture.detectChanges();

    const textareaComponent = queryTextarea();

    const message = 'This is my message';
    textareaComponent?.valueChange.emit(message);

    expect(sendMessageSpy).not.toHaveBeenCalled();
    expect(textareaComponent?.placeholder).toBe('streamChat.Slow Mode ON');

    discardPeriodicTasks();
  }));

  it('should not display emoji picker and file upload button during cooldown period', fakeAsync(() => {
    const channel = generateMockChannels(1)[0];
    channel.data!.own_capabilities = ['slow-mode', 'send-message'];
    channel.data!.cooldown = 30;
    mockActiveChannel$.next(channel);
    latestMessageDateByUserByChannels$.next({
      [channel.cid]: new Date(),
    });
    tick(1);
    fixture.detectChanges();

    expect(queryattachmentUploadButton()).toBeNull();
    expect(
      nativeElement.querySelector('[data-testid="emoji-picker"]')
    ).toBeNull();

    flush();
    discardPeriodicTasks();
  }));

  it('should display cooldown timer', fakeAsync(() => {
    const channel = generateMockChannels(1)[0];
    channel.data!.own_capabilities = ['slow-mode', 'send-message'];
    channel.data!.cooldown = 30;
    mockActiveChannel$.next(channel);
    latestMessageDateByUserByChannels$.next({
      [channel.cid]: new Date(),
    });
    fixture.detectChanges();
    tick(1);
    fixture.detectChanges();

    expect(queryCooldownTimer()).not.toBeNull();
    expect(queryCooldownTimer()?.innerHTML).toContain(30);

    discardPeriodicTasks();
  }));

  it('should discard cooldown timer after channel is chnaged', () => {
    component.isCooldownInProgress = true;
    const channel = generateMockChannels(1)[0];
    channel.data!.own_capabilities = ['slow-mode', 'send-message'];
    channel.data!.cooldown = 30;
    channel.cid = 'newchannel';
    mockActiveChannel$.next(channel);

    expect(component.isCooldownInProgress).toBeFalse();
  });

  it(`shouldn't start a cooldown if message was sent in another channel`, () => {
    const channel = generateMockChannels(1)[0];
    channel.data!.own_capabilities = ['slow-mode', 'send-message'];
    channel.data!.cooldown = 30;
    mockActiveChannel$.next(channel);
    latestMessageDateByUserByChannels$.next({
      [channel.cid + 'not']: new Date(),
    });

    expect(component.isCooldownInProgress).toBeFalse();
  });

  it('should display attachment previews', () => {
    const attachmentPreviews = queryAttachmentPreviewList();

    expect(attachmentPreviews).not.toBeUndefined();
    expect(attachmentPreviews.attachmentUploads$).toBe(
      attachmentService.attachmentUploads$
    );
  });

  it('should delete attachment', () => {
    const attachmentPreviews = queryAttachmentPreviewList();
    const upload = {
      file: { name: 'contract.pdf', type: 'application/pdf' } as File,
      state: 'success',
      url: 'url',
      type: 'file',
    } as AttachmentUpload;
    attachmentPreviews.deleteAttachment.next(upload);

    expect(attachmentService.deleteAttachment).toHaveBeenCalledWith(upload);
  });

  it('should retry attachment upload', () => {
    const attachmentPreviews = queryAttachmentPreviewList();
    const file = { name: 'my_image.png', type: 'image/png' } as File;
    attachmentPreviews.retryAttachmentUpload.next(file);

    expect(attachmentService.retryAttachmentUpload).toHaveBeenCalledWith(file);
  });

  it('should trigger message send by #sendMessage$', () => {
    const sendMessage$ = new Subject<void>();
    component.sendMessage$ = sendMessage$;
    component.ngOnChanges({ sendMessage$: {} as SimpleChange });
    sendMessage$.next();

    expect(component.messageSent).toHaveBeenCalledWith();
  });

  it('should trim leading and ending empty lines in message text', () => {
    component.textareaValue =
      'This is a multiline text\nthis should be left unchanged';
    void component.messageSent();
    //eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    let sentText = sendMessageSpy.calls.mostRecent().args[0];

    expect(sentText).toEqual(
      'This is a multiline text\nthis should be left unchanged'
    );

    component.textareaValue =
      '\n\nLeading and trailing empty \nlines should be removed\n\n';
    void component.messageSent();
    //eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    sentText = sendMessageSpy.calls.mostRecent().args[0];

    expect(sentText).toEqual(
      'Leading and trailing empty \nlines should be removed'
    );

    component.textareaValue =
      'Multiple empty line inside the message\n\n\nis allowed';
    void component.messageSent();
    //eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    sentText = sendMessageSpy.calls.mostRecent().args[0];

    expect(sentText).toEqual(
      'Multiple empty line inside the message\n\n\nis allowed'
    );
  });
});
