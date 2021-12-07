import { CUSTOM_ELEMENTS_SCHEMA, SimpleChange } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { Channel, UserResponse } from 'stream-chat';
import { AttachmentService } from '../attachment.service';
import { ChannelService } from '../channel.service';
import { ChatClientService } from '../chat-client.service';
import { textareaInjectionToken } from '../injection-tokens';
import { generateMockChannels, mockCurrentUser, mockMessage } from '../mocks';
import { NotificationService } from '../notification.service';
import { AttachmentUpload } from '../types';
import { MessageInputComponent } from './message-input.component';
import { TextareaDirective } from './textarea.directive';
import { AutocompleteTextareaComponent } from './autocomplete-textarea/autocomplete-textarea.component';

describe('MessageInputComponent', () => {
  let nativeElement: HTMLElement;
  let component: MessageInputComponent;
  let fixture: ComponentFixture<MessageInputComponent>;
  let queryTextarea: () => AutocompleteTextareaComponent | null;
  let querySendButton: () => HTMLButtonElement | null;
  let queryattachmentUploadButton: () => HTMLElement | null;
  let queryFileInput: () => HTMLInputElement | null;
  let mockActiveChannel$: BehaviorSubject<Channel>;
  let sendMessageSpy: jasmine.Spy;
  let updateMessageSpy: jasmine.Spy;
  let channel: Channel;
  let user: UserResponse;
  let attachmentService: {
    attachmentUploadInProgressCounter$: Subject<number>;
    attachmentUploads$: Subject<AttachmentUpload[]>;
    resetAttachmentUploads: jasmine.Spy;
    filesSelected: jasmine.Spy;
    mapToAttachments: jasmine.Spy;
    createFromAttachments: jasmine.Spy;
  };

  beforeEach(() => {
    channel = generateMockChannels(1)[0];
    mockActiveChannel$ = new BehaviorSubject(channel);
    user = mockCurrentUser();
    sendMessageSpy = jasmine.createSpy();
    updateMessageSpy = jasmine.createSpy();
    attachmentService = {
      resetAttachmentUploads: jasmine.createSpy(),
      attachmentUploadInProgressCounter$: new BehaviorSubject(0),
      attachmentUploads$: new BehaviorSubject<AttachmentUpload[]>([]),
      filesSelected: jasmine.createSpy(),
      mapToAttachments: jasmine.createSpy(),
      createFromAttachments: jasmine.createSpy(),
    };
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
      ],
      providers: [
        {
          provide: ChannelService,
          useValue: {
            activeChannel$: mockActiveChannel$,
            sendMessage: sendMessageSpy,
            updateMessage: updateMessageSpy,
            autocompleteMembers: jasmine.createSpy().and.resolveTo([]),
          },
        },
        {
          provide: ChatClientService,
          useValue: { chatClient: { user } },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    });
    fixture = TestBed.createComponent(MessageInputComponent);
    component = fixture.componentInstance;
    spyOn(component, 'messageSent').and.callThrough();
    nativeElement = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    queryTextarea = () =>
      fixture.debugElement.query(By.directive(AutocompleteTextareaComponent))
        ?.componentInstance as AutocompleteTextareaComponent;
    querySendButton = () =>
      nativeElement.querySelector('[data-testid="send-button"]');
    queryattachmentUploadButton = () =>
      nativeElement.querySelector('[data-testid="file-upload-button"]');
    queryFileInput = () =>
      nativeElement.querySelector('[data-testid="file-input"]');
  });

  it('should display textarea', () => {
    component.textareaValue = 'Hi';
    component.areMentionsEnabled = true;
    fixture.detectChanges();
    const textarea = queryTextarea();

    expect(textarea?.value).toEqual('Hi');
    expect(textarea?.areMentionsEnabled).toBeTrue();

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

  it('should emit #messageUpdate event if message update was successful', async () => {
    component.message = mockMessage();
    component.ngOnChanges({ message: {} as any as SimpleChange });
    fixture.detectChanges();
    const spy = jasmine.createSpy();
    component.messageUpdate.subscribe(spy);
    await component.messageSent();

    expect(spy).toHaveBeenCalledWith(undefined);
  });

  it('should send message if button is clicked', () => {
    const textarea = queryTextarea();
    const message = 'This is my message';
    textarea!.value = message;
    querySendButton()?.click();
    fixture.detectChanges();

    expect(component.messageSent).toHaveBeenCalledWith();
  });

  it('should send message', () => {
    const message = 'This is my message';
    component.textareaValue = message;
    attachmentService.mapToAttachments.and.returnValue([]);
    const mentionedUsers = [{ id: 'john', name: 'John' }];
    component.mentionedUsers = mentionedUsers;
    void component.messageSent();
    fixture.detectChanges();

    expect(sendMessageSpy).toHaveBeenCalledWith(message, [], mentionedUsers);
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
    } as any as Channel);
    fixture.detectChanges();

    expect(queryattachmentUploadButton()).toBeNull();
  });

  it(`shouldn't display file upload button, if #isFileUploadEnabled is false`, () => {
    component.isFileUploadEnabled = false;
    fixture.detectChanges();

    expect(queryattachmentUploadButton()).toBeNull();
  });

  it('should set the accepted file types', () => {
    const accepted = ['.jpg', '.png'];
    component.acceptedFileTypes = accepted;
    fixture.detectChanges();
    const attachmentUpload = queryFileInput();

    expect(attachmentUpload?.getAttribute('accept')).toBe(accepted.join(','));
  });

  it('should accept every file type if #acceptedFileTypes not provided', () => {
    const attachmentUpload = queryFileInput();

    expect(attachmentUpload?.getAttribute('accept')).toBe('');
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
      { file, state: 'success', url: 'url/to/image' },
    ]);
    const files = [file];
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
      { file: file1, state: 'success', url: 'url/to/image', type: 'image' },
      { file: file2, state: 'success', url: 'url/to/pdf', type: 'file' },
    ]);
    const attachments = [
      { fallback: 'my_image.png', image_url: 'url/to/image', type: 'image' },
      {
        title: 'homework.pdf',
        asset_url: 'url/to/pdf',
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
      []
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
    mockActiveChannel$.next({} as Channel);
    fixture.detectChanges();

    expect(component.textareaValue).toBe('');
    expect(attachmentService.resetAttachmentUploads).toHaveBeenCalledWith();
  });

  it('should accept #message as input', () => {
    component.message = mockMessage();
    component.ngOnChanges({ message: {} as any as SimpleChange });
    fixture.detectChanges();

    expect(queryTextarea()?.value).toBe(component.message.text);
  });

  it('should display attachments of #message', () => {
    const attachments = [
      { fallback: 'flower.png', image_url: 'url/to/img', type: 'image' },
      {
        title: 'note.txt',
        file_size: 3272969,
        asset_url: 'url/to/data',
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

  it('should apply CSS class if attachments are present', () => {
    const cssClass = 'str-chat__input-flat-has-attachments';

    expect(nativeElement.querySelector(`.${cssClass}`)).toBeNull();

    attachmentService.attachmentUploads$.next([{} as any as AttachmentUpload]);
    fixture.detectChanges();

    expect(nativeElement.querySelector(`.${cssClass}`)).not.toBeNull();
  });

  it('should set #canSendLinks', async () => {
    expect(component.canSendLinks).toBeTrue();

    mockActiveChannel$.next({
      data: { own_capabilities: [] },
    } as any as Channel);
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

    expect(sendMessageSpy).toHaveBeenCalledWith(message, undefined, []);
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
    } as any as Channel);

    expect(component.canSendMessages).toBeFalse();
  });

  it(`shouldn't display textarea component if user can't send messages`, () => {
    expect(queryTextarea()).toBeDefined();

    component.canSendMessages = false;
    fixture.detectChanges();

    expect(queryTextarea()).toBeUndefined();
  });
});
