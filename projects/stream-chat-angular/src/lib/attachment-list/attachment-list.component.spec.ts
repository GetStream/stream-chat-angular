import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import { ModalComponent } from '../modal/modal.component';
import { ChannelService } from '../channel.service';
import { StreamI18nService } from '../stream-i18n.service';
import { AttachmentListComponent } from './attachment-list.component';
import { Attachment } from 'stream-chat';
import { DefaultStreamChatGenerics } from '../types';
import { AttachmentConfigurationService } from '../attachment-configuration.service';
import { ThemeService } from '../theme.service';
import { SimpleChange } from '@angular/core';

describe('AttachmentListComponent', () => {
  let component: AttachmentListComponent;
  let fixture: ComponentFixture<AttachmentListComponent>;
  let nativeElement: HTMLElement;
  let queryAttachments: () => HTMLElement[];
  let queryImages: () => HTMLImageElement[];
  let queryFileLinks: () => HTMLAnchorElement[];
  let queryFileNames: () => HTMLElement[];
  let queryUrlLinks: () => HTMLAnchorElement[];
  let queryCardImages: () => HTMLImageElement[];
  let queryActions: () => HTMLElement[];
  let queryImageModal: () => ModalComponent;
  let queryImageModalImage: () => HTMLImageElement | null;
  let queryImageModalPrevButton: () => HTMLButtonElement | null;
  let queryImageModalNextButton: () => HTMLButtonElement | null;
  let queryGallery: () => HTMLElement | null;
  let queryVideos: () => HTMLVideoElement[];
  let queryVideoContainers: () => HTMLElement[];
  let sendAction: jasmine.Spy;

  beforeEach(async () => {
    sendAction = jasmine.createSpy();
    await TestBed.configureTestingModule({
      declarations: [AttachmentListComponent, ModalComponent],
      providers: [
        { provide: ChannelService, useValue: { sendAction: sendAction } },
        { provide: ThemeService, useValue: { themeVersion: '2' } },
        StreamI18nService,
        AttachmentConfigurationService,
      ],
      imports: [TranslateModule.forRoot()],
    }).compileComponents();
    TestBed.inject(StreamI18nService).setTranslation();
  });

  beforeEach(fakeAsync(() => {
    fixture = TestBed.createComponent(AttachmentListComponent);
    component = fixture.componentInstance;
    nativeElement = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    tick();
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
    queryFileNames = () =>
      Array.from(
        nativeElement.querySelectorAll('[data-testclass="file-title"]')
      );
    queryUrlLinks = () =>
      Array.from(nativeElement.querySelectorAll('[data-testclass="url-link"]'));
    queryCardImages = () =>
      Array.from(nativeElement.querySelectorAll('[data-testclass="card-img"]'));
    queryActions = () =>
      Array.from(
        nativeElement.querySelectorAll('[data-testclass="attachment-action"]')
      );
    queryImageModal = () =>
      fixture.debugElement.query(By.directive(ModalComponent))
        ?.componentInstance as ModalComponent;
    queryImageModalImage = () =>
      nativeElement.querySelector(
        '[data-testid="modal-image"]'
      ) as HTMLImageElement;
    queryImageModalPrevButton = () =>
      nativeElement.querySelector(
        '[data-testid="image-modal-prev"]'
      ) as HTMLButtonElement;
    queryImageModalNextButton = () =>
      nativeElement.querySelector(
        '[data-testid="image-modal-next"]'
      ) as HTMLButtonElement;
    queryGallery = () =>
      nativeElement.querySelector('[data-testid="image-gallery"]');
    queryVideos = () =>
      Array.from(
        nativeElement.querySelectorAll('[data-testclass="video-attachment"]')
      );
    queryVideoContainers = () =>
      Array.from(
        nativeElement.querySelectorAll(
          '[data-testclass="video-attachment-parent"]'
        )
      );
  }));

  it('should display received #attachments ordered', () => {
    component.attachments = [];
    component.ngOnChanges({ attachments: {} as SimpleChange });
    fixture.detectChanges();

    expect(queryAttachments().length).toBe(0);

    component.attachments = [
      { type: 'image', img_url: 'http://url1' },
      { type: 'file', asset_url: 'http://url3' },
      {
        type: 'video',
        asset_url: 'http://url6',
      },
    ];
    component.ngOnChanges({ attachments: {} as SimpleChange });
    fixture.detectChanges();
    const attachments = queryAttachments();

    expect(attachments.length).toBe(3);
    expect(
      attachments[0].classList.contains('str-chat__message-attachment--image')
    ).toBeTrue();

    expect(
      attachments[1].classList.contains('str-chat__message-attachment--video')
    ).toBeTrue();

    expect(
      attachments[2].classList.contains('str-chat__message-attachment--file')
    ).toBeTrue();

    expect(
      attachments[2].classList.contains('str-chat__message-attachment--image')
    ).toBeFalse();

    expect(queryImages().length).toBe(1);
    expect(queryFileLinks().length).toBe(1);
    expect(queryCardImages().length).toBe(0);
    expect(queryActions().length).toBe(0);
    expect(
      nativeElement.querySelector('.str-chat__message-attachment-with-actions')
    ).toBeNull();

    expect(queryVideos().length).toBe(1);
  });

  it('should create gallery', () => {
    component.attachments = [
      { type: 'image', img_url: 'http://url1' },
      { type: 'file', asset_url: 'http://url3' },
      { type: 'image', img_url: 'http://url2' },
    ];
    component.ngOnChanges({ attachments: {} as SimpleChange });
    fixture.detectChanges();
    const orderedAttachments = component.orderedAttachments;

    expect(orderedAttachments.length).toBe(2);
    expect(orderedAttachments[0].type).toBe('gallery');
    expect(orderedAttachments[0].images![0].img_url).toBe('http://url1');
    expect(orderedAttachments[0].images![1].img_url).toBe('http://url2');
  });

  it('should display gallery', () => {
    component.attachments = [
      { type: 'image', img_url: 'http://url1' },
      { type: 'image', img_url: 'http://url2' },
    ];
    component.ngOnChanges({ attachments: {} as SimpleChange });
    fixture.detectChanges();
    let gallery = queryAttachments()[0];
    let imageElemnts = gallery.querySelectorAll('img');

    expect(gallery.querySelectorAll('.str-chat__gallery-image').length).toBe(2);
    expect(imageElemnts[0].src).toContain('http://url1');
    expect(imageElemnts[1].src).toContain('http://url2');
    expect(
      nativeElement.querySelector('.str-chat__gallery-two-rows')
    ).toBeNull();

    component.attachments = [
      { type: 'image', img_url: 'http://url1' },
      { type: 'image', img_url: 'http://url2' },
      { type: 'image', thumb_url: 'http://url3' },
      { type: 'image', image_url: 'http://url4' },
    ];
    component.ngOnChanges({ attachments: {} as SimpleChange });
    fixture.detectChanges();
    gallery = queryAttachments()[0];
    imageElemnts = gallery.querySelectorAll('img');

    expect(gallery.querySelectorAll('.str-chat__gallery-image').length).toBe(4);
    expect(imageElemnts[0].src).toContain('http://url1');
    expect(imageElemnts[1].src).toContain('http://url2');
    expect(imageElemnts[2].src).toContain('http://url3');
    expect(imageElemnts[3].src).toContain('http://url4');
    expect(
      nativeElement.querySelector('.str-chat__gallery-two-rows')
    ).not.toBeNull();

    component.attachments = [
      { type: 'image', img_url: 'http://url1' },
      { type: 'image', img_url: 'http://url2' },
      { type: 'image', thumb_url: 'http://url3' },
      { type: 'image', image_url: 'http://url4' },
      { type: 'image', image_url: 'http://url5' },
    ];
    component.ngOnChanges({ attachments: {} as SimpleChange });
    fixture.detectChanges();
    gallery = queryAttachments()[0];
    imageElemnts = gallery.querySelectorAll('img');
    const lastImage = gallery.querySelector(
      '.str-chat__gallery-placeholder'
    ) as HTMLElement;

    expect(gallery.querySelectorAll('.str-chat__gallery-image').length).toBe(3);
    expect(
      gallery.querySelectorAll('.str-chat__gallery-placeholder').length
    ).toBe(1);

    expect(lastImage.style.backgroundImage).toContain('http://url4');
    expect(lastImage.innerHTML).toContain('1 more');
  });

  it('should display attachment actions and apply CSS class', () => {
    const attachment = {
      type: 'giphy',
      title: 'cats',
      title_link: 'https://giphy.com/gifs/cat-funny-costume-3mq6k5fqe5g8o',
      thumb_url:
        'https://media3.giphy.com/media/3mq6k5fqe5g8o/giphy.gif?cid=c4b036756eqt4bhl28q4lm1xxpqk5a1cwspozzn9q8f0za10&rid=giphy.gif&ct=g',
      actions: [
        {
          name: 'image_action',
          text: 'Send',
          style: 'primary',
          type: 'button',
          value: 'send',
        },
        {
          name: 'image_action',
          text: 'Shuffle',
          style: 'default',
          type: 'button',
          value: 'shuffle',
        },
        {
          name: 'image_action',
          text: 'Cancel',
          style: 'default',
          type: 'button',
          value: 'cancel',
        },
      ],
      giphy: {
        original: {
          url: 'https://media3.giphy.com/media/3mq6k5fqe5g8o/giphy.gif?cid=c4b036756eqt4bhl28q4lm1xxpqk5a1cwspozzn9q8f0za10&rid=giphy.gif&ct=g',
          width: '499',
          height: '340',
          size: '411781',
          frames: '6',
        },
      },
    } as any as Attachment<DefaultStreamChatGenerics>;
    component.attachments = [attachment];
    component.ngOnChanges({ attachments: {} as SimpleChange });
    fixture.detectChanges();

    const actions = queryActions();

    expect(actions.length).toBe(3);
    expect(actions[0].innerHTML).toContain('Send');
    expect(actions[1].innerHTML).toContain('Shuffle');
    expect(actions[2].innerHTML).toContain('Cancel');
    expect(
      nativeElement.querySelector('.str-chat__message-attachment-with-actions')
    ).not.toBeNull();
  });

  it('should send attachment action, if clicked', () => {
    const attachment = {
      type: 'giphy',
      title: 'cats',
      title_link: 'https://giphy.com/gifs/cat-funny-costume-3mq6k5fqe5g8o',
      thumb_url:
        'https://media3.giphy.com/media/3mq6k5fqe5g8o/giphy.gif?cid=c4b036756eqt4bhl28q4lm1xxpqk5a1cwspozzn9q8f0za10&rid=giphy.gif&ct=g',
      actions: [
        {
          name: 'image_action',
          text: 'Send',
          style: 'primary',
          type: 'button',
          value: 'send',
        },
        {
          name: 'image_action',
          text: 'Shuffle',
          style: 'default',
          type: 'button',
          value: 'shuffle',
        },
        {
          name: 'image_action',
          text: 'Cancel',
          style: 'default',
          type: 'button',
          value: 'cancel',
        },
      ],
      giphy: {
        original: {
          url: 'https://media3.giphy.com/media/3mq6k5fqe5g8o/giphy.gif?cid=c4b036756eqt4bhl28q4lm1xxpqk5a1cwspozzn9q8f0za10&rid=giphy.gif&ct=g',
          width: '499',
          height: '340',
          size: '411781',
          frames: '6',
        },
      },
    } as any as Attachment<DefaultStreamChatGenerics>;
    component.messageId = 'message-id';
    component.attachments = [attachment];
    component.parentMessageId = 'parent-id';
    component.ngOnChanges({ attachments: {} as SimpleChange });
    fixture.detectChanges();

    const actions = queryActions();
    actions[1].click();

    expect(sendAction).toHaveBeenCalledWith(
      'message-id',
      {
        image_action: 'shuffle',
      },
      'parent-id'
    );
  });

  describe('should display image attachment', () => {
    it('should display image by img_url', () => {
      const imageUrl = 'http://image/url';
      component.attachments = [
        { type: 'image', img_url: imageUrl, thumb_url: 'thumb/url' },
      ];
      component.ngOnChanges({ attachments: {} as SimpleChange });
      fixture.detectChanges();

      expect(queryImages()[0].src).toContain(imageUrl);
    });

    it('should display image by thumb_url', () => {
      const thumbUrl = 'http://thumb/url';
      component.attachments = [
        { type: 'image', img_url: undefined, thumb_url: thumbUrl },
      ];
      component.ngOnChanges({ attachments: {} as SimpleChange });
      fixture.detectChanges();

      expect(queryImages()[0].src).toContain(thumbUrl);
    });

    it('should display image by image_url', () => {
      const imageUrl = 'http://image/url';
      component.attachments = [
        {
          type: 'image',
          img_url: undefined,
          thumb_url: undefined,
          image_url: imageUrl,
        },
      ];
      component.ngOnChanges({ attachments: {} as SimpleChange });
      fixture.detectChanges();

      expect(queryImages()[0].src).toContain(imageUrl);
    });

    it('should set alt text for image', () => {
      const fallback = 'Fallback is image can not be displayed';
      component.attachments = [
        { type: 'image', img_url: 'http://url1', fallback },
      ];
      component.ngOnChanges({ attachments: {} as SimpleChange });
      fixture.detectChanges();

      expect(queryImages()[0].alt).toContain(fallback);
    });

    it('should display add necessary CSS class for SVG images', () => {
      component.attachments = [
        { type: 'image', img_url: 'http://image/url', fallback: 'image.svg' },
      ];
      component.ngOnChanges({ attachments: {} as SimpleChange });
      fixture.detectChanges();

      expect(
        nativeElement.querySelector('.str-chat__message-attachment--svg-image')
      ).not.toBeNull();

      component.attachments = [
        { type: 'image', img_url: 'http://image/url', fallback: 'image.jpg' },
      ];
      component.ngOnChanges({ attachments: {} as SimpleChange });
      fixture.detectChanges();

      expect(
        nativeElement.querySelector('.str-chat__message-attachment--svg-image')
      ).toBeNull();
    });
  });

  describe('should display file attachment', () => {
    it('should display file link', () => {
      const title = 'contract.pdf';
      const asset_url = 'http://url/to/contract';
      component.attachments = [{ type: 'file', title, asset_url }];
      component.ngOnChanges({ attachments: {} as SimpleChange });
      fixture.detectChanges();
      const link = queryFileLinks()[0];
      const titleElement = queryFileNames()[0];

      expect(link.href).toContain(asset_url);
      expect(titleElement.textContent).toContain(title);
    });

    it('should add CSS class for files', () => {
      component.attachments = [
        {
          type: 'file',
          title: 'contract.pdf',
          asset_url: 'http://url/to/contract',
        },
        {
          type: 'file',
          title: 'contract2.pdf',
          asset_url: 'http://url/to/contract2',
        },
      ];
      component.ngOnChanges({ attachments: {} as SimpleChange });
      fixture.detectChanges();

      expect(
        queryAttachments()[0].classList.contains(
          'str-chat-angular__message-attachment-file-single'
        )
      ).toBeTrue();

      expect(
        queryAttachments()[1].classList.contains(
          'str-chat-angular__message-attachment-file-single'
        )
      ).toBeTrue();
    });

    it('should sanitize file link', () => {
      const asset_url = 'javascript:alert(document.domain)';
      component.attachments = [
        { type: 'file', title: 'contract.pdf', asset_url },
      ];
      component.ngOnChanges({ attachments: {} as SimpleChange });
      fixture.detectChanges();
      const link = queryFileLinks()[0];

      expect(link.href).toContain('unsafe:' + asset_url);
    });

    it('should display file size, if provided', () => {
      const title = 'contract.pdf';
      const asset_url = 'http://url/to/contract';
      component.attachments = [
        { type: 'file', title, asset_url, file_size: 3272969 },
      ];
      component.ngOnChanges({ attachments: {} as SimpleChange });
      fixture.detectChanges();
      let preview = queryAttachments()[0];
      let fileSize = preview.querySelector('[data-testclass="size"]');

      expect(fileSize?.textContent).toContain('3.27 MB');

      component.attachments = [
        { type: 'file', title, asset_url, file_size: '3272969' },
      ];
      component.ngOnChanges({ attachments: {} as SimpleChange });
      fixture.detectChanges();
      preview = queryAttachments()[0];
      fileSize = preview.querySelector('[data-testclass="size"]');

      expect(fileSize?.textContent).toContain('3.27 MB');
    });
  });

  describe('should display URL attachment as card', () => {
    it('should trim URL', () => {
      expect(component.trimUrl('https://angular.io/')).toBe('angular.io');
      expect(component.trimUrl('https://www.youtube.com/')).toBe('youtube.com');
    });

    it('should display image by #image_url', () => {
      const imageUrl = 'https://getstream.io/images/og/OG_Home.png';
      component.attachments = [
        {
          author_name: 'GetStream',
          image_url: imageUrl,
          og_scrape_url: 'https://getstream.io',
          thumb_url: 'not' + imageUrl,
          title: 'Stream',
          title_link: '/',
          type: 'image',
        },
      ];
      component.ngOnChanges({ attachments: {} as SimpleChange });
      fixture.detectChanges();

      expect(queryCardImages()[0].src).toBe(imageUrl);
    });

    it('should display image by #thumb_url', () => {
      const thumbUrl = 'https://getstream.io/images/og/OG_Home.png';
      component.attachments = [
        {
          author_name: 'GetStream',
          image_url: undefined,
          og_scrape_url: 'https://getstream.io',
          thumb_url: thumbUrl,
          title: 'Stream',
          title_link: '/',
        },
      ];
      component.ngOnChanges({ attachments: {} as SimpleChange });
      fixture.detectChanges();

      expect(queryCardImages()[0].src).toBe(thumbUrl);
    });

    it(`shouldn't display url preview if there are other attachments`, () => {
      component.attachments = [
        {
          author_name: 'GetStream',
          image_url: 'https://getstream.io/images/og/OG_Home.png',
          og_scrape_url: 'https://getstream.io',
          title: 'Stream',
          title_link: '/',
          type: 'image',
        },
        {
          type: 'image',
          image_url: 'http://url/to/flower.png',
        },
      ];
      component.ngOnChanges({ attachments: {} as SimpleChange });
      fixture.detectChanges();

      expect(component.orderedAttachments.length).toBe(1);
    });

    it('should display attachment #title, if exists', () => {
      const title = 'Stream';
      component.attachments = [
        {
          author_name: 'GetStream',
          image_url: undefined,
          og_scrape_url: 'https://getstream.io',
          thumb_url: 'https://getstream.io/images/og/OG_Home.png',
          title,
          title_link: '/',
        },
      ];
      component.ngOnChanges({ attachments: {} as SimpleChange });
      fixture.detectChanges();

      expect(
        queryAttachments()[0].querySelector('[data-testclass="card-title"]')
          ?.textContent
      ).toContain(title);
    });

    it('should display attachment #text, if exists', () => {
      const text =
        'Build scalable in-app chat or activity feeds in days. Product teams trust Stream to launch faster, iterate more often, and ship a better user experience.';
      component.attachments = [
        {
          author_name: 'GetStream',
          image_url: undefined,
          og_scrape_url: 'https://getstream.io',
          thumb_url: 'https://getstream.io/images/og/OG_Home.png',
          title: 'Stream',
          text,
          title_link: '/',
        },
      ];
      component.ngOnChanges({ attachments: {} as SimpleChange });
      fixture.detectChanges();

      expect(
        queryAttachments()[0].querySelector('[data-testclass="card-text"]')
          ?.textContent
      ).toContain(text);
    });

    it('should display attachment #title_link', () => {
      const titleLink = 'https://getstream.io';
      component.attachments = [
        {
          author_name: 'GetStream',
          image_url: undefined,
          og_scrape_url: 'https://getstream.io/home',
          thumb_url: 'https://getstream.io/images/og/OG_Home.png',
          title: 'Stream',
          text: 'Build scalable in-app chat or activity feeds in days. Product teams trust Stream to launch faster, iterate more often, and ship a better user experience.',
          title_link: titleLink,
        },
      ];
      component.ngOnChanges({ attachments: {} as SimpleChange });
      fixture.detectChanges();

      expect(queryUrlLinks()[0].href).toContain(titleLink);
      expect(queryUrlLinks()[0].textContent).toContain('getstream.io');
    });

    it('should display attachment #og_scrape_url', () => {
      const scrapeUrl = 'https://getstream.io';
      component.attachments = [
        {
          author_name: 'GetStream',
          image_url: undefined,
          og_scrape_url: scrapeUrl,
          thumb_url: 'https://getstream.io/images/og/OG_Home.png',
          title: 'Stream',
          text: 'Build scalable in-app chat or activity feeds in days. Product teams trust Stream to launch faster, iterate more often, and ship a better user experience.',
          title_link: undefined,
        },
      ];
      component.ngOnChanges({ attachments: {} as SimpleChange });
      fixture.detectChanges();

      expect(queryUrlLinks()[0].href).toContain(scrapeUrl);
      expect(queryUrlLinks()[0].textContent).toContain(
        component.trimUrl('getstream.io')
      );
    });

    it('should open image viewer modal - single image', () => {
      const imageModalSpy = jasmine.createSpy();
      component.imageModalStateChange.subscribe(imageModalSpy);

      const attachment = {
        type: 'image',
        image_url: 'http://url1',
      };
      component.attachments = [attachment];
      component.ngOnChanges({ attachments: {} as SimpleChange });
      fixture.detectChanges();

      expect(queryImageModal()).toBeUndefined();

      queryImages()[0].click();
      fixture.detectChanges();

      expect(queryImageModal()).toBeDefined();
      expect(component.imagesToView).toEqual([attachment]);
      expect(component.imagesToViewCurrentIndex).toBe(0);
      expect(queryImageModalPrevButton()?.style.visibility).toBe('hidden');
      expect(queryImageModalNextButton()?.style.visibility).toBe('hidden');
      expect(imageModalSpy).toHaveBeenCalledWith('opened');
    });

    it('should open image viewer modal - image gallery', () => {
      const attachments = [
        {
          type: 'image',
          image_url: 'http://url1',
        },
        {
          type: 'image',
          img_url: 'http://url2',
        },
      ];
      component.attachments = attachments;
      component.ngOnChanges({ attachments: {} as SimpleChange });
      fixture.detectChanges();

      expect(queryImageModal()).toBeUndefined();

      queryGallery()
        ?.querySelectorAll<HTMLButtonElement>(
          '[data-testclass="gallery-image"]'
        )[0]
        .click();
      fixture.detectChanges();

      expect(queryImageModal()).toBeDefined();
      expect(component.imagesToView).toEqual(attachments);
      expect(component.imagesToViewCurrentIndex).toBe(0);
    });

    it('should open image viewer modal with preselected image', () => {
      const attachments = [
        {
          type: 'image',
          image_url: 'http://url1',
        },
        {
          type: 'image',
          img_url: 'http://url2',
        },
      ];
      component.attachments = attachments;
      component.ngOnChanges({ attachments: {} as SimpleChange });
      fixture.detectChanges();

      expect(queryImageModal()).toBeUndefined();

      queryGallery()
        ?.querySelectorAll<HTMLButtonElement>(
          '[data-testclass="gallery-image"]'
        )[1]
        .click();
      fixture.detectChanges();

      expect(queryImageModal()).toBeDefined();
      expect(component.imagesToView).toEqual(attachments);
      expect(component.imagesToViewCurrentIndex).toBe(1);
    });

    it('should move to next and previous images', () => {
      const attachments = [
        {
          type: 'image',
          image_url: 'http://url1',
        },
        {
          type: 'image',
          img_url: 'http://url2',
        },
        {
          type: 'image',
          thumb_url: 'http://url3',
        },
      ];
      component.attachments = attachments;
      component.ngOnChanges({ attachments: {} as SimpleChange });
      fixture.detectChanges();

      queryGallery()
        ?.querySelectorAll<HTMLButtonElement>(
          '[data-testclass="gallery-image"]'
        )[0]
        .click();
      fixture.detectChanges();

      expect(queryImageModalImage()?.src).toContain(attachments[0].image_url!);
      expect(queryImageModalPrevButton()?.style.visibility).toBe('hidden');

      queryImageModalNextButton()?.click();
      fixture.detectChanges();

      expect(queryImageModalImage()?.src).toContain(attachments[1].img_url!);
      expect(queryImageModalPrevButton()?.style.visibility).toBe('visible');
      expect(queryImageModalNextButton()?.style.visibility).toBe('visible');

      queryImageModalPrevButton()?.click();
      fixture.detectChanges();

      expect(queryImageModalImage()?.src).toContain(attachments[0].image_url!);

      queryImageModalNextButton()?.click();
      queryImageModalNextButton()?.click();
      fixture.detectChanges();

      expect(queryImageModalImage()?.src).toContain(attachments[2].thumb_url!);
      expect(queryImageModalPrevButton()?.style.visibility).toBe('visible');
      expect(queryImageModalNextButton()?.style.visibility).toBe('hidden');
    });

    it('should deselect images if modal is closed', () => {
      const imageModalSpy = jasmine.createSpy();
      component.imageModalStateChange.subscribe(imageModalSpy);
      imageModalSpy.calls.reset();
      const attachment = {
        type: 'image',
        image_url: 'http://url1',
      };
      component.attachments = [attachment];
      component.ngOnChanges({ attachments: {} as SimpleChange });
      component.imagesToView = [attachment];
      fixture.detectChanges();
      queryImageModal().close();
      fixture.detectChanges();

      expect(component.imagesToView).toEqual([]);
      expect(imageModalSpy).toHaveBeenCalledWith('closed');
    });
  });

  it(`shouldn't display video links as video attachments`, () => {
    const attachment = {
      asset_url: 'https://www.youtube.com/watch?v=m4-HM_sCvtQ',
      author_name: 'YouTube',
      image_url: 'https://i.ytimg.com/vi/m4-HM_sCvtQ/mqdefault.jpg',
      og_scrape_url: 'https://www.youtube.com/watch?v=m4-HM_sCvtQ',
      text: "Java is one of the most successful and most dreaded technologies in the computer science world. Let's roast this powerful open-source programming language to find out why it has so many haters. \n\n#java #programming #comedy #100SecondsOfCode\n\n🔗 Resources\n\nJava Website https://java.com\nJava in 100 Seconds https://youtu.be/l9AzO1FMgM8\nWhy Java Sucks https://tech.jonathangardner.net/wiki/Why_Java_Sucks\nWhy Java Doesn't Suck https://smartbear.com/blog/please-stop-staying-java-sucks/\n\n🔥 Get More Content - Upgrade to PRO\n\nUpgrade to Fireship PRO at https://fireship.io/pro\nUse code lORhwXd2 for ...",
      thumb_url: 'https://i.ytimg.com/vi/m4-HM_sCvtQ/mqdefault.jpg',
      title: 'Java for the Haters in 100 Seconds',
      title_link: 'https://www.youtube.com/watch?v=m4-HM_sCvtQ',
      type: 'video',
    };
    component.attachments = [attachment];
    component.ngOnChanges({ attachments: {} as SimpleChange });
    fixture.detectChanges();

    expect(queryVideos().length).toBe(0);
  });

  it('should set respect image configuration for all attachments', () => {
    const configurationService = TestBed.inject(AttachmentConfigurationService);
    const testConfiguration = {
      url: 'test-url',
      width: '300px',
      height: '300px',
      originalHeight: 1200,
      originalWidth: 800,
    };
    spyOn(
      configurationService,
      'getImageAttachmentConfiguration'
    ).and.returnValue(testConfiguration);
    spyOn(
      configurationService,
      'getVideoAttachmentConfiguration'
    ).and.returnValue(testConfiguration);
    spyOn(
      configurationService,
      'getGiphyAttachmentConfiguration'
    ).and.returnValue(testConfiguration);
    spyOn(
      configurationService,
      'getScrapedImageAttachmentConfiguration'
    ).and.returnValue(testConfiguration);

    // Single image, link image, video, giphy
    component.attachments = [
      { type: 'image', img_url: 'http://url1' },
      {
        title: 'BBC - Homepage',
        title_link: 'https://www.bbc.com/',
        og_scrape_url: 'https://www.bbc.com/',
        image_url: 'https://assets/images/favicons/favicon-194x194.png',
      },
      {
        image_url: 'https://getstream.io/images/og/OG_Home.png',
        og_scrape_url: 'https://getstream.io/',
        text: 'Build scalable in-app chat or activity feeds in days. Product teams trust Stream to launch faster, iterate more often, and ship a better user experience.',
        thumb_url: 'https://getstream.io/images/og/OG_Home.png',
        title: 'The #1 Chat Messaging + Activity Feed Infrastructure',
        title_link: '/',
        type: 'image',
      },
      {
        thumb_url:
          'https://media3.giphy.com/media/Eq5pb4dR4DJQc/giphy.gif?cid=c4b036756eqt4bhl28q4lm1xxpqk5a1cwspozzn9q8f0za10&rid=giphy.gif&ct=g',
        title: 'cats',
        title_link: 'https://giphy.com/gifs/game-point-Eq5pb4dR4DJQc',
        type: 'giphy',
      },
      {
        type: 'video',
        asset_url: 'http://url6',
      },
    ];
    component.ngOnChanges({ attachments: {} as SimpleChange });
    fixture.detectChanges();

    [...queryImages(), ...queryVideoContainers()].forEach((element) => {
      expect(element.style.height).toBe(testConfiguration.height);

      expect(element.style.width).toBe(testConfiguration.width);

      expect(
        getComputedStyle(element).getPropertyValue('--original-height')
      ).toBe(testConfiguration.originalHeight.toString());

      expect(
        getComputedStyle(element).getPropertyValue('--original-width')
      ).toBe(testConfiguration.originalWidth.toString());
    });

    [...queryCardImages()].forEach((element) => {
      expect(element.style.height).toBe(testConfiguration.height);
      expect(element.style.width).toBe(testConfiguration.width);
    });

    // Gallery
    component.attachments = [
      { type: 'image', img_url: 'http://url1' },
      { type: 'image', img_url: 'http://url2' },
      { type: 'image', img_url: 'http://url3' },
      { type: 'image', img_url: 'http://url4' },
      { type: 'image', img_url: 'http://url5' },
    ];
    component.ngOnChanges({ attachments: {} as SimpleChange });
    fixture.detectChanges();
    const gallery = queryGallery()!;

    [
      ...Array.from(gallery.querySelectorAll('img')),
      gallery.querySelector<HTMLButtonElement>(
        '[data-testid="more-image-button"]'
      )!,
    ].forEach((element) => {
      expect(element.style.height).toBe(testConfiguration.height);
      expect(element.style.width).toBe(testConfiguration.width);

      expect(
        getComputedStyle(element).getPropertyValue('--original-height')
      ).toBe(testConfiguration.originalHeight.toString());

      expect(
        getComputedStyle(element).getPropertyValue('--original-width')
      ).toBe(testConfiguration.originalWidth.toString());
    });

    // Image carousel
    const attachment = {
      type: 'image',
      image_url: 'http://url1',
    };
    component.attachments = [attachment];
    component.ngOnChanges({ attachments: {} as SimpleChange });
    fixture.detectChanges();
    queryImages()[0].click();
    fixture.detectChanges();
    const modalImage = queryImageModalImage()!;

    expect(modalImage.style.height).toBe(testConfiguration.height);
    expect(modalImage.style.width).toBe(testConfiguration.width);

    expect(
      getComputedStyle(modalImage).getPropertyValue('--original-height')
    ).toBe(testConfiguration.originalHeight.toString());

    expect(
      getComputedStyle(modalImage).getPropertyValue('--original-width')
    ).toBe(testConfiguration.originalWidth.toString());
  });

  it('should display video attachment with thumb url', () => {
    const attachments = [
      {
        type: 'video',
        asset_url: 'http://url/to/video',
        thumb_url: 'http://url/to/thumb',
      },
    ];
    component.attachments = attachments;
    component.ngOnChanges({ attachments: {} as SimpleChange });
    fixture.detectChanges();
    const videoElements = queryVideos();

    expect(videoElements[0].src).toContain(attachments[0].asset_url);
    expect(videoElements[0].poster).toContain(attachments[0].thumb_url);
  });
});
