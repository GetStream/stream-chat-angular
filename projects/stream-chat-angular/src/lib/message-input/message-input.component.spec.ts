import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
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
  let queryPreviews: () => HTMLElement[];
  let queryLoadingIndicators: () => HTMLElement[];
  let queryPreviewImages: () => HTMLImageElement[];
  let mockActiveChannel$: BehaviorSubject<Channel>;
  let sendMessageSpy: jasmine.Spy;
  let uploadAttachmentsSpy: jasmine.Spy;
  let channel: Channel;
  let user: UserResponse;

  beforeEach(() => {
    spyOn(window, 'FileReader').and.returnValue({
      onload: jasmine.createSpy(),
      readAsDataURL: jasmine.createSpy(),
    } as any as FileReader);
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
    queryPreviews = () =>
      Array.from(
        nativeElement.querySelectorAll('[data-testclass="attachment-preview"]')
      );
    queryLoadingIndicators = () =>
      Array.from(
        nativeElement.querySelectorAll('[data-testclass="loading-indicator"]')
      );
    queryPreviewImages = () =>
      Array.from(
        nativeElement.querySelectorAll('[data-testclass="attachment-image"]')
      );
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

  it('should filter and upload files', () => {
    const imageFiles = [{ type: 'image/png' }, { type: 'image/jpg' }];
    const files = [
      ...imageFiles,
      { type: 'image/vnd.adobe.photoshop' },
      { type: 'plain/text' },
    ];
    void component.filesSelected(files as any as FileList);

    expect(uploadAttachmentsSpy).toHaveBeenCalledWith(imageFiles);
    expect(queryFileInput()?.value).toBe('');
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

  it(`shouldn't send message, if file uploads are in progress`, async () => {
    uploadAttachmentsSpy.and.resolveTo([]);
    void component.filesSelected([{ type: 'image/png' }] as any as FileList);
    await component.messageSent();

    expect(sendMessageSpy).not.toHaveBeenCalled();
  });

  it(`shouldn't send message, if file uploads are in progress - multiple uploads`, fakeAsync(() => {
    uploadAttachmentsSpy.and.resolveTo([]);
    void component.filesSelected([{ type: 'image/png' }] as any as FileList);
    uploadAttachmentsSpy.and.returnValue(new Promise(() => {}));
    void component.filesSelected([{ type: 'image/png' }] as any as FileList);
    tick();
    void component.messageSent();

    expect(sendMessageSpy).not.toHaveBeenCalled();
  }));

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

  it('should be able to upload files in multiple steps', async () => {
    const file1 = { name: 'my_image.png', type: 'image/png' } as File;
    uploadAttachmentsSpy.and.resolveTo([
      { file: file1, state: 'success', url: 'url/to/image' },
    ]);
    await component.filesSelected([file1] as any as FileList);

    expect(component.fileUploads).toEqual([
      { file: file1, state: 'success', url: 'url/to/image' },
    ]);

    const file2 = { name: 'my_image2.png', type: 'image/png' } as File;
    uploadAttachmentsSpy.and.resolveTo([
      { file: file2, state: 'success', url: 'url/to/image2' },
    ]);
    await component.filesSelected([file2] as any as FileList);

    expect(component.fileUploads).toEqual([
      { file: file1, state: 'success', url: 'url/to/image' },
      { file: file2, state: 'success', url: 'url/to/image2' },
    ]);

    await component.messageSent();

    expect(sendMessageSpy).toHaveBeenCalledWith(jasmine.any(String), [
      { fallback: 'my_image.png', image_url: 'url/to/image', type: 'image' },
      { fallback: 'my_image2.png', image_url: 'url/to/image2', type: 'image' },
    ]);
  });

  it('should display image preview - uploading', () => {
    void component.filesSelected([
      { name: 'my_image.png', type: 'image/png' },
      { name: 'my_image2.png', type: 'image/png' },
    ] as any as FileList);
    fixture.detectChanges();
    const previews = queryPreviews();

    expect(previews.length).toBe(2);
    expect(queryLoadingIndicators().length).toBe(2);
    previews.forEach((p) =>
      // eslint-disable-next-line jasmine/new-line-before-expect
      expect(
        p.classList.contains('rfu-image-previewer__image--loaded')
      ).toBeFalse()
    );
  });

  it('should display image preview - success', async () => {
    const file = { name: 'my_image.png', type: 'image/png' } as File;
    uploadAttachmentsSpy.and.resolveTo([
      { file, state: 'success', url: 'url/to/image' },
    ]);
    await component.filesSelected([file] as any as FileList);
    fixture.detectChanges();
    const previews = queryPreviews();

    expect(previews.length).toBe(1);
    expect(queryLoadingIndicators().length).toBe(0);
    previews.forEach((p) =>
      // eslint-disable-next-line jasmine/new-line-before-expect
      expect(
        p.classList.contains('rfu-image-previewer__image--loaded')
      ).toBeTrue()
    );
  });

  it('should display image preview - error', async () => {
    const file1 = { name: 'my_image.png', type: 'image/png' } as File;
    const file2 = { name: 'my_image2.png', type: 'image/png' } as File;
    uploadAttachmentsSpy.and.resolveTo([
      { file: file1, state: 'success', url: 'url/to/image' },
      { file: file2, state: 'error' },
    ]);
    await component.filesSelected([file1, file2] as any as FileList);
    fixture.detectChanges();
    const previews = queryPreviews();

    expect(
      previews[0].classList.contains('rfu-image-previewer__image--loaded')
    ).toBeTrue();

    expect(
      previews[0].querySelector('[data-testclass="upload-error"]')
    ).toBeNull();

    expect(
      previews[1].querySelector('[data-testclass="upload-error"]')
    ).not.toBeNull();
  });

  it('should display attachment url or preview', () => {
    const file = { name: 'my_image.png', type: 'image/png' } as File;
    const previewUri = 'data:...';
    component.fileUploads = [{ file, state: 'uploading', previewUri }];
    fixture.detectChanges();
    const previewImage = queryPreviewImages()[0];

    expect(previewImage.src).toContain(previewUri);

    const url = 'url/to/img';
    component.fileUploads = [{ file, state: 'success', url }];
    fixture.detectChanges();

    expect(previewImage.src).toContain(url);
  });

  it('should retry file upload', async () => {
    const file = { name: 'my_image.png', type: 'image/png' } as File;
    uploadAttachmentsSpy.and.resolveTo([{ file, state: 'error' }]);
    await component.filesSelected([file] as any as FileList);
    fixture.detectChanges();
    const retryButton = queryPreviews()[0].querySelector(
      '[data-testclass="upload-error"]'
    ) as HTMLButtonElement;
    uploadAttachmentsSpy.and.resolveTo([
      { file, state: 'success', url: 'image/url' },
    ]);
    retryButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.fileUploads).toEqual([
      { file, state: 'success', url: 'image/url' },
    ]);
  });

  it('should handle channel change', () => {
    const input = queryTextarea()!;
    component.fileUploads = [
      { file: { name: 'img.png' } as any as File, state: 'uploading' },
    ];
    input.value = 'text';
    mockActiveChannel$.next({} as Channel);
    fixture.detectChanges();

    expect(input.value).toBe('');
    expect(component.fileUploads).toEqual([]);
  });
});
