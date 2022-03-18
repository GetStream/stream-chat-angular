import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, Subject } from 'rxjs';
import { AttachmentUpload } from '../types';

import { AttachmentPreviewListComponent } from './attachment-preview-list.component';

describe('AttachmentPreviewListComponent', () => {
  let component: AttachmentPreviewListComponent;
  let fixture: ComponentFixture<AttachmentPreviewListComponent>;
  let attachmentUploads$: Subject<AttachmentUpload[]>;
  let queryImagePreviews: () => HTMLElement[];
  let queryLoadingIndicators: () => HTMLElement[];
  let queryPreviewImages: () => HTMLImageElement[];
  let queryPreviewFiles: () => HTMLElement[];

  beforeEach(async () => {
    attachmentUploads$ = new BehaviorSubject<AttachmentUpload[]>([]);
    await TestBed.configureTestingModule({
      declarations: [AttachmentPreviewListComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AttachmentPreviewListComponent);
    component = fixture.componentInstance;
    const nativeElement = fixture.nativeElement as HTMLElement;
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
    component.attachmentUploads$ = attachmentUploads$;
    fixture.detectChanges();
  });

  it('should display image preview - uploading', () => {
    attachmentUploads$.next([
      {
        file: { name: 'my_image.png', type: 'image/png' } as any as File,
        type: 'image',
        state: 'uploading',
      },
      {
        file: { name: 'my_image2.png', type: 'image/png' } as any as File,
        type: 'image',
        state: 'uploading',
      },
      {
        file: { name: 'note.txt', type: 'plain/text' } as any as File,
        type: 'file',
        state: 'uploading',
      },
    ]);
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

  it('should display image preview - success', () => {
    const file = { name: 'my_image.png', type: 'image/png' } as File;
    attachmentUploads$.next([
      { file, state: 'success', url: 'url/to/image', type: 'image' },
    ]);
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

  it('should display image preview - error', () => {
    const file1 = { name: 'my_image.png', type: 'image/png' } as File;
    const file2 = { name: 'my_image2.png', type: 'image/png' } as File;
    attachmentUploads$.next([
      { file: file1, state: 'success', url: 'url/to/image', type: 'image' },
      { file: file2, state: 'error', type: 'image' },
    ]);
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
    attachmentUploads$.next([
      {
        file: { name: 'my_image2.png' } as File,
        type: 'image',
        state: 'uploading',
      },
      { file: { name: 'note.txt' } as File, type: 'file', state: 'uploading' },
    ]);
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
    attachmentUploads$.next([
      {
        file: { name: fileName, type: 'plain/text' } as File,
        state: 'success',
        url,
        type: 'file',
      },
    ]);
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
    attachmentUploads$.next([
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
    ]);
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
    attachmentUploads$.next([
      { file, state: 'uploading', previewUri, type: 'image' },
    ]);
    fixture.detectChanges();
    const previewImage = queryPreviewImages()[0];

    expect(previewImage.src).toContain(previewUri);

    const url = 'url/to/img';
    attachmentUploads$.next([{ file, state: 'success', url, type: 'image' }]);
    fixture.detectChanges();

    expect(previewImage.src).toContain(url);
  });

  it('should retry file upload', () => {
    const upload = {
      file: { name: 'contract.pdf', type: 'application/pdf' } as File,
      state: 'error',
      type: 'file',
    } as AttachmentUpload;
    attachmentUploads$.next([upload]);
    fixture.detectChanges();
    const spy = jasmine.createSpy();
    component.retryAttachmentUpload.subscribe(spy);
    const filePreviews = queryPreviewFiles();
    const retryButton = filePreviews[0].querySelector(
      '[data-testclass="file-upload-retry"]'
    ) as HTMLButtonElement;
    retryButton.click();
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith(upload.file);
  });

  it('should delete file', () => {
    const upload = {
      file: { name: 'contract.pdf', type: 'application/pdf' } as File,
      state: 'success',
      url: 'url',
      type: 'file',
    } as AttachmentUpload;
    attachmentUploads$.next([upload]);
    fixture.detectChanges();
    const filePreviews = queryPreviewFiles();
    const deleteButton = filePreviews[0].querySelector(
      '[data-testclass="file-delete"]'
    ) as HTMLButtonElement;
    const spy = jasmine.createSpy();
    component.deleteAttachment.subscribe(spy);
    deleteButton.click();
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith(upload);
  });

  it('should retry image upload', () => {
    const file = { name: 'my_image.png', type: 'image/png' } as File;
    attachmentUploads$.next([{ file, state: 'error', type: 'image' }]);
    fixture.detectChanges();
    const retryButton = queryImagePreviews()[0].querySelector(
      '[data-testclass="upload-error"]'
    ) as HTMLButtonElement;
    retryButton.click();
    attachmentUploads$.next([
      { file, state: 'success', url: 'image/url', type: 'image' },
    ]);
    fixture.detectChanges();

    expect(
      queryImagePreviews()[0].querySelector('[data-testclass="upload-error"]')
    ).toBeNull();
  });

  it('should download file, if upload was successful', () => {
    const upload = {
      file: { name: 'contract.pdf', type: 'application/pdf' } as File,
      state: 'success',
      url: 'url/to/file',
      type: 'file',
    } as AttachmentUpload;
    attachmentUploads$.next([upload]);
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
    attachmentUploads$.next([upload]);
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
});
