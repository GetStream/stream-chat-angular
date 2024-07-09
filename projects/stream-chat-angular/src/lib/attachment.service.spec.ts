import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { first } from 'rxjs/operators';
import { AppSettings, Attachment } from 'stream-chat';
import { AttachmentService } from './attachment.service';
import { ChannelService } from './channel.service';
import { NotificationService } from './notification.service';
import { AttachmentUpload, DefaultStreamChatGenerics } from './types';
import { Subject } from 'rxjs';
import { ChatClientService } from './chat-client.service';

describe('AttachmentService', () => {
  let service: AttachmentService<DefaultStreamChatGenerics>;
  let uploadAttachmentsSpy: jasmine.Spy;
  let deleteAttachmentSpy: jasmine.Spy;
  let readAsDataURLSpy: jasmine.Spy;
  let appSettings$: Subject<AppSettings>;
  let getAppSettings: jasmine.Spy;

  beforeEach(() => {
    appSettings$ = new Subject<AppSettings>();
    getAppSettings = jasmine.createSpy();
    getAppSettings.and.callFake(() => appSettings$.next({}));
    readAsDataURLSpy = jasmine.createSpy();
    spyOn(window, 'FileReader').and.returnValue({
      onload: jasmine.createSpy(),
      readAsDataURL: readAsDataURLSpy,
    } as any as FileReader);
    uploadAttachmentsSpy = jasmine.createSpy('uploadAttachmentsSpy');
    uploadAttachmentsSpy.and.resolveTo([]);
    deleteAttachmentSpy = jasmine.createSpy('deleteAttachmentSpy');
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ChannelService,
          useValue: {
            uploadAttachments: uploadAttachmentsSpy,
            deleteAttachment: deleteAttachmentSpy,
          },
        },
        {
          provide: ChatClientService,
          useValue: {
            appSettings$,
            getAppSettings,
          },
        },
      ],
    });
    service = TestBed.inject(
      AttachmentService
    ) as AttachmentService<DefaultStreamChatGenerics>;
  });

  it('should delete attachment, if file is already uploaded', async () => {
    const file = { name: 'myimage.jpg', type: 'image/jpg' } as any as File;
    const fileUpload = {
      file,
      state: 'success' as const,
      url: 'http://url/to/image',
      type: 'image' as const,
    };
    uploadAttachmentsSpy.and.resolveTo([fileUpload]);
    await service.filesSelected([file] as any as FileList);
    await service.deleteAttachment(fileUpload);

    expect(deleteAttachmentSpy).toHaveBeenCalledWith(fileUpload);
  });

  it('should delete attachment, if file is uploading', fakeAsync(() => {
    const file = { name: 'myimage.jpg', type: 'image/jpg' } as any as File;
    let resolver!: Function;
    uploadAttachmentsSpy.and.returnValue(
      new Promise((resolve) => {
        resolver = () =>
          resolve([
            {
              file,
              state: 'success' as const,
              url: 'http://url/to/image',
              type: 'image' as const,
            },
          ]);
      })
    );
    const attachmentUploadsSpy = jasmine.createSpy('attachmentUploadsSpy');
    service.attachmentUploads$.subscribe(attachmentUploadsSpy);
    void service.filesSelected([file] as any as FileList);
    tick();
    let attachmentUpload!: AttachmentUpload;
    service.attachmentUploads$.pipe(first()).subscribe((uploads) => {
      attachmentUpload = uploads[0];
    });
    void service.deleteAttachment(attachmentUpload);
    attachmentUploadsSpy.calls.reset();
    resolver();
    tick();

    expect(attachmentUploadsSpy).toHaveBeenCalledWith([]);
  }));

  it(`shouldn't delete preview, if attachment couldn't be deleted`, async () => {
    const file = { name: 'myimage.jpg', type: 'img/jpg' } as any as File;
    uploadAttachmentsSpy.and.resolveTo([
      {
        file,
        state: 'success' as const,
        url: 'http://url/to/image',
        type: 'image' as const,
      },
    ]);
    await service.filesSelected([file] as any as FileList);
    deleteAttachmentSpy.and.rejectWith(new Error('error'));
    let attachmentUpload!: AttachmentUpload;
    service.attachmentUploads$
      .pipe(first())
      .subscribe((uploads) => (attachmentUpload = uploads[0]));
    const uploadedAttachmentsSpy = jasmine.createSpy('uploadedAttachmentsSpy');
    service.attachmentUploads$.subscribe(uploadAttachmentsSpy);
    uploadedAttachmentsSpy.calls.reset();
    await service.deleteAttachment(attachmentUpload);

    expect(uploadedAttachmentsSpy).not.toHaveBeenCalled();
  });

  it('should remove deleted attachments after upload', fakeAsync(() => {
    const file = { name: 'my_image.png', type: 'image/png' } as File;
    const url = 'http://url/to/image';
    const fileUpload = {
      file,
      state: 'success' as const,
      url,
      type: 'image' as const,
    };
    uploadAttachmentsSpy.and.resolveTo([fileUpload]);
    void service.filesSelected([file] as any as FileList);
    void service.deleteAttachment(fileUpload);
    tick();

    expect(deleteAttachmentSpy).toHaveBeenCalledWith({
      file,
      state: 'success',
      url,
      type: 'image',
    });
  }));

  it(`shouldn't try to delete custom attachments from CDN`, fakeAsync(() => {
    const customAttachment = {
      image_url: 'url/to/my/image',
      type: 'image',
    };
    const attachmentUploadsSpy = jasmine.createSpy('attachmentUploadsSpy');
    service.attachmentUploads$.subscribe(attachmentUploadsSpy);
    service.addAttachment(customAttachment);
    let attachmentUpload!: AttachmentUpload;
    service.attachmentUploads$.pipe(first()).subscribe((uploads) => {
      attachmentUpload = uploads[0];
    });
    attachmentUploadsSpy.calls.reset();
    void service.deleteAttachment(attachmentUpload);
    tick();

    expect(attachmentUploadsSpy).toHaveBeenCalledWith([]);
    expect(deleteAttachmentSpy).not.toHaveBeenCalled();
  }));

  it('should display error message, if upload was unsuccessful', async () => {
    const image = { name: 'my_image.png', type: 'image/png' } as File;
    const file = { name: 'user_guide.pdf', type: 'application/pdf' } as File;
    uploadAttachmentsSpy.and.resolveTo([
      {
        file: image,
        state: 'error',
        type: 'image',
        errorReason: 'file-extension',
        errorExtraInfo: [{ param: '.jpg' }],
      },
      {
        file,
        state: 'error',
        type: 'file',
        errorReason: 'file-size',
        errorExtraInfo: [{ param: '50MB' }],
      },
    ]);
    const notificationService = TestBed.inject(NotificationService);
    spyOn(notificationService, 'addTemporaryNotification');
    await service.filesSelected([image, file] as any as FileList);

    expect(notificationService.addTemporaryNotification).toHaveBeenCalledWith(
      'streamChat.Error uploading file, extension not supported',
      'error',
      undefined,
      { name: image.name, ext: '.jpg' }
    );

    expect(notificationService.addTemporaryNotification).toHaveBeenCalledWith(
      'streamChat.Error uploading file, maximum file size exceeded',
      'error',
      undefined,
      { name: file.name, limit: '50MB' }
    );
  });

  it('should retry attachment upload', async () => {
    const file = { name: 'my_image.png', type: 'image/png' } as File;
    uploadAttachmentsSpy.and.resolveTo([
      { file, state: 'error', type: 'file' },
    ]);
    await service.filesSelected([file] as any as FileList);
    uploadAttachmentsSpy.and.resolveTo([
      { file, state: 'success', url: 'image/url', type: 'image' },
    ]);
    await service.retryAttachmentUpload(file);
    const attachmentUploadsSpy = jasmine.createSpy('attachmentUploadsSpy');
    service.attachmentUploads$.subscribe(attachmentUploadsSpy);

    expect(attachmentUploadsSpy).toHaveBeenCalledWith([
      {
        file,
        state: 'success',
        url: 'image/url',
        type: 'image',
        thumb_url: undefined,
        errorReason: undefined,
        errorExtraInfo: undefined,
      },
    ]);
  });

  it('should be able to upload files in multiple steps', async () => {
    const file1 = { name: 'my_image.png', type: 'image/png' } as File;
    uploadAttachmentsSpy.and.resolveTo([
      {
        file: file1,
        state: 'success',
        url: 'http://url/to/image',
        type: 'image',
      },
    ]);
    await service.filesSelected([file1] as any as FileList);

    const attachmentUploadsSpy = jasmine.createSpy('attachmentUploadsSpy');
    service.attachmentUploads$.subscribe(attachmentUploadsSpy);

    expect(attachmentUploadsSpy).toHaveBeenCalledWith([
      {
        file: file1,
        state: 'success',
        url: 'http://url/to/image',
        type: 'image',
        thumb_url: undefined,
      },
    ]);

    const file2 = { name: 'my_image2.png', type: 'image/png' } as File;
    uploadAttachmentsSpy.and.resolveTo([
      { file: file2, state: 'success', url: 'http://url/to/image2' },
    ]);
    await service.filesSelected([file2] as any as FileList);

    expect(attachmentUploadsSpy).toHaveBeenCalledWith([
      {
        file: file1,
        state: 'success',
        url: 'http://url/to/image',
        type: 'image',
        thumb_url: undefined,
      },
      {
        file: file2,
        state: 'success',
        url: 'http://url/to/image2',
        type: 'image',
        thumb_url: undefined,
      },
    ]);
  });

  it('should upload files', fakeAsync(() => {
    const imageFiles = [{ type: 'image/png' }, { type: 'image/jpg' }];
    const dataFiles = [
      { type: 'image/vnd.adobe.photoshop' },
      { type: 'plain/text' },
    ];
    const videoFiles = [
      { type: 'video/quicktime' },
      { type: 'video/x-msvideo' },
    ];
    const files = [...imageFiles, ...dataFiles, ...videoFiles];
    let resolver!: Function;
    uploadAttachmentsSpy.and.returnValue(
      new Promise((resolve) => {
        resolver = () =>
          resolve([
            {
              file: imageFiles[0],
              state: 'success',
              url: 'url1',
              type: 'image',
            },
            {
              file: imageFiles[1],
              state: 'success',
              url: 'url2',
              type: 'image',
            },
            { file: dataFiles[0], state: 'success', url: 'url3', type: 'file' },
            { file: dataFiles[1], state: 'success', url: 'url4', type: 'file' },
            {
              file: videoFiles[0],
              state: 'success',
              url: 'url5',
              type: 'video',
            },
            {
              file: videoFiles[1],
              state: 'success',
              url: 'url6',
              type: 'video',
            },
          ]);
      })
    );
    void service.filesSelected(files as any as FileList);
    tick();

    expect(uploadAttachmentsSpy).toHaveBeenCalledWith([
      { file: imageFiles[0], type: 'image', state: 'uploading' },
      { file: imageFiles[1], type: 'image', state: 'uploading' },
      { file: videoFiles[0], type: 'video', state: 'uploading' },
      { file: videoFiles[1], type: 'video', state: 'uploading' },
      { file: dataFiles[0], type: 'file', state: 'uploading' },
      { file: dataFiles[1], type: 'file', state: 'uploading' },
    ]);

    resolver();
    tick();

    expect(deleteAttachmentSpy).not.toHaveBeenCalled();
  }));

  it('should create preview for images', async () => {
    const imageFile = { type: 'image/png' };
    const dataFile = { type: 'plain/text' };
    uploadAttachmentsSpy.and.resolveTo([{}, {}]);
    await service.filesSelected([imageFile, dataFile] as any as FileList);

    expect(readAsDataURLSpy).toHaveBeenCalledOnceWith(imageFile);
  });

  it('should emit the number of uploads in progress', fakeAsync(() => {
    const spy = jasmine.createSpy();
    service.attachmentUploadInProgressCounter$.subscribe(spy);
    let resolver!: Function;
    uploadAttachmentsSpy.and.returnValue(
      new Promise((resovle) => {
        resolver = () => resovle([{}, {}]);
      })
    );

    expect(spy).toHaveBeenCalledWith(0);

    void service.filesSelected([
      { type: 'application/pdf' },
    ] as any as FileList);
    tick();

    expect(spy).toHaveBeenCalledWith(1);

    void service.filesSelected([{ type: 'image/png' }] as any as FileList);
    tick();

    expect(spy).toHaveBeenCalledWith(2);

    spy.calls.reset();
    resolver();
    tick();

    expect(spy).toHaveBeenCalledWith(0);
  }));

  it('should reset attachments', () => {
    const spy = jasmine.createSpy();
    service.attachmentUploads$.subscribe(spy);
    spy.calls.reset();
    service.resetAttachmentUploads();

    expect(spy).toHaveBeenCalledWith([]);
  });

  it('should map to attachments', async () => {
    const imageFile = { name: 'flower.png', type: 'image/png' };
    const dataFile = { name: 'note.txt', type: 'plain/text', size: 3272969 };
    const dataFile2 = { name: 'contract.pdf', type: 'application/pdf' };
    const videoFile = { name: 'test.mp4', type: 'video/mp4', size: 22233332 };
    uploadAttachmentsSpy.and.resolveTo([
      {
        file: imageFile,
        state: 'success',
        url: 'http://url/to/img',
        thumb_url: undefined,
      },
      {
        file: dataFile,
        state: 'success',
        url: 'http://url/to/data',
        thumb_url: undefined,
      },
      {
        file: dataFile2,
        state: 'error',
      },
      {
        file: videoFile,
        state: 'success',
        url: 'http://url/to/file',
        thumb_url: 'http://url/to/thumb',
      },
    ]);
    await service.filesSelected([
      imageFile,
      dataFile,
      dataFile2,
      videoFile,
    ] as any as FileList);

    const customAttachment: Attachment = {
      type: 'video',
      asset_url: 'url/to/my/video',
      thumb_url: 'url/to/my/thumb',
    };

    service.addAttachment(customAttachment);

    expect(service.mapToAttachments()).toEqual([
      {
        fallback: 'flower.png',
        image_url: 'http://url/to/img',
        type: 'image',
        mime_type: 'image/png',
      },
      {
        type: 'video',
        title: 'test.mp4',
        file_size: 22233332,
        asset_url: 'http://url/to/file',
        thumb_url: 'http://url/to/thumb',
        mime_type: 'video/mp4',
      },
      {
        title: 'note.txt',
        file_size: 3272969,
        asset_url: 'http://url/to/data',
        type: 'file',
        thumb_url: undefined,
        mime_type: 'plain/text',
      },
      {
        type: 'video',
        asset_url: 'url/to/my/video',
        thumb_url: 'url/to/my/thumb',
        isCustomAttachment: true,
      },
    ]);
  });

  it('should create attachmentUploads from attachments', () => {
    const attachments = [
      {
        fallback: 'flower.png',
        image_url: 'http://url/to/img',
        type: 'image',
        mime_type: undefined,
      },
      {
        title: 'note.txt',
        file_size: 3272969,
        asset_url: 'http://url/to/data',
        type: 'file',
        mime_type: undefined,
      },
      {
        title: 'cute.mov',
        file_size: 45367543,
        asset_url: 'http://url/to/video',
        type: 'video',
        thumb_url: 'http://url/to/poster',
        mime_type: 'video/mov',
      },
      {
        type: 'file',
        asset_url: 'url/to/my/file',
        title: 'my-file.pdf',
        mime_type: 'application/pdf',
        isCustomAttachment: true,
      },
    ];
    const imageFile = { name: 'flower.png', type: undefined };
    const dataFile = { name: 'note.txt', size: 3272969, type: undefined };
    const videoFile = {
      name: 'cute.mov',
      size: 45367543,
      type: 'video/mov',
    };
    const customFile = {
      name: 'my-file.pdf',
      size: undefined,
      type: 'application/pdf',
    };
    const result = [
      {
        file: imageFile,
        state: 'success',
        url: 'http://url/to/img',
        type: 'image',
        fromAttachment: attachments[0],
      },
      {
        file: dataFile,
        state: 'success',
        url: 'http://url/to/data',
        type: 'file',
        thumb_url: undefined,
        fromAttachment: attachments[1],
      },
      {
        file: videoFile,
        state: 'success',
        url: 'http://url/to/video',
        type: 'video',
        thumb_url: 'http://url/to/poster',
        fromAttachment: attachments[2],
      },
      {
        file: customFile,
        type: 'file',
        url: 'url/to/my/file',
        state: 'success',
        thumb_url: undefined,
        fromAttachment: attachments[3],
      },
    ];
    const spy = jasmine.createSpy();
    service.attachmentUploads$.subscribe(spy);
    spy.calls.reset();
    service.createFromAttachments(attachments);

    expect(spy).toHaveBeenCalledWith(jasmine.arrayContaining(result));
  });

  it('should ignore URL attachments if creating from attachments', () => {
    const urlAttachment = { type: 'image', title_link: 'title_link' };
    const spy = jasmine.createSpy();
    service.attachmentUploads$.subscribe(spy);
    spy.calls.reset();
    service.createFromAttachments([urlAttachment]);

    expect(spy).not.toHaveBeenCalled();
  });

  it('should be able to add custom attachment', () => {
    const customAttachment: Attachment = {
      type: 'file',
      asset_url: 'url/to/my/file',
      file_size: undefined,
      title: 'my-file.pdf',
      mime_type: undefined,
    };

    const spy = jasmine.createSpy();
    service.attachmentUploads$.subscribe(spy);
    spy.calls.reset();
    service.addAttachment(customAttachment);

    expect(spy).toHaveBeenCalledWith([
      {
        url: 'url/to/my/file',
        state: 'success',
        file: {
          name: 'my-file.pdf',
          size: undefined,
          type: undefined,
        } as unknown as File,
        type: 'file',
        fromAttachment: { ...customAttachment, isCustomAttachment: true },
        thumb_url: undefined,
      },
    ]);
  });

  it(`should check uploaded attachments' size`, async () => {
    const notificationService = TestBed.inject(NotificationService);
    const errorNotificationSpy = spyOn(
      notificationService,
      'addTemporaryNotification'
    );
    appSettings$.next({
      file_upload_config: {
        size_limit: 10485760,
      },
      image_upload_config: {
        size_limit: 3145728,
      },
    });
    let files = [{ name: 'test.pdf', type: 'application/pdf', size: 1048576 }];
    let result = await service.filesSelected(files as any as FileList);

    expect(result).toBeTrue();
    expect(errorNotificationSpy).not.toHaveBeenCalled();

    files = [
      { name: 'test.pdf', type: 'application/pdf', size: 1048576 },
      { name: 'test2.doc', type: 'application/msword', size: 10495760 },
      { name: 'test3.png', type: 'image/png', size: 3145729 },
    ];
    result = await service.filesSelected(files as any as FileList);

    expect(result).toBeFalse();
    const calls = errorNotificationSpy.calls;
    expect(errorNotificationSpy).toHaveBeenCalledTimes(2);
    expect(calls.first().args).toEqual([
      'streamChat.Error uploading file, maximum file size exceeded',
      undefined,
      undefined,
      {
        name: 'test2.doc',
        limit: '10MB',
      },
    ]);
    expect(calls.mostRecent().args).toEqual([
      'streamChat.Error uploading file, maximum file size exceeded',
      undefined,
      undefined,
      {
        name: 'test3.png',
        limit: '3MB',
      },
    ]);
  });

  it(`should check uploaded attachments' extensions`, async () => {
    const notificationService = TestBed.inject(NotificationService);
    const errorNotificationSpy = spyOn(
      notificationService,
      'addTemporaryNotification'
    );
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
    let result = await service.filesSelected(files as any as FileList);

    expect(result).toBeTrue();

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
    result = await service.filesSelected(files as any as FileList);

    expect(result).toBeFalse();
    const calls = errorNotificationSpy.calls;
    expect(errorNotificationSpy).toHaveBeenCalledTimes(2);
    expect(calls.first().args).toEqual([
      'streamChat.Error uploading file, extension not supported',
      undefined,
      undefined,
      { name: 'test2.doc', ext: 'application/msword' },
    ]);
    expect(calls.mostRecent().args).toEqual([
      'streamChat.Error uploading file, extension not supported',
      undefined,
      undefined,
      { name: 'test3.png', ext: 'image/png' },
    ]);

    errorNotificationSpy.calls.reset();
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
    result = await service.filesSelected(files as any as FileList);

    expect(result).toBeFalse();
    expect(notificationService.addTemporaryNotification).toHaveBeenCalledTimes(
      2
    );
  });

  it('should load app settings, if not yet loaded', async () => {
    const files = [{ name: 'test.pdf', type: 'application/pdf' }];
    await service.filesSelected(files as any as FileList);

    expect(getAppSettings).toHaveBeenCalledWith();
  });

  it('should load app settings only once', async () => {
    const files = [{ name: 'test.pdf', type: 'application/pdf' }];
    await service.filesSelected(files as any as FileList);
    await service.filesSelected(files as any as FileList);

    expect(getAppSettings).toHaveBeenCalledTimes(1);
  });
});
