import { TestBed } from '@angular/core/testing';
import { Attachment } from 'stream-chat';
import { AttachmentConfigurationService } from './attachment-configuration.service';

describe('AttachmentConfigurationService', () => {
  let service: AttachmentConfigurationService;

  beforeEach(() => {
    service = TestBed.inject(AttachmentConfigurationService);
  });

  it('should provide the correct configuration for image attachments', () => {
    let attachment: Attachment = {
      img_url: 'url/to/img',
      thumb_url: 'different/url',
    };

    expect(
      service.getImageAttachmentConfiguration(attachment, 'single')
    ).toEqual({
      url: 'url/to/img',
      height: '300px',
      width: '',
    });

    attachment = {
      thumb_url: 'url/to/img',
    };

    expect(
      service.getImageAttachmentConfiguration(attachment, 'single')
    ).toEqual({
      url: 'url/to/img',
      height: '300px',
      width: '',
    });

    attachment = {
      image_url: 'url/to/img',
    };

    expect(
      service.getImageAttachmentConfiguration(attachment, 'single')
    ).toEqual({
      url: 'url/to/img',
      height: '300px',
      width: '',
    });
  });

  it('should call #customImageAttachmentConfigurationHandler, if provided', () => {
    const spy = jasmine.createSpy();
    service.customImageAttachmentConfigurationHandler = spy;
    const attachment: Attachment = {
      img_url: 'url/to/img',
      thumb_url: 'different/url',
    };
    service.getImageAttachmentConfiguration(attachment, 'carousel');

    expect(spy).toHaveBeenCalledWith(attachment, 'carousel');
  });

  it('should provide the correct configuration for gallery image attachments', () => {
    const attachment: Attachment = {
      img_url: 'url/to/img',
    };

    expect(
      service.getImageAttachmentConfiguration(attachment, 'gallery')
    ).toEqual({
      url: 'url/to/img',
      height: '',
      width: '',
    });
  });

  it('should provide the correct configuration for image attachments inside the carousel', () => {
    const attachment: Attachment = {
      img_url: 'url/to/img',
    };

    expect(
      service.getImageAttachmentConfiguration(attachment, 'carousel')
    ).toEqual({
      url: 'url/to/img',
      height: '',
      width: '',
    });
  });

  it('should provide the correct configuration for video attachments', () => {
    const attachment: Attachment = {
      asset_url: 'url/to/video',
    };

    expect(service.getVideoAttachmentConfiguration(attachment)).toEqual({
      url: 'url/to/video',
      height: '100%',
      width: '100%',
    });
  });

  it('should call #customVideoAttachmentConfigurationHandler, if provided', () => {
    const spy = jasmine.createSpy();
    service.customVideoAttachmentConfigurationHandler = spy;
    const attachment: Attachment = {
      img_url: 'url/to/video',
      thumb_url: 'different/url',
    };
    service.getVideoAttachmentConfiguration(attachment);

    expect(spy).toHaveBeenCalledWith(attachment);
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
      image_url: 'url/to/img',
      thumb_url: 'different/url',
    };

    expect(service.getScrapedImageAttachmentConfiguration(attachment)).toEqual({
      url: 'url/to/img',
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
});
