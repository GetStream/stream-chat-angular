import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
import { Channel, UserResponse } from 'stream-chat';
import { ChannelService } from '../channel.service';
import { ChatClientService } from '../chat-client.service';
import { generateMockChannels, mockCurrentUser } from '../mocks';
import { MessageInputComponent } from './message-input.component';

describe('MessageInputComponent', () => {
  let nativeElement: HTMLElement;
  let component: MessageInputComponent;
  let fixture: ComponentFixture<MessageInputComponent>;
  let queryTextarea: () => HTMLTextAreaElement | null;
  let querySendButton: () => HTMLButtonElement | null;
  let queryFileUploadButton: () => HTMLElement | null;
  let queryFileInput: () => HTMLInputElement | null;
  let mockActiveChannel$: BehaviorSubject<Channel>;
  let sendMessageSpy: jasmine.Spy;
  let uploadAttachmentsSpy: jasmine.Spy;
  let channel: Channel;
  let user: UserResponse;

  beforeEach(() => {
    channel = generateMockChannels(1)[0];
    mockActiveChannel$ = new BehaviorSubject(channel);
    user = mockCurrentUser();
    sendMessageSpy = jasmine.createSpy();
    uploadAttachmentsSpy = jasmine.createSpy();
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      declarations: [MessageInputComponent],
      providers: [
        {
          provide: ChannelService,
          useValue: {
            activeChannel$: mockActiveChannel$,
            sendMessage: sendMessageSpy,
            uploadAttachments: uploadAttachmentsSpy,
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
    queryFileUploadButton = () =>
      nativeElement.querySelector('[data-testid="file-upload-button"]');
    queryFileInput = () =>
      nativeElement.querySelector('[data-testid="file-input"]');
    fixture.detectChanges();
  });

  it('should display textarea, and focus it', () => {
    const textarea = queryTextarea();

    expect(textarea).not.toBeNull();
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

  it('should display file upload button, if #isFileUploadEnabled is true', () => {
    expect(queryFileUploadButton()).not.toBeNull();
  });

  it(`shouldn't display file upload button, if #isFileUploadEnabled is false`, () => {
    component.isFileUploadEnabled = false;
    fixture.detectChanges();

    expect(queryFileUploadButton()).toBeNull();
  });

  it('should set the accepted file types', () => {
    const accepted = ['.jpg', '.png'];
    component.acceptedFileTypes = accepted;
    fixture.detectChanges();
    const fileUpload = queryFileInput();

    expect(fileUpload?.getAttribute('accept')).toBe(accepted.join(','));
  });

  it('should accept every file type if #acceptedFileTypes not provided', () => {
    const fileUpload = queryFileInput();

    expect(fileUpload?.getAttribute('accept')).toBe('');
  });

  it('should set multiple attribute on file upload', () => {
    const fileUpload = queryFileInput();

    expect(fileUpload?.hasAttribute('multiple')).toBeTrue();

    component.isMultipleFileUploadEnabled = false;
    fixture.detectChanges();

    expect(fileUpload?.hasAttribute('multiple')).toBeFalse();
  });

  it('should filter and upload files', async () => {
    const imageFiles = [{ type: 'image/png' }, { type: 'image/jpg' }];
    const files = [
      ...imageFiles,
      { type: 'image/vnd.adobe.photoshop' },
      { type: 'plain/text' },
    ];
    await component.filesSelected(files as any as FileList);

    expect(uploadAttachmentsSpy).toHaveBeenCalledWith(imageFiles);
  });

  it('should reset files, after message is sent', async () => {
    const file = { name: 'my_image.png', type: 'image/png' };
    uploadAttachmentsSpy.and.resolveTo([
      { file, state: 'success', url: 'url/to/image' },
    ]);
    const files = [file];
    await component.filesSelected(files as any as FileList);
    await component.messageSent();
    await component.messageSent();

    expect(sendMessageSpy).toHaveBeenCalledWith(jasmine.any(String), []);
  });

  it(`shouln't send message, if file uploads are in progress`, async () => {
    uploadAttachmentsSpy.and.resolveTo([]);
    void component.filesSelected([{ type: 'image/png' }] as any as FileList);
    await component.messageSent();

    expect(sendMessageSpy).not.toHaveBeenCalled();
  });

  it(`should send message, if file uploads are completed`, async () => {
    const file = { name: 'my_image.png', type: 'image/png' };
    uploadAttachmentsSpy.and.resolveTo([
      { file, state: 'success', url: 'url/to/image' },
    ]);
    await component.filesSelected([file] as any as FileList);
    void component.messageSent();

    expect(sendMessageSpy).toHaveBeenCalledWith(jasmine.any(String), [
      { fallback: 'my_image.png', image_url: 'url/to/image', type: 'image' },
    ]);
  });
});
