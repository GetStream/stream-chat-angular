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
      img_url: 'http://url/to/img',
      thumb_url: 'different/url',
    };

    expect(
      service.getImageAttachmentConfiguration(attachment, 'single')
    ).toEqual({
      url: 'http://url/to/img?h=600&w=600',
      height: '300px',
      width: '',
    });

    attachment = {
      thumb_url: 'http://url/to/img',
    };

    expect(
      service.getImageAttachmentConfiguration(attachment, 'single')
    ).toEqual({
      url: 'http://url/to/img?h=600&w=600',
      height: '300px',
      width: '',
    });

    attachment = {
      image_url: 'http://url/to/img',
    };

    expect(
      service.getImageAttachmentConfiguration(attachment, 'single')
    ).toEqual({
      url: 'http://url/to/img?h=600&w=600',
      height: '300px',
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
    service.getImageAttachmentConfiguration(attachment, 'carousel');

    expect(spy).toHaveBeenCalledWith(attachment, 'carousel');
  });

  it('should provide the correct configuration for gallery image attachments', () => {
    const attachment: Attachment = {
      img_url: 'http://url/to/img',
    };

    expect(
      service.getImageAttachmentConfiguration(attachment, 'gallery')
    ).toEqual({
      url: 'http://url/to/img?h=300&w=300',
      height: '150px',
      width: '',
    });
  });

  it('should provide the correct configuration for image attachments inside the carousel', () => {
    const attachment: Attachment = {
      img_url: 'http://url/to/img',
    };

    expect(
      service.getImageAttachmentConfiguration(attachment, 'carousel')
    ).toEqual({
      url: 'http://url/to/img',
      height: '',
      width: '',
    });
  });

  it('should provide the correct configuration for video attachments', () => {
    let attachment: Attachment = {
      asset_url: 'http://url/to/video',
      thumb_url: 'http://url/to/poster',
    };

    expect(service.getVideoAttachmentConfiguration(attachment)).toEqual({
      url: 'http://url/to/video',
      height: '100%',
      width: '100%',
      thumbUrl: 'http://url/to/poster?h=600&w=600',
    });

    attachment = {
      asset_url: 'http://url/to/video',
      thumb_url: 'http://url/to/poster?oh=1080&ow=1920',
    };

    expect(service.getVideoAttachmentConfiguration(attachment)).toEqual({
      url: 'http://url/to/video',
      height: '100%',
      width: '100%',
      thumbUrl: 'http://url/to/poster?oh=1080&ow=1920&h=600&w=1067',
    });

    attachment = {
      asset_url: 'http://url/to/video',
    };

    expect(service.getVideoAttachmentConfiguration(attachment)).toEqual({
      url: 'http://url/to/video',
      height: '100%',
      width: '100%',
      thumbUrl: undefined,
    });
  });

  it('should call #customVideoAttachmentConfigurationHandler, if provided', () => {
    const spy = jasmine.createSpy();
    service.customVideoAttachmentConfigurationHandler = spy;
    const attachment: Attachment = {
      img_url: 'http://url/to/video',
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

    const result = service.getImageAttachmentConfiguration(
      attachment,
      'single'
    );

    expect(result.url).toContain('h=750&w=600');
  });
});
