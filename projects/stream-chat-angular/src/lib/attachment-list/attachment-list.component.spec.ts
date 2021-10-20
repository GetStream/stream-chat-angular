import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImageLoadService } from '../message-list/image-load.service';
import { AttachmentListComponent } from './attachment-list.component';

describe('AttachmentListComponent', () => {
  let component: AttachmentListComponent;
  let fixture: ComponentFixture<AttachmentListComponent>;
  let nativeElement: HTMLElement;
  let queryAttachments: () => HTMLElement[];
  let queryImages: () => HTMLImageElement[];
  let queryFileLinks: () => HTMLAnchorElement[];

  const waitForImgComplete = () => {
    const img = queryImages()[0];
    return new Promise((resolve, reject) => {
      if (!img) {
        return reject();
      }
      img.addEventListener('load', () => resolve(undefined));
      img.addEventListener('error', () => resolve(undefined));
    });
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AttachmentListComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AttachmentListComponent);
    component = fixture.componentInstance;
    nativeElement = fixture.nativeElement as HTMLElement;
    queryAttachments = () =>
      Array.from(
        nativeElement.querySelectorAll(
          '[data-testclass="attachment-container"]'
        )
      );
    queryImages = () =>
      Array.from(nativeElement.querySelectorAll('[data-testclass="image"]'));
    queryFileLinks = () =>
      Array.from(
        nativeElement.querySelectorAll('[data-testclass="file-link"]')
      );
    fixture.detectChanges();
  });

  it('should display received #attachments', () => {
    component.attachments = [];
    fixture.detectChanges();

    expect(queryAttachments().length).toBe(0);

    component.attachments = [
      { type: 'image', img_url: 'url1' },
      { type: 'image', img_url: 'url2' },
      { type: 'file', asset_url: 'url3' },
    ];
    fixture.detectChanges();
    const attachments = queryAttachments();

    expect(attachments.length).toBe(3);
    expect(
      attachments[0].classList.contains('str-chat__message-attachment--image')
    ).toBeTrue();

    expect(
      attachments[1].classList.contains('str-chat__message-attachment--image')
    ).toBeTrue();

    expect(
      attachments[2].classList.contains('str-chat__message-attachment--image')
    ).toBeFalse();

    expect(
      attachments[2].classList.contains('str-chat__message-attachment--file')
    ).toBeTrue();

    expect(queryImages().length).toBe(2);
    expect(queryFileLinks().length).toBe(1);
  });

  describe('should display image attachment', () => {
    it('should display image by img_url', () => {
      const imageUrl = 'image/url';
      component.attachments = [
        { type: 'image', img_url: imageUrl, thumb_url: 'thumb/url' },
      ];
      fixture.detectChanges();

      expect(queryImages()[0].src).toContain(imageUrl);
    });

    it('should display image by thumb_url', () => {
      const thumbUrl = 'thumb/url';
      component.attachments = [
        { type: 'image', img_url: undefined, thumb_url: thumbUrl },
      ];
      fixture.detectChanges();

      expect(queryImages()[0].src).toContain(thumbUrl);
    });

    it('should display image by image_url', () => {
      const imageUrl = 'image/url';
      component.attachments = [
        {
          type: 'image',
          img_url: undefined,
          thumb_url: undefined,
          image_url: imageUrl,
        },
      ];
      fixture.detectChanges();

      expect(queryImages()[0].src).toContain(imageUrl);
    });

    it('should set alt text for image', () => {
      const fallback = 'Fallback is image can not be displayed';
      component.attachments = [{ type: 'image', img_url: 'url1', fallback }];
      fixture.detectChanges();

      expect(queryImages()[0].alt).toContain(fallback);
    });

    it('should emit image load event', async () => {
      const imageLoadService = TestBed.inject(ImageLoadService);
      const spy = jasmine.createSpy();
      imageLoadService.imageLoad$.subscribe(spy);
      component.attachments = [
        {
          type: 'image',
          image_url: 'https://picsum.photos/200/300',
        },
      ];
      fixture.detectChanges();
      await waitForImgComplete();

      expect(spy).toHaveBeenCalledWith(undefined);
    });
  });

  describe('should display file attachment', () => {
    it('should display file link', () => {
      const title = 'contract.pdf';
      const asset_url = 'url/to/contract';
      component.attachments = [{ type: 'file', title, asset_url }];
      fixture.detectChanges();
      const link = queryFileLinks()[0];

      expect(link.hasAttribute('download')).toBeTrue();
      expect(link.href).toContain(asset_url);
      expect(link.textContent).toContain(title);
    });

    it('should sanitize file link', () => {
      const asset_url = 'javascript:alert(document.domain)';
      component.attachments = [
        { type: 'file', title: 'contract.pdf', asset_url },
      ];
      fixture.detectChanges();
      const link = queryFileLinks()[0];

      expect(link.hasAttribute('download')).toBeTrue();
      expect(link.href).toContain('unsafe:' + asset_url);
    });

    it('should display file size, if provided', () => {
      const title = 'contract.pdf';
      const asset_url = 'url/to/contract';
      component.attachments = [
        { type: 'file', title, asset_url, file_size: 3272969 },
      ];
      fixture.detectChanges();
      const preview = queryAttachments()[0];
      const fileSize = preview.querySelector('[data-testclass="size"]');

      expect(fileSize?.textContent).toContain('3.27 MB');
    });
  });
});
