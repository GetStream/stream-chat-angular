import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
import { Channel, UserResponse } from 'stream-chat';
import { AttachmentUpload } from 'stream-chat-angular';
import { ChannelService } from '../channel.service';
import { ChatClientService } from '../chat-client.service';
import { generateMockChannels, mockCurrentUser } from '../mocks';
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
  let queryImagePreviews: () => HTMLElement[];
  let queryLoadingIndicators: () => HTMLElement[];
  let queryPreviewImages: () => HTMLImageElement[];
  let queryPreviewFiles: () => HTMLElement[];
  let mockActiveChannel$: BehaviorSubject<Channel>;
  let sendMessageSpy: jasmine.Spy;
  let uploadAttachmentsSpy: jasmine.Spy;
  let deleteAttachmentSpy: jasmine.Spy;
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
    deleteAttachmentSpy = jasmine.createSpy();
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
            deleteAttachment: deleteAttachmentSpy,
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
    queryImagePreviews = () =>
      Array.from(
        nativeElement.querySelectorAll(
          '[data-testclass="attachment-image-preview"]'
        )
      );
    queryLoadingIndicators = () =>
      Array.from(
        nativeElement.querySelectorAll('[data-testclass="loading-indicator"]')
      );
    queryPreviewImages = () =>
      Array.from(
        nativeElement.querySelectorAll('[data-testclass="attachment-image"]')
      );
    queryPreviewFiles = () =>
      Array.from(
        nativeElement.querySelectorAll(
          '[data-testclass="attachment-file-preview"]'
        )
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
    expect(queryattachmentUploadButton()).not.toBeNull();
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

  it('should upload files', fakeAsync(() => {
    const imageFiles = [{ type: 'image/png' }, { type: 'image/jpg' }];
    const dataFiles = [
      { type: 'image/vnd.adobe.photoshop' },
      { type: 'plain/text' },
    ];
    const files = [...imageFiles, ...dataFiles];
    uploadAttachmentsSpy.and.resolveTo([
      { file: imageFiles[0], state: 'success', url: 'url1', type: 'image' },
      { file: imageFiles[1], state: 'success', url: 'url2', type: 'image' },
      { file: dataFiles[0], state: 'success', url: 'url3', type: 'file' },
      { file: dataFiles[1], state: 'success', url: 'url4', type: 'file' },
    ]);
    void component.filesSelected(files as any as FileList);

    expect(uploadAttachmentsSpy).toHaveBeenCalledWith([
      { file: imageFiles[0], type: 'image', state: 'uploading' },
      { file: imageFiles[1], type: 'image', state: 'uploading' },
      { file: dataFiles[0], type: 'file', state: 'uploading' },
      { file: dataFiles[1], type: 'file', state: 'uploading' },
    ]);

    tick();

    expect(deleteAttachmentSpy).not.toHaveBeenCalled();
    expect(queryFileInput()?.value).toBe('');
  }));

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
    const file1 = { name: 'my_image.png', type: 'image/png' };
    const file2 = {
      name: 'homework.pdf',
      type: 'application/pdf',
      size: 3272969,
    };
    uploadAttachmentsSpy.and.resolveTo([
      { file: file1, state: 'success', url: 'url/to/image', type: 'image' },
      { file: file2, state: 'success', url: 'url/to/pdf', type: 'file' },
    ]);
    await component.filesSelected([file1, file2] as any as FileList);
    void component.messageSent();

    expect(sendMessageSpy).toHaveBeenCalledWith(jasmine.any(String), [
      { fallback: 'my_image.png', image_url: 'url/to/image', type: 'image' },
      {
        title: 'homework.pdf',
        asset_url: 'url/to/pdf',
        type: 'file',
        file_size: 3272969,
      },
    ]);
  });

  it('should be able to upload files in multiple steps', async () => {
    const file1 = { name: 'my_image.png', type: 'image/png' } as File;
    uploadAttachmentsSpy.and.resolveTo([
      { file: file1, state: 'success', url: 'url/to/image', type: 'image' },
    ]);
    await component.filesSelected([file1] as any as FileList);

    expect(component.attachmentUploads).toEqual([
      { file: file1, state: 'success', url: 'url/to/image', type: 'image' },
    ]);

    const file2 = { name: 'my_image2.png', type: 'image/png' } as File;
    uploadAttachmentsSpy.and.resolveTo([
      { file: file2, state: 'success', url: 'url/to/image2' },
    ]);
    await component.filesSelected([file2] as any as FileList);

    expect(component.attachmentUploads).toEqual([
      { file: file1, state: 'success', url: 'url/to/image', type: 'image' },
      { file: file2, state: 'success', url: 'url/to/image2', type: 'image' },
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
      { name: 'note.txt', type: 'plain/text' },
    ] as any as FileList);
    fixture.detectChanges();
    const previews = queryImagePreviews();

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
    const previews = queryImagePreviews();

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
    const previews = queryImagePreviews();

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

  it('should display file preview - uploading', () => {
    void component.filesSelected([
      { name: 'my_image2.png', type: 'image/png' },
      { name: 'note.txt', type: 'plain/text' },
    ] as any as FileList);
    fixture.detectChanges();
    const filePreviews = queryPreviewFiles();

    expect(queryImagePreviews().length).toBe(1);
    expect(filePreviews.length).toBe(1);
    filePreviews.forEach((p) =>
      // eslint-disable-next-line jasmine/new-line-before-expect
      expect(
        p.querySelector('.rfu-file-previewer__file--uploading')
      ).not.toBeNull()
    );
  });

  it('should display file preview - success', () => {
    const fileName = 'note.txt';
    const url = 'url/to/download';
    component.attachmentUploads = [
      {
        file: { name: fileName, type: 'plain/text' } as File,
        state: 'success',
        url,
        type: 'file',
      },
    ];
    fixture.detectChanges();
    const filePreviews = queryPreviewFiles();

    filePreviews.forEach((p) => {
      /* eslint-disable jasmine/new-line-before-expect */
      expect(
        p.querySelector('.rfu-file-previewer__file--uploading')
      ).toBeNull();
      expect(p.innerHTML).toContain(url);
      expect(p.innerHTML).toContain(fileName);
      /* eslint-enable jasmine/new-line-before-expect */
    });
  });

  it('should display file preview - error', () => {
    component.attachmentUploads = [
      {
        file: { name: 'note.txt', type: 'plain/text' } as File,
        state: 'success',
        url: 'url',
        type: 'file',
      },
      {
        file: { name: 'contract.pdf', type: 'application/pdf' } as File,
        state: 'error',
        type: 'file',
      },
    ];
    fixture.detectChanges();
    const filePreviews = queryPreviewFiles();

    expect(
      filePreviews[0].querySelector('.rfu-file-previewer__file--failed')
    ).toBeNull();

    expect(
      filePreviews[1].querySelector('.rfu-file-previewer__file--failed')
    ).not.toBeNull();
  });

  it('should display attachment url or preview', () => {
    const file = { name: 'my_image.png', type: 'image/png' } as File;
    const previewUri = 'data:...';
    component.attachmentUploads = [
      { file, state: 'uploading', previewUri, type: 'image' },
    ];
    fixture.detectChanges();
    const previewImage = queryPreviewImages()[0];

    expect(previewImage.src).toContain(previewUri);

    const url = 'url/to/img';
    component.attachmentUploads = [
      { file, state: 'success', url, type: 'image' },
    ];
    fixture.detectChanges();

    expect(previewImage.src).toContain(url);
  });

  it('should retry file upload', () => {
    const upload = {
      file: { name: 'contract.pdf', type: 'application/pdf' } as File,
      state: 'error',
      type: 'file',
    } as AttachmentUpload;
    component.attachmentUploads = [upload];
    fixture.detectChanges();
    const filePreviews = queryPreviewFiles();
    const retryButton = filePreviews[0].querySelector(
      '[data-testclass="file-upload-retry"]'
    ) as HTMLButtonElement;
    spyOn(component, 'retryAttachmentUpload');
    retryButton.click();
    fixture.detectChanges();

    expect(component.retryAttachmentUpload).toHaveBeenCalledWith(upload.file);
  });

  it('should delete file', () => {
    const upload = {
      file: { name: 'contract.pdf', type: 'application/pdf' } as File,
      state: 'success',
      url: 'url',
      type: 'file',
    } as AttachmentUpload;
    component.attachmentUploads = [upload];
    fixture.detectChanges();
    const filePreviews = queryPreviewFiles();
    const deleteButton = filePreviews[0].querySelector(
      '[data-testclass="file-delete"]'
    ) as HTMLButtonElement;
    spyOn(component, 'deleteAttachment');
    deleteButton.click();
    fixture.detectChanges();

    expect(component.deleteAttachment).toHaveBeenCalledWith(upload);
  });

  it('should retry attachment upload', async () => {
    const file = { name: 'my_image.png', type: 'image/png' } as File;
    uploadAttachmentsSpy.and.resolveTo([
      { file, state: 'error', type: 'file' },
    ]);
    await component.filesSelected([file] as any as FileList);
    fixture.detectChanges();
    const retryButton = queryImagePreviews()[0].querySelector(
      '[data-testclass="upload-error"]'
    ) as HTMLButtonElement;
    uploadAttachmentsSpy.and.resolveTo([
      { file, state: 'success', url: 'image/url', type: 'image' },
    ]);
    retryButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.attachmentUploads).toEqual([
      { file, state: 'success', url: 'image/url', type: 'image' },
    ]);
  });

  it('should download file, if upload was successful', () => {
    const upload = {
      file: { name: 'contract.pdf', type: 'application/pdf' } as File,
      state: 'success',
      url: 'url/to/file',
      type: 'file',
    } as AttachmentUpload;
    component.attachmentUploads = [upload];
    fixture.detectChanges();
    const link = queryPreviewFiles()[0].querySelector(
      '[data-testclass="file-download-link"]'
    ) as HTMLAnchorElement;
    const event = new KeyboardEvent('click');
    spyOn(event, 'preventDefault');
    link.dispatchEvent(event);
    fixture.detectChanges();

    expect(link.hasAttribute('download')).toBeTrue();
    expect(event.preventDefault).not.toHaveBeenCalledWith();
  });

  it(`shouldn't download file, if upload wasn't successful`, () => {
    const upload = {
      file: { name: 'contract.pdf', type: 'application/pdf' } as File,
      state: 'error',
      type: 'file',
    } as AttachmentUpload;
    component.attachmentUploads = [upload];
    fixture.detectChanges();
    const link = queryPreviewFiles()[0].querySelector(
      '[data-testclass="file-download-link"]'
    ) as HTMLAnchorElement;
    const event = new KeyboardEvent('click');
    spyOn(event, 'preventDefault');
    link.dispatchEvent(event);
    fixture.detectChanges();

    expect(event.preventDefault).toHaveBeenCalledWith();
  });

  it('should handle channel change', () => {
    const input = queryTextarea()!;
    component.attachmentUploads = [
      {
        file: { name: 'img.png' } as any as File,
        state: 'uploading',
        type: 'image',
      },
    ];
    input.value = 'text';
    mockActiveChannel$.next({} as Channel);
    fixture.detectChanges();

    expect(input.value).toBe('');
    expect(component.attachmentUploads).toEqual([]);
  });

  it('should delete attachment, if file is already uploaded', async () => {
    const url = 'url/to/img';
    const attachmentUpload = {
      file: { name: 'myimage.jpg' } as any as File,
      state: 'success',
      type: 'image',
      url,
    };
    component.attachmentUploads = [attachmentUpload as AttachmentUpload];
    fixture.detectChanges();
    const preview = queryImagePreviews()[0];
    const deleteButton = preview.querySelector(
      '[data-testclass="delete-attachment"]'
    ) as HTMLButtonElement;
    deleteButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(deleteAttachmentSpy).toHaveBeenCalledWith(attachmentUpload);
    expect(component.attachmentUploads).toEqual([]);
  });

  it('should delete attachment, if file is uploading', async () => {
    component.attachmentUploads = [
      {
        file: { name: 'myimage.jpg' } as any as File,
        type: 'image',
        state: 'uploading',
      },
    ];
    fixture.detectChanges();
    const preview = queryImagePreviews()[0];
    const deleteButton = preview.querySelector(
      '[data-testclass="delete-attachment"]'
    ) as HTMLButtonElement;
    deleteButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.attachmentUploads).toEqual([]);
    expect(queryImagePreviews().length).toBe(0);
  });

  it(`shouldn't delete preview, if attachment couldn't be deleted`, async () => {
    component.attachmentUploads = [
      {
        file: { name: 'myimage.jpg' } as any as File,
        state: 'success',
        type: 'image',
        url: 'url/to/img',
      },
    ];
    fixture.detectChanges();
    deleteAttachmentSpy.and.rejectWith(new Error('error'));
    const preview = queryImagePreviews()[0];
    const deleteButton = preview.querySelector(
      '[data-testclass="delete-attachment"]'
    ) as HTMLButtonElement;
    deleteButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(preview).not.toBeNull();
  });

  it('should remove deleted attachments after upload', fakeAsync(() => {
    const file = { name: 'my_image.png', type: 'image/png' } as File;
    const url = 'url/to/image';
    uploadAttachmentsSpy.and.resolveTo([
      { file, state: 'success', url, type: 'image' },
    ]);
    void component.filesSelected([file] as any as FileList);
    component.attachmentUploads = [];
    tick();

    expect(deleteAttachmentSpy).toHaveBeenCalledWith({
      file,
      state: 'success',
      url,
      type: 'image',
    });
  }));

  it('should display error message, if upload was unsuccessful', async () => {
    const image = { name: 'my_image.png', type: 'image/png' } as File;
    const file = { name: 'user_guide.pdf', type: 'application/pdf' } as File;
    uploadAttachmentsSpy.and.resolveTo([
      { file: image, state: 'error', type: 'image' },
      { file, state: 'error', type: 'file' },
    ]);
    const notificationService = TestBed.inject(NotificationService);
    spyOn(notificationService, 'addTemporaryNotification');
    await component.filesSelected([image, file] as any as FileList);

    expect(notificationService.addTemporaryNotification).toHaveBeenCalledWith(
      'Error uploading image'
    );

    expect(notificationService.addTemporaryNotification).toHaveBeenCalledWith(
      'Error uploading file'
    );
  });
});
