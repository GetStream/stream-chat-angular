import { SimpleChange } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { Channel, UserResponse } from 'stream-chat';
import { AttachmentUpload } from 'stream-chat-angular';
import { AttachmentService } from '../attachment.service';
import { ChannelService } from '../channel.service';
import { ChatClientService } from '../chat-client.service';
import { generateMockChannels, mockCurrentUser, mockMessage } from '../mocks';
import { NotificationService } from '../notification.service';
import { MessageInputComponent } from './message-input.component';

describe('MessageInputComponent', () => {
  let nativeElement: HTMLElement;
  let component: MessageInputComponent;
  let fixture: ComponentFixture<MessageInputComponent>;
  let queryTextarea: () => HTMLTextAreaElement | null;
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
        ],
      },
    });
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      declarations: [MessageInputComponent],
      providers: [
        {
          provide: ChannelService,
          useValue: {
            activeChannel$: mockActiveChannel$,
            sendMessage: sendMessageSpy,
            updateMessage: updateMessageSpy,
          },
        },
        {
          provide: ChatClientService,
          useValue: { chatClient: { user } },
        },
      ],
    });
    fixture = TestBed.createComponent(MessageInputComponent);
    component = fixture.componentInstance;
    spyOn(component, 'messageSent').and.callThrough();
    nativeElement = fixture.nativeElement as HTMLElement;
    queryTextarea = () =>
      nativeElement.querySelector('[data-testid="textarea"]');
    querySendButton = () =>
      nativeElement.querySelector('[data-testid="send-button"]');
    queryattachmentUploadButton = () =>
      nativeElement.querySelector('[data-testid="file-upload-button"]');
    queryFileInput = () =>
      nativeElement.querySelector('[data-testid="file-input"]');
    fixture.detectChanges();
  });

  it('should display textarea, and focus it', () => {
    const textarea = queryTextarea();

    expect(textarea).not.toBeNull();
    expect(textarea?.value).toBe('');
    expect(textarea?.hasAttribute('autofocus')).toBeTrue();
  });

  it('should send message if enter is hit', () => {
    const textarea = queryTextarea();
    const message = 'This is my message';
    textarea!.value = message;
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    spyOn(event, 'preventDefault');
    textarea?.dispatchEvent(event);
    fixture.detectChanges();

    expect(component.messageSent).toHaveBeenCalledWith(event);
    expect(event.preventDefault).toHaveBeenCalledWith();
  });

  it('should update message if enter is hit and #message is provided', () => {
    component.message = mockMessage();
    fixture.detectChanges();
    const textarea = queryTextarea();
    const message = 'This is my new message';
    textarea!.value = message;
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    spyOn(event, 'preventDefault');
    textarea?.dispatchEvent(event);
    fixture.detectChanges();

    expect(updateMessageSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({ id: component.message.id, text: message })
    );

    expect(event.preventDefault).toHaveBeenCalledWith();
  });

  it('should show error message if message update failed', async () => {
    const notificationService = TestBed.inject(NotificationService);
    spyOn(notificationService, 'addTemporaryNotification');
    const spy = jasmine.createSpy();
    component.messageUpdate.subscribe(spy);
    component.message = mockMessage();
    updateMessageSpy.and.rejectWith(new Error('Error'));
    await component.messageSent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(notificationService.addTemporaryNotification).toHaveBeenCalledWith(
      'streamChat.Edit message request failed'
    );

    expect(spy).not.toHaveBeenCalledWith();
  });

  it('should emit #messageUpdate event if message update was successful', async () => {
    component.message = mockMessage();
    const spy = jasmine.createSpy();
    component.messageUpdate.subscribe(spy);
    await component.messageSent(new KeyboardEvent('keydown', { key: 'Enter' }));

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

  it(`shouldn't send message if shift+enter is hit`, () => {
    const textarea = queryTextarea();
    textarea!.value = 'This is my message';
    textarea?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true })
    );
    fixture.detectChanges();

    expect(component.messageSent).not.toHaveBeenCalled();
  });

  it('should send message', () => {
    const message = 'This is my message';
    queryTextarea()!.value = message;
    attachmentService.mapToAttachments.and.returnValue([]);
    void component.messageSent();
    fixture.detectChanges();

    expect(sendMessageSpy).toHaveBeenCalledWith(message, []);
  });

  it('reset textarea after message is sent', () => {
    const textarea = queryTextarea();
    const message = 'This is my message';
    textarea!.value = message;
    void component.messageSent();
    fixture.detectChanges();

    expect(textarea?.value).toBe('');
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
    attachmentService.resetAttachmentUploads.and.returnValue([]);
    attachmentService.mapToAttachments.and.returnValue([]);
    await component.filesSelected(files as any as FileList);
    await component.messageSent();
    await component.messageSent();

    expect(sendMessageSpy).toHaveBeenCalledWith(jasmine.any(String), []);
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
      attachments
    );
  });

  it('should handle channel change', () => {
    const input = queryTextarea()!;
    attachmentService.attachmentUploads$.next([
      {
        file: { name: 'img.png' } as any as File,
        state: 'uploading',
        type: 'image',
      },
    ]);
    input.value = 'text';
    mockActiveChannel$.next({} as Channel);
    fixture.detectChanges();

    expect(input.value).toBe('');
    expect(attachmentService.resetAttachmentUploads).toHaveBeenCalledWith();
  });

  it('should accept #message as input', () => {
    component.message = mockMessage();
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
});
