import { TestBed } from '@angular/core/testing';
import { Attachment } from 'stream-chat';
import { AttachmentConfigurationService } from './attachment-configuration.service';

describe('AttachmentConfigurationService', () => {
  let service: AttachmentConfigurationService;

  beforeEach(() => {
    spyOn(window, 'getComputedStyle').and.callFake(
      (htmlElement: Element) =>
        ({
          getPropertyValue: (property) =>
            htmlElement[property as keyof Element] || '',
        } as CSSStyleDeclaration)
    );
    service = TestBed.inject(AttachmentConfigurationService);
  });

  it('should provide the correct configuration for image attachments', () => {
    let attachment: Attachment = {
      img_url: 'http://url/to/img',
      thumb_url: 'different/url',
    };
    const htmlElement = {
      'max-width': '300px',
      'max-height': '300px',
      height: '',
    } as any as HTMLElement;

    expect(
      service.getImageAttachmentConfiguration(attachment, 'single', htmlElement)
    ).toEqual({
      url: 'http://url/to/img?h=600&w=600',
      height: '',
      width: '',
      originalHeight: 1000000,
      originalWidth: 1000000,
    });

    attachment = {
      thumb_url: 'http://url/to/img?oh=1200&ow=800',
    };

    expect(
      service.getImageAttachmentConfiguration(attachment, 'single', htmlElement)
    ).toEqual({
      url: 'http://url/to/img?oh=1200&ow=800&h=900&w=600',
      height: '',
      width: '',
      originalHeight: 1200,
      originalWidth: 800,
    });

    attachment = {
      image_url: 'http://url/to/img?oh=1&ow=1',
    };

    expect(
      service.getImageAttachmentConfiguration(attachment, 'single', htmlElement)
    ).toEqual({
      url: 'http://url/to/img?oh=1&ow=1&h=600&w=600',
      originalHeight: 1000000,
      originalWidth: 1000000,
      height: '',
      width: '',
    });
  });

  it('should call #customImageAttachmentConfigurationHandler, if provided', () => {
    const spy = jasmine.createSpy();
    service.customImageAttachmentConfigurationHandler = spy;
    const attachment: Attachment = {
      img_url: 'http://url/to/img',
      thumb_url: 'different/url',
    };
    const htmlElement = {
      'max-width': 'none',
      'max-height': 'none',
    } as any as HTMLElement;
    service.getImageAttachmentConfiguration(
      attachment,
      'carousel',
      htmlElement
    );

    expect(spy).toHaveBeenCalledWith(attachment, 'carousel', htmlElement);
  });

  it('should provide the correct configuration for gallery image attachments', () => {
    const attachment: Attachment = {
      img_url: 'http://url/to/img',
    };
    const htmlElement = {
      'max-width': '300px',
      height: '300px',
    } as any as HTMLElement;

    expect(
      service.getImageAttachmentConfiguration(
        attachment,
        'gallery',
        htmlElement
      )
    ).toEqual({
      url: 'http://url/to/img?h=600&w=600',
      height: '',
      width: '',
      originalHeight: 1000000,
      originalWidth: 1000000,
    });
  });

  it('should provide the correct configuration for image attachments inside the carousel', () => {
    const attachment: Attachment = {
      img_url: 'http://url/to/img',
    };
    const htmlElement = {
      'max-width': 'none',
      'max-height': 'none',
    } as any as HTMLElement;

    expect(
      service.getImageAttachmentConfiguration(
        attachment,
        'carousel',
        htmlElement
      )
    ).toEqual({
      url: 'http://url/to/img',
      height: '',
      width: '',
      originalHeight: 1000000,
      originalWidth: 1000000,
    });
  });

  it('should provide the correct configuration for video attachments', () => {
    let attachment: Attachment = {
      asset_url: 'http://url/to/video',
      thumb_url: 'http://url/to/poster',
    };
    const htmlElement = {
      'max-width': '300px',
      'max-height': '300px',
    } as any as HTMLElement;

    expect(
      service.getVideoAttachmentConfiguration(attachment, htmlElement)
    ).toEqual({
      url: 'http://url/to/video',
      height: '',
      width: '',
      thumbUrl: 'http://url/to/poster?h=600&w=600',
      originalHeight: 1000000,
      originalWidth: 1000000,
    });

    attachment = {
      asset_url: 'http://url/to/video',
      thumb_url: 'http://url/to/poster?oh=1080&ow=1920',
    };

    expect(
      service.getVideoAttachmentConfiguration(attachment, htmlElement)
    ).toEqual({
      url: 'http://url/to/video',
      height: '',
      width: '',
      thumbUrl: 'http://url/to/poster?oh=1080&ow=1920&h=600&w=1066',
      originalHeight: 1080,
      originalWidth: 1920,
    });

    attachment = {
      asset_url: 'http://url/to/video',
    };

    expect(
      service.getVideoAttachmentConfiguration(attachment, htmlElement)
    ).toEqual({
      url: 'http://url/to/video',
      height: '',
      width: '',
      thumbUrl: undefined,
      originalHeight: 1000000,
      originalWidth: 1000000,
    });
  });

  it('should call #customVideoAttachmentConfigurationHandler, if provided', () => {
    const spy = jasmine.createSpy();
    service.customVideoAttachmentConfigurationHandler = spy;
    const attachment: Attachment = {
      img_url: 'http://url/to/video',
      thumb_url: 'different/url',
    };
    const htmlElement = {
      'max-width': '300px',
      'max-height': '300px',
    } as any as HTMLElement;
    service.getVideoAttachmentConfiguration(attachment, htmlElement);

    expect(spy).toHaveBeenCalledWith(attachment, htmlElement);
  });

  it('should provide the correct configuration for GIFs', () => {
    let attachment: Attachment = {
      image_url: 'link/to/GIF',
    };

    expect(service.getGiphyAttachmentConfiguration(attachment)).toEqual({
      url: 'link/to/GIF',
      height: '300px',
      width: '',
    });

    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    attachment = {
      image_url: 'link/to/GIF',
      giphy: {
        fixed_height_downsampled: {
          height: '200',
          width: '400',
          url: 'link/to/smaller/GIF',
        },
      } as any,
    };
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */

    expect(service.getGiphyAttachmentConfiguration(attachment)).toEqual({
      url: 'link/to/smaller/GIF',
      height: '200px',
      width: '400px',
    });
  });

  it('should call #customGiphyAttachmentConfigurationHandler, if provided', () => {
    const spy = jasmine.createSpy();
    service.customGiphyAttachmentConfigurationHandler = spy;

    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    const attachment = {
      image_url: 'link/to/GIF',
      giphy: {
        fixed_height_downsampled: {
          height: '200',
          width: '400',
          url: 'link/to/smaller/GIF',
        },
      } as any,
    };
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */

    service.getGiphyAttachmentConfiguration(attachment);

    expect(spy).toHaveBeenCalledWith(attachment);
  });

  it('should provide correct configuration for scraped images', () => {
    let attachment: Attachment = {
      image_url: 'http://url/to/img',
      thumb_url: 'different/url',
    };

    expect(service.getScrapedImageAttachmentConfiguration(attachment)).toEqual({
      url: 'http://url/to/img',
      width: '',
      height: '',
    });

    attachment = {
      thumb_url: 'different/url',
    };

    expect(service.getScrapedImageAttachmentConfiguration(attachment)).toEqual({
      url: 'different/url',
      width: '',
      height: '',
    });
  });

  it('should call #customScrapedImageAttachmentConfigurationHandler, if provided', () => {
    const spy = jasmine.createSpy();
    service.customScrapedImageAttachmentConfigurationHandler = spy;
    const attachment = {
      image_url: 'link/to/url',
    };
    service.getScrapedImageAttachmentConfiguration(attachment);

    expect(spy).toHaveBeenCalledWith(attachment);
  });

  it('should provide integer values for image resize and make sure that each dimension is at least the size restriction', () => {
    const attachment = {
      img_url: 'http://url/to/img?ow=3534&oh=4417',
    };
    const htmlElement = {
      'max-width': '300px',
      height: '300px',
    } as any as HTMLElement;

    const result = service.getImageAttachmentConfiguration(
      attachment,
      'gallery',
      htmlElement
    );

    expect(result.url).toContain('h=750&w=600');
  });

  it('should turn off thumbnail generation for video files', () => {
    service.shouldGenerateVideoThumbnail = false;
    const htmlElement = {
      'max-width': '300px',
      'max-height': '300px',
    } as any as HTMLElement;

    const attachment: Attachment = {
      asset_url: 'http://url/to/video',
      thumb_url: 'http://url/to/poster',
    };

    expect(
      service.getVideoAttachmentConfiguration(attachment, htmlElement).thumbUrl
    ).toBeUndefined();
  });

  it('should override existing "h" and "w" URL params', () => {
    const attachment: Attachment = {
      image_url: 'http://url/to/img?crop=*&h=*&oh=0&ow=0&resize=*&ro=0&w=*',
    };
    const htmlElement = {
      'max-width': '300px',
      'max-height': '300px',
    } as any as HTMLElement;

    const url = service.getImageAttachmentConfiguration(
      attachment,
      'single',
      htmlElement
    ).url;

    expect(url).not.toContain('h=*');
    expect(url).not.toContain('w=*');
    expect(url).toContain('h=600');
    expect(url).toContain('w=600');
  });

  it('should handle if image attachments have invalid or missing urls', () => {
    const attachment: Attachment = {};
    const htmlElement = {
      'max-width': '300px',
      'max-height': '300px',
      height: '',
    } as any as HTMLElement;

    expect(() =>
      service.getImageAttachmentConfiguration(attachment, 'single', htmlElement)
    ).not.toThrow(jasmine.any(Error));
  });
});
