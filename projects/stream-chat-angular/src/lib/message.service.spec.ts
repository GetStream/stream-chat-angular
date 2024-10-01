import { TestBed } from '@angular/core/testing';

import { MessageService } from './message.service';
import { Attachment } from 'stream-chat';

describe('MessageService', () => {
  let service: MessageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MessageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should filter custom attachments', () => {
    const attachment: Attachment = {
      type: 'image',
    };

    expect(service.isCustomAttachment(attachment)).toBeFalse();

    attachment.type = 'video';

    expect(service.isCustomAttachment(attachment)).toBeFalse();

    attachment.type = 'file';

    expect(service.isCustomAttachment(attachment)).toBeFalse();

    attachment.type = 'voiceRecording';

    expect(service.isCustomAttachment(attachment)).toBeFalse();

    attachment.type = 'custom';

    expect(service.isCustomAttachment(attachment)).toBeTrue();

    service.filterCustomAttachment = (a: Attachment) =>
      a.type === 'image' || a.type === 'custom';

    attachment.type = 'image';

    expect(service.isCustomAttachment(attachment)).toBeTrue();
  });
});
