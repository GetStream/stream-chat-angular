import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AttachmentListComponent } from './attachment-list.component';

describe('AttachmentListComponent', () => {
  let component: AttachmentListComponent;
  let fixture: ComponentFixture<AttachmentListComponent>;
  let nativeElement: HTMLElement;
  let queryAttachments: () => HTMLElement[];
  let queryImages: () => HTMLImageElement[];

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
    fixture.detectChanges();
  });

  it('should display received #attachments', () => {
    component.attachments = [];
    fixture.detectChanges();

    expect(queryAttachments().length).toBe(0);

    component.attachments = [
      { type: 'image', img_url: 'url1' },
      { type: 'image', img_url: 'url2' },
    ];
    fixture.detectChanges();

    expect(queryAttachments().length).toBe(2);
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

    it('should set alt text for image', () => {
      const fallback = 'Fallback is image can not be displayed';
      component.attachments = [{ type: 'image', img_url: 'url1', fallback }];
      fixture.detectChanges();

      expect(queryImages()[0].alt).toContain(fallback);
    });
  });
});
